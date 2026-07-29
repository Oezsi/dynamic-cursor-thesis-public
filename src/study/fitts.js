/**
* fitts.js
*
* Fitts task geometry (ISO 9241-9 multidirectional tapping)
*/


// Distributes N targets equally around a circle of radius R centered on (cx, cy),
// starting at the top. Each target carries its index i and radius r = W/2
export function makeTargets(N, cx, cy, R, W) {
   const targets = [];
   for (let i = 0; i < N; i++) {
      const angle = -Math.PI / 2 + i * ((2 * Math.PI) / N);
      targets.push({
         i,
         x: cx + R * Math.cos(angle),
         y: cy + R * Math.sin(angle),
         r: W / 2,
      });
   }
   return targets;
}


// Ring radius chosen so the chord between two targets `step` apart equals D
export function ringRadius(D, N, step) {
   return D / (2 * Math.sin((step * Math.PI) / N));
}

// Is (x, y) inside the target disc?
export function hitTest(target, x, y) {
   return Math.hypot(x - target.x, y - target.y) <= target.r;
}

// Step between successively visited targets (star-crossing pattern)
export function visitStep(N) {
   return Math.round(N / 2);
}

// Visiting order across all N targets, stepping by visitStep each time.
export function makeOrder(N) {
   const step = visitStep(N);
   const order = [];
   for (let i = 0; i < N; i++) {
      order.push((i * step) % N);
   }
   return order;
}
