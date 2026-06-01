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
  predator_migration: {
    id: 'predator_migration',
    icon: '🦖',
    label: 'Predator Migration',
    text: 'Hunters are moving through this region. Fire and high ground matter.',
  },
  alpha_predator: {
    id: 'alpha_predator',
    icon: '🦷',
    label: 'Alpha Predator',
    text: 'An alpha raptor is stalking the region. Bring fire, a spear, or a companion.',
  },
  grazer_herd: {
    id: 'grazer_herd',
    icon: '🌿',
    label: 'Grazer Herd',
    text: 'A peaceful herd passes nearby. Stay calm to earn their trust.',
  },
  drought: {
    id: 'drought',
    icon: '☀️',
    label: 'Drought',
    text: 'Food spoils faster. Store meals and plan the town.',
  },
  raider_scouts: {
    id: 'raider_scouts',
    icon: '⚔️',
    label: 'Raider Scouts',
    text: 'Scouts are probing the settlement. Walls and light discourage them.',
  },
  siege_raid: {
    id: 'siege_raid',
    icon: '🛡️',
    label: 'Siege Raid',
    text: 'A raiding party is testing the town defenses.',
  },
};

export class WorldEventLog {
  constructor(data = {}) {
    this.cooldowns = {
      meteor_shower: 70,
      predator_migration: 95,
      alpha_predator: 210,
      grazer_herd: 55,
      drought: 85,
      raider_scouts: 110,
      siege_raid: 220,
      ...(data.cooldowns || {}),
    };
    this.seen = new Set(data.seen || []);
    this.active = new Set(data.active || []);
    this.durations = { ...(data.durations || {}) };
    this._coldWasActive = this.active.has('cold_night');
  }

  update(game, dt) {
    const started = [];
    if (game.mode !== 'survival') {
      this.active.clear();
      return started;
    }
    this._tickDurations(dt);

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

      this.cooldowns.predator_migration -= dt;
      if (this.cooldowns.predator_migration <= 0 && game.dayFactor() < 0.65) {
        this.cooldowns.predator_migration = 150 + hash2(Math.floor(game.clock), 11, game.world.seed) * 80;
        this._activate('predator_migration', 35);
        this._spawnNear(game, hash2(Math.floor(game.clock), 12, game.world.seed) < 0.72 ? 'raptor' : 'rex');
        started.push(this._markSeen('predator_migration'));
      }

      this.cooldowns.alpha_predator -= dt;
      if (this.cooldowns.alpha_predator <= 0 && game.dayFactor() > 0.28) {
        this.cooldowns.alpha_predator = 260 + hash2(Math.floor(game.clock), 17, game.world.seed) * 130;
        this._activate('alpha_predator', 45);
        this._spawnNear(game, 'alpha_raptor');
        started.push(this._markSeen('alpha_predator'));
      }

      this.cooldowns.grazer_herd -= dt;
      if (this.cooldowns.grazer_herd <= 0 && game.dayFactor() > 0.45) {
        this.cooldowns.grazer_herd = 120 + hash2(Math.floor(game.clock), 13, game.world.seed) * 70;
        this._activate('grazer_herd', 30);
        this._spawnNear(game, hash2(Math.floor(game.clock), 14, game.world.seed) < 0.5 ? 'stego' : 'trike');
        started.push(this._markSeen('grazer_herd'));
      }
    } else if (game.eraId === 'bronze' || game.eraId === 'iron') {
      this._setActive('cold_night', false);

      this.cooldowns.drought -= dt;
      if (game.eraId === 'bronze' && this.cooldowns.drought <= 0) {
        this.cooldowns.drought = 160;
        this._activate('drought', 45);
        started.push(this._markSeen('drought'));
      }

      this.cooldowns.raider_scouts -= dt;
      if (this.cooldowns.raider_scouts <= 0 && game.dayFactor() < 0.5) {
        this.cooldowns.raider_scouts = 150;
        this._activate('raider_scouts', 40);
        this._spawnNear(game, game.eraId === 'iron' ? 'bandit' : 'raider');
        started.push(this._markSeen('raider_scouts'));
      }

      this.cooldowns.siege_raid -= dt;
      if (game.eraId === 'iron' && this.cooldowns.siege_raid <= 0 && game.dayFactor() < 0.55) {
        this.cooldowns.siege_raid = 280;
        this._activate('siege_raid', 50);
        if (game.spawnSiege) game.spawnSiege('bandit', game._hasTownDefense?.() ? 2 : 3);
        else this._spawnNear(game, 'bandit');
        started.push(this._markSeen('siege_raid'));
      }
    } else {
      for (const id of ['cold_night', 'predator_migration', 'alpha_predator', 'grazer_herd', 'drought', 'raider_scouts', 'siege_raid']) {
        this._setActive(id, false);
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
      durations: this.durations,
    };
  }

  _setActive(id, on) {
    if (on) this.active.add(id);
    else this.active.delete(id);
  }

  _activate(id, seconds) {
    this.active.add(id);
    this.durations[id] = seconds;
  }

  _tickDurations(dt) {
    for (const [id, remaining] of Object.entries(this.durations)) {
      const next = remaining - dt;
      if (next <= 0) {
        delete this.durations[id];
        this.active.delete(id);
      } else {
        this.durations[id] = next;
      }
    }
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

  _spawnNear(game, type) {
    if (!game.spawnMobNearPlayer) return;
    game.spawnMobNearPlayer(type);
  }
}
