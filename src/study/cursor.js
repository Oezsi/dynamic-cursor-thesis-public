/*
* cursor.js
* Renders the cursor via the native CSS cursor property, so the OS compositor
* draws it at the true pointer position (bypassing the JS/rAF pipeline). The
* dynamic arrow is pre-rendered into 360 rotated frames, one per integer degree,
* cached as CSS cursor strings.
*/

import { cursor } from "../core/config.js";
import { createRotation } from "./rotation.js";

const rotation = createRotation(cursor);
const state = {
   x: 0,
   y: 0,
   angle: 0,
   mode: "classic"
};

let targetEl = null;
let frames = null;
let neutralCss = null;
let ready = false;
let lastKey = null;

// Loads an image and resolves once it has decoded
function loadImage(src) {
   return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
   });
}

// Pre-renders the arrow into 360 rotated frames and prepares the neutral cursor sting.
// Each frame is a full CSS `cursor` value with the hotspot at the arrow tip.
// Call once at startup.
export async function loadCursor(el = document.getElementById("stage")) {
   targetEl = el;
   if (!targetEl) return;

   const img = await loadImage(cursor.arrowImgPath);
   const side = img.naturalWidth;
   const cx = (side - 1) / 2;
   const hot = Math.round(cx / cursor.ratio);

   const c = document.createElement("canvas");
   c.width = c.height = side;
   const ctx = c.getContext("2d");
   ctx.imageSmoothingEnabled = true;
   ctx.imageSmoothingQuality = "high";

   frames = new Map();
   for (let deg = 0; deg < 360; deg += 1) {
      ctx.clearRect(0, 0, side, side);
      ctx.save();
      ctx.translate(cx, cx);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.translate(-cx, -cx);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      const url = c.toDataURL("image/png");
      frames.set(deg, `image-set(url("${url}") ${cursor.ratio}x) ${hot} ${hot}, auto`);
   }

   neutralCss = `image-set(url("${cursor.neutralImgPath}") ${cursor.ratio}x) ${hot} ${hot}, auto`;

   ready = true;
}

// Radians -> integer degree in [0, 359], the key into the pre-rendered frame map.
function snapDeg(rad) {
   const n = ((((rad * 180) / Math.PI) % 360) + 360) % 360;
   return Math.round(n) % 360;
}

// Applies the CSS cursor for the current mode/angle, skipping the write when the frame
// key is unchanged (avoids resetting the cursor every frame).
function applyCursor() {
   if (!ready || !targetEl) return;
   let key, css;
   if (state.mode === "neutral") {
      key = "neutral";
      css = neutralCss;
   } else {
      key = snapDeg(state.angle);
      css = frames.get(key);
   }
   if (key === lastKey) return;
   lastKey = key;
   targetEl.style.cursor = css;
}

export function setCursorMode(mode) {
   state.mode = mode;
   lastKey = null;
}

export function updateCursorPosition(x, y) {
   state.x = x;
   state.y = y
}

// Recomputes the angle from movement and repaints the cursor.
// Call once per frame.
export function updateRotation() {
   state.angle = rotation.update(state.x, state.y, state.mode);
   applyCursor();
}

// Resets rotation state;
// use at each block start so velocity does not carry over.
export function resetRotation() {
   rotation.reset();
   state.angle = 0;
   lastKey = null;
}

export function getCursorState() {
   return { x: state.x, y: state.y, angle: state.angle, mode: state.mode };
}
