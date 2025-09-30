// 地図回転関連のユーティリティ関数

/**
 * ルートの進行方向を計算（方位角）
 * @param {Object} routeData - ルートデータ
 * @returns {number} 方位角（0-360度）
 */
export const calculateRouteBearing = (routeData) => {
  if (
    !routeData ||
    !routeData.polyline?.geometry?.coordinates ||
    routeData.polyline.geometry.coordinates.length < 2
  ) {
    return 0;
  }

  const coordinates = routeData.polyline.geometry.coordinates;

  // ルートの最初の2点を使用して進行方向を計算
  const start = coordinates[0];
  const next = coordinates[Math.min(1, coordinates.length - 1)];

  // より正確な方位角計算
  const lat1 = (start[1] * Math.PI) / 180;
  const lat2 = (next[1] * Math.PI) / 180;
  const deltaLng = ((next[0] - start[0]) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // 0-360度に正規化

  // 地図の回転は反時計回りなので、時計回りの方位角を反時計回りに変換
  const mapRotation = (360 - bearing) % 360;

  console.log(`🧭 ルート進行方向計算:`, {
    start: start,
    next: next,
    bearing: `${bearing.toFixed(1)}度`,
    mapRotation: `${mapRotation.toFixed(1)}度`,
    direction: getDirectionName(bearing),
  });

  return mapRotation;
};

/**
 * 現在地からルート上の進行方向を計算
 * @param {Object} currentLocation - 現在地座標 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {number} 方位角（0-360度）
 */
export const calculateCurrentDirection = (currentLocation, routeData) => {
  if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
    return calculateRouteBearing(routeData); // フォールバック
  }

  const coordinates = routeData.polyline.geometry.coordinates;
  let closestIndex = 0;
  let minDistance = Infinity;

  // 現在地に最も近いルート上の点を見つける
  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    const distance = Math.sqrt(
      (coord[1] - currentLocation.lat) ** 2 + (coord[0] - currentLocation.lng) ** 2
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  // 最も近い点から次の点への方向を計算
  const currentPoint = coordinates[closestIndex];
  const nextPoint = coordinates[Math.min(closestIndex + 1, coordinates.length - 1)];

  // 方位角計算
  const lat1 = (currentPoint[1] * Math.PI) / 180;
  const lat2 = (nextPoint[1] * Math.PI) / 180;
  const deltaLng = ((nextPoint[0] - currentPoint[0]) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  // 地図の回転は反時計回りなので、時計回りの方位角を反時計回りに変換
  const mapRotation = (360 - bearing) % 360;

  console.log(`🧭 現在地進行方向計算:`, {
    currentLocation: currentLocation,
    closestIndex: closestIndex,
    currentPoint: currentPoint,
    nextPoint: nextPoint,
    bearing: `${bearing.toFixed(1)}度`,
    mapRotation: `${mapRotation.toFixed(1)}度`,
    direction: getDirectionName(bearing),
  });

  return mapRotation;
};

/**
 * 方位角から方向名を取得
 * @param {number} bearing - 方位角（0-360度）
 * @returns {string} 方向名
 */
export const getDirectionName = (bearing) => {
  const directions = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

/**
 * 回転時の地図サイズを計算（空白スペースを埋めるためにより大きなサイズ）
 * @param {number} mapRotation - 地図の回転角度（0-360度）
 * @returns {Object} サイズとマージンの設定
 */
export const calculateMapSize = (mapRotation) => {
  const rotationRad = (mapRotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rotationRad));
  const sin = Math.abs(Math.sin(rotationRad));
  // より大きなスケールで空白スペースを埋める
  const scale = 1.2 / (cos + sin);
  return {
    width: `${100 * scale}%`,
    height: `${100 * scale}%`,
    marginLeft: `${50 * (1 - scale)}%`,
    marginTop: `${50 * (1 - scale)}%`,
  };
};

/**
 * 地図を進行方向に合わせて回転させる関数
 * @param {Object} routeData - ルートデータ
 * @param {Function} setMapRotation - 地図回転角度を設定する関数
 */
export const rotateMapToRoute = (routeData, setMapRotation) => {
  const rotation = calculateRouteBearing(routeData);
  setMapRotation(rotation);
  console.log(`🗺️ 地図をルート進行方向に回転: ${rotation.toFixed(1)}度`);
  console.log(`🔄 CSS transform: rotate(${rotation}deg)`);
};

/**
 * 地図を現在地の進行方向に合わせて回転させる関数
 * @param {Object} currentLocation - 現在地座標
 * @param {Object} routeData - ルートデータ
 * @param {Function} setMapRotation - 地図回転角度を設定する関数
 */
export const rotateMapToCurrentDirection = (currentLocation, routeData, setMapRotation) => {
  const rotation = calculateCurrentDirection(currentLocation, routeData);
  setMapRotation(rotation);
  console.log(`🗺️ 地図を現在地進行方向に回転: ${rotation.toFixed(1)}度`);
  console.log(`🔄 CSS transform: rotate(${rotation}deg)`);
};

/**
 * 地図を北向きにリセットする関数
 * @param {Function} setMapRotation - 地図回転角度を設定する関数
 */
export const resetMapToNorth = (setMapRotation) => {
  setMapRotation(0);
  console.log(`🧭 地図を北向きにリセット`);
  console.log(`🔄 CSS transform: rotate(0deg)`);
};
