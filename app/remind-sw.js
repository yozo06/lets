// Loaded by the service worker (sw.js). Shows "today's story is ready" when the phone lets
// the app wake up in the background, and only if the learner asked to be reminded.
// The app leaves a small plan in the cache (see main.js): what to say, and after which day.
const REMIND_CACHE = 'lets-remind';
const letsToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
async function letsRemind() {
  try {
    const cache = await caches.open(REMIND_CACHE), saved = await cache.match('plan'); if (!saved) return;
    const plan = await saved.json(), today = letsToday();
    if (!plan.show || !(plan.after < today) || plan.shown === today) return;   // nothing new yet, or already reminded today
    await self.registration.showNotification(plan.title, { body: plan.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'lets-today', lang: plan.lang });
    await cache.put('plan', new Response(JSON.stringify({ ...plan, shown: today })));
  } catch (e) { /* a reminder is a nicety */ }
}
self.addEventListener('periodicsync', (e) => { if (e.tag === 'lets-daily') e.waitUntil(letsRemind()); });
self.addEventListener('message', (e) => { if (e.data === 'lets-remind-now') e.waitUntil(letsRemind()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((open) => (open[0] && open[0].focus ? open[0].focus() : self.clients.openWindow('./'))));
});
