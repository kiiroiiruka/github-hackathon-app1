import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
	build: {
		rollupOptions: {
			output: {
				// ビルド時の最適化を調整して循環参照を防ぐ
				manualChunks: {
					'firebase': ['firebase/app', 'firebase/auth', 'firebase/database'],
					'react-vendor': ['react', 'react-dom', 'react-router-dom'],
					'leaflet': ['leaflet', 'react-leaflet'],
				},
				// 変数名の圧縮を緩和（デバッグしやすくする）
				compact: false,
			},
		},
		// ソースマップを生成（エラー追跡用）
		sourcemap: true,
	},
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			// 開発環境ではService Workerを完全に無効化（本番環境でのみ有効）
			disable: mode === 'development',
			devOptions: {
				enabled: false,
				type: 'module',
			},
			includeAssets: ["carIcon.png", "vite.svg"],
			manifest: {
				// バージョンを追加してキャッシュを強制更新（変更するたびに更新）
				version: "2.0.1",
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
				// キャッシュ名にバージョンを付けて、デプロイごとに自動更新
				cacheId: "drivelink-v2.0.1",
				// navigateFallbackを無効化して、外部APIリクエストを確実にネットワーク経由にする
				navigateFallback: null,
				navigateFallbackDenylist: [/^\/api/, /router\.project-osrm\.org/, /nominatim\.openstreetmap\.org/],
				runtimeCaching: [
					// OSRM API（ルート計算）- NetworkOnlyでキャッシュを使用しない
					{
						urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/i,
						handler: "NetworkOnly",
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
}));
