const CACHE_NAME = "my-cache-v1";
const urlsToCache = [
    "/",
    "/js/game.js",
    "/css/default.css",
    "/fonts/GameBoy.ttf",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .catch(e => console.error(e)) 
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});
