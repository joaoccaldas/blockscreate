/**
 * Timed powerups.
 *
 * Powerups are intentionally tiny data objects with effects queried by the
 * game loop. Hidden discoveries and future relic pickups can grant the same
 * buffs without coupling those systems together.
 */
export const POWERUPS = {
  builders_glove: {
    id: 'builders_glove',
    icon: '🧤',
    label: "Builder's Glove",
    seconds: 90,
    effects: { reach: 1.6 },
  },
  miners_charm: {
    id: 'miners_charm',
    icon: '⛏️',
    label: "Miner's Charm",
    seconds: 75,
    effects: { miningSpeed: 1.45 },
  },
  feast: {
    id: 'feast',
    icon: '🍗',
    label: 'Feast',
    seconds: 120,
    effects: { hungerDrain: 0.45 },
  },
  architects_eye: {
    id: 'architects_eye',
    icon: '👁️',
    label: "Architect's Eye",
    seconds: 120,
    effects: { structureScan: 1 },
  },
  time_shard: {
    id: 'time_shard',
    icon: '🌀',
    label: 'Time Shard',
    seconds: 45,
    effects: { cpMultiplier: 1.25 },
  },
  ember_heart: {
    id: 'ember_heart',
    icon: '🔥',
    label: 'Ember Heart',
    seconds: 150,
    effects: { warmth: 1, hungerDrain: 0.75 },
  },
  fossil_charm: {
    id: 'fossil_charm',
    icon: '🦴',
    label: 'Fossil Charm',
    seconds: 120,
    effects: { predatorDamage: 0.7 },
  },
  meteor_pick: {
    id: 'meteor_pick',
    icon: '☄️',
    label: 'Meteor Pick',
    seconds: 90,
    effects: { miningSpeed: 1.7, cpMultiplier: 1.15 },
  },
  city_planner: {
    id: 'city_planner',
    icon: '🏛️',
    label: 'City Planner',
    seconds: 150,
    effects: { structureScan: 1, cpMultiplier: 1.1 },
  },
  granary_feast: {
    id: 'granary_feast',
    icon: '🏺',
    label: 'Granary Feast',
    seconds: 150,
    effects: { hungerDrain: 0.55 },
  },
};

export class PowerupManager {
  constructor(active = []) {
    this.active = new Map();
    for (const p of active) this.grant(p.id, p.remaining ?? p.seconds, { silent: true });
  }

  grant(id, seconds = null, { silent = false } = {}) {
    const def = POWERUPS[id];
    if (!def) return null;
    const remaining = seconds ?? def.seconds;
    const prev = this.active.get(id);
    const next = { ...def, remaining: Math.max(prev?.remaining || 0, remaining), fresh: !silent };
    this.active.set(id, next);
    return next;
  }

  update(dt) {
    for (const [id, p] of this.active) {
      p.remaining -= dt;
      p.fresh = false;
      if (p.remaining <= 0) this.active.delete(id);
    }
  }

  value(effect, fallback = 0) {
    let v = fallback;
    for (const p of this.active.values()) {
      if (p.effects[effect] == null) continue;
      v = Math.max(v, p.effects[effect]);
    }
    return v;
  }

  multiplier(effect) {
    let v = 1;
    for (const p of this.active.values()) {
      if (p.effects[effect] != null) v *= p.effects[effect];
    }
    return v;
  }

  list() {
    return [...this.active.values()].sort((a, b) => b.remaining - a.remaining);
  }

  serialize() {
    return this.list().map((p) => ({ id: p.id, remaining: p.remaining }));
  }
}
