/**
* render.js
* 
* Canvas drawing for the tow tasks.
*/

// Draws all Fitts targets: 
// - inactive ones as outlined rings,
// - the active one filled
export function drawTargets(ctx, targets, activeIndex, colors) {
   for (const t of targets) {
      if (t.i === activeIndex) continue;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, 2 * Math.PI);
      ctx.strokeStyle = colors.ring;
      ctx.lineWidth = 2;
      ctx.stroke();
   }

   const active = targets.find((t) => t.i === activeIndex);
   if (active) {
      ctx.beginPath();
      ctx.arc(active.x, active.y, active.r, 0, 2 * Math.PI);
      ctx.fillStyle = colors.active;
      ctx.fill();
      ctx.strokeStyle = colors.ring;
      ctx.lineWidth = 2;
      ctx.stroke();
   }
}


// Draws the steering tunnel: 
// - two walls, a green goal cap and a red entry cap
// - `grayed` dims the walls/goal while the run is not yet armed
// - `dir`picks which end is which
export function drawTunnel(ctx, tunnel, colors, { grayed = false, dir = 1 } = {}) {
   const { axis, alongLo, alongHi, perpLo, perpHi } = tunnel;

   const left = axis === "x" ? alongLo : perpLo;
   const right = axis === "x" ? alongHi : perpHi;
   const top = axis === "x" ? perpLo : alongLo;
   const bottom = axis === "x" ? perpHi : alongHi;

   const wallW = 4;
   const capW = 5;
   const overshoot = capW / 2;

   const wallColor = grayed ? colors.gray : colors.ring;
   const goalColor = grayed ? colors.gray : colors.green;
   const entryColor = colors.active;

   const drawCap = (which, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = capW;
      ctx.beginPath();
      if (axis === "x") {
         const xx = which === "lo" ? left : right;
         ctx.moveTo(xx, top);
         ctx.lineTo(xx, bottom);
      } else {
         const yy = which === "lo" ? top : bottom;
         ctx.moveTo(left, yy);
         ctx.lineTo(right, yy);
      }
      ctx.stroke();
   };

   const entryIsA = dir > 0;
   drawCap(entryIsA ? "hi" : "lo", goalColor);
   drawCap(entryIsA ? "lo" : "hi", entryColor);

   ctx.strokeStyle = wallColor;
   ctx.lineWidth = wallW;
   ctx.beginPath();
   if (axis === "x") {
      ctx.moveTo(left - overshoot, top);
      ctx.lineTo(right + overshoot, top);
      ctx.moveTo(left - overshoot, bottom);
      ctx.lineTo(right + overshoot, bottom);
   } else {
      ctx.moveTo(left, top - overshoot);
      ctx.lineTo(left, bottom + overshoot);
      ctx.moveTo(right, top - overshoot);
      ctx.lineTo(right, bottom + overshoot);
   }
   ctx.stroke();

}

