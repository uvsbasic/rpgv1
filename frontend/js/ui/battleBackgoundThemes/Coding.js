// frontend/js/ui/battleBackgoundThemes/Coding.js
// Coding - arcade-heavy 1980s vector grid with intentional motion.
//
// Direction implemented:
// - Remove random drifting shape layer
// - Remove spiral geometry
// - Keep geometric plane (perspective grid)
// - Denser fixed-column numeric rain rendered as separate foreground layer
// - Background constantly "zooms inward" with a fractal-like zoom cadence

export function makeState({ srcW, srcH, intensity }, H) {
  const w = Math.max(1, srcW || 400);
  const h = Math.max(1, srcH || 300);

  return {
    horizon: H.rand(0.48, 0.62),
    laneCount: Math.max(14, Math.floor(w / 48)),
    rowCount: 32 + intensity * 4,
    gridScroll: H.rand(0, 1000),
    gridSpeed: H.rand(0.40, 0.58) + intensity * 0.03,

    pulseT: H.rand(0, Math.PI * 2),
    pulseSpeed: H.rand(0.26, 0.40),

    zoomT: H.rand(0, 1000),
    zoomSpeed: H.rand(0.14, 0.22) + intensity * 0.015,
    hexRot: H.rand(0, Math.PI * 2),
    hexRotSpeed: H.rand(0.28, 0.42),

    skyline: makeSkylineBands(w, h, H),
    rain: makeCodeRain(Math.max(28, Math.floor(w / 22)), w, h, H),

    starSeed: (Math.random() * 1e9) | 0,
    scanOffset: H.rand(0, 6),
    w,
    h
  };
}

export function tick(state, dt, intensity, sizes, H) {
  const w = Math.max(1, sizes?.srcW || state.w || 400);
  const h = Math.max(1, sizes?.srcH || state.h || 300);
  state.w = w;
  state.h = h;

  state.gridScroll += dt * (30 + intensity * 16) * state.gridSpeed;
  state.pulseT += dt * state.pulseSpeed;
  state.zoomT += dt * state.zoomSpeed;
  state.hexRot += dt * state.hexRotSpeed;

  tickSkyline(state.skyline, dt, intensity, H);
  tickCodeRain(state.rain, dt, intensity, w, h);
}

export function drawBase(ctx, w, h, _pal, state, t, intensity, _meta, H) {
  const horizonY = Math.floor(h * state.horizon);

  drawSkyBackdrop(ctx, w, h, horizonY, intensity, H);
  drawZoomField(ctx, w, h, horizonY, state, t, intensity, H);
  drawStars(ctx, w, h, state.starSeed, t, intensity);
  drawSkyline(ctx, w, h, horizonY, state.skyline, intensity, H);
  drawHorizonGlow(ctx, w, h, horizonY, t, intensity, H);
  // Horizontal plane removed per art direction.
  drawCrtTexture(ctx, w, h, state.scanOffset, t, intensity, H);

  // Separate foreground layer for numbers.
  drawCodeRain(ctx, w, h, state.rain, t, intensity, H);

  H.addFineNoise(ctx, w, h, 0.014 + 0.002 * (intensity - 1));
  H.addVignette(ctx, w, h, 0.28 + 0.02 * (intensity - 1));
}

function drawSkyBackdrop(ctx, w, h, horizonY, intensity, H) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, "rgb(10,8,24)");
  g.addColorStop(Math.max(0.12, (horizonY - 90) / h), "rgb(18,18,60)");
  g.addColorStop(Math.min(0.88, (horizonY + 20) / h), "rgb(10,10,30)");
  g.addColorStop(1.0, "rgb(6,6,16)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.06 + 0.01 * (intensity - 1);
  ctx.fillStyle = "rgba(120,110,255,1)";
  ctx.fillRect(0, 0, w, Math.floor(horizonY * 0.9));
  ctx.restore();
}

function drawZoomField(ctx, w, h, horizonY, state, t, intensity, H) {
  const centerX = w * 0.5;
  const centerY = h * 0.5; // keep center static at screen center
  const depthBase = (state.zoomT * 0.95) % 1;
  const layers = 20 + intensity * 3;
  const rot = state.hexRot; // continuous clockwise rotation from tick()

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const hexTone = tronOscColor(t);

  const layerGeom = [];
  for (let i = 0; i < layers; i++) {
    const u = ((i / layers) + depthBase) % 1;
    const eased = Math.pow(u, 1.45);
    const r = (0.018 + eased * 0.30) * Math.max(w, h) * 1.35;
    const ry = r * 0.56;
    const alpha = H.clamp((1 - eased) * 0.20, 0.04, 0.17);
    const stroke = rgbaFromRgb(hexTone, alpha);

    // Main edge pass (more visible)
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.25;
    drawHexOutline(ctx, centerX, centerY, r, ry, rot, 6);

    // Glow pass
    ctx.strokeStyle = rgbaFromRgb(hexTone, alpha * 0.58);
    ctx.lineWidth = 2.1;
    drawHexOutline(ctx, centerX, centerY, r, ry, rot, 6);

    layerGeom.push({ rx: r, ry });
  }

  // Geometric-plane style connectors between neighboring hex layers:
  // this gives each side the wireframe "plane" feel from the original grid.
  const connectorCount = Math.min(16, layerGeom.length - 1);
  for (let k = 0; k < connectorCount; k++) {
    const a = layerGeom[k];
    const b = layerGeom[k + 1];
    const depthFade = 1 - k / Math.max(1, connectorCount);
    const alpha = H.clamp(0.14 * depthFade, 0.02, 0.10);
    ctx.strokeStyle = rgbaFromRgb(hexTone, alpha);
    ctx.lineWidth = 1.0;
    drawHexConnectors(ctx, centerX, centerY, a.rx, a.ry, b.rx, b.ry, rot, 6, 5);
  }

  // Fixed-size center hex anchor so the middle never appears to pulse.
  const centerRx = Math.max(14, Math.min(w, h) * 0.028);
  const centerRy = centerRx * 0.56;
  ctx.strokeStyle = rgbaFromRgb(hexTone, 0.34);
  ctx.lineWidth = 1.35;
  drawHexOutline(ctx, centerX, centerY, centerRx, centerRy, rot, 6);
  ctx.strokeStyle = rgbaFromRgb(hexTone, 0.18);
  ctx.lineWidth = 2.3;
  drawHexOutline(ctx, centerX, centerY, centerRx, centerRy, rot, 6);

  ctx.restore();
}

function drawStars(ctx, w, h, seed, t, intensity) {
  const count = Math.floor((w * h) / 12000);
  ctx.save();
  ctx.globalAlpha = 0.16 + 0.03 * (intensity - 1);
  for (let i = 0; i < count; i++) {
    const n = hash2(i + seed);
    const x = (n * 9973) % w;
    const y = ((n * 6151) % (h * 0.58));
    const tw = 0.4 + ((Math.sin(t * 1.2 + i * 0.33) * 0.5 + 0.5) * 0.9);
    ctx.fillStyle = i % 4 === 0 ? `rgba(120,170,255,${tw})` : `rgba(230,180,255,${tw * 0.75})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  ctx.restore();
}

function makeSkylineBands(w, h, H) {
  const bands = [];
  for (let b = 0; b < 3; b++) {
    const buildings = [];
    let x = -40;
    while (x < w + 40) {
      const bw = H.rand(20, 58) * (1 + b * 0.1);
      const bh = H.rand(h * 0.05, h * (0.18 + b * 0.04));
      buildings.push({ x, w: bw, h: bh });
      x += bw + H.rand(4, 16);
    }
    bands.push({
      yOffset: H.rand(-6, 6) + b * 7,
      speed: H.rand(1.5, 6.5) * (0.55 + b * 0.18),
      alpha: 0.14 + b * 0.08,
      buildings
    });
  }
  return bands;
}

function tickSkyline(bands, dt, intensity, H) {
  for (const band of bands) {
    band.yOffset += Math.sin((band.speed + intensity) * dt) * 0.04;
    band.alpha = H.clamp(band.alpha + Math.sin(dt * (0.9 + band.speed * 0.03)) * 0.001, 0.12, 0.32);
  }
}

function drawSkyline(ctx, _w, _h, horizonY, bands, intensity, H) {
  for (let bi = 0; bi < bands.length; bi++) {
    const band = bands[bi];
    const yBase = horizonY + Math.round(band.yOffset) + bi * 6;
    ctx.save();
    ctx.globalAlpha = band.alpha + 0.01 * (intensity - 1);
    ctx.fillStyle = bi === 2 ? "rgb(20,20,50)" : bi === 1 ? "rgb(16,16,42)" : "rgb(12,12,34)";
    for (const b of band.buildings) {
      const bh = Math.max(8, Math.floor(b.h));
      const bx = Math.floor(b.x);
      ctx.fillRect(bx, yBase - bh, Math.ceil(b.w), bh);
    }
    ctx.restore();
  }
}

function drawHorizonGlow(ctx, w, h, horizonY, t, intensity, H) {
  const glowPulse = 0.6 + 0.4 * Math.sin(t * 1.8);
  const r = Math.max(w, h) * (0.32 + 0.02 * (intensity - 1));
  const g = ctx.createRadialGradient(w * 0.5, horizonY, 0, w * 0.5, horizonY, r);
  g.addColorStop(0.0, `rgba(255,145,90,${0.20 * glowPulse})`);
  g.addColorStop(0.45, `rgba(120,130,255,${0.24 * glowPulse})`);
  g.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Intentionally no hard horizon stroke.
}

function drawPerspectiveGrid(ctx, w, h, horizonY, state, t, intensity, H) {
  const laneCount = state.laneCount;
  const half = laneCount / 2;
  const centerX = w * 0.5;
  const pulse = 0.86 + 0.14 * Math.sin(state.pulseT + t * 0.5);
  const nearY = h + 20;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(105,160,255,0.82)";
  ctx.lineWidth = 1.15 + 0.12 * (intensity - 1);

  for (let i = -half; i <= half; i++) {
    const nx = i / half;
    const nearX = centerX + nx * (w * 0.95);
    const farX = centerX + nx * (w * 0.09);
    ctx.beginPath();
    ctx.moveTo(nearX, nearY);
    ctx.lineTo(farX, horizonY);
    ctx.stroke();
  }

  const rows = state.rowCount + intensity * 2;
  const scroll = state.gridScroll % 1;
  const zoomPulse = 1 + 0.08 * Math.sin(state.zoomT * 2.2 + t * 0.35);

  for (let r = 0; r < rows; r++) {
    const u = (r + scroll) / rows;
    const depthBase = 1 - Math.pow(1 - u, 2.1);
    const depth = H.clamp(depthBase * zoomPulse, 0, 1.2);
    const y = horizonY + depth * (h - horizonY + 30);
    const xInset = (1 - depth) * (w * 0.41);
    const alpha = H.clamp((0.16 + depth * 0.62) * pulse, 0.08, 0.9);
    ctx.strokeStyle = r % 3 === 0
      ? `rgba(255,130,95,${alpha * 0.8})`
      : `rgba(120,165,255,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(xInset, y);
    ctx.lineTo(w - xInset, y);
    ctx.stroke();
  }

  ctx.restore();
}

function makeCodeRain(cols, w, h, H) {
  const out = [];
  const colW = w / cols;
  for (let i = 0; i < cols; i++) {
    out.push({
      x: i * colW + colW * 0.25,
      y: H.rand(-h, h),
      speed: H.rand(18, 52),
      len: H.randInt(8, 18),
      ph: H.rand(0, Math.PI * 2)
    });
  }
  return out;
}

function tickCodeRain(rain, dt, intensity, _w, h) {
  for (const c of rain) {
    c.y += dt * c.speed * (0.48 + intensity * 0.04);
    c.ph += dt * (0.55 + intensity * 0.02);
    if (c.y > h + 40) c.y = -80;
  }
}

function drawCodeRain(ctx, _w, _h, rain, t, intensity, H) {
  ctx.save();
  ctx.font = "10px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const glyphs = "0100110011010010110100101101001";
  for (let i = 0; i < rain.length; i++) {
    const c = rain[i];
    const baseA = H.clamp(0.11 + 0.09 * Math.sin(t * 1.15 + c.ph) + 0.014 * (intensity - 1), 0.05, 0.28);
    for (let j = 0; j < c.len; j++) {
      const y = c.y - j * 10;
      if (y < -16 || y > 9999) continue;
      const ch = glyphs[(i * 7 + j * 11 + Math.floor(t * 11)) % glyphs.length];
      const alpha = baseA * (1 - j / (c.len + 1));
      // Keep columns perfectly vertical; color uses a theme-matching neon green.
      ctx.fillStyle = `rgba(95,255,160,${alpha})`;
      ctx.fillText(ch, c.x, y);
    }
  }
  ctx.restore();
}

function drawCrtTexture(ctx, w, h, scanOffset, t, intensity, H) {
  ctx.save();
  const stripeA = 0.035 + 0.006 * (intensity - 1);
  for (let y = 0; y < h; y += 3) {
    const a = stripeA * (0.7 + 0.3 * Math.sin((y + scanOffset + t * 22) * 0.05));
    ctx.fillStyle = `rgba(0,0,0,${H.clamp(a, 0.01, 0.08)})`;
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();
}

function hash2(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function tronOscColor(t) {
  // One unified hue oscillating across blue -> magenta -> orange and back.
  const s1 = 0.5 + 0.5 * Math.sin(t * 0.85);
  const s2 = 0.5 + 0.5 * Math.sin(t * 0.85 + 2.0944);
  const s3 = 0.5 + 0.5 * Math.sin(t * 0.85 + 4.1888);
  const w = s1 + s2 + s3 || 1;

  // Darker TRON-inspired palette (reduced white/brightness).
  const blue = { r: 70, g: 105, b: 210 };
  const magenta = { r: 150, g: 70, b: 175 };
  const orange = { r: 190, g: 95, b: 55 };

  return {
    r: Math.round((blue.r * s1 + magenta.r * s2 + orange.r * s3) / w),
    g: Math.round((blue.g * s1 + magenta.g * s2 + orange.g * s3) / w),
    b: Math.round((blue.b * s1 + magenta.b * s2 + orange.b * s3) / w)
  };
}

function rgbaFromRgb(rgb, a) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

function drawHexOutline(ctx, cx, cy, rx, ry, rot, sides = 6) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawHexConnectors(ctx, cx, cy, rxA, ryA, rxB, ryB, rot, sides = 6, subdivisions = 1) {
  for (let i = 0; i < sides; i++) {
    const a0 = rot + (i / sides) * Math.PI * 2;
    const a1 = rot + ((i + 1) / sides) * Math.PI * 2;
    for (let s = 0; s <= subdivisions; s++) {
      const u = s / (subdivisions + 1);
      const a = a0 + (a1 - a0) * u;
      const x1 = cx + Math.cos(a) * rxA;
      const y1 = cy + Math.sin(a) * ryA;
      const x2 = cx + Math.cos(a) * rxB;
      const y2 = cy + Math.sin(a) * ryB;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}
