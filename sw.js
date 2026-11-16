// Money tracker service worker: page is network-first (so updates arrive), icons, fonts and same-origin assets cache-first.
const CACHE='money-tracker-v8';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./manifest.json','./favicon.svg','./favicon-32.png','./icon-180.png','./icon-512.png','./fonts/plex-sans-400.woff','./fonts/plex-sans-500.woff','./fonts/plex-sans-600.woff','./fonts/plex-mono-500.woff','./fonts/plex-mono-600.woff'])));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  if(req.mode==='navigate'){e.respondWith(fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp));}return r;}).catch(()=>caches.match('./index.html')));return;}
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok&&req.url.startsWith('http')){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));}return r;})));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{const c=cs[0];return c?c.focus():self.clients.openWindow('./index.html#dashboard');}));});
