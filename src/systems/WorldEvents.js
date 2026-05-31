/**
 * Era world events and hazards.
 *
 * Events make history happen to the player instead of only appearing as text.
 * The first implementation focuses on the Age of Dinosaurs: cold nights force
 * shelter and fire to matter, while meteor showers seed alternate-history clues.
 */
import { blockId } from '../core/blocks.js';
import { hash2 } from '../world/noise.js';

export const WORLD_EVENTS = {
  cold_night: {
    id: 'cold_night',
    icon: '❄️',
    label: 'Cold Night',
    text: 'Night cold bites. Shelter, torches and campfires protect you.',
  },
  meteor_shower: {
    id: 'meteor_shower',
    icon: '☄️',
    label: 'Meteor Shower',
    text: 'A shard from deep time has fallen nearby.',
  },
};

export class WorldEventLog {
  constructor(data = {}) {
    this.cooldowns = { meteor_shower: 70, ...(data.cooldowns || {}) };
    this.seen = new Set(data.seen || []);
    this.active = new Set(data.active || []);
    this._coldWasActive = this.active.has('cold_night');
  }

  update(game, dt) {
    const started = [];
    if (game.mode !== 'survival') {
      this.active.clear();
      return started;
    }

    if (game.eraId === 'stone') {
      const cold = game.dayFactor() < 0.22;
      this._setActive('cold_night', cold);
      if (cold && !this._coldWasActive) started.push(this._markSeen('cold_night'));
      this._coldWasActive = cold;

      this.cooldowns.meteor_shower -= dt;
      if (this.cooldowns.meteor_shower <= 0 && game.dayFactor() < 0.42) {
        this.cooldowns.meteor_shower = 180;
        this._dropMeteorShard(game);
        started.push(this._markSeen('meteor_shower'));
      }
    }

    return started.filter(Boolean);
  }

  isActive(id) { return this.active.has(id); }
  listActive() { return [...this.active].map((id) => WORLD_EVENTS[id]).filter(Boolean); }
  listSeen() { return [...this.seen].map((id) => WORLD_EVENTS[id]).filter(Boolean); }

  serialize() {
    return {
      cooldowns: this.cooldowns,
      seen: [...this.seen],
      active: [...this.active],
    };
  }

  _setActive(id, on) {
    if (on) this.active.add(id);
    else this.active.delete(id);
  }

  _markSeen(id) {
    this.seen.add(id);
    return WORLD_EVENTS[id] || null;
  }

  _dropMeteorShard(game) {
    const world = game.world;
    const base = Math.floor(game.player.x);
    const offset = 8 + Math.floor(hash2(world.globalX(base), Math.floor(game.clock), world.seed + 5151) * 18);
    const dir = hash2(world.globalX(base), 99, world.seed + 5252) < 0.5 ? -1 : 1;
    const x = Math.max(3, Math.min(world.width - 4, base + offset * dir));
    const surf = world.heightMap[x];
    const y = Math.max(2, surf - 1);
    world.set(x, y, blockId('meteor_shard'));
    game.particles?.fountain(x + 0.5, y, ['#8e6bd6', '#f4d24a', '#fff'], 26);
  }
}
