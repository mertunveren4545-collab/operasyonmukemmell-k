/* OPEX service worker
   - Bildirimleri gösterir (Android bunu ZORUNLU kılar: new Notification() Android'de çalışmaz)
   - Web Push için 'push' dinleyicisi hazır (2. aşamada sunucu tarafı eklenince aktif olur)
   - Kasıtlı olarak sayfa/asset ÖNBELLEĞE ALINMAZ; böylece GitHub'a yeni index.html
     yüklediğinde eski sürüm takılıp kalmaz. */

self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

/* Web Push mesajı geldiğinde (uygulama kapalıyken bile) */
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

/* Bildirime tıklanınca uygulamayı öne getir / aç */
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(cl){
      for(var i=0;i<cl.length;i++){ if('focus' in cl[i]) return cl[i].focus(); }
      if(self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
