const CACHE_NAME = "music-finder-v3";

const ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./css/style.css",
    "./js/relativeKeys.js",
    "./js/styleSimilarity.js",
    "./js/csvLoader.js",
    "./js/ui.js",
    "./js/search.js",
    "./js/similarity.js",
    "./js/app.js",
    "./data/musicas.csv",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );

});

self.addEventListener("activate", event => {

    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );

});

self.addEventListener("fetch", event => {

    if (event.request.method !== "GET")
        return;

    event.respondWith(
        caches.match(event.request)
            .then(cached => {

                if (cached)
                    return cached;

                return fetch(event.request)
                    .then(response => {

                        if (!response || response.status !== 200)
                            return response;

                        const clone = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, clone));

                        return response;

                    })
                    .catch(() => caches.match("./index.html"));

            })
    );

});
