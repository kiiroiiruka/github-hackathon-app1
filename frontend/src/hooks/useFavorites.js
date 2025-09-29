import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { isLoggedInAtom, userUidAtom } from "../atom/userAtom";
import {
	addUserFavorite,
	getUserFavorites,
	migrateFavoritesFromLocalStorage,
	removeAllUserFavorites,
	removeUserFavorite,
} from "../firebase/map";

/**
 * お気に入り場所を管理するカスタムフック
 * @returns {Object} お気に入り管理の状態と関数
 */
export const useFavorites = () => {
	const [userUid] = useAtom(userUidAtom);
	const [isLoggedIn] = useAtom(isLoggedInAtom);
	const [favorites, setFavorites] = useState([]);
	const [loading, setLoading] = useState(true); // 初期状態をtrueに
	const [error, setError] = useState(null);
	const [authInitialized, setAuthInitialized] = useState(false); // 認証初期化フラグ

	// お気に入りを読み込む
	const loadFavorites = useCallback(async () => {
		console.log("loadFavorites called:", { isLoggedIn, userUid });

		setLoading(true);
		setError(null);

		if (!isLoggedIn || !userUid) {
			// ログインしていない場合はローカルストレージから読み込み
			const localFavorites = localStorage.getItem("favoriteLocations");
			console.log("Loading from localStorage:", localFavorites);

			if (localFavorites) {
				try {
					const parsedFavorites = JSON.parse(localFavorites);
					console.log("Parsed local favorites:", parsedFavorites);
					setFavorites(parsedFavorites);
				} catch (error) {
					console.error("ローカルお気に入りの読み込みエラー:", error);
					setError("ローカルお気に入りの読み込みに失敗しました");
					setFavorites([]);
				}
			} else {
				console.log("No local favorites found, setting empty array");
				setFavorites([]);
			}
			setLoading(false);
			return;
		}

		try {
			console.log("Loading favorites from Firebase for user:", userUid);
			const userFavorites = await getUserFavorites(userUid);
			console.log("Firebase favorites loaded:", userFavorites);
			setFavorites(userFavorites);
		} catch (err) {
			console.error("お気に入りの読み込みエラー:", err);
			setError("お気に入りの読み込みに失敗しました");
			setFavorites([]);
		} finally {
			setLoading(false);
		}
	}, [userUid, isLoggedIn]);

	// お気に入りを追加
	const addFavorite = useCallback(
		async (name, coordinates) => {
			if (!name || !coordinates) {
				setError("名前と座標は必須です");
				return false;
			}

			if (!isLoggedIn || !userUid) {
				// ログインしていない場合はローカルストレージに保存
				const newFavorite = {
					id: Date.now(),
					name: name,
					coordinates: coordinates,
					addedAt: new Date().toISOString(),
				};

				const updatedFavorites = [...favorites, newFavorite];
				setFavorites(updatedFavorites);
				localStorage.setItem(
					"favoriteLocations",
					JSON.stringify(updatedFavorites),
				);
				console.log("ローカルお気に入りに追加:", name);
				return true;
			}

			setError(null);

			try {
				const docId = await addUserFavorite(userUid, name, coordinates);
				if (docId) {
					// 成功した場合、リストを再読み込み
					await loadFavorites();
					return true;
				} else {
					console.log("重複のため追加されませんでした:", name);
					return false;
				}
			} catch (err) {
				console.error("お気に入りの追加エラー:", err);
				setError("お気に入りの追加に失敗しました");
				return false;
			}
		},
		[userUid, isLoggedIn, favorites, loadFavorites],
	);

	// お気に入りを削除
	const removeFavorite = useCallback(
		async (favoriteId) => {
			if (!favoriteId) {
				setError("お気に入りIDが必要です");
				return false;
			}

			if (!isLoggedIn || !userUid) {
				// ログインしていない場合はローカルストレージから削除
				const updatedFavorites = favorites.filter((f) => f.id !== favoriteId);
				setFavorites(updatedFavorites);

				if (updatedFavorites.length === 0) {
					localStorage.removeItem("favoriteLocations");
				} else {
					localStorage.setItem(
						"favoriteLocations",
						JSON.stringify(updatedFavorites),
					);
				}
				console.log("ローカルお気に入りから削除:", favoriteId);
				return true;
			}

			setError(null);

			try {
				await removeUserFavorite(favoriteId);
				// 成功した場合、リストを再読み込み
				await loadFavorites();
				return true;
			} catch (err) {
				console.error("お気に入りの削除エラー:", err);
				setError("お気に入りの削除に失敗しました");
				return false;
			}
		},
		[userUid, isLoggedIn, favorites, loadFavorites],
	);

	// お気に入りを全削除
	const removeAllFavorites = useCallback(async () => {
		if (!isLoggedIn || !userUid) {
			// ログインしていない場合はローカルストレージをクリア
			setFavorites([]);
			localStorage.removeItem("favoriteLocations");
			console.log("ローカルお気に入りを全削除");
			return true;
		}

		setError(null);

		try {
			await removeAllUserFavorites(userUid);
			setFavorites([]);
			return true;
		} catch (err) {
			console.error("お気に入りの全削除エラー:", err);
			setError("お気に入りの全削除に失敗しました");
			return false;
		}
	}, [userUid, isLoggedIn]);

	// ローカルストレージからFirebaseに移行
	const migrateFromLocalStorage = useCallback(async () => {
		if (!isLoggedIn || !userUid) {
			return 0;
		}

		try {
			const migratedCount = await migrateFavoritesFromLocalStorage(userUid);
			if (migratedCount > 0) {
				await loadFavorites();
			}
			return migratedCount;
		} catch (err) {
			console.error("お気に入りの移行エラー:", err);
			setError("お気に入りの移行に失敗しました");
			return 0;
		}
	}, [userUid, isLoggedIn, loadFavorites]);

	// 認証初期化の監視
	useEffect(() => {
		// userUidがnullでもisLoggedInが確定していれば認証初期化完了とみなす
		if (userUid !== undefined && isLoggedIn !== undefined) {
			const timer = setTimeout(() => {
				if (!authInitialized) {
					console.log("Auth initialized:", { isLoggedIn, userUid });
					setAuthInitialized(true);
				}
			}, 200);

			return () => clearTimeout(timer);
		}
	}, [userUid, isLoggedIn, authInitialized]);

	// 認証初期化完了後にお気に入りを読み込み
	useEffect(() => {
		if (authInitialized) {
			console.log("Loading favorites after auth initialization:", {
				isLoggedIn,
				userUid,
			});
			loadFavorites();
		}
	}, [authInitialized, loadFavorites]);

	// ログイン直後にローカルストレージから移行（一度だけ実行）
	useEffect(() => {
		if (authInitialized && isLoggedIn && userUid) {
			console.log("Migration triggered for user:", userUid);
			const timer = setTimeout(() => {
				migrateFromLocalStorage();
			}, 500); // Firebaseからの読み込み完了を待つ

			return () => clearTimeout(timer);
		}
	}, [authInitialized, isLoggedIn, userUid, migrateFromLocalStorage]);

	return {
		favorites,
		loading,
		error,
		addFavorite,
		removeFavorite,
		removeAllFavorites,
		loadFavorites,
		migrateFromLocalStorage,
	};
};
