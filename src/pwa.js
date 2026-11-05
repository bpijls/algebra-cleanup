/* Registers the service worker (offline play, installable app). Not part of the single-file Artifact build. */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
