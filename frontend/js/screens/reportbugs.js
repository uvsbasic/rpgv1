import { SCREEN } from "../layout.js";
import { GameState, changeScreen } from "../game.js";
import { Input } from "../ui.js";

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

const PANEL = {
  w: 392,
  h: 252
};

const formState = {
  title: "",
  description: "",
  filesLabel: "No files selected"
};

let dom = null;
let activeField = "title";
let backspaceWasDown = false;
let backspaceNextRepeatAt = 0;
const confirmState = {
  isOpen: false,
  index: 0 // 0=yes, 1=no
};

function getConfirmModalRects() {
  const w = 270;
  const h = 96;
  const x = Math.floor((SCREEN.W - w) / 2);
  const y = Math.floor((SCREEN.H - h) / 2);
  return {
    panel: { x, y, w, h },
    titleX: x + 12,
    titleY: y + 24,
    promptX: x + 12,
    promptY: y + 46,
    yes: { x: x + 48, y: y + 60, w: 70, h: 18 },
    no: { x: x + 152, y: y + 60, w: 70, h: 18 }
  };
}

function clampNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getUiRects() {
  const px = Math.floor((SCREEN.W - PANEL.w) / 2);
  const py = Math.floor((SCREEN.H - PANEL.h) / 2);
  const left = px + 14;
  const right = px + PANEL.w - 14;

  return {
    panel: { x: px, y: py, w: PANEL.w, h: PANEL.h },
    back: { x: px + 14, y: py + 10, w: 56, h: 16 },
    titleTextY: py + 24,
    dividerY: py + 32,
    title: { x: left, y: py + 50, w: right - left, h: 18 },
    description: { x: left, y: py + 84, w: right - left, h: 82 },
    attach: { x: left, y: py + 198, w: 242, h: 18 },
    submit: { x: left + 252, y: py + 198, w: 126, h: 18 }
  };
}

function setCommonInputStyles(el) {
  el.setAttribute("data-ui-field", "1");
  el.style.position = "fixed";
  el.style.zIndex = "999999";
  el.style.opacity = "0";
  el.style.border = "0";
  el.style.padding = "0";
  el.style.margin = "0";
  el.style.outline = "none";
  el.style.boxSizing = "border-box";
  el.style.pointerEvents = "none";
}

function ensureDom() {
  if (dom) return dom;

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = "Enter title...";
  titleInput.autocomplete = "off";
  titleInput.value = formState.title;
  setCommonInputStyles(titleInput);
  titleInput.addEventListener("input", () => {
    formState.title = String(titleInput.value || "");
  });

  const descInput = document.createElement("textarea");
  descInput.placeholder = "Describe the bug...";
  descInput.value = formState.description;
  descInput.spellcheck = true;
  descInput.style.resize = "none";
  descInput.style.lineHeight = "1.2";
  descInput.style.padding = "4px";
  setCommonInputStyles(descInput);
  descInput.addEventListener("input", () => {
    formState.description = String(descInput.value || "");
  });

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.accept = "image/*";
  fileInput.style.position = "fixed";
  fileInput.style.left = "-9999px";
  fileInput.style.top = "-9999px";
  fileInput.style.width = "1px";
  fileInput.style.height = "1px";
  fileInput.style.opacity = "0";
  fileInput.style.pointerEvents = "none";
  fileInput.addEventListener("change", () => {
    const count = fileInput.files?.length || 0;
    formState.filesLabel = count > 0 ? `${count} image${count > 1 ? "s" : ""} selected` : "No files selected";
  });

  document.body.appendChild(titleInput);
  document.body.appendChild(descInput);
  document.body.appendChild(fileInput);

  dom = { titleInput, descInput, fileInput };
  return dom;
}

function removeDom() {
  if (!dom) return;
  for (const el of Object.values(dom)) {
    try {
      el.remove();
    } catch {}
  }
  dom = null;
}

function syncDomLayout() {
  const refs = ensureDom();
  const rects = getUiRects();
  const canvas = document.querySelector("canvas");
  if (!canvas) return;

  const cr = canvas.getBoundingClientRect();
  const scaleX = cr.width / clampNum(SCREEN?.W, 400);
  const scaleY = cr.height / clampNum(SCREEN?.H, 300);

  function place(el, r) {
    el.style.left = `${Math.floor(cr.left + r.x * scaleX)}px`;
    el.style.top = `${Math.floor(cr.top + r.y * scaleY)}px`;
    el.style.width = `${Math.max(10, Math.floor(r.w * scaleX))}px`;
    el.style.height = `${Math.max(10, Math.floor(r.h * scaleY))}px`;
  }

  place(refs.titleInput, rects.title);
  place(refs.descInput, rects.description);

  // Keep hidden file input off-screen.
  refs.fileInput.style.left = "-9999px";
  refs.fileInput.style.top = "-9999px";

}

function submitForm() {
  const title = String(formState.title || "").trim().toLowerCase();
  const description = String(formState.description || "").trim().toLowerCase();
  const SECRET_CODES = new Set(["jesse", "film"]);
  const hasValidCode = SECRET_CODES.has(title) || SECRET_CODES.has(description);

  if (hasValidCode) {
    confirmState.isOpen = true;
    confirmState.index = 0;
    activeField = "submit";
    return;
  }
  window.alert("Report Bugs is still a work in progress. Thanks for helping improve the game.");
}

function leaveToMenu() {
  removeDom();
  changeScreen("menu");
}

function focusField(fieldId) {
  if (!dom) return;
  activeField = fieldId;
  const target = fieldId === "title" ? dom.titleInput
    : fieldId === "description" ? dom.descInput
    : null;
  if (!target) return;
  try { target.focus({ preventScroll: true }); } catch { try { target.focus(); } catch {} }
}

function applyStateToDomField(fieldId) {
  if (!dom) return;
  if (fieldId === "title" && dom.titleInput) dom.titleInput.value = formState.title;
  if (fieldId === "description" && dom.descInput) dom.descInput.value = formState.description;
}

function deleteOneCharFromActiveField() {
  const isTitle = activeField === "title";
  const isDescription = activeField === "description";
  if (!isTitle && !isDescription) return false;

  const el = isTitle ? dom?.titleInput : dom?.descInput;
  if (!el) return false;

  const current = String(el.value || "");
  let start = Number.isFinite(el.selectionStart) ? el.selectionStart : current.length;
  let end = Number.isFinite(el.selectionEnd) ? el.selectionEnd : current.length;

  start = Math.max(0, Math.min(current.length, start));
  end = Math.max(0, Math.min(current.length, end));
  if (end < start) {
    const t = start;
    start = end;
    end = t;
  }

  let next = current;
  let nextCaret = start;

  // If text is selected, delete the selection. Otherwise delete char to the left.
  if (start !== end) {
    next = current.slice(0, start) + current.slice(end);
    nextCaret = start;
  } else if (start > 0) {
    next = current.slice(0, start - 1) + current.slice(end);
    nextCaret = start - 1;
  } else {
    return false;
  }

  el.value = next;
  try { el.setSelectionRange(nextCaret, nextCaret); } catch {}

  if (isTitle) formState.title = next;
  if (isDescription) formState.description = next;

  return true;
}

function fitText(ctx, text, maxW) {
  let out = String(text || "");
  while (out.length > 0 && ctx.measureText(out).width > maxW) out = out.slice(0, -1);
  return out;
}

function wrapLines(ctx, text, maxW, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxW) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function drawInsetBox(ctx, r, hot) {
  ctx.fillStyle = "#000";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = hot ? "#ff0" : "#fff";
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = "#444";
  ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
}

export const ReportBugsScreen = {
  enter() {
    ensureDom();
    syncDomLayout();
    focusField("title");
  },

  update(mouse) {
    syncDomLayout();

    if (confirmState.isOpen) {
      const modal = getConfirmModalRects();
      const yesRect = modal.yes;
      const noRect = modal.no;

      if (Input.keys?.Escape) {
        Input.consume("Escape");
        Input.consume("Back");
        confirmState.isOpen = false;
        return;
      }

      if (mouse?.clicked && pointInRect(mouse.x, mouse.y, yesRect)) {
        confirmState.index = 0;
      } else if (mouse?.clicked && pointInRect(mouse.x, mouse.y, noRect)) {
        confirmState.index = 1;
      }

      if (Input.pressed("Left") || Input.pressed("ArrowLeft")) {
        Input.consume("Left");
        Input.consume("ArrowLeft");
        confirmState.index = 0;
      }
      if (Input.pressed("Right") || Input.pressed("ArrowRight")) {
        Input.consume("Right");
        Input.consume("ArrowRight");
        confirmState.index = 1;
      }

      const confirmPressed = !!(Input.pressed("Enter") || Input.pressed("Confirm") || mouse?.clicked);
      if (confirmPressed) {
        Input.consume("Enter");
        Input.consume("Confirm");
        const chooseYes = confirmState.index === 0;
        confirmState.isOpen = false;

        if (chooseYes) {
          GameState.specialFlow = {
            type: "eggBattle",
            hideEnemyLevel: true,
            source: "reportbugs"
          };
          if (!GameState.flags) GameState.flags = {};
          if (!GameState.flags.secrets) GameState.flags.secrets = {};
          GameState.flags.secrets.eggBattleEntrySource = "reportbugs";
          removeDom();
          changeScreen("select");
          return;
        }
        return;
      }

      return;
    }

    if (Input.keys?.Escape) {
      Input.consume("Back");
      Input.consume("Escape");
      leaveToMenu();
      return;
    }

    const rects = getUiRects();
    if (mouse?.clicked && pointInRect(mouse.x, mouse.y, rects.back)) {
      leaveToMenu();
      return;
    }

    if (mouse?.clicked && pointInRect(mouse.x, mouse.y, rects.title)) {
      focusField("title");
      return;
    }
    if (mouse?.clicked && pointInRect(mouse.x, mouse.y, rects.description)) {
      focusField("description");
      return;
    }
    if (mouse?.clicked && pointInRect(mouse.x, mouse.y, rects.attach)) {
      activeField = "attach";
      try { dom?.fileInput?.click(); } catch {}
      return;
    }
    if (mouse?.clicked && pointInRect(mouse.x, mouse.y, rects.submit)) {
      activeField = "submit";
      submitForm();
      return;
    }

    if (Input.pressed("Enter") && (activeField === "submit" || activeField === "title" || activeField === "description")) {
      Input.consume("Confirm");
      Input.consume("Enter");
      submitForm();
      return;
    }

    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const backspaceDown = !!Input.keys?.Backspace;
    if (backspaceDown) {
      if (!backspaceWasDown) {
        if (deleteOneCharFromActiveField()) {
          backspaceNextRepeatAt = now + 380;
        }
      } else if (now >= backspaceNextRepeatAt) {
        if (deleteOneCharFromActiveField()) {
          backspaceNextRepeatAt = now + 55;
        }
      }
    }
    backspaceWasDown = backspaceDown;
  },

  render(ctx) {
    const rects = getUiRects();
    const px = rects.panel.x;
    const py = rects.panel.y;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);

    ctx.fillStyle = "#111";
    ctx.fillRect(rects.panel.x, rects.panel.y, rects.panel.w, rects.panel.h);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(rects.panel.x, rects.panel.y, rects.panel.w, rects.panel.h);
    ctx.strokeRect(rects.panel.x + 1, rects.panel.y + 1, rects.panel.w - 2, rects.panel.h - 2);

    ctx.strokeStyle = "#fff";
    ctx.strokeRect(rects.back.x, rects.back.y, rects.back.w, rects.back.h);
    ctx.fillStyle = "#fff";
    ctx.font = "9px monospace";
    ctx.fillText("Back", rects.back.x + 16, rects.back.y + 11);

    ctx.font = "16px monospace";
    ctx.fillText("Report Bugs", px + 86, rects.titleTextY);
    ctx.strokeStyle = "#777";
    ctx.beginPath();
    ctx.moveTo(px + 10, rects.dividerY);
    ctx.lineTo(px + PANEL.w - 10, rects.dividerY);
    ctx.stroke();

    ctx.font = "10px monospace";

    ctx.fillStyle = "#fff";
    ctx.fillText("Title", rects.title.x, rects.title.y - 4);
    drawInsetBox(ctx, rects.title, activeField === "title");

    ctx.fillText("Description", rects.description.x, rects.description.y - 4);
    drawInsetBox(ctx, rects.description, activeField === "description");

    ctx.fillText("Attach Images", rects.attach.x, rects.attach.y - 6);
    drawInsetBox(ctx, rects.attach, activeField === "attach");
    drawInsetBox(ctx, { x: rects.attach.x + 1, y: rects.attach.y + 1, w: 58, h: rects.attach.h - 2 }, activeField === "attach");
    ctx.fillStyle = activeField === "attach" ? "#ff0" : "#fff";
    ctx.fillText("Choose", rects.attach.x + 13, rects.attach.y + 12);
    ctx.fillStyle = "#aaa";
    ctx.fillText(fitText(ctx, formState.filesLabel, rects.attach.w - 66), rects.attach.x + 64, rects.attach.y + 12);

    drawInsetBox(ctx, rects.submit, activeField === "submit");
    ctx.fillStyle = activeField === "submit" ? "#ff0" : "#fff";
    ctx.fillText("Submit", rects.submit.x + 30, rects.submit.y + 12);

    ctx.fillStyle = formState.title ? "#fff" : "#777";
    ctx.fillText(fitText(ctx, formState.title || "Enter title...", rects.title.w - 8), rects.title.x + 4, rects.title.y + 12);

    const descLines = formState.description
      ? wrapLines(ctx, formState.description, rects.description.w - 8, 7)
      : ["Describe the bug..."];
    ctx.fillStyle = formState.description ? "#fff" : "#777";
    for (let i = 0; i < descLines.length; i++) {
      ctx.fillText(descLines[i], rects.description.x + 4, rects.description.y + 12 + (i * 10));
    }

    ctx.fillStyle = "#777";
    ctx.font = "9px monospace";
    ctx.fillText("Press Esc to return.", px + 14, py + PANEL.h - 12);

    if (confirmState.isOpen) {
      const modal = getConfirmModalRects();
      const yesRect = modal.yes;
      const noRect = modal.no;

      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);

      ctx.fillStyle = "#000";
      ctx.fillRect(modal.panel.x, modal.panel.y, modal.panel.w, modal.panel.h);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(modal.panel.x, modal.panel.y, modal.panel.w, modal.panel.h);
      ctx.strokeStyle = "#444";
      ctx.strokeRect(modal.panel.x + 1, modal.panel.y + 1, modal.panel.w - 2, modal.panel.h - 2);

      ctx.fillStyle = "#fff";
      ctx.font = "15px monospace";
      ctx.fillText("Confirm", modal.titleX, modal.titleY);
      ctx.font = "10px monospace";
      ctx.fillText("Are you sure you want to enter this?", modal.promptX, modal.promptY);

      drawInsetBox(ctx, yesRect, confirmState.index === 0);
      drawInsetBox(ctx, noRect, confirmState.index === 1);

      ctx.fillStyle = confirmState.index === 0 ? "#ff0" : "#fff";
      ctx.fillText("Yes", yesRect.x + 24, yesRect.y + 12);
      ctx.fillStyle = confirmState.index === 1 ? "#ff0" : "#fff";
      ctx.fillText("No", noRect.x + 28, noRect.y + 12);
    }
  }
};
