const CACHE="tt-orcachat-v1-20260806g";
const ASSETS=["./","index.html","styles.css","config.js","engine.js","engine-fix-v2.js","engine-fix-v3.js","main.js","ui-fix-v3.js","manifest.webmanifest","assets-icon.svg","data/language.json","data/stock-chunk-01.js","data/stock-chunk-02.js","data/catalog-adapter.js"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok && new URL(event.request.url).origin===self.location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>event.request.mode==="navigate"?caches.match("index.html"):undefined)));
});
