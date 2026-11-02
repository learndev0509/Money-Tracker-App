import { toast } from './toast';

/**
 * Registers the service worker and offers a reload once a newer build has taken over.
 * sw.js calls skipWaiting() and clients.claim(), so a new build becomes the controller as soon as it
 * has installed; the page that is open keeps running the old scripts until it reloads. The first
 * controller a page ever gets is its own build's worker, which is not an update.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const sw = navigator.serviceWorker;
  let controlled = !!sw.controller;
  sw.addEventListener('controllerchange', () => {
    if (controlled) offerReload();
    controlled = true;
  });
  sw.register('./sw.js')
    .then(reg => {
      // A phone keeps the app open for days; the browser only checks for a new sw.js on navigation.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible')
          reg.update().catch(() => {
            /* offline */
          });
      });
    })
    .catch(() => {
      /* offline support is optional */
    });
}

export function offerReload() {
  toast('A new version is ready.', { label: 'Reload', fn: () => location.reload() }, undefined, 15000);
}
