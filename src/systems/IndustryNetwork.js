/**
 * Industry network — spatial logistics for the Industrial Age.
 *
 * The production chain (auto miner → smelter → factory) runs on its own, but a
 * *connected* chain runs better. This system reads the world grid and works out
 * which machines are wired together by conveyor belts into a real supply line:
 *   auto miner ─belt─ smelter ─belt─ factory.
 *
 * It is deliberately a pure, read-only analyzer — the world grid is the single
 * source of truth, so there is no placement/break bookkeeping to keep in sync
 * (place a belt and it just works; mine one and the line re-evaluates). That
 * keeps it modular and bug-resistant as the world streams and edits.
 *
 * `evaluate()` returns a small summary the game uses for an efficiency multiplier
 * and the HUD; it never mutates anything.
 */
import { blockId } from '../core/blocks.js';

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class IndustryNetwork {
  constructor() {
    this._ids = null;
  }

  _blockIds() {
    if (!this._ids) {
      this._ids = {
        miner: blockId('auto_miner'),
        smelter: blockId('smelter'),
        factory: blockId('factory'),
        conveyor: blockId('conveyor'),
      };
    }
    return this._ids;
  }

  /**
   * Analyze the machines + belts in a bounded box around (cx, cy).
   * @returns {{miners,smelters,factories,conveyors,linkedSmelters,linkedFactories,
   *           fedFraction,efficiency}}
   */
  evaluate(world, cx, cy, radius = 26) {
    const ids = this._blockIds();
    const miners = [];
    const smelters = [];
    const factories = [];
    const belts = new Set();

    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(world.width - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(world.height - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const id = world.get(x, y);
        if (id === ids.miner) miners.push([x, y]);
        else if (id === ids.smelter) smelters.push([x, y]);
        else if (id === ids.factory) factories.push([x, y]);
        else if (id === ids.conveyor) belts.add(key(x, y));
      }
    }

    // Flood-fill the belts into connected components.
    const comp = new Map();
    let cid = 0;
    for (const k of belts) {
      if (comp.has(k)) continue;
      const stack = [k];
      comp.set(k, cid);
      while (stack.length) {
        const [px, py] = unkey(stack.pop());
        for (const [dx, dy] of NEIGHBORS) {
          const nk = key(px + dx, py + dy);
          if (belts.has(nk) && !comp.has(nk)) { comp.set(nk, cid); stack.push(nk); }
        }
      }
      cid++;
    }

    // A machine's "ports" are the belt components orthogonally touching it.
    const portsOf = ([x, y]) => {
      const ports = new Set();
      for (const [dx, dy] of NEIGHBORS) {
        const c = comp.get(key(x + dx, y + dy));
        if (c !== undefined) ports.add(c);
      }
      return ports;
    };

    // Components that touch a miner (the head of the chain).
    const minerComps = new Set();
    for (const m of miners) for (const c of portsOf(m)) minerComps.add(c);

    // A smelter is fed if a belt links it to a miner; remember its components so
    // a downstream factory must reach a *fed* smelter (a true end-to-end line).
    const fedSmelterComps = new Set();
    let linkedSmelters = 0;
    for (const s of smelters) {
      const ports = portsOf(s);
      if ([...ports].some((c) => minerComps.has(c))) {
        linkedSmelters++;
        for (const c of ports) fedSmelterComps.add(c);
      }
    }

    let linkedFactories = 0;
    for (const f of factories) {
      const ports = portsOf(f);
      if ([...ports].some((c) => fedSmelterComps.has(c))) linkedFactories++;
    }

    const denom = Math.max(1, smelters.length + factories.length);
    const fedFraction = (linkedSmelters + linkedFactories) / denom;
    return {
      miners: miners.length,
      smelters: smelters.length,
      factories: factories.length,
      conveyors: belts.size,
      linkedSmelters,
      linkedFactories,
      fedFraction,
      // Connected lines boost throughput up to +60%.
      efficiency: 1 + 0.6 * fedFraction,
    };
  }
}

function key(x, y) { return `${x},${y}`; }
function unkey(k) { const i = k.indexOf(','); return [+k.slice(0, i), +k.slice(i + 1)]; }
