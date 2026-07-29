/**
* main.js
*/

import { createExperiment } from "./study/experiment.js";
import { parseParams } from "./core/params.js";
import {
   loadCursor,
   updateCursorPosition,
   updateRotation,
   getCursorState,
} from "./study/cursor.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const hud = document.getElementById("hud");

// Liest die Zielfarben aus styles.css
function readColors() {
   const s = getComputedStyle(document.documentElement);
   return {
      ring: s.getPropertyValue("--color-ring").trim(),
      active: s.getPropertyValue("--color-active").trim(),
      green: s.getPropertyValue("--color-green").trim(),
      gray: s.getPropertyValue("--color-grayed").trim(),
   };
}

const colors = readColors();

const params = parseParams(window.location.search);

const experiment = createExperiment({ colors, overlay, hud, params });

/**
* Setzt die Canvas-Größe auf das Fenster und skaliert für
* scharfe Darstellung auf hochauflösenden Displays. 
* Berechnet auch die Zielpositionen neu.
*/
function layout() {
   const dpr = window.devicePixelRatio || 1;
   canvas.style.width = window.innerWidth + "px";
   canvas.style.height = window.innerHeight + "px";
   canvas.width = window.innerWidth * dpr;
   canvas.height = window.innerHeight * dpr;
   ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Render-Schleife: clearen, Winkel aktualisieren, Cursor zeichnen
function render() {
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   if (experiment.isTrialActive()) {
      experiment.renderTask(ctx);
      updateRotation();
      experiment.recordSample(getCursorState());
   }
   requestAnimationFrame(render);
}

function onMouseMove(e) {
   updateCursorPosition(e.clientX, e.clientY);
   experiment.handleMouseMove(e.clientX, e.clientY);
}

function onClick(e) {
   experiment.handleClick(e.clientX, e.clientY);
}

// Tasten 1/2/3 schalten den Cursor-Modus
function onKeyDown(e) {
   experiment.handleKey(e);
}

function init() {
   layout();
   loadCursor();
   window.addEventListener("resize", layout);
   canvas.addEventListener("mousemove", onMouseMove);
   canvas.addEventListener("click", onClick);
   window.addEventListener("keydown", onKeyDown);
   requestAnimationFrame(render);
   experiment.start();
}

init();
