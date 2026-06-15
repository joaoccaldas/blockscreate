import { useMemo, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import type { Pokestop } from '../types';
import { useInventory } from '../hooks/useInventory';

interface PokestopScreenProps {
  pokestop: Pokestop;
  isSpinable: boolean;
  onClose: () => void;
  onSpin: (id: string) => void;
}

const ITEM_SPRITE_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/';

const stopName = (id: string) => {
  const words = id.replace(/[-_]/g, ' ').replace(/\d+/g, '').trim();
  return words ? words.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Neighbourhood Landmark';
};

const PhotoScene = ({ used }: { used: boolean }) => (
  <div className="absolute inset-[12px] overflow-hidden rounded-full bg-[#9ed9e2]">
    <div className="absolute inset-x-0 top-0 h-[48%] bg-[linear-gradient(180deg,#7cc9df,#d8f1ed)]" />
    <div className="absolute inset-x-[-12%] bottom-[17%] h-[38%] rounded-[50%] bg-[#8acb84]" />
    <div className="absolute inset-x-[-18%] bottom-[-7%] h-[42%] rounded-[50%] bg-[#57a76d]" />
    <div className="absolute bottom-[12%] left-1/2 h-[48%] w-[23%] -translate-x-1/2 rounded-t-full bg-[#e8e2cc] shadow-[inset_0_0_0_3px_rgba(85,109,102,.2)]" />
    <div className="absolute bottom-[35%] left-1/2 h-[26%] w-[44%] -translate-x-1/2 rounded-t-[45%] border-[5px] border-[#466d68] bg-[#f4d36c]" />
    <div className="absolute bottom-[35%] left-1/2 h-[17%] w-[10%] -translate-x-1/2 rounded-t-full bg-[#5c7c73]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,.72),transparent_44%)]" />
    {used && <div className="absolute inset-0 bg-[#654692]/42 mix-blend-multiply" />}
  </div>
);

const PokestopScreen: React.FC<PokestopScreenProps> = ({ pokestop, isSpinable, onClose, onSpin }) => {
  const [spinning, setSpinning] = useState(false);
  const [rewards, setRewards] = useState<{ pokeballs: number; razzBerries: number; xp: number } | null>(null);
  const { addItems } = useInventory();
  const name = useMemo(() => stopName(pokestop.id), [pokestop.id]);

  const handleSpin = async () => {
    if (!isSpinable || spinning || rewards) return;
    setSpinning(true);
    const newPokeballs = Math.floor(Math.random() * 4) + 2;
    const newBerries = Math.floor(Math.random() * 2) + 1;
    const xp = 50;

    await new Promise((resolve) => window.setTimeout(resolve, 850));
    setRewards({ pokeballs: newPokeballs, razzBerries: newBerries, xp });
    await addItems({ pokeballs: newPokeballs, razzBerries: newBerries });
    onSpin(pokestop.id);
    setSpinning(false);
  };

  const finishDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 42 || Math.abs(info.velocity.x) > 320) void handleSpin();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.015 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.015 }}
      className="absolute inset-0 z-[800] overflow-hidden bg-[linear-gradient(180deg,#d9f3f1_0%,#effaf6_58%,#cce8df_100%)] text-[#315e63]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_18%,rgba(255,255,255,.9),transparent_36%),linear-gradient(130deg,transparent_45%,rgba(74,156,139,.08)_46%,transparent_48%)]" />

      <header className="relative z-20 flex items-center justify-between px-4 pb-3 pt-[max(18px,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white/88 text-[#39716f] shadow-md backdrop-blur" aria-label="Close PokéStop">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white/70 text-[#4b807a] shadow-sm backdrop-blur" aria-label="PokéStop details">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
        </button>
      </header>

      <main className="relative z-10 flex h-[calc(100%-76px)] flex-col items-center px-5">
        <div className="mt-1 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#719b98]">PokéStop</p>
          <h1 className="mt-1 max-w-[330px] text-[24px] font-black leading-tight tracking-[-0.025em]">{name}</h1>
          <p className="mt-1 text-xs font-bold text-[#88a6a2]">Local point of interest</p>
        </div>

        <div className="relative mt-7 flex h-[360px] w-full max-w-[390px] items-center justify-center">
          <div className={`absolute h-[318px] w-[318px] rounded-full blur-2xl ${isSpinable ? 'bg-[#46bde0]/22' : 'bg-[#8654b8]/18'}`} />
          <motion.div
            drag={isSpinable && !rewards ? 'x' : false}
            dragConstraints={{ left: -74, right: 74 }}
            dragElastic={0.45}
            onDragEnd={finishDrag}
            onTap={() => void handleSpin()}
            animate={spinning ? { rotate: 720, scale: [1, 1.04, 1] } : { rotate: 0, scale: 1 }}
            transition={{ duration: spinning ? 0.85 : 0.25, ease: 'easeOut' }}
            className="relative h-[284px] w-[284px] cursor-grab touch-pan-y active:cursor-grabbing"
          >
            <div className={`absolute inset-0 rounded-full border-[9px] bg-white shadow-[0_18px_38px_rgba(39,91,92,.24)] ${isSpinable ? 'border-[#54c7ea]' : 'border-[#9865be]'}`} />
            <div className={`absolute inset-[8px] rounded-full border-[5px] ${isSpinable ? 'border-[#b8edfb]' : 'border-[#d8bde9]'}`} />
            <PhotoScene used={!isSpinable} />
            <div className="absolute inset-[20px] rounded-full border border-white/80" />
          </motion.div>

          <AnimatePresence>
            {rewards && (
              <>
                <motion.div initial={{ scale: 0.3, opacity: 0, x: 0, y: 70 }} animate={{ scale: 1, opacity: 1, x: -112, y: -104 }} className="absolute flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white shadow-xl">
                  <img src={`${ITEM_SPRITE_BASE}poke-ball.png`} alt="Poké Ball" className="h-11 w-11 object-contain" />
                  <span className="absolute -right-2 -top-2 rounded-full bg-[#314f59] px-2 py-0.5 text-xs font-black text-white">+{rewards.pokeballs}</span>
                </motion.div>
                <motion.div initial={{ scale: 0.3, opacity: 0, x: 0, y: 70 }} animate={{ scale: 1, opacity: 1, x: 112, y: -72 }} transition={{ delay: 0.08 }} className="absolute flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white shadow-xl">
                  <img src={`${ITEM_SPRITE_BASE}razz-berry.png`} alt="Razz Berry" className="h-11 w-11 object-contain" />
                  <span className="absolute -right-2 -top-2 rounded-full bg-[#314f59] px-2 py-0.5 text-xs font-black text-white">+{rewards.razzBerries}</span>
                </motion.div>
                <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }} className="absolute bottom-0 rounded-full bg-[#2f7275] px-5 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg">+{rewards.xp} XP</motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-auto w-full max-w-sm pb-[max(24px,env(safe-area-inset-bottom))] text-center">
          <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-white/78 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#638783] ring-1 ring-white">
            <span className={`h-2.5 w-2.5 rounded-full ${isSpinable ? 'bg-[#35bfe6]' : 'bg-[#9560b7]'}`} />
            {rewards ? 'Items collected' : isSpinable ? 'Swipe the Photo Disc' : 'Come back later'}
          </div>
          <p className="text-xs font-bold leading-5 text-[#789793]">{rewards ? 'Your rewards have been added to the Item Bag.' : isSpinable ? 'Swipe horizontally or tap the disc to collect items.' : 'This PokéStop has already been visited recently.'}</p>
          {rewards && <button type="button" onClick={onClose} className="mt-4 h-12 w-full rounded-full bg-gradient-to-r from-[#52c3b1] to-[#2c9ead] text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg">Continue</button>}
        </div>
      </main>
    </motion.div>
  );
};

export default PokestopScreen;
