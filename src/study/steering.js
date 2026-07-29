/**
* steering.js
*
* Geometry of the straight steeing tunnel (Accot & Zhai 1997)
*/

// Baut einen horizontalen Tunnel zentriert um (cx, cy).
// Builds a tunnel centered on (cx, cy).
// - `axis` is the travel axis
// - A is the length along it (Amplitude)
// - W is the width across it
// Coordinates are split into along-axis and perpendicular halves
export function makeTunnel(A, W, cx, cy, axis = "x") {
   const alongCenter = axis === "x" ? cx : cy;
   const perpCenter = axis === "x" ? cy : cx;
   return {
      axis,
      A,
      W,
      alongLo: alongCenter - A / 2,
      alongHi: alongCenter + A / 2,
      perpLo: perpCenter - W / 2,
      perpHi: perpCenter + W / 2,
   };
}

// Coordinate along the travel axis
export function alongCoord(tunnel, x, y) {
   return tunnel.axis === "x" ? x : y;
}

// Coordinate across the travel axis
function perpCoord(tunnel, x, y) {
   return tunnel.axis === "x" ? y : x;
}


// Is the point between the two tunnel walls?
export function withinWalls(tunnel, x, y) {
   const p = perpCoord(tunnel, x, y);
   return p >= tunnel.perpLo && p <= tunnel.perpHi;
}


// Did the pointer cross the entry line inward?
export function enteredInward(prevCoord, coord, entry, dir) {
   return dir > 0
      ? prevCoord <= entry && coord > entry
      : prevCoord >= entry && coord < entry;
}


// Has the along-axis coordinate reached the goal line?
export function passedLine(coord, line, dir) {
   return dir > 0 ? coord >= line : coord <= line;
}
