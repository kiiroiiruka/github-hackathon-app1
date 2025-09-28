import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  updateDoc
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// ========================================
// ルート保存管理機能
// ========================================

// ルートのコレクション名
const ROUTES_COLLECTION = "userRoutes";

/**
 * ユーザーの保存されたルートを取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} 保存されたルートの配列
 */
export const getUserRoutes = async (userId) => {
  if (!userId) {
    console.warn("ユーザーIDが指定されていません");
    return [];
  }

  try {
    const q = query(
      collection(db, ROUTES_COLLECTION),
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const routes = [];
    
    querySnapshot.forEach((doc) => {
      routes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // JavaScriptでソート（最新順）
    routes.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA; // 降順（新しい順）
    });
    
    console.log(`ユーザー ${userId} の保存ルートを取得:`, routes.length, "件");
    return routes;
  } catch (error) {
    console.error("保存ルートの取得エラー:", error);
    throw error;
  }
};

/**
 * ルートを保存
 * @param {string} userId - ユーザーID
 * @param {Object} routeData - ルートデータ
 * @returns {Promise<string>} 追加されたドキュメントのID
 */
export const saveUserRoute = async (userId, routeData) => {
  if (!userId) {
    throw new Error("ユーザーIDが指定されていません");
  }

  if (!routeData || !routeData.departure || !routeData.destination) {
    throw new Error("ルートデータが無効です");
  }

  try {
    // 既存のルートをチェック
    const existingRoutes = await getUserRoutes(userId);
    
    // 重複チェック（同じ出発地と目的地のルート）
    const isDuplicate = existingRoutes.some(
      route => 
        route.departure &&
        route.destination &&
        Math.abs(route.departure.coordinates[0] - routeData.departure.coordinates[0]) < 0.000001 &&
        Math.abs(route.departure.coordinates[1] - routeData.departure.coordinates[1]) < 0.000001 &&
        Math.abs(route.destination.coordinates[0] - routeData.destination.coordinates[0]) < 0.000001 &&
        Math.abs(route.destination.coordinates[1] - routeData.destination.coordinates[1]) < 0.000001
    );

    if (isDuplicate) {
      console.log("同じルートが既に保存されています");
      return null; // 重複の場合はnullを返す
    }

    // 1ユーザー1ルートまでの制限
    if (existingRoutes.length >= 1) {
      // 既存のルートを削除してから新しいルートを保存
      console.log("既存のルートを削除して新しいルートで置き換えます");
      for (const route of existingRoutes) {
        await removeUserRoute(route.id);
      }
    }

    const routeDocument = {
      userId,
      ...routeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, ROUTES_COLLECTION), routeDocument);
    console.log("ルートを保存:", routeData.routeName || "無名のルート", "ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("ルートの保存エラー:", error);
    throw error;
  }
};

/**
 * 保存されたルートを削除
 * @param {string} routeId - ルートのドキュメントID
 * @returns {Promise<void>}
 */
export const removeUserRoute = async (routeId) => {
  if (!routeId) {
    throw new Error("ルートIDが指定されていません");
  }

  try {
    await deleteDoc(doc(db, ROUTES_COLLECTION, routeId));
    console.log("保存ルートを削除:", routeId);
  } catch (error) {
    console.error("保存ルートの削除エラー:", error);
    throw error;
  }
};

/**
 * ユーザーの保存ルートを全削除
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 削除された件数
 */
export const removeAllUserRoutes = async (userId) => {
  if (!userId) {
    throw new Error("ユーザーIDが指定されていません");
  }

  try {
    const routes = await getUserRoutes(userId);
    const deletePromises = routes.map(route => 
      removeUserRoute(route.id)
    );
    
    await Promise.all(deletePromises);
    console.log(`ユーザー ${userId} の保存ルートを全削除:`, routes.length, "件");
    return routes.length;
  } catch (error) {
    console.error("保存ルートの全削除エラー:", error);
    throw error;
  }
};

/**
 * 保存されたルートを更新
 * @param {string} routeId - ルートのドキュメントID
 * @param {Object} updateData - 更新するデータ
 * @returns {Promise<void>}
 */
export const updateUserRoute = async (routeId, updateData) => {
  if (!routeId) {
    throw new Error("ルートIDが指定されていません");
  }

  try {
    const docRef = doc(db, ROUTES_COLLECTION, routeId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: new Date()
    });
    console.log("保存ルートを更新:", routeId);
  } catch (error) {
    console.error("保存ルートの更新エラー:", error);
    throw error;
  }
};

/**
 * ローカルストレージから保存ルートをFirebaseに移行
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 移行された件数
 */
export const migrateRoutesFromLocalStorage = async (userId) => {
  if (!userId) {
    console.warn("ユーザーIDが指定されていません");
    return 0;
  }

  try {
    const localRoutes = localStorage.getItem('savedRoutes');
    if (!localRoutes) {
      return 0;
    }

    const parsedRoutes = JSON.parse(localRoutes);
    if (!Array.isArray(parsedRoutes) || parsedRoutes.length === 0) {
      return 0;
    }

    let migratedCount = 0;
    for (const route of parsedRoutes) {
      try {
        const docId = await saveUserRoute(userId, route);
        if (docId) {
          migratedCount++;
        }
      } catch (error) {
        console.warn("保存ルートの移行でエラー:", route.routeName, error);
      }
    }

    // 移行完了後、ローカルストレージをクリア
    if (migratedCount > 0) {
      localStorage.removeItem('savedRoutes');
      console.log(`${migratedCount}件の保存ルートをFirebaseに移行しました`);
    }

    return migratedCount;
  } catch (error) {
    console.error("保存ルートの移行エラー:", error);
    return 0;
  }
};

// ========================================
// ルート情報のフォーマット関数
// ========================================

/**
 * ルートデータを標準フォーマットに変換
 * @param {Object} departure - 出発地情報
 * @param {Object} destination - 目的地情報
 * @param {Object} routeInfo - ルート計算結果
 * @param {string} routeName - ルート名（オプション）
 * @returns {Object} 標準フォーマットのルートデータ
 */
export const formatRouteData = (departure, destination, routeInfo, routeName = null) => {
  return {
    routeName: routeName || `${departure.name || "出発地"} → ${destination.name || "目的地"}`,
    departure: {
      name: departure.name || "出発地",
      coordinates: departure.coordinates || departure
    },
    destination: {
      name: destination.name || "目的地", 
      coordinates: destination.coordinates || destination
    },
    routeInfo: {
      distanceKm: routeInfo.distanceKm,
      durationMin: routeInfo.durationMin,
      arrivalTime: routeInfo.arrivalTime?.toISOString?.() || null
    },
    createdAt: new Date().toISOString()
  };
};

/**
 * 距離をフォーマット
 * @param {number} km - キロメートル
 * @returns {string} フォーマットされた距離
 */
export const formatRouteDistance = (km) => {
  if (typeof km !== 'number' || km < 0) {
    return "不明";
  }

  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  } else {
    return `${km.toFixed(1)}km`;
  }
};

/**
 * 所要時間をフォーマット
 * @param {number} minutes - 分数
 * @returns {string} フォーマットされた時間
 */
export const formatRouteDuration = (minutes) => {
  if (typeof minutes !== 'number' || minutes < 0) {
    return "不明";
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}時間${mins > 0 ? mins + '分' : ''}`;
  } else {
    return `${mins}分`;
  }
};
