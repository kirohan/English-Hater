const CACHE='english-haters-v11-final-polish';
const CORE=['./','styles.css','app.js','backend.js','data/questions.js','data/lessons.js','manifest.webmanifest','admin.html','admin.css','admin.js','cloud-admin.html','cloud-admin.js','privacy.html','terms.html','launch.html','launch.js','question-import-template.csv','lesson-import-template.csv'];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));

async function networkFirst(request){
  try{
    const response=await fetch(request);
    if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone())}
    return response;
  }catch(err){
    return (await caches.match(request)) || (await caches.match('./'));
  }
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET')return;
  if(url.origin!==self.location.origin)return;
  const dynamic=url.pathname.endsWith('/')||url.pathname.endsWith('.html')||url.pathname.endsWith('backend-config.js');
  if(dynamic){event.respondWith(networkFirst(event.request));return}
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);cache.put(event.request,response.clone())}return response})));
});
