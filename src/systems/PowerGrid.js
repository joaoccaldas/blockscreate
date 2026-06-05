/**
 * Power grid — the energy layer for the Industrial Age.
 *
 * Sibling to IndustryNetwork (material logistics), this is the *power* network:
 * generators and windmills are sources, power lines distribute, and machines are
 * the load. A machine is "powered" when it sits on a power-line component whose
 * source capacity covers everything drawing from it. Overload that grid and the
 * machines brown out — so your power has to scale with your factory, which is
 * the fun tension: keep adding clean windmills or dirty-but-strong generators.
 *
 * Like IndustryNetwork it is a pure, read-only analyzer over the world grid —
 * no placement bookkeeping, so it can never drift out of sync.
 */
import { blockId } from '../core/blocks.js';

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// How much capacity each source provides, and what each machine draws.
const SOURCE_CAP = { generator: 5, windmill: 2 };
const CONSUMERS = ['auto_miner', 'smelter', 'factory'];

export class PowerGrid {
  constructor() { this._ids = null; }

  _blockIds() {
    if (!this._ids) {
      this._ids = {
        line: blockId('power_line'),
        generator: blockId('generator'),
        windmill: blockId('windmill'),
        consumers: CONSUMERS.map((n) => [blockId(n), n]),
      };
    }
    return this._ids;
  }

  /**
   * @returns {{generators,windmills,lines,sources,capacity,load,poweredCount,
   *            poweredFraction,overloaded}}
   */
  evaluate(world, cx, cy, radius = 26) {
    const ids = this._blockIds();
    const consumerId = new Map(ids.consumers);
    const lines = new Set();
    const sources = []; // [x, y, cap]
    const consumers = []; // [x, y]
    let generators = 0;
    let windmills = 0;

    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(world.width - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(world.height - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const id = world.get(x, y);
        if (id === ids.line) lines.add(key(x, y));
        else if (id === ids.generator) { sources.push([x, y, SOURCE_CAP.generator]); generators++; }
        else if (id === ids.windmill) { sources.push([x, y, SOURCE_CAP.windmill]); windmills++; }
        else if (consumerId.has(id)) consumers.push([x, y]);
      }
    }

    // Flood-fill power lines into components.
    const comp = new Map();
    let cid = 0;
    for (const k of lines) {
      if (comp.has(k)) continue;
      const stack = [k];
      comp.set(k, cid);
      while (stack.length) {
        const [px, py] = unkey(stack.pop());
        for (const [dx, dy] of NEIGHBORS) {
          const nk = key(px + dx, py + dy);
          if (lines.has(nk) && !comp.has(nk)) { comp.set(nk, cid); stack.push(nk); }
        }
      }
      cid++;
    }

    // Assign each source/consumer to one component (smallest adjacent id) so
    // capacity and load are counted cleanly without double-billing.
    const pick = (x, y) => {
      let best;
      for (const [dx, dy] of NEIGHBORS) {
        const c = comp.get(key(x + dx, y + dy));
        if (c !== undefined && (best === undefined || c < best)) best = c;
      }
      return best;
    };

    const capacity = new Map();
    for (const [x, y, cap] of sources) {
      const c = pick(x, y);
      if (c !== undefined) capacity.set(c, (capacity.get(c) || 0) + cap);
    }
    const load = new Map();
    const consumerComp = [];
    for (const [x, y] of consumers) {
      const c = pick(x, y);
      consumerComp.push(c);
      if (c !== undefined) load.set(c, (load.get(c) || 0) + 1);
    }

    let poweredCount = 0;
    let wiredButUnpowered = 0;
    for (const c of consumerComp) {
      if (c === undefined) continue; // not on the grid at all
      if ((capacity.get(c) || 0) >= (load.get(c) || 0)) poweredCount++;
      else wiredButUnpowered++;
    }

    let totalCapacity = 0;
    for (const v of capacity.values()) totalCapacity += v;

    return {
      generators,
      windmills,
      sources: sources.length,
      lines: lines.size,
      capacity: totalCapacity,
      load: consumers.length,
      poweredCount,
      poweredFraction: poweredCount / Math.max(1, consumers.length),
      overloaded: wiredButUnpowered > 0,
    };
  }
}

function key(x, y) { return `${x},${y}`; }
function unkey(k) { const i = k.indexOf(','); return [+k.slice(0, i), +k.slice(i + 1)]; }
