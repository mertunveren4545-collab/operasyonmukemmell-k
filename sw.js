/* OPEX service worker — NETWORK-FIRST
   Amaç: "bir telefonda eski sürüm takılı kalıyor / kullanıcı bulunamadı" sorununu
   kalıcı bitirmek.
   - Her dosya (index.html dahil) önce AĞDAN taze çekilir (HTTP önbelleği baypas).
   - Ağ yoksa son kaydedilen kopya (cache) ile açılır → çevrimdışı da açılır.
   - Yeni sürüm yayınlanınca açık tüm sekmeler OTOMATİK yenilenir (elle önbellek
     temizlemeye gerek kalmaz).
   - Supabase vb. dış (cross-origin) istekler service worker'a hiç uğramaz.
   - Bildirim / Web Push davranışı aynen korunur.

   Not: Yeni bir sürüm dağıtacağın her seferde aşağıdaki SURUM satırındaki tarihi
   değiştirmen yeterli (ör. opex-YYYY-AA-GG). Bu, güncellemeyi kesinleştirir. */

var SURUM = 'opex-2026-09-04';
var CACHE = SURUM;

self.addEventListener('install', function(e){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    /* eski sürüm önbelleklerini temizle */
    try{
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
    }catch(x){}
    await self.clients.claim();
    /* açık sekmelere "yeni sürüm" haberi ver → sayfa kendini bir kez tazeler */
    try{
      var cl = await self.clients.matchAll({type:'window', includeUncontrolled:true});
      cl.forEach(function(c){ try{ c.postMessage('yeni-surum'); }catch(y){} });
    }catch(z){}
  })());
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;                 /* sadece GET isteklerine karış */
  var url;
  try{ url = new URL(req.url); }catch(x){ return; }
  if(url.origin !== self.location.origin) return;  /* Supabase / dış istekleri ELLEME */

  e.respondWith((async function(){
    try{
      /* ÖNCE AĞ — HTTP önbelleğini baypas ederek her zaman taze */
      var fresh = await fetch(req, {cache:'no-store'});
      try{ var c = await caches.open(CACHE); c.put(req, fresh.clone()); }catch(y){}
      return fresh;
    }catch(err){
      /* Ağ yok → son kopya */
      var cached = await caches.match(req);
      if(cached) return cached;
      if(req.mode === 'navigate'){
        var idx = await caches.match('./index.html') || await caches.match('./');
        if(idx) return idx;
      }
      throw err;
    }
  })());
});

/* ---- Web Push (uygulama kapalıyken bile bildirim) ---- */
self.addEventListener('push', function(e){
  var d={title:'OPEX', body:'Yeni bildirim'};
  try{ if(e.data) d = Object.assign(d, e.data.json()); }
  catch(x){ try{ d.body = e.data.text(); }catch(y){} }
  e.waitUntil(self.registration.showNotification(d.title || 'OPEX', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'opex',
    renotify: true,
    data: d
  }));
});

/* ---- Bildirime tıklanınca uygulamayı öne getir / aç ---- */
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(cl){
      for(var i=0;i<cl.length;i++){ if('focus' in cl[i]) return cl[i].focus(); }
      if(self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
