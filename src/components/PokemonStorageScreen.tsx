import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { calculateHP, MAX_LEVEL, powerUpCost } from '../data/cpTable';
import { getSpecies, TYPE_COLORS } from '../data/pokemonDatabase';
import PokemonSprite from './PokemonSprite';
import type { CandyBag, OwnedPokemon } from '../types';

interface PokemonStorageScreenProps {
  onClose: () => void;
  owned: OwnedPokemon[];
  candies: CandyBag;
  stardust: number;
  onEvolve: (uid: string, toSpeciesId: number, candyCost: number) => Promise<boolean>;
  onPowerUp: (uid: string) => Promise<boolean>;
  onToggleFavorite: (uid: string) => Promise<void>;
}

type StorageTab = 'tags' | 'pokemon' | 'eggs';
type SortKey = 'recent' | 'favorite' | 'number' | 'hp' | 'name' | 'cp';

const STORAGE_CAP = 300;
const TABS: { id: StorageTab; label: string }[] = [{ id: 'tags', label: 'Tags' }, { id: 'pokemon', label: 'Pokémon' }, { id: 'eggs', label: 'Eggs' }];
const SORTS: { id: SortKey; label: string }[] = [{ id: 'recent', label: 'Recent' }, { id: 'favorite', label: 'Favorite' }, { id: 'number', label: 'Number' }, { id: 'hp', label: 'HP' }, { id: 'name', label: 'Name' }, { id: 'cp', label: 'CP' }];

const Star = ({ filled = false, className = 'h-5 w-5' }: { filled?: boolean; className?: string }) => <svg viewBox="0 0 24 24" className={className}><path d="m12 2.7 2.8 5.9 6.5.8-4.7 4.5 1.2 6.4-5.8-3.1-5.8 3.1 1.2-6.4-4.7-4.5 6.5-.8L12 2.7Z" fill={filled ? '#f4c247' : 'none'} stroke={filled ? '#d79520' : 'currentColor'} strokeWidth="1.5" /></svg>;

const PokemonStorageScreen: React.FC<PokemonStorageScreenProps> = ({ onClose, owned, candies, stardust, onEvolve, onPowerUp, onToggleFavorite }) => {
  const [tab, setTab] = useState<StorageTab>('pokemon');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [descending, setDescending] = useState(true);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = owned.filter((pokemon) => {
      const species = getSpecies(pokemon.speciesId);
      if (!species) return false;
      return !normalized || species.name.toLowerCase().includes(normalized) || `${species.id}`.includes(normalized) || `cp${pokemon.cp}`.includes(normalized.replace(/\s/g, ''));
    });
    result.sort((a, b) => {
      const speciesA = getSpecies(a.speciesId);
      const speciesB = getSpecies(b.speciesId);
      let value = 0;
      if (sortKey === 'recent') value = a.caughtAt - b.caughtAt;
      if (sortKey === 'favorite') value = Number(!!a.favorite) - Number(!!b.favorite);
      if (sortKey === 'number') value = a.speciesId - b.speciesId;
      if (sortKey === 'hp') value = (speciesA?.baseStats.stamina ?? 0) - (speciesB?.baseStats.stamina ?? 0);
      if (sortKey === 'name') value = (speciesA?.name ?? '').localeCompare(speciesB?.name ?? '');
      if (sortKey === 'cp') value = a.cp - b.cp;
      return descending ? -value : value;
    });
    return result;
  }, [owned, query, sortKey, descending]);

  const selected = selectedUid ? owned.find((pokemon) => pokemon.uid === selectedUid) : undefined;
  const species = selected ? getSpecies(selected.speciesId) : undefined;
  const candyCount = species ? candies[species.family] ?? 0 : 0;
  const evolution = species?.evolutions[0];
  const powerCost = selected ? powerUpCost(selected.level) : null;

  return (
    <motion.div initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }} className="absolute inset-0 z-[700] flex flex-col overflow-hidden bg-[#f5f7f8] text-[#3d5664]">
      <header className="shrink-0 bg-[linear-gradient(180deg,#126070,#0d4052)] px-4 pb-0 pt-[max(18px,env(safe-area-inset-top))] text-white shadow-md">
        <div className="flex h-14 items-center justify-between">
          <button type="button" onClick={() => setSearchOpen(!searchOpen)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10" aria-label="Search Pokémon"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg></button>
          <h1 className="text-[25px] font-black uppercase tracking-[0.17em]">Pokémon</h1>
          <span className="min-w-[58px] text-right text-sm font-black">{owned.length}/{STORAGE_CAP}</span>
        </div>
        <nav className="grid grid-cols-3">
          {TABS.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`relative h-12 text-xs font-black uppercase tracking-[0.12em] ${tab === item.id ? 'text-white' : 'text-white/55'}`}>{item.label}{tab === item.id && <motion.span layoutId="storage-tab" className="absolute inset-x-4 bottom-0 h-1 rounded-t-full bg-white" />}</button>)}
        </nav>
      </header>

      <AnimatePresence initial={false}>
        {searchOpen && <motion.div initial={{ height: 0 }} animate={{ height: 58 }} exit={{ height: 0 }} className="shrink-0 overflow-hidden border-b border-[#d9e0e4] bg-white"><div className="mx-4 mt-2.5 flex h-10 items-center gap-2 rounded-full bg-[#edf1f3] px-4"><svg viewBox="0 0 24 24" className="h-5 w-5 text-[#78909b]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></div></motion.div>}
      </AnimatePresence>

      {tab === 'pokemon' && <>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#dfe5e8] bg-white px-4 shadow-sm">
          <button type="button" onClick={() => setSortOpen(!sortOpen)} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[#677f8a]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M7 12h10M10 17h4" /></svg>Sort</button>
          <button type="button" onClick={() => setDescending(!descending)} className="rounded-full bg-[#168596] px-5 py-2 text-xs font-black uppercase tracking-[0.08em] text-white">{SORTS.find((item) => item.id === sortKey)?.label} {descending ? '↓' : '↑'}</button>
          <span className="w-10" />
        </div>
        <AnimatePresence>{sortOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="z-10 overflow-hidden border-b border-[#dfe5e8] bg-white"><div className="grid grid-cols-3 gap-2 p-3">{SORTS.map((item) => <button key={item.id} type="button" onClick={() => { setSortKey(item.id); setSortOpen(false); }} className={`rounded-full px-3 py-2 text-[10px] font-black uppercase ${sortKey === item.id ? 'bg-[#168596] text-white' : 'bg-[#edf1f3] text-[#708690]'}`}>{item.label}</button>)}</div></motion.div>}</AnimatePresence>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f8] pb-24">
          <div className="grid grid-cols-3 border-l border-t border-[#e0e5e7]">
            {sorted.map((pokemon) => {
              const item = getSpecies(pokemon.speciesId);
              if (!item) return null;
              const color = TYPE_COLORS[item.types[0]];
              return <button key={pokemon.uid} type="button" onClick={() => setSelectedUid(pokemon.uid)} className="relative flex aspect-[.86] flex-col items-center border-b border-r border-[#e0e5e7] bg-white px-1.5 pb-2 pt-2 active:bg-[#edf7f7]">
                <p className="text-[11px] font-black text-[#4c6370]">CP {pokemon.cp}</p>
                {pokemon.favorite && <Star filled className="absolute right-2 top-2 h-4 w-4" />}
                <div className="relative flex min-h-0 w-full flex-1 items-center justify-center"><div className="absolute bottom-2 h-10 w-20 rounded-[50%] opacity-12" style={{ background: color }} /><PokemonSprite id={item.id} name={item.name} className="relative max-h-full max-w-full object-contain drop-shadow-md" /></div>
                <p className="w-full truncate text-center text-[12px] font-black text-[#405865]">{item.name}</p>
                <div className="mt-1 h-1 w-[82%] overflow-hidden rounded-full bg-[#e5eaec]"><div className="h-full rounded-full bg-[#50b8a4]" style={{ width: `${Math.min(100, pokemon.level / MAX_LEVEL * 100)}%` }} /></div>
              </button>;
            })}
          </div>
          {sorted.length === 0 && <div className="py-20 text-center"><p className="font-black">No Pokémon found</p><p className="mt-2 text-sm text-[#7e939c]">Try another search.</p></div>}
        </div>
      </>}

      {tab === 'tags' && <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-24"><div className="grid grid-cols-2 gap-3">{[['Favorites', '#e5ad36', owned.filter((p) => p.favorite).length], ['Battle', '#7665aa', 0], ['Trade', '#43a8a4', 0], ['Power Up', '#da6f6c', 0]].map(([name, color, count]) => <button key={String(name)} type="button" className="overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-[#e0e7e8]"><div className="h-3" style={{ background: String(color) }} /><div className="p-4"><p className="font-black">{name}</p><p className="mt-1 text-xs font-bold text-[#83969d]">{count} Pokémon</p></div></button>)}</div><button type="button" className="mt-5 h-12 w-full rounded-full bg-[#168596] text-sm font-black uppercase tracking-[0.14em] text-white">Create a new tag</button></div>}

      {tab === 'eggs' && <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-24 text-center"><div className="mx-auto mt-10 grid max-w-sm grid-cols-3 gap-5">{[2, 5, 10].map((distance) => <div key={distance} className="flex flex-col items-center"><div className="flex h-24 w-20 items-center justify-center rounded-[50%] bg-[radial-gradient(circle_at_35%_25%,#fff,#e3e9dc_60%,#b9c9b8)] shadow-md"><span className="text-lg font-black text-[#6f8d78]">{distance}</span></div><p className="mt-3 text-xs font-black">{distance} km Egg</p></div>)}</div><p className="mx-auto mt-10 max-w-xs text-sm leading-6 text-[#7c929a]">Walk with an Egg in an Incubator to discover what will hatch.</p></div>}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#f5f7f8] via-[#f5f7f8]/96 to-transparent pb-[max(18px,env(safe-area-inset-bottom))] pt-10"><button type="button" onClick={onClose} className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#168596] bg-white text-[#168596] shadow-xl ring-4 ring-white/80" aria-label="Close Pokémon storage"><svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg></button></div>

      <AnimatePresence>{selected && species && <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: .22 }} className="absolute inset-0 z-40 overflow-y-auto bg-white text-[#3d5664]">
        <div className="absolute inset-x-0 top-0 h-[48vh] opacity-30" style={{ background: `linear-gradient(180deg,${TYPE_COLORS[species.types[0]]},#e9f7f2 62%,white)` }} />
        <header className="relative z-10 flex items-center justify-between px-4 pt-[max(18px,env(safe-area-inset-top))]"><button type="button" onClick={() => setSelectedUid(null)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/78 shadow"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6" /></svg></button><button type="button" onClick={() => void onToggleFavorite(selected.uid)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/78 shadow"><Star filled={!!selected.favorite} className="h-7 w-7" /></button></header>
        <div className="relative z-10 flex h-72 flex-col items-center justify-center"><div className="absolute top-8 rounded-full bg-white/78 px-5 py-1.5 shadow-sm"><span className="text-xs font-black text-[#71858e]">CP </span><span className="text-2xl font-black">{selected.cp}</span></div><svg viewBox="0 0 280 140" className="absolute top-4 h-36 w-72 opacity-70"><path d="M20 130A120 120 0 0 1 260 130" fill="none" stroke="white" strokeWidth="4" /><circle cx="140" cy="10" r="5" fill="white" /></svg><PokemonSprite id={species.id} name={species.name} variant="artwork" className="mt-14 h-52 w-[75%] object-contain drop-shadow-xl" /></div>
        <section className="relative z-10 rounded-t-[34px] bg-white px-5 pb-[max(30px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-10px_30px_rgba(42,82,80,.08)]"><h2 className="text-center text-3xl font-black tracking-tight">{species.name}</h2><p className="mt-1 text-center text-xs font-bold text-[#81939a]">HP {calculateHP(species.baseStats.stamina, selected.level, selected.ivs.stamina)} / {calculateHP(species.baseStats.stamina, selected.level, selected.ivs.stamina)}</p><div className="mt-5 grid grid-cols-3 divide-x divide-[#e2e8e9] rounded-2xl bg-[#f5f8f8] py-4"><div className="text-center"><p className="font-black">{species.weightKg} kg</p><p className="text-[9px] font-bold uppercase text-[#8a9ba1]">Weight</p></div><div className="text-center"><p className="font-black">{species.types[0]}</p><p className="text-[9px] font-bold uppercase text-[#8a9ba1]">Type</p></div><div className="text-center"><p className="font-black">{species.heightM} m</p><p className="text-[9px] font-bold uppercase text-[#8a9ba1]">Height</p></div></div><div className="mt-5 flex justify-around rounded-2xl border border-[#e2e8e9] py-3"><div><p className="text-[10px] font-bold uppercase text-[#8a9ba1]">Stardust</p><p className="font-black">{stardust.toLocaleString()}</p></div><div><p className="text-[10px] font-bold uppercase text-[#8a9ba1]">Candy</p><p className="font-black">{candyCount}</p></div></div>{powerCost && <button type="button" disabled={selected.level >= MAX_LEVEL} onClick={() => void onPowerUp(selected.uid)} className="mt-4 h-13 w-full rounded-full bg-[#36bfa8] py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white disabled:opacity-40">Power up · {powerCost.stardust} Stardust</button>}{evolution && <button type="button" onClick={() => void onEvolve(selected.uid, evolution.toId, evolution.candyCost)} className="mt-3 h-13 w-full rounded-full border-2 border-[#36bfa8] bg-white py-3 text-sm font-black uppercase tracking-[0.14em] text-[#299783]">Evolve · {evolution.candyCost} Candy</button>}</section>
      </motion.div>}</AnimatePresence>
    </motion.div>
  );
};

export default PokemonStorageScreen;
