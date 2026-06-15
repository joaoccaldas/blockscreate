import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getMoveset } from '../data/moves';
import { getSpecies, POKEMON_DATABASE, TYPE_COLORS } from '../data/pokemonDatabase';
import PokemonSprite from './PokemonSprite';
import type { CandyBag, OwnedPokemon } from '../types';

interface PokedexScreenProps {
  onClose: () => void;
  owned: OwnedPokemon[];
  candies: CandyBag;
  seen: number[];
  onEvolve: (uid: string, toSpeciesId: number, candyCost: number) => Promise<boolean>;
}

type DexFilter = 'all' | 'caught' | 'seen' | 'missing';
type DetailTab = 'caught' | 'info' | 'battle';

const REGIONS = [
  { id: 1, name: 'Kanto', color: '#ea765d' },
  { id: 2, name: 'Johto', color: '#e7ad4b' },
  { id: 3, name: 'Hoenn', color: '#4ca5be' },
  { id: 4, name: 'Sinnoh', color: '#8c78bd' },
  { id: 5, name: 'Unova', color: '#687e8c' },
  { id: 6, name: 'Kalos', color: '#4ea693' },
  { id: 7, name: 'Alola', color: '#df8ba0' },
  { id: 8, name: 'Galar', color: '#6f8fd2' },
  { id: 9, name: 'Paldea', color: '#d98656' },
];

const FILTERS: { id: DexFilter; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'caught', label: 'Caught' }, { id: 'seen', label: 'Seen' }, { id: 'missing', label: 'Missing' }];

const PokedexScreen: React.FC<PokedexScreenProps> = ({ onClose, owned, candies, seen, onEvolve }) => {
  const [region, setRegion] = useState(1);
  const [filter, setFilter] = useState<DexFilter>('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('info');
  const [extraDexOpen, setExtraDexOpen] = useState(false);

  const seenSet = useMemo(() => new Set([...seen, ...owned.map((pokemon) => pokemon.speciesId)]), [seen, owned]);
  const ownedBySpecies = useMemo(() => {
    const map = new Map<number, OwnedPokemon[]>();
    owned.forEach((pokemon) => map.set(pokemon.speciesId, [...(map.get(pokemon.speciesId) ?? []), pokemon].sort((a, b) => b.cp - a.cp)));
    return map;
  }, [owned]);

  const entries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return POKEMON_DATABASE.filter((species) => {
      const caught = ownedBySpecies.has(species.id);
      const wasSeen = seenSet.has(species.id);
      if (species.generation !== region) return false;
      if (filter === 'caught' && !caught) return false;
      if (filter === 'seen' && !wasSeen) return false;
      if (filter === 'missing' && wasSeen) return false;
      return !normalized || species.name.toLowerCase().includes(normalized) || `${species.id}`.includes(normalized);
    });
  }, [region, filter, query, ownedBySpecies, seenSet]);

  const selectedSpecies = selectedId ? getSpecies(selectedId) : undefined;
  const selectedOwned = selectedId ? ownedBySpecies.get(selectedId) ?? [] : [];
  const bestOwned = selectedOwned[0];
  const moves = selectedSpecies ? getMoveset(selectedSpecies.types) : null;
  const caughtCount = ownedBySpecies.size;
  const seenCount = seenSet.size;
  const activeRegion = REGIONS.find((item) => item.id === region) ?? REGIONS[0];
  const regionSpecies = POKEMON_DATABASE.filter((species) => species.generation === region);
  const regionCaught = regionSpecies.filter((species) => ownedBySpecies.has(species.id)).length;

  return (
    <motion.div initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }} className="absolute inset-0 z-[700] flex flex-col overflow-hidden bg-[linear-gradient(180deg,#d6eef1,#ecf6f4_52%,#d5ebe7)] text-[#385d65]">
      <header className="shrink-0 bg-[linear-gradient(180deg,#16788a,#105467)] px-4 pb-3 pt-[max(18px,env(safe-area-inset-top))] text-white shadow-md">
        <div className="flex h-14 items-center justify-between">
          <button type="button" onClick={() => setSearchOpen(!searchOpen)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10" aria-label="Search Pokédex"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg></button>
          <h1 className="text-[25px] font-black uppercase tracking-[0.16em]">Pokédex</h1>
          <button type="button" onClick={() => setExtraDexOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10" aria-label="Extra Pokédexes"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/12 px-4 py-2 ring-1 ring-white/15"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/62">Caught</p><p className="text-xl font-black">{caughtCount}</p></div>
          <div className="rounded-xl bg-white/12 px-4 py-2 ring-1 ring-white/15"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/62">Seen</p><p className="text-xl font-black">{seenCount}</p></div>
        </div>
      </header>

      <AnimatePresence initial={false}>{searchOpen && <motion.div initial={{ height: 0 }} animate={{ height: 58 }} exit={{ height: 0 }} className="shrink-0 overflow-hidden bg-white/94"><div className="mx-4 mt-2.5 flex h-10 items-center gap-2 rounded-full bg-[#e8eff0] px-4"><svg viewBox="0 0 24 24" className="h-5 w-5 text-[#789499]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or number" className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></div></motion.div>}</AnimatePresence>

      <div className="shrink-0 border-b border-white/80 bg-white/65 px-3 py-3 backdrop-blur">
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {REGIONS.map((item) => {
            const caught = POKEMON_DATABASE.filter((species) => species.generation === item.id && ownedBySpecies.has(species.id)).length;
            const total = POKEMON_DATABASE.filter((species) => species.generation === item.id).length;
            return <button key={item.id} type="button" onClick={() => setRegion(item.id)} className={`flex min-w-[76px] flex-col items-center rounded-2xl px-2 py-2 transition ${region === item.id ? 'bg-white shadow-md ring-1 ring-white' : 'opacity-65'}`}><span className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white text-[11px] font-black text-white shadow-sm" style={{ background: item.color }}>{item.id}</span><span className="mt-1 text-[10px] font-black uppercase tracking-wide">{item.name}</span><span className="text-[8px] font-bold text-[#7e989c]">{caught}/{total}</span></button>;
          })}
        </div>
        <div className="mt-3 flex justify-center gap-2">{FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${filter === item.id ? 'bg-[#1a8995] text-white shadow' : 'bg-white/75 text-[#68878b]'}`}>{item.label}</button>)}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-28 pt-4">
        <div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7d9a9c]">Region</p><h2 className="text-xl font-black">{activeRegion.name}</h2></div><p className="text-sm font-black text-[#5f8185]">{regionCaught}/{regionSpecies.length}</p></div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-3">
          {entries.map((species) => {
            const caught = ownedBySpecies.get(species.id);
            const wasSeen = seenSet.has(species.id);
            return <motion.button key={species.id} type="button" whileTap={{ scale: .96 }} onClick={() => wasSeen && setSelectedId(species.id)} disabled={!wasSeen} className="relative flex aspect-[.83] flex-col items-center overflow-hidden rounded-[18px] bg-white/76 px-1.5 pb-2 pt-2 shadow-sm ring-1 ring-white/90">
              <span className="text-[9px] font-black text-[#6b898d]">{species.id.toString().padStart(3, '0')}</span>
              <div className="relative flex min-h-0 w-full flex-1 items-center justify-center"><div className="absolute bottom-2 h-12 w-20 rounded-[50%] bg-[#8fbcb8]/13" />{caught ? <PokemonSprite id={species.id} name={species.name} className="relative max-h-full max-w-full object-contain drop-shadow" /> : wasSeen ? <PokemonSprite id={species.id} name={species.name} className="relative max-h-full max-w-full object-contain [filter:brightness(0)_opacity(.4)]" /> : <span className="text-3xl font-black text-[#a8c1c2]">?</span>}</div>
              <p className={`w-full truncate text-center text-[10px] font-black ${wasSeen ? 'text-[#41636a]' : 'text-[#9db3b5]'}`}>{wasSeen ? species.name : 'Unknown'}</p>
              {caught && caught.length > 1 && <span className="absolute right-1.5 top-1.5 rounded-full bg-[#177c88] px-1.5 py-0.5 text-[8px] font-black text-white">×{caught.length}</span>}
            </motion.button>;
          })}
        </div>
        {entries.length === 0 && <div className="py-20 text-center"><p className="font-black">No entries found</p><p className="mt-2 text-sm text-[#779397]">Change the region, filter or search.</p></div>}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#d5ebe7] via-[#d5ebe7]/96 to-transparent pb-[max(18px,env(safe-area-inset-bottom))] pt-10"><button type="button" onClick={onClose} className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#168596] bg-white text-[#168596] shadow-xl ring-4 ring-white/80" aria-label="Close Pokédex"><svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg></button></div>

      <AnimatePresence>{extraDexOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExtraDexOpen(false)} className="absolute inset-0 z-30 flex items-end bg-[#163e46]/38 px-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[2px]"><motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={(event) => event.stopPropagation()} className="w-full rounded-[28px] bg-white p-5 shadow-2xl"><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d8e1e2]" /><h2 className="text-center text-xl font-black">Select Pokédex</h2><div className="mt-5 grid grid-cols-2 gap-3">{['Standard', 'Shiny', 'Lucky', 'Perfect', 'Shadow', 'Dynamax'].map((name, index) => <button key={name} type="button" onClick={() => setExtraDexOpen(false)} className={`rounded-2xl p-4 text-left ring-1 ${index === 0 ? 'bg-[#e8f5f3] text-[#167d87] ring-[#cce8e5]' : 'bg-[#f5f7f7] text-[#71888d] ring-[#e5eaeb]'}`}><p className="font-black">{name}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide">{index === 0 ? 'Active' : 'Collection view'}</p></button>)}</div></motion.section></motion.div>}</AnimatePresence>

      <AnimatePresence>{selectedSpecies && seenSet.has(selectedSpecies.id) && <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: .22 }} className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-white text-[#3b5962]">
        <div className="relative h-[43%] shrink-0 overflow-hidden" style={{ background: `linear-gradient(180deg,${TYPE_COLORS[selectedSpecies.types[0]]}bb,#dff1ed)` }}><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,.76),transparent_48%)]" /><header className="relative z-10 flex items-center justify-between px-4 pt-[max(18px,env(safe-area-inset-top))]"><button type="button" onClick={() => setSelectedId(null)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/72 shadow"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6" /></svg></button><span className="rounded-full bg-white/65 px-4 py-2 text-xs font-black">#{selectedSpecies.id.toString().padStart(3, '0')}</span><span className="h-11 w-11" /></header><div className="relative z-10 flex h-[calc(100%-60px)] items-center justify-center"><PokemonSprite id={selectedSpecies.id} name={selectedSpecies.name} variant="artwork" className={`h-[88%] w-[78%] object-contain drop-shadow-xl ${bestOwned ? '' : '[filter:brightness(0)_opacity(.5)]'}`} /></div></div>
        <section className="relative -mt-5 min-h-0 flex-1 overflow-y-auto rounded-t-[30px] bg-white px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-10px_28px_rgba(30,74,74,.1)]"><h2 className="text-center text-3xl font-black">{selectedSpecies.name}</h2><div className="mt-4 grid grid-cols-3 border-b border-[#e2e8e9]">{(['caught', 'info', 'battle'] as DetailTab[]).map((tab) => <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={`relative h-11 text-[10px] font-black uppercase tracking-[0.12em] ${detailTab === tab ? 'text-[#177f88]' : 'text-[#8b9ca1]'}`}>{tab}{detailTab === tab && <motion.span layoutId="dex-detail-tab" className="absolute inset-x-4 bottom-0 h-1 rounded-t-full bg-[#188894]" />}</button>)}</div>
          {detailTab === 'info' && <div className="pt-5"><div className="flex justify-center gap-2">{selectedSpecies.types.map((type) => <span key={type} className="rounded-full px-4 py-1.5 text-[10px] font-black uppercase text-white" style={{ background: TYPE_COLORS[type] }}>{type}</span>)}</div><div className="mt-5 grid grid-cols-3 divide-x divide-[#e1e8e9] rounded-2xl bg-[#f4f7f7] py-4"><div className="text-center"><p className="font-black">{selectedSpecies.weightKg} kg</p><p className="text-[9px] font-bold uppercase text-[#8b9ca1]">Weight</p></div><div className="text-center"><p className="font-black">{selectedSpecies.rarity}</p><p className="text-[9px] font-bold uppercase text-[#8b9ca1]">Rarity</p></div><div className="text-center"><p className="font-black">{selectedSpecies.heightM} m</p><p className="text-[9px] font-bold uppercase text-[#8b9ca1]">Height</p></div></div><p className="mt-5 text-center text-sm leading-6 text-[#778e94]">This Pokémon has been registered in the {activeRegion.name} Pokédex.</p></div>}
          {detailTab === 'caught' && <div className="pt-5"><div className="rounded-2xl bg-[#f4f7f7] p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a9ca1]">Caught</p><p className="mt-1 text-2xl font-black">{selectedOwned.length}</p><p className="mt-1 text-xs text-[#7a9197]">{bestOwned ? `Best CP ${bestOwned.cp}` : 'Seen, but not caught yet'}</p></div>{bestOwned && selectedSpecies.evolutions[0] && <button type="button" onClick={() => void onEvolve(bestOwned.uid, selectedSpecies.evolutions[0].toId, selectedSpecies.evolutions[0].candyCost)} className="mt-4 h-13 w-full rounded-full bg-[#35bba5] py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white">Evolve · {selectedSpecies.evolutions[0].candyCost} Candy</button>}<p className="mt-3 text-center text-xs font-bold text-[#82969b]">Candy: {candies[selectedSpecies.family] ?? 0}</p></div>}
          {detailTab === 'battle' && moves && <div className="space-y-3 pt-5">{[[moves.fast.name, 'Fast Attack', moves.fast.type], [moves.charged.name, 'Charged Attack', moves.charged.type]].map(([name, label, type]) => <div key={name} className="flex items-center justify-between rounded-2xl border border-[#e1e8e9] p-4"><div><p className="font-black">{name}</p><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a9ca1]">{label}</p></div><span className="rounded-full px-3 py-1 text-[10px] font-black uppercase text-white" style={{ background: TYPE_COLORS[type as keyof typeof TYPE_COLORS] }}>{type}</span></div>)}</div>}
        </section>
      </motion.div>}</AnimatePresence>
    </motion.div>
  );
};

export default PokedexScreen;
