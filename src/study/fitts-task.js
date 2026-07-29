/**
* fitts-task.js
*
* Fitts task as an encapsulated task module.
* Runs the multidirectional tapping sequence for
* a block and logs one trial per accepted movement.
*/

import { makeTargets, ringRadius, hitTest, makeOrder, visitStep } from "./fitts.js";
import { drawTargets } from "../ui/render.js";
import { fitts, scale as currentScale } from "../core/config.js";

const N = fitts.N;

// Creates the Fitts task.
// `phase` here is the per-target state machine:
// - "idle" (nothing running)
// - "acquire" (waiting for the first target of a condition to be hit)
// - "move" (timing movements between targets)
export function createFittsTask({ colors, log }) {
   const step = visitStep(N);
   const order = makeOrder(N);

   let spec = null;
   let conditions = [];
   let condPtr = 0;
   let targets = [];
   let activeIndex = 0;
   let phase = "idle";
   let movementsDone = 0;
   let lastAcceptedTime = null;
   let fromCenter = null;
   let fromIndex = null;
   let scale = currentScale;
   let pendingClicks = [];
   let pendingSamples = []

   // Lays out the target ring for the current condition,
   // scaled and centerd on screen
   function placeTargets() {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const { D, W } = conditions[condPtr];
      const R = ringRadius(D * scale, N, step);
      targets = makeTargets(N, cx, cy, R, W * scale);
   }

   // Resets per-condition state and places the targets for the next condition.
   function startCondition() {
      placeTargets();
      activeIndex = 0;
      phase = "acquire";
      movementsDone = 0;
      lastAcceptedTime = null;
      fromCenter = null;
      fromIndex = null;
      pendingClicks = [];
      pendingSamples = [];
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
      if (phase === "idle") return;
      drawTargets(ctx, targets, order[activeIndex], colors);
   }

   function onMove() { }

   // Trajectory sampling is gated to the "move" phase
   function onSample(t, x, y, angle) {
      if (phase !== "move") return;
      pendingSamples.push({ t, x, y, a: angle });
   }

   // Logs one completed movement 
   // (from the previous target to the one just hit)
   function recordMovement(t, targetIndex, center) {
      const c = conditions[condPtr];
      log.fittsTrial({
         conditionIndex: condPtr,
         practice: c.practice === true,
         D: c.D,
         W: c.W,
         scale,
         fromIndex,
         toIndex: targetIndex,
         fromX: fromCenter.x,
         fromY: fromCenter.y,
         toX: center.x,
         toY: center.y,
         tStart: lastAcceptedTime,
         tEnd: t,
         clicks: pendingClicks,
         samples: pendingSamples,
      });
      pendingClicks = [];
      pendingSamples = [];
   }

   // Click handler and core state machine.
   // - "acquire" -> hit on the active target starts timing
   // - "move" -> every click is recorded
   // - a hit closes the current movement
   //    -> starts the next 
   //    -> advances condition once N-1 movements are done
   function onClick(x, y) {
      if (phase === "idle") return;
      const t = performance.now();
      const targetIndex = order[activeIndex];
      const target = targets[order[activeIndex]];
      const hit = hitTest(target, x, y);
      const center = { x: target.x, y: target.y };

      if (phase === "acquire") {
         if (hit) {
            phase = "move";
            lastAcceptedTime = t;
            fromCenter = center;
            fromIndex = order[activeIndex];
            pendingClicks = [];
            pendingSamples = [];
            activeIndex = (activeIndex + 1) % N;
         }
         return;
      }

      pendingClicks.push({ t, x, y, hit });

      if (!hit) return;

      recordMovement(t, targetIndex, center);

      movementsDone += 1;
      lastAcceptedTime = t;
      fromCenter = center;
      fromIndex = order[activeIndex]
      activeIndex = (activeIndex + 1) % N;

      if (movementsDone >= N - 1) {
         condPtr += 1;
         if (condPtr >= conditions.length) {
            phase = "idle";
            const done = spec.onComplete;
            spec = null;
            if (done) done();
         } else {
            startCondition();
         }
      }
   }
   return { begin, render, onMove, onSample, onClick };
}
