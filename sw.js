const CACHE='everyday-v17';
const ROOT=new URL('./',self.location).href;
const ASSETS=['./','./index.html','./styles.css','./js/app.js','./js/model.js','./js/voice.js','./js/platform.js','./js/dictation.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];

// Use the installed release immediately. A new release is precached by a
// waiting worker and activates after the existing app windows have closed.
const ASSET_URLS=new Set(ASSETS.map(path=>new URL(path,ROOT).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...ASSET_URLS])));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>(key.startsWith('everyday-')&&key!==CACHE)||key.startsWith('whistle-assets-'))
      .map(key=>caches.delete(key))
  )).then(()=>self.clients.claim()));
});
async function cachedAsset(request,key){
  let cache;
  try{
    cache=await caches.open(CACHE);
    const saved=await cache.match(key);
    if(saved)return saved;
    if(request.mode==='navigate'){
      const shell=await cache.match(new URL('./index.html',ROOT).href);
      if(shell)return shell;
    }
  }catch{}
  // The network is needed only for a first visit or an evicted/missing asset.
  const response=await fetch(request);
  if(response.ok&&cache){
    try{await cache.put(key,response.clone());}catch{}
  }
  return response;
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  url.search='';url.hash='';
  if(!ASSET_URLS.has(url.href))return;
  event.respondWith(cachedAsset(event.request,url.href));
});
