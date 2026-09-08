const CACHE_NAME = "licman-app-v1";
const APP_SHELL = [
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/favicon.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((nombres) =>
                Promise.all(
                    nombres
                        .filter((nombre) => nombre !== CACHE_NAME)
                        .map((nombre) => caches.delete(nombre)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(async (response) => {
                    if (response.ok) {
                        const copia = response.clone();
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put("/index.html", copia);
                    }
                    return response;
                })
                .catch(async () => {
                    return (
                        (await caches.match("/index.html")) ||
                        caches.match("/")
                    );
                }),
        );
        return;
    }

    if (
        ["script", "style", "image", "font"].includes(request.destination)
    ) {
        event.respondWith(
            fetch(request)
                .then(async (response) => {
                    if (response.ok) {
                        const copia = response.clone();
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(request, copia);
                    }
                    return response;
                })
                .catch(() => caches.match(request)),
        );
    }
});
