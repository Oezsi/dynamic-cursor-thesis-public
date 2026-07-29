/**
* experiment.js
* 
* Experiment controller / state machine.
* Walks the step list from plan.js and drives the screens, tasks logging and uploads.
*
* Schedule from plan.js:
   * phaseIntro -> (trials -> survey -> break) x blocks -> ... -> (next phase) -> end
*/

import { buildPlan, blockConditions } from "../core/plan.js";
import { createFittsTask } from "./fitts-task.js";
import { createSteeringTask } from "./steering-task.js";
import { setCursorMode, resetRotation } from "./cursor.js";
import * as screens from "../ui/screens.js";
import {
   enterFullscreen,
   exitFullscreen,
   isFullscreen,
   watchFullscreen
} from "../ui/fullscreen.js";
import {
   experiment as expConfig,
   scale as currentScale,
   rescale,
   MODES
} from "../core/config.js";
import { createLog } from "../data/log.js";
import { createUploader } from "../data/supabase.js";

// Debug-only keyboard shortcuts (active with ?debug=1)
const DEBUG_MODE_KEYS = { 1: "classic", 2: "dynamic", 3: "neutral" };
const DEBUG_TASK_KEYS = { f: "fitts", s: "steering" };

export function createExperiment({ colors, overlay, hud, params = {} }) {
   const log = createLog();
   const uploader = createUploader();
   const fittsTask = createFittsTask({ colors, log });
   const steeringTask = createSteeringTask({ colors, log });

   let group = 0;
   let cursorOrder = params.cursorOrder;
   let axesOrder = params.axesOrder;
   let steps = [];
   let stepPtr = -1;

   let session = null;
   let activeTask = null;
   let trialActive = false;
   let totalBlocks = expConfig.rounds * MODES.length;

   let pendingContinue = null;
   let pendingBlockPayload = null;

   let debugBlockActive = false;
   let debugMode = "classic";

   let fullscreenRequired = false;

   watchFullscreen(onFullscreenChange);


   // ---- Trial state on/off ----

   function showOverlay() {
      trialActive = false;
      activeTask = null;
      document.body.classList.remove("trial-active");
      overlay.style.display = "flex";
      screens.clearHud(hud);
   }

   function hideOverlayForTrial() {
      pendingContinue = null;
      overlay.style.display = "none";
      document.body.classList.add("trial-active");
      trialActive = true;
   }


   // ---- Upload ----

   // After each block, try to flush the upload queue; 
   // log if blocks remain
   function pushPending() {
      uploader.flush().then((clean) => {
         if (!clean && uploader.pendingCount() > 0) {
            console.warn(
               `supabase: ${uploader.pendingCount()} Block/Blöcke noch offen, neuer Versuch bei der nächsten Pause.`
            );
         }
      });
   }

   // Final upload at the end of the session.
   // On failure, show a retry button.
   function finishUpload() {
      screens.renderEnd(overlay, { status: "uploading" });
      uploader.flush().then((clean) => {
         screens.renderEnd(
            overlay,
            clean
               ? { status: "done" }
               : {
                  status: "error",
                  onRetry: finishUpload,
               },
         );
      });
   }


   // ---- Step-by-step sequence ----

   function advance() {
      stepPtr += 1;
      if (stepPtr >= steps.length) return;
      runStep(steps[stepPtr]);
   }

   // Runs one planned step.
   // If fullscreen is required but lost, show the guard insted.
   function runStep(step) {
      if (
         fullscreenRequired &&
         !params.debug &&
         !isFullscreen() &&
         step.type !== "end"
      ) {
         showGuard(false);
         return;
      }

      switch (step.type) {
         case "phaseIntro":
            showOverlay();
            screens.renderPhaseIntro(overlay, step.phase, advance);
            break;

         case "break": {
            showOverlay();
            const remaining = steps
               .slice(stepPtr + 1)
               .filter((s) => s.type === "trials").length;
            screens.renderBreak(overlay, { remaining }, advance);
            break;
         }

         case "survey":
            showOverlay();
            screens.renderSurvey(overlay, onSurveySubmit);
            break;

         case "trials":
            startTrials(step);
            break;

         case "end":
            fullscreenRequired = false;
            exitFullscreen();
            showOverlay();
            pendingContinue = null;
            finishUpload();
            break;

         default:
            advance();
      }
   }

   // Starts a trials block:
   // - rescale
   // - set the cursor mode
   // - open a log block
   // - run the task
   function startTrials(step) {
      debugBlockActive = step.debug === true;
      activeTask = step.phase === "fitts" ? fittsTask : steeringTask;

      rescale();
      setCursorMode(step.cursorMode);
      resetRotation();

      // Open a new log block
      log.beginBlock({
         phase: step.phase,
         cursorMode: step.cursorMode,
         blockIndex: step.blockIndex,
         round: step.round,
         scale: currentScale,
         debug: debugBlockActive,
      });

      hideOverlayForTrial();

      activeTask.begin({
         conditions: step.conditions,
         cursorMode: step.cursorMode,
         phase: step.phase,
         blockIndex: step.blockIndex,
         round: step.round,
         debug: debugBlockActive,
         onComplete: onBlockComplete,
         onProgress: (p) =>
            screens.setHud(hud, {
               phase: step.phase,
               cursorMode: step.cursorMode,
               blockIndex: step.blockIndex,
               totalBlocks,
               index: p.index,
               total: p.total,
            }),
      });
   }

   // Called when a task block finishes. Debug blocks just re-render;
   // real blocks keep their payload until the survey is submitted, then advance.
   function onBlockComplete() {
      const wasDebug = debugBlockActive;
      debugBlockActive = false;

      const payload = log.endBlock();
      showOverlay();

      if (wasDebug) {
         rerenderCurrentStep();
         return;
      }

      pendingBlockPayload = payload;
      advance();
   }

   // Attaches the survey answers to the pending block payload and enqueues it for upload
   function onSurveySubmit(responses) {
      if (pendingBlockPayload) {
         pendingBlockPayload.block.survey = responses;
         uploader.enqueue(pendingBlockPayload);
         pushPending();
         pendingBlockPayload = null;
      }
      advance();
   }

   // Re-renders the current planned step
   // (used after a fullscreen recovery or debug block)
   function rerenderCurrentStep() {
      if (stepPtr >= 0 && stepPtr < steps.length) {
         runStep(steps[stepPtr]);
      } else {
         start();
      }
   }

   // ---- Start: welcome -> demographics -> plan ----

   // Required URL parameters missing -> broken-link screen
   function missingParams() {
      const missing = [];
      if (!params.cursorOrder) missing.push("cursor");
      if (!params.axesOrder) missing.push("axes");
      if (!params.prolificPid) missing.push("PID");
      return missing;
   }

   // Entry point after setup: shows the welcome screen or the config-error screen
   // if the required URL parameters are missing.
   function start() {
      showOverlay();

      const missing = missingParams();
      if (missing.length > 0) {
         console.error(`missing parameter: ${missing.join(", ")}`,);
         pendingContinue = null;
         screens.renderConfigError(overlay, { missing });
         return;
      }

      screens.renderWelcome(overlay, continueFromWelcome);
   }

   function continueFromWelcome() {
      enterFullscreen().then(goToDemographics);
   }

   function goToDemographics() {
      showOverlay();
      pendingContinue = null;
      screens.renderDemographics(overlay, onDemographics, goToWelcome);
   }

   // Back from demographics form to participant-information screen
   function goToWelcome() {
      showOverlay();
      pendingContinue = null;
      screens.renderWelcome(overlay, continueFromWelcome);
   }

   // Builds the plan and the session record form the demographics,
   // starts logging and enters the scheduled steps.
   // Fullscreen enforcement is armed from here on.
   function onDemographics(data) {
      const plan = buildPlan(params);
      totalBlocks = plan.blocksPerPhase;
      axesOrder = plan.axesOrder;
      cursorOrder = plan.order;
      group = plan.group;

      session = {
         group,
         age: data.age,
         sex: data.sex,
         handedness: data.handedness,
         cursorOrder,
         axesOrder,
         startedAt: new Date().toISOString(),
         timeOrigin: performance.timeOrigin,
         environment: {
            screenW: window.screen.width,
            screenH: window.screen.height,
            innerW: window.innerWidth,
            innerH: window.innerHeight,
            dpr: window.devicePixelRatio || 1,
            userAgent: navigator.userAgent,
         },
         config: {
            rounds: expConfig.rounds,
            phaseOrder: expConfig.phaseOrder,
            practice: expConfig.practice.enabled,
         },
      };

      console.log(`group ${group}, cursor ${plan.order.join("/")}, axes ${axesOrder.join("/")}`,);

      log.startSession(session);
      uploader.setSession(log.sessionRow());

      steps = plan.steps;
      stepPtr = -1;
      fullscreenRequired = true;
      advance();
   }

   // ---- Fullscreen guard ---

   function onFullscreenChange(active) {
      if (active) return;
      if (!fullscreenRequired || params.debug) return;
      showGuard(trialActive);
   }

   // Shows the fullscreen guard; retrying re-enters fullscreen and resumes the current step.
   function showGuard(blockRestart) {
      showOverlay();

      const retry = () => {
         enterFullscreen().then(() => {
            if (!isFullscreen()) {
               showGuard(blockRestart);
               return;
            }
            rerenderCurrentStep();
         });
      };
      pendingContinue = retry;

      screens.renderFullscreenGuard(
         overlay,
         { blockRestart },
         retry
      );
   }

   // ---- Debug-Keys ----

   function tryDebugKey(e) {
      if (!params.debug) return false;
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return false;

      const mode = DEBUG_MODE_KEYS[e.key];
      if (mode) {
         debugMode = mode;
         setCursorMode(mode);
         resetRotation();
         return true;
      }

      const phase = DEBUG_TASK_KEYS[e.key.toLowerCase()];
      if (phase) {
         startDebugBlock(phase);
         return true;
      }
      return false;
   }

   function startDebugBlock(phase) {
      startTrials({
         type: "trials",
         phase,
         cursorMode: debugMode,
         blockIndex: 0,
         round: 0,
         debug: true,
         conditions: blockConditions(
            phase,
            group,
            debugMode,
            0,
            axesOrder,
         ),
      });
   }

   // ---- Input ----

   function handleMouseMove(x, y) {
      if (trialActive && activeTask) activeTask.onMove(x, y);
   }

   function handleClick(x, y) {
      if (trialActive && activeTask) activeTask.onClick(x, y);
   }

   function recordSample(cursorState) {
      if (trialActive && activeTask) {
         activeTask.onSample(performance.now(), cursorState.x, cursorState.y, cursorState.angle);
      }
   }

   function handleKey(e) {
      if (tryDebugKey(e)) {
         e.preventDefault();
         return;
      }
      if (trialActive) return;
      if ((e.key === " " || e.key === "Enter") && pendingContinue) {
         e.preventDefault();
         const fn = pendingContinue;
         pendingContinue = null;
         fn();
      }
   }

   // ---- Render / Resize ----

   function renderTask(ctx) {
      if (trialActive && activeTask) activeTask.render(ctx);
   }

   function isTrialActive() {
      return trialActive;
   }

   return {
      start,
      handleMouseMove,
      handleClick,
      handleKey,
      renderTask,
      recordSample,
      isTrialActive,
   };
}
