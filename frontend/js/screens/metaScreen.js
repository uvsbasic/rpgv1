// frontend/js/screens/metaScreen.js
//
// Dedicated post-run unlock screen for campaignScreen unlocks.
// - Triggered only from post-battle loss or post-campaign-clear flow.
// - Uses real poster assets (no title placeholders).

import { GameState, changeScreen } from "../game.js";
import { SCREEN, QUICKPLAY_LAYOUT, UNLOCK_OVERLAY_LAYOUT as L } from "../layout.js";
import { Input } from "../ui.js";
import { movies } from "../data/movies.js";
import { playUIBackBlip, playUIConfirmBlip } from "../sfx/uiSfx.js";

const POSTER_BASE = "frontend/assets/posters/";
const posterCache = new Map(); // id -> { img, loaded, failed }

function getMovieById(id) {
  return (
    movies.find((m) => m.id === id) || {
      id,
      title: "Unknown",
      runtime: 120,
      imdb: 7.0
    }
  );
}

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

function drawPoster(ctx, movie, x, y, w, h) {
  const id = movie?.id ? String(movie.id) : "";
  const rec = startPosterLoad(id);

  ctx.strokeStyle = "#fff";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  if (!(rec && rec.loaded && rec.img)) return;

  const iw = rec.img.naturalWidth || w;
  const ih = rec.img.naturalHeight || h;
  const scale = Math.min(w / iw, h / ih);
  const dw = Math.floor(iw * scale);
  const dh = Math.floor(ih * scale);
  const dx = x + Math.floor((w - dw) / 2);
  const dy = y + Math.floor((h - dh) / 2);

  try {
    ctx.drawImage(rec.img, dx, dy, dw, dh);
  } catch {}
}

function getPayload() {
  const p = GameState?.ui?.campaignUnlockScreenPayload;
  return p && typeof p === "object" ? p : null;
}

function closeToMenu() {
  if (GameState?.ui) {
    GameState.ui.campaignUnlockScreenPayload = null;
  }
  changeScreen("menu");
}

let enterArmed = false;

export const CampaignUnlockScreen = {
  enter() {
    enterArmed = false;
    const payload = getPayload();
    const ids = Array.isArray(payload?.movieIds) ? payload.movieIds.slice(0, 4) : [];
    for (const id of ids) startPosterLoad(id);
  },

  update(mouse) {
    if (!Input.isDown("Confirm")) enterArmed = true;

    if (Input.pressed("Back")) {
      Input.consume("Back");
      playUIBackBlip();
      closeToMenu();
      return;
    }

    if (enterArmed && Input.pressed("Confirm")) {
      Input.consume("Confirm");
      playUIConfirmBlip();
      closeToMenu();
      return;
    }

    if (mouse?.clicked || mouse?.tapped) {
      playUIConfirmBlip();
      closeToMenu();
    }
  },

  render(ctx) {
    const payload = getPayload() || {};
    const isMovieUnlock = String(payload?.type || "") === "MOVIE_UNLOCKED";
    const archetypeName = payload.archetypeName || "Unknown";
    const codeLabel = payload.codeLabel || "";
    const party = (payload.movieIds || []).slice(0, 4).map(getMovieById).filter(Boolean);

    const width = SCREEN.W;
    const height = SCREEN.H;

    // Screen-presentation unlocks: no dim-overlay/panel, clean full-screen background.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = "center";

    ctx.fillStyle = "#ff0";
    ctx.font = "11px monospace";
    ctx.fillText(isMovieUnlock ? "Movie Unlocked!" : "Secret Unlocked!", Math.floor(width / 2), 24);

    ctx.fillStyle = "#fff";
    ctx.font = "8px monospace";
    ctx.fillText(`Unlocked: ${archetypeName}`, Math.floor(width / 2), 38);

    ctx.fillStyle = "#aaa";
    ctx.fillText(`${codeLabel}`, Math.floor(width / 2), 50);

    const posterW = QUICKPLAY_LAYOUT.poster.w;
    const posterH = QUICKPLAY_LAYOUT.poster.h;
    const gap = QUICKPLAY_LAYOUT.poster.gap;
    const posterCount = Math.max(1, party.length);
    const totalW = posterW * posterCount + gap * Math.max(0, posterCount - 1);
    const startX = Math.floor((width - totalW) / 2);
    const y = L.posters.y;

    for (let i = 0; i < party.length; i++) {
      const m = party[i];
      const x = startX + i * (posterW + gap);
      drawPoster(ctx, m, x, y, posterW, posterH);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "8px monospace";
    ctx.fillText("Enter: Continue", Math.floor(width / 2), L.footer.y);

    ctx.textAlign = "start";
  }
};
