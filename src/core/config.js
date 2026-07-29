/**
* config.js
*
* Central configuration module: all study parameters and tuning knobs.
*/

// Geometry scale factor relative to the 900px reference viewport height
export let scale = window.innerHeight / 900;

// Recompute the scale factor; called at the start of each block once fullscreen is active
export function rescale() {
   scale = window.innerHeight / 900;
}

export const cursor = {
   arrowImgPath: "assets/cursor.png",
   neutralImgPath: "assets/cursor-neutral.png",

   // Device-pixel ratio the cursor PNGs are authored at
   ratio: 3,

   classicAngle: 0,
   // Baseline offset of the arrow artwork
   imageAngle: -Math.PI / 2 - (20 * Math.PI) / 180,

   // One Euro Filter on the velocity signal
   fcmin: 0.8, // the minimum cutoff (standstill jitter)
   beta: 0.02, // raises the cutoff with speed (movement lag)

   dcutoff: 1.0,     // cutoff for the speed estimate that dirves the adaptive cutoff
   velWindow: 0.025, // fixed differentiation window in seconds (refresh-rate independent)
   minSpeed: 20,     // below this speed the last orientation is held instead of jittering

   fcRot: 4, // cutoff of the orientation-lag low-pass
};

export const cursorModes = {
   classic: { label: "static" },
   dynamic: { label: "dynamic" },
   neutral: { label: "neutral" },
};

export const MODES = Object.keys(cursorModes);

export const fitts = {
   N: 13,
   Ds: [300, 500, 700],
   Ws: [20, 100],
};

export const steering = {
   As: [525, 700],
   Ws: [35, 60, 112],
};

export const experiment = {
   phaseOrder: ["fitts", "steering"],

   rounds: 2,

   practice: {
      enabled: true,
      fitts: [{ D: 500, W: 50 }],
      steering: { A: 600, W: 60 },
   },
};

