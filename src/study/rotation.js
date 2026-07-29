/*
* rotation.js
* 
* Computes the cursor orientation from pointer movement: 
* - a fixed-window velocitiy
* - a One Euro Filter on the velocitiy
* – an exponential orientation lag  
*/

import { scale as currentScale } from "../core/config.js";

// Low-pass smoothing factor for cutoff fc over time step dt
function smoothingFactor(fc, dt) {
   return 1 - Math.exp(-2 * Math.PI * fc * dt);
}

// Wraps an angle to the shortest signed representation in (-pi, pi]
function wrapAngle(a) {
   return Math.atan2(Math.sin(a), Math.cos(a));
}


// Creates a rotation model with encapsulated state 
// (one per curosr instance)
export function createRotation(config) {
   let scale = 1;

   let history = [];
   let lastTime = null;

   let smoothedSpeed = 0;
   let smoothedVx = 0;
   let smoothedVy = 0;
   let angle = 0;

   // Returns the position at time tTarget by linear interpolation between
   // the two surrounding history samples, clamped to the ends of the buffer.
   // This gives a fixed time window for velocitiy, independet of the frame rate.
   function sampleAt(tTarget) {
      if (history.length === 0) return null;

      if (history[0].t >= tTarget) return history[0];

      for (let i = history.length - 1; i > 0; i--) {
         const a = history[i - 1];
         const b = history[i];
         if (a.t <= tTarget && tTarget <= b.t) {
            const span = b.t - a.t;
            if (span <= 0) return a;
            const f = (tTarget - a.t) / span;
            return {
               t: tTarget,
               x: a.x + f * (b.x - a.x),
               y: a.y + f * (b.y - a.y),
            };
         }
      }

      return history[history.length - 1];
   }

   // Updates the angle from current position and mode. Call once per frame.
   // nowMs is injectable for deterministic tests; production passes nothing.
   function update(x, y, mode, nowMs) {
      if (mode === "classic") {
         angle = config.classicAngle;
         return angle;
      }
      if (mode === "neutral") {
         angle = 0;
         return angle;
      }

      // Current time in seconds (injected clock in tests, else performance.now())
      const now = (nowMs === undefined ? performance.now() : nowMs) / 1000;

      if (lastTime === null) {
         lastTime = now;
         history = [{ t: now, x, y }];
         return angle;
      }

      const dt = now - lastTime;
      lastTime = now;
      if (dt === 0) return angle;

      const tTarget = now - config.velWindow;
      const past = sampleAt(tTarget);

      history.push({ t: now, x, y });

      // Drop history samples older than the velocity window
      while (history.length >= 2 && history[1].t <= tTarget) history.shift();

      if (past === null) return angle;

      const dtEff = now - past.t;
      if (dtEff <= 0) return angle;

      // Instantaneous velocity from the position difference over the window
      const vx = (x - past.x) / dtEff;
      const vy = (y - past.y) / dtEff;

      // Denoise the speed estimate (derives the adaptice cutoff below)
      const speedRaw = Math.hypot(vx, vy) / scale;
      const aSpeed = smoothingFactor(config.dcutoff, dt);
      smoothedSpeed = aSpeed * speedRaw + (1 - aSpeed) * smoothedSpeed;

      // Adaptive cutoff:
      // fcmin at standstill, rising with speed (One Euro Filter)
      const fc = config.fcmin + config.beta * smoothedSpeed;
      const a = smoothingFactor(fc, dt);
      smoothedVx = a * vx + (1 - a) * smoothedVx;
      smoothedVy = a * vy + (1 - a) * smoothedVy;

      // Near standstill, hold the last orientation instead of jittering
      const speed = Math.hypot(smoothedVx, smoothedVy) / scale;
      if (speed < config.minSpeed) return angle;

      // Target angel = direction of travel
      const targetAngle = Math.atan2(smoothedVy, smoothedVx) - config.imageAngle;

      // Orientation lag:
      // ease the angle toward the target over frames
      const diff = wrapAngle(targetAngle - angle);
      const aRot = smoothingFactor(config.fcRot, dt);
      angle = wrapAngle(angle + aRot * diff);

      return angle;
   }


   // Resets internal state; re-reads the current geometry scale.
   function reset() {
      scale = currentScale;
      history = [];
      lastTime = null;
      smoothedSpeed = 0;
      smoothedVx = 0;
      smoothedVy = 0;
      angle = 0;
   }

   reset();

   return { update, reset };
}
