/**
* steering-task.js
*
* Steering task as an encapsulated task module. Each condition is
* traversed twice (forward, then back) and one trial is logged per
* successful pass
*/

import {
   makeTunnel,
   withinWalls,
   alongCoord,
   enteredInward,
   passedLine,
} from "./steering.js";
import { drawTunnel } from "../ui/render.js";
import { scale as currentScale } from "../core/config.js";

// Creates the steering task.
// `state` is the per pass state machine:
// - "idle" (nothin running)
// - "armed" (tunnel shown, waiting for an inward entry)
// - "steering" (timing a pass)
export function createSteeringTask({ colors, log }) {
   let spec = null;
   let conditions = [];
   let condPtr = 0;
   let scale = currentScale;
   let tunnel = null;
   let state = "idle";
   let dir = 1;
   let startTime = null;
   let prevX = null;
   let prevY = null;
   let wallBreaks = [];
   let pendingSamples = [];

   // Builds the tunnel for the current condition, scaled and centred on screen
   function placeTunnel() {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const { axis, A, W } = conditions[condPtr];
      tunnel = makeTunnel(A * scale, W * scale, cx, cy, axis);
   }

   function entryLine() {
      return dir > 0 ? tunnel.alongLo : tunnel.alongHi;
   }
   function goalLine() {
      return dir > 0 ? tunnel.alongHi : tunnel.alongLo;
   }

   // Start a fresh pass:
   // clears wall breaks and samples, then re-arms
   function newPass() {
      wallBreaks = [];
      pendingSamples = [];
      armRun();
   }

   // Arms a run:
   // waits for the pointer to enter the tunnel inward before timing begins
   function armRun() {
      state = "armed";
      startTime = null;
      prevX = null;
      prevY = null;
   }

   // Sets up the next condition, starting with the forward pass (dir = 1)
   function startCondition() {
      placeTunnel();
      dir = 1;
      newPass();
      if (spec.onProgress) {
         spec.onProgress({ index: condPtr, total: conditions.length });
      }
   }


   // Begins a block:
   // takes the condition list from the spec and starts the first one
   function begin(s) {
      spec = s;
      conditions = s.conditions;
      condPtr = 0;
      scale = currentScale;
      startCondition();
   }

   function render(ctx) {
      if (state === "idle" || !tunnel) return;
      drawTunnel(ctx, tunnel, colors, { grayed: state !== "steering", dir });
   }

   // Advances to the next condition or ends the block when all conditions are done
   function finishCondition() {
      condPtr += 1;
      if (condPtr >= conditions.length) {
         state = "idle";
         tunnel = null;
         const done = spec.onComplete;
         spec = null;
         if (done) done();
      } else {
         startCondition();
      }
   }

   // Logs one completed pass through the tunnel 
   // (movement time, wall breaks, trajectory)
   function recordPass(t) {
      const c = conditions[condPtr];
      log.steeringTrial({
         conditionIndex: condPtr,
         practice: c.practice === true,
         axis: c.axis,
         dir,
         A: c.A,
         W: c.W,
         scale,
         tStart: startTime,
         tEnd: t,
         wallBreaks,
         samples: pendingSamples,
      });
   }

   // Move handler and core state machine.
   // - "armed" -> inward crossing of the entry line starts timing
   // - "steering" -> leaving the walls records a wall break an re-arms
   //    - reaching the goal logs the pass
   //    - then reverses direction or finishes
   function onMove(x, y) {
      if (state === "idle" || !tunnel) return;
      const t = performance.now();
      const coord = alongCoord(tunnel, x, y);
      const inside = withinWalls(tunnel, x, y);

      if (state === "armed") {
         const prevCoord =
            prevX === null ? null : alongCoord(tunnel, prevX, prevY);
         if (
            prevCoord !== null &&
            inside &&
            enteredInward(prevCoord, coord, entryLine(), dir)
         ) {
            state = "steering";
            startTime = t;
         }
      } else if (state === "steering") {
         if (!inside) {
            wallBreaks.push({ t, x, y });
            armRun();
         } else if (passedLine(coord, goalLine(), dir)) {
            recordPass(t);
            if (dir > 0) {
               dir = -1;
               newPass();
            } else {
               finishCondition();
            }
         }
      }
      prevX = x;
      prevY = y;
   }
   function onClick() { }

   // Trajectory sampling is gated to the "steering" phase
   function onSample(t, x, y, angle) {
      if (state !== "steering") return;
      pendingSamples.push({ t, x, y, a: angle });
   }

   return { begin, render, onMove, onSample, onClick };
}
