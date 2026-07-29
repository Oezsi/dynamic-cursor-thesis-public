/**
* params.js
*
* Reads the study's contorl parameters from the URL query string.
*/

const CURSOR_LETTERS = { c: "classic", d: "dynamic", n: "neutral" };
const AXIS_LETTERS = { h: "x", v: "y" };

// Parses the query string into a parameter object
export function parseParams(search = "") {
   const q = new URLSearchParams(search);
   return {
      cursorOrder: parseCursorOrder(q.get("cursor")),
      axesOrder: parseAxesOrder(q.get("axes")),
      prolificPid: q.get("PID"),
      debug: q.get("debug") === "1",
   };
}


// "cdn" -> ["classic","dynamic","neutral"]; null for invalid input
function parseCursorOrder(value) {
   if (!value) return null;
   const letters = value.toLowerCase().split("");
   const unique = new Set(letters);
   const valid =
      letters.length === 3 &&
      unique.size === 3 &&
      letters.every((l) => l in CURSOR_LETTERS);
   if (!valid) return null;
   return letters.map((l) => CURSOR_LETTERS[l]);
}


// "hv" -> ["x", "y"], "vh" -> ["y","x"]; null for invalid input
function parseAxesOrder(value) {
   if (!value) return null;
   const v = value.toLowerCase();
   if (v !== "hv" && v !== "vh") return null;
   return v.split("").map((l) => AXIS_LETTERS[l]);
}
