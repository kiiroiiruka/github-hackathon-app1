// Service Worker for PWA
const CACHE_NAME = "drivelink-app-v2";
const urlsToCache = ["/", "/manifest.json", "/carIcon.png"];

// インストール時の処理
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log("Opened cache");
			return cache.addAll(urlsToCache);
		}),
	);
	// 新しいSWを即座に適用
	self.skipWaiting();
});

// フェッチ時の処理
self.addEventListener("fetch", (event) => {
	const request = event.request;
	const url = new URL(request.url);

	// 1) クロスオリジン（例: OSRM APIなど）はSWでキャッシュせず、そのままネットワークに流す
	// 2) 非GETリクエストもそのまま通す
	// 3) 明示的にOSRMのエンドポイントは素通し
	const isCrossOrigin = url.origin !== self.location.origin;
	const isGet = request.method === "GET";
	const isOSRM = url.hostname.includes("router.project-osrm.org");

	if (!isGet || isCrossOrigin || isOSRM) {
		event.respondWith(fetch(request));
		return;
	}

	// 同一オリジンのGETのみキャッシュ優先
	event.respondWith(
		caches
			.match(request)
			.then((cached) => {
				if (cached) return cached;
				return fetch(request);
			})
			.catch(() => fetch(request)),
	);
});

// アクティベート時の処理
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						console.log("Deleting old cache:", cacheName);
						return caches.delete(cacheName);
					}
				}),
			);
		}),
	);
	// 既存のページにも即適用
	self.clients.claim();
});
