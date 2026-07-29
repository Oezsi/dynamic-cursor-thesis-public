/**
* plan.js
*
* Builds the full session schedule from the configuration and the URL parameters.
*/

import { fitts, steering, experiment, MODES } from "./config.js";
import { groupIndex, conditionOrder } from "./counterbalance.js";

// All measured Fitts conditions (D x W)
function fittsMeasured() {
   return fitts.Ds.flatMap((D) =>
      fitts.Ws.map((W) => ({ D, W, practice: false })),
   );
}

// All measured steering conditions for one axis (A x W)
function steeringMeasured(axis) {
   return steering.As.flatMap((A) =>
      steering.Ws.map((W) => ({ axis, A, W, practice: false })),
   );
}

// Ordered conditions list for a single block: practice condition first, then the
// measured conditions in Williams-counterbalanced order. Steering runs per axis.
export function blockConditions(phase, group, cursorMode, round, axesOrder) {
   const modeIndex = MODES.indexOf(cursorMode)

   if (phase === "fitts") {
      const practice = experiment.practice.enabled
         ? experiment.practice.fitts.map((c) => ({ ...c, practice: true }))
         : [];
      const measured = fittsMeasured();
      const row = conditionOrder(measured.length, group, modeIndex, round, 0);
      return [...practice, ...row.map((i) => measured[i])];
   }

   const out = [];
   axesOrder.forEach((axis, axisIndex) => {
      if (experiment.practice.enabled) {
         out.push({ axis, ...experiment.practice.steering, practice: true });
      }
      const measured = steeringMeasured(axis);
      const row = conditionOrder(measured.length, group, modeIndex, round, axisIndex);
      out.push(...row.map((i) => measured[i]));
   });
   return out;
}


/*
* Builds the ordered step list for one participant: for each phase, a phase intro
* followed by (rounds x cursor modes) block, each with its own trials, survey and
* break step, ending with a final "end" step.
*/
export function buildPlan(params) {
   const order = params.cursorOrder;
   const axesOrder = params.axesOrder;

   const group = groupIndex(order)
   const rounds = experiment.rounds;
   const blocksPerPhase = rounds * order.length;
   const steps = [];

   for (const phase of experiment.phaseOrder) {
      steps.push({ type: "phaseIntro", phase });

      for (let round = 0; round < rounds; round++) {
         order.forEach((cursorMode, i) => {
            const blockIndex = round * order.length + i;

            steps.push({
               type: "trials",
               phase,
               cursorMode,
               blockIndex,
               round,
               conditions: blockConditions(phase, group, cursorMode, round, axesOrder),
            });

            steps.push({
               type: "survey",
               phase,
               cursorMode,
               blockIndex,
            });

            const isLastBlock = blockIndex === blocksPerPhase - 1;
            if (!isLastBlock) {
               steps.push({
                  type: "break",
                  phase,
                  blockIndex
               });
            }
         });
      }

   }

   steps.push({ type: "end" });
   return { order, axesOrder, group, blocksPerPhase, steps };
}
