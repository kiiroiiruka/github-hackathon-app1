import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	updateDoc,
	where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// ========================================
// お気に入り管理機能
// ========================================

// お気に入りのコレクション名
const FAVORITES_COLLECTION = "userFavorites";

/**
 * ユーザーのお気に入り場所を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} お気に入り場所の配列
 */
export const getUserFavorites = async (userId) => {
	if (!userId) {
		console.warn("ユーザーIDが指定されていません");
		return [];
	}

	try {
		const q = query(
			collection(db, FAVORITES_COLLECTION),
			where("userId", "==", userId),
		);

		const querySnapshot = await getDocs(q);
		const favorites = [];

		querySnapshot.forEach((doc) => {
			favorites.push({
				id: doc.id,
				...doc.data(),
			});
		});

		// JavaScriptでソート（最新順）
		favorites.sort((a, b) => {
			const dateA = new Date(a.addedAt || a.createdAt || 0);
			const dateB = new Date(b.addedAt || b.createdAt || 0);
			return dateB - dateA; // 降順（新しい順）
		});

		console.log(
			`ユーザー ${userId} のお気に入りを取得:`,
			favorites.length,
			"件",
		);
		return favorites;
	} catch (error) {
		console.error("お気に入りの取得エラー:", error);
		throw error;
	}
};

/**
 * お気に入り場所を追加
 * @param {string} userId - ユーザーID
 * @param {string} name - 場所の名前
 * @param {Array} coordinates - 座標 [緯度, 経度]
 * @returns {Promise<string>} 追加されたドキュメントのID
 */
export const addUserFavorite = async (userId, name, coordinates) => {
	if (!userId) {
		throw new Error("ユーザーIDが指定されていません");
	}

	if (
		!name ||
		!coordinates ||
		!Array.isArray(coordinates) ||
		coordinates.length !== 2
	) {
		throw new Error("名前または座標が無効です");
	}

	try {
		// 重複チェック
		const existingFavorites = await getUserFavorites(userId);
		const isDuplicate = existingFavorites.some(
			(favorite) =>
				favorite.name === name &&
				Math.abs(favorite.coordinates[0] - coordinates[0]) < 0.000001 &&
				Math.abs(favorite.coordinates[1] - coordinates[1]) < 0.000001,
		);

		if (isDuplicate) {
			console.log("同じ場所が既にお気に入りに登録されています:", name);
			return null; // 重複の場合はnullを返す
		}

		const favoriteData = {
			userId,
			name,
			coordinates,
			addedAt: new Date().toISOString(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const docRef = await addDoc(
			collection(db, FAVORITES_COLLECTION),
			favoriteData,
		);
		console.log("お気に入りを追加:", name, "ID:", docRef.id);
		return docRef.id;
	} catch (error) {
		console.error("お気に入りの追加エラー:", error);
		throw error;
	}
};

/**
 * お気に入り場所を削除
 * @param {string} favoriteId - お気に入りのドキュメントID
 * @returns {Promise<void>}
 */
export const removeUserFavorite = async (favoriteId) => {
	if (!favoriteId) {
		throw new Error("お気に入りIDが指定されていません");
	}

	try {
		await deleteDoc(doc(db, FAVORITES_COLLECTION, favoriteId));
		console.log("お気に入りを削除:", favoriteId);
	} catch (error) {
		console.error("お気に入りの削除エラー:", error);
		throw error;
	}
};

/**
 * ユーザーのお気に入りを全削除
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 削除された件数
 */
export const removeAllUserFavorites = async (userId) => {
	if (!userId) {
		throw new Error("ユーザーIDが指定されていません");
	}

	try {
		const favorites = await getUserFavorites(userId);
		const deletePromises = favorites.map((favorite) =>
			removeUserFavorite(favorite.id),
		);

		await Promise.all(deletePromises);
		console.log(
			`ユーザー ${userId} のお気に入りを全削除:`,
			favorites.length,
			"件",
		);
		return favorites.length;
	} catch (error) {
		console.error("お気に入りの全削除エラー:", error);
		throw error;
	}
};

/**
 * お気に入り場所を更新
 * @param {string} favoriteId - お気に入りのドキュメントID
 * @param {Object} updateData - 更新するデータ
 * @returns {Promise<void>}
 */
export const updateUserFavorite = async (favoriteId, updateData) => {
	if (!favoriteId) {
		throw new Error("お気に入りIDが指定されていません");
	}

	try {
		const docRef = doc(db, FAVORITES_COLLECTION, favoriteId);
		await updateDoc(docRef, {
			...updateData,
			updatedAt: new Date(),
		});
		console.log("お気に入りを更新:", favoriteId);
	} catch (error) {
		console.error("お気に入りの更新エラー:", error);
		throw error;
	}
};

/**
 * ローカルストレージからFirebaseに移行
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 移行された件数
 */
export const migrateFavoritesFromLocalStorage = async (userId) => {
	if (!userId) {
		console.warn("ユーザーIDが指定されていません");
		return 0;
	}

	try {
		const localFavorites = localStorage.getItem("favoriteLocations");
		if (!localFavorites) {
			return 0;
		}

		const parsedFavorites = JSON.parse(localFavorites);
		if (!Array.isArray(parsedFavorites) || parsedFavorites.length === 0) {
			return 0;
		}

		let migratedCount = 0;
		for (const favorite of parsedFavorites) {
			try {
				const docId = await addUserFavorite(
					userId,
					favorite.name,
					favorite.coordinates,
				);
				if (docId) {
					migratedCount++;
				}
			} catch (error) {
				console.warn("お気に入りの移行でエラー:", favorite.name, error);
			}
		}

		// 移行完了後、ローカルストレージをクリア
		if (migratedCount > 0) {
			localStorage.removeItem("favoriteLocations");
			console.log(`${migratedCount}件のお気に入りをFirebaseに移行しました`);
		}

		return migratedCount;
	} catch (error) {
		console.error("お気に入りの移行エラー:", error);
		return 0;
	}
};

// ========================================
// 地図・ルート関連機能
// ========================================

/**
 * 2点間の距離を計算（ハーバーサイン公式）
 * @param {Array} coord1 - 座標1 [緯度, 経度]
 * @param {Array} coord2 - 座標2 [緯度, 経度]
 * @returns {number} 距離（km）
 */
export const calculateDistance = (coord1, coord2) => {
	if (
		!Array.isArray(coord1) ||
		!Array.isArray(coord2) ||
		coord1.length !== 2 ||
		coord2.length !== 2
	) {
		throw new Error("座標の形式が無効です");
	}

	const [lat1, lon1] = coord1;
	const [lat2, lon2] = coord2;

	const R = 6371; // 地球の半径 (km)
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
};

/**
 * 座標の妥当性をチェック
 * @param {Array} coordinates - 座標 [緯度, 経度]
 * @returns {boolean} 妥当性
 */
export const validateCoordinates = (coordinates) => {
	if (!Array.isArray(coordinates) || coordinates.length !== 2) {
		return false;
	}

	const [lat, lng] = coordinates;
	return (
		typeof lat === "number" &&
		typeof lng === "number" &&
		lat >= -90 &&
		lat <= 90 &&
		lng >= -180 &&
		lng <= 180
	);
};

/**
 * 地図の中心点を計算
 * @param {Array} coordinatesArray - 座標の配列
 * @returns {Array} 中心座標 [緯度, 経度]
 */
export const calculateMapCenter = (coordinatesArray) => {
	if (!Array.isArray(coordinatesArray) || coordinatesArray.length === 0) {
		// デフォルトは東京駅
		return [35.6812, 139.7671];
	}

	if (coordinatesArray.length === 1) {
		return coordinatesArray[0];
	}

	const validCoordinates = coordinatesArray.filter(validateCoordinates);
	if (validCoordinates.length === 0) {
		return [35.6812, 139.7671];
	}

	const sumLat = validCoordinates.reduce((sum, coord) => sum + coord[0], 0);
	const sumLng = validCoordinates.reduce((sum, coord) => sum + coord[1], 0);

	return [sumLat / validCoordinates.length, sumLng / validCoordinates.length];
};

/**
 * 住所から座標を取得（Nominatim API使用）
 * @param {string} address - 住所
 * @returns {Promise<Object>} 座標と詳細情報
 */
export const geocodeAddress = async (address) => {
	if (!address || typeof address !== "string") {
		throw new Error("住所が指定されていません");
	}

	try {
		const encodedAddress = encodeURIComponent(address);
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`,
			{
				headers: {
					"User-Agent": "HakaApp/1.0 (contact@example.com)",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (!data || data.length === 0) {
			throw new Error("住所が見つかりませんでした");
		}

		const result = data[0];
		return {
			name: result.display_name,
			coordinates: [parseFloat(result.lat), parseFloat(result.lon)],
			address: result.address || {},
			boundingBox: result.boundingbox
				? result.boundingbox.map(parseFloat)
				: null,
		};
	} catch (error) {
		console.error("住所の検索エラー:", error);
		throw error;
	}
};

/**
 * 座標から住所を取得（逆ジオコーディング）
 * @param {Array} coordinates - 座標 [緯度, 経度]
 * @returns {Promise<Object>} 住所情報
 */
export const reverseGeocode = async (coordinates) => {
	if (!validateCoordinates(coordinates)) {
		throw new Error("座標の形式が無効です");
	}

	const [lat, lng] = coordinates;

	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
			{
				headers: {
					"User-Agent": "HakaApp/1.0 (contact@example.com)",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (!data) {
			throw new Error("住所が見つかりませんでした");
		}

		return {
			name: data.display_name,
			address: data.address || {},
			coordinates: [parseFloat(data.lat), parseFloat(data.lon)],
		};
	} catch (error) {
		console.error("逆ジオコーディングエラー:", error);
		throw error;
	}
};

/**
 * ルート情報を取得（OSRM API使用）
 * @param {Array} startCoordinates - 出発地座標 [緯度, 経度]
 * @param {Array} endCoordinates - 目的地座標 [緯度, 経度]
 * @param {string} profile - ルーティングプロファイル（'driving', 'walking', 'cycling'）
 * @returns {Promise<Object>} ルート情報
 */
export const getRoute = async (
	startCoordinates,
	endCoordinates,
	profile = "driving",
) => {
	if (
		!validateCoordinates(startCoordinates) ||
		!validateCoordinates(endCoordinates)
	) {
		throw new Error("座標の形式が無効です");
	}

	const validProfiles = ["driving", "walking", "cycling"];
	if (!validProfiles.includes(profile)) {
		throw new Error("無効なプロファイルです");
	}

	const [startLat, startLng] = startCoordinates;
	const [endLat, endLng] = endCoordinates;

	try {
		const response = await fetch(
			`https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (!data.routes || data.routes.length === 0) {
			throw new Error("ルートが見つかりませんでした");
		}

		const route = data.routes[0];
		return {
			geometry: route.geometry,
			distance: route.distance, // メートル
			duration: route.duration, // 秒
			steps: route.legs[0]?.steps || [],
			summary: {
				distanceKm: Math.round((route.distance / 1000) * 10) / 10,
				durationMinutes: Math.round(route.duration / 60),
				durationText: formatDuration(route.duration),
			},
		};
	} catch (error) {
		console.error("ルート取得エラー:", error);
		throw error;
	}
};

/**
 * 所要時間をフォーマット
 * @param {number} seconds - 秒数
 * @returns {string} フォーマットされた時間
 */
export const formatDuration = (seconds) => {
	if (typeof seconds !== "number" || seconds < 0) {
		return "不明";
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours > 0) {
		return `${hours}時間${minutes > 0 ? minutes + "分" : ""}`;
	} else {
		return `${minutes}分`;
	}
};

/**
 * 距離をフォーマット
 * @param {number} meters - メートル
 * @returns {string} フォーマットされた距離
 */
export const formatDistance = (meters) => {
	if (typeof meters !== "number" || meters < 0) {
		return "不明";
	}

	if (meters < 1000) {
		return `${Math.round(meters)}m`;
	} else {
		return `${Math.round((meters / 1000) * 10) / 10}km`;
	}
};

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 日本の座標かどうかを判定
 * @param {Array} coordinates - 座標 [緯度, 経度]
 * @returns {boolean} 日本の座標かどうか
 */
export const isJapanCoordinate = (coordinates) => {
	if (!validateCoordinates(coordinates)) {
		return false;
	}

	const [lat, lng] = coordinates;

	// 日本の大まかな範囲
	return lat >= 24 && lat <= 46 && lng >= 123 && lng <= 146;
};
