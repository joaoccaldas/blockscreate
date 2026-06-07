/**
 * Share card — a downloadable/shareable PNG of your run.
 *
 * Images travel further than links: a player screenshots their reality and posts
 * it. This composes a clean card (era mood, key stats, and the reality code so
 * the image is *playable*) onto a canvas, then shares it via the Web Share API
 * or falls back to a download.
 *
 * Split so the data/layout is pure and testable; the drawing is thin and works
 * against any 2D context (real or stubbed).
 */
import { getEra } from '../core/eras.js';
import { variantInfo, getEraTheme } from '../core/eraTheme.js';
import { encodeReality, realityUrl } from '../core/RealityCode.js';

/** Pure: everything the card needs, derived from the game. Easy to test. */
export function shareCardData(game) {
  const era = getEra(game.eraId);
  const v = variantInfo(game.eraId, game.world?.variant);
  const code = encodeReality({
    seed: game.world?.seed ?? 0, era: game.eraId,
    variant: game.world?.variant || null, mode: game.mode,
  });
  const ages = (game.realityPath?.length || 0) + 1;
  const sky = era.sky?.day || ['#456', '#234'];
  return {
    title: 'BlocksCreate',
    icon: era.icon || '🌀',
    eraName: v ? v.name : era.name,
    subtitle: v ? era.name : 'Across the Ages',
    code,
    url: realityUrl(code),
    colors: { a: sky[0], b: sky[1], accent: getEraTheme(game.eraId, game.world?.variant).accent || '#6fc04e' },
    stats: [
      { label: 'Civ Points', value: Math.floor(game.civ?.cp || 0) },
      { label: 'Ages', value: ages },
      { label: 'Mined', value: game.civ?.totalMined || 0 },
      { label: 'Clues', value: game.clues?.count?.() || 0 },
      { label: 'Branches', value: game.timeline?.divergedCount?.() || 0 },
      { label: 'Trophies', value: game.achievements?.count?.() || 0 },
    ],
  };
}

/** Draw the card onto a 2D context of size w×h. Works on a stub context. */
export function drawShareCard(ctx, w, h, data) {
  // Background: era sky gradient.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, data.colors.a);
  g.addColorStop(1, data.colors.b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Darkening panel for text legibility.
  ctx.fillStyle = 'rgba(8, 12, 28, 0.55)';
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(h * 0.16)}px system-ui, sans-serif`;
  ctx.fillText(data.icon, w / 2, h * 0.27);

  ctx.font = `bold ${Math.round(h * 0.075)}px system-ui, sans-serif`;
  ctx.fillStyle = data.colors.accent;
  ctx.fillText(data.eraName, w / 2, h * 0.46);

  ctx.font = `${Math.round(h * 0.038)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`${data.title} · ${data.subtitle}`, w / 2, h * 0.535);

  // Stats row (3 per line).
  const cols = 3;
  const top = h * 0.6;
  const cw = w / cols;
  data.stats.slice(0, 6).forEach((s, i) => {
    const cx = cw * (i % cols) + cw / 2;
    const cy = top + Math.floor(i / cols) * (h * 0.13);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(h * 0.05)}px system-ui, sans-serif`;
    ctx.fillText(String(s.value), cx, cy + h * 0.045);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${Math.round(h * 0.026)}px system-ui, sans-serif`;
    ctx.fillText(s.label, cx, cy + h * 0.08);
  });

  // Reality code footer (so the image is playable).
  ctx.fillStyle = data.colors.accent;
  ctx.font = `bold ${Math.round(h * 0.032)}px system-ui, sans-serif`;
  ctx.fillText(`▶ Play this reality: ${data.code}`, w / 2, h * 0.95);
  ctx.textAlign = 'left';
}

/** Compose a card canvas (via the provided document) and return it. */
export function composeShareCardCanvas(data, doc = (typeof document !== 'undefined' ? document : null), w = 600, h = 800) {
  if (!doc) return null;
  const canvas = doc.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawShareCard(ctx, w, h, data);
  return canvas;
}

/**
 * Share the card image via the Web Share API (with files) when available, else
 * download it. Returns a promise-ish; tolerant of missing platform APIs.
 */
export function shareCardImage(canvas, text, { nav = (typeof navigator !== 'undefined' ? navigator : null), doc = (typeof document !== 'undefined' ? document : null) } = {}) {
  if (!canvas || !canvas.toBlob) return downloadFallback(canvas, doc);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const file = (typeof File !== 'undefined') ? new File([blob], 'blockscreate.png', { type: 'image/png' }) : null;
    if (nav?.share && file && (!nav.canShare || nav.canShare({ files: [file] }))) {
      nav.share({ files: [file], text, title: 'BlocksCreate' }).catch(() => downloadBlob(blob, doc));
    } else {
      downloadBlob(blob, doc);
    }
  }, 'image/png');
  return true;
}

function downloadBlob(blob, doc) {
  if (!doc || !blob) return;
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url; a.download = 'blockscreate.png';
  doc.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function downloadFallback(canvas, doc) {
  if (!canvas?.toDataURL || !doc) return false;
  const a = doc.createElement('a');
  a.href = canvas.toDataURL('image/png'); a.download = 'blockscreate.png';
  doc.body.appendChild(a); a.click(); a.remove();
  return true;
}
