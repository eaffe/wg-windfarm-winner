const CACHE='wfw-v1.0.1-wg-brand';
const ASSETS=['./','./index.html','./styles.css','./src/main.js','./src/engine.js','./src/catalog.js','./src/cloud.js','./src/config.js','./manifest.webmanifest','./assets/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('wfw-')&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==location.origin)return;
  e.respondWith(fetch(req).then(res=>{if(res.ok){const c=res.clone();e.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,c)));}return res;}).catch(()=>caches.match(req).then(found=>found|| (req.mode==='navigate'?caches.match('./index.html'):null)||Response.error())));
});
