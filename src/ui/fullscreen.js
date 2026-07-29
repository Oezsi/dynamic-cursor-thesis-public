/**
* fullscreen.js
* 
* Thin wrapper around the Fullscreen API (with WebKit fallbacks).
*/

const doc = document;
const root = document.documentElement;

export function isFullscreen() {
   return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export function enterFullscreen() {
   if (isFullscreen()) return Promise.resolve();
   try {
      if (root.requestFullscreen) {
         return root
            .requestFullscreen({ navigationUI: "hide" })
            .catch(() => { });
      }
   } catch (_) {
      // API nicht verfügbar -> Guard fängt ab
   }
   return Promise.resolve();
}

export function exitFullscreen() {
   if (!isFullscreen()) return Promise.resolve();
   try {
      if (doc.exitFullscreen) return doc.exitFullscreen().catch(() => { });
      if (doc.webkitFullscreenElement) doc.webkitExitFullscreen();
   } catch (_) {
      // noop
   }
   return Promise.resolve();
}

// Subscribes to fullscreen changes; 
// returns an unsubscribe function.
export function watchFullscreen(cb) {
   const handler = () => cb(isFullscreen());
   doc.addEventListener("fullscreenchange", handler);
   doc.addEventListener("webkitfullscreenchange", handler);
   return () => {
      doc.removeEventListener("fullscreenchange", handler);
      doc.removeEventListener("webkitfullscreenchange", handler);
   };
}
