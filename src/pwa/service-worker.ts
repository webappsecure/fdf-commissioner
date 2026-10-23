// The service worker also supplies the cross-origin isolation headers expo-sqlite needs on web.
// The page reloads once after the worker takes control so it loads isolated.
export function setUpServiceWorker() {
  if (process.env.EXPO_OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // The app cannot supply its own +html file: with one, Expo omits the app bundle script.
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = './manifest.json';
    document.head.appendChild(link);
  }

  if (process.env.NODE_ENV !== 'production') {
    // The dev server already sends the headers; a leftover worker from a production build only gets in the way.
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()));
      await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
      if (registrations.length > 0) location.reload();
    });
    return;
  }

  navigator.serviceWorker
    .register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      if (!window.crossOriginIsolated && !sessionStorage.getItem('fdf-sw-reload')) {
        sessionStorage.setItem('fdf-sw-reload', '1');
        location.reload();
      }
    });
}
