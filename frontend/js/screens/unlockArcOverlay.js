// frontend/js/screens/unlockArcOverlay.js
//
// Render-only unlock overlay for hidden archetype unlock moment.
// ✅ Native 400x300 (no legacy translate/scale)
// ✅ Positions are editable in layout.js

import { SCREEN, QUICKPLAY_LAYOUT, UNLOCK_OVERLAY_LAYOUT as L } from "../layout.js";

const POSTER_BASE = "frontend/assets/posters/";
const posterCache = new Map(); // id -> { img, loaded, failed }

function startPosterLoad(movieId) {
  if (!movieId) return null;
  if (posterCache.has(movieId)) return posterCache.get(movieId);

  const rec = { img: null, loaded: false, failed: false };
  posterCache.set(movieId, rec);

  const exts = ["png", "jpg", "jpeg", "webp"];
  let idx = 0;

  const img = new Image();
  rec.img = img;

  const tryNext = () => {
    if (idx >= exts.length) {
      rec.failed = true;
      rec.loaded = false;
      return;
    }
    const ext = exts[idx++];
    img.src = `${POSTER_BASE}${movieId}.${ext}`;
  };

  img.onload = () => {
    rec.loaded = true;
    rec.failed = false;
  };

  img.onerror = () => {
    tryNext();
  };

  tryNext();
  return rec;
}

function drawPosterPlaceholder(ctx, movie, x, y, w, h) {
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = "#111";
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  ctx.fillStyle = "#fff";
  ctx.font = "7px monospace";

  const t = String(movie?.title || "");
  const line1 = t.slice(0, 14);
  const line2 = t.slice(14, 28);

  ctx.fillText(line1, x + 3, y + h - 16);
  if (line2.trim()) ctx.fillText(line2, x + 3, y + h - 8);
}

function drawPoster(ctx, movie, x, y, w, h) {
  const id = movie?.id ? String(movie.id) : "";
  const rec = startPosterLoad(id);

  ctx.strokeStyle = "#fff";
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = "#111";
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  if (!(rec && rec.loaded && rec.img)) {
    drawPosterPlaceholder(ctx, movie, x, y, w, h);
    return;
  }

  const iw = rec.img.naturalWidth || w;
  const ih = rec.img.naturalHeight || h;

  const scale = Math.min(w / iw, h / ih);
  const dw = Math.floor(iw * scale);
  const dh = Math.floor(ih * scale);
  const dx = x + Math.floor((w - dw) / 2);
  const dy = y + Math.floor((h - dh) / 2);

  try {
    ctx.drawImage(rec.img, dx, dy, dw, dh);
  } catch {
    drawPosterPlaceholder(ctx, movie, x, y, w, h);
  }
}

export function renderUnlockArcOverlay(
  ctx,
  { width = SCREEN.W, height = SCREEN.H, archetypeName = "Unknown", party = [], codeLabel = "I → M → D → B" } = {}
) {
  // Dim overlay
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, width, height);

  // Panel
  const px = L.panel.x;
  const py = L.panel.y;
  const pw = L.panel.w;
  const ph = L.panel.h;

  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#000";
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeRect(px, py, pw, ph);

  // Title
  ctx.fillStyle = "#ff0";
  ctx.font = "11px monospace";
  ctx.fillText("Secret Unlocked!", L.title.x, L.title.y);

  // Unlocked line
  ctx.fillStyle = "#fff";
  ctx.font = "8px monospace";
  ctx.fillText(`Unlocked: ${archetypeName}`, L.unlocked.x, L.unlocked.y);

  // Code label
  ctx.fillStyle = "#aaa";
  ctx.fillText(`${codeLabel}`, L.code.x, L.code.y);

  // Posters
  const posterW = QUICKPLAY_LAYOUT.poster.w;
  const posterH = QUICKPLAY_LAYOUT.poster.h;
  const gap = QUICKPLAY_LAYOUT.poster.gap;

  const safeParty = (party || []).slice(0, 4).filter(Boolean);
  const posterCount = Math.max(1, safeParty.length);
  const totalW = posterW * posterCount + gap * Math.max(0, posterCount - 1);
  const startX = Math.floor((width - totalW) / 2);
  const y = L.posters.y;

  for (let i = 0; i < safeParty.length; i++) {
    const m = safeParty[i];
    const x = startX + i * (posterW + gap);
    drawPoster(ctx, m, x, y, posterW, posterH);
  }

  // Instructions
  ctx.fillStyle = "#fff";
  ctx.font = "8px monospace";
  ctx.fillText("Enter: Continue", L.footer.leftX, L.footer.y);
  ctx.fillText("Backspace: Back", L.footer.rightX, L.footer.y);
}
