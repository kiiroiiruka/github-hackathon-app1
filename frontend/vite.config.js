import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["carIcon.png", "vite.svg"],
			manifest: {
				name: "DriveLink",
				short_name: "DriveLink",
				description: "車のナビゲーションと駐車場管理アプリ",
				theme_color: "#3b82f6",
				background_color: "#ffffff",
				display: "fullscreen",
				orientation: "portrait",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "carIcon.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any"
					},
					{
						src: "carIcon.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable"
					}
				],
				categories: ["navigation", "travel", "utilities"],
				lang: "ja",
				dir: "ltr"
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB制限
				runtimeCaching: [
					// OSRM API（ルート計算）- NetworkOnlyでキャッシュを使用しない
					{
						urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/i,
						handler: "NetworkOnly",
						options: {},
					},
					// Nominatim API（住所検索）- StaleWhileRevalidateで軽量キャッシュ
					{
						urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
						handler: "StaleWhileRevalidate",
						options: {
							cacheName: "nominatim-cache",
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 7, // 7日間
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					// Firebase Realtime Database - NetworkOnlyでキャッシュを使用しない（リアルタイム通信に必須）
					{
						urlPattern: /^https:\/\/.*\.firebasedatabase\.app\/.*/i,
						handler: "NetworkOnly",
						options: {},
					},
					// Firebase Auth/Storage - NetworkOnlyでキャッシュを使用しない
					{
						urlPattern: /^https:\/\/.*\.firebaseapp\.com\/.*/i,
						handler: "NetworkOnly",
						options: {},
					},
					// Firebase APIs全般 - NetworkOnlyでキャッシュを使用しない
					{
						urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
						handler: "NetworkOnly",
						options: {},
					},
					// 画像リソースのキャッシュ戦略
					{
						urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
						handler: "CacheFirst",
						options: {
							cacheName: "images-cache",
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 30, // 30日間
							},
						},
					},
				],
				skipWaiting: true,
				clientsClaim: true,
			},
		}),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
