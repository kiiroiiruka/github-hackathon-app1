// ルート判定と合流ルート計算のユーティリティ関数

/**
 * 2点間の距離を計算（ハーバサイン公式）
 * @param {number} lat1 - 緯度1
 * @param {number} lng1 - 経度1
 * @param {number} lat2 - 緯度2
 * @param {number} lng2 - 経度2
 * @returns {number} 距離（メートル）
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
	const R = 6371000; // 地球の半径（メートル）
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
};

/**
 * 点から線分への最短距離を計算
 * @param {Object} point - 点 {lat, lng}
 * @param {Array} lineStart - 線分の開始点 [lng, lat]
 * @param {Array} lineEnd - 線分の終了点 [lng, lat]
 * @returns {number} 最短距離（メートル）
 */
export const distanceToLineSegment = (point, lineStart, lineEnd) => {
	const A = point.lat - lineStart[1];
	const B = point.lng - lineStart[0];
	const C = lineEnd[1] - lineStart[1];
	const D = lineEnd[0] - lineStart[0];

	const dot = A * C + B * D;
	const lenSq = C * C + D * D;
	let param = -1;
	if (lenSq !== 0) {
		param = dot / lenSq;
	}

	let xx, yy;

	if (param < 0) {
		xx = lineStart[0];
		yy = lineStart[1];
	} else if (param > 1) {
		xx = lineEnd[0];
		yy = lineEnd[1];
	} else {
		xx = lineStart[0] + param * C;
		yy = lineStart[1] + param * D;
	}

	return calculateDistance(point.lat, point.lng, yy, xx);
};

/**
 * GPSがルート上にいるかを判定
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @param {number} threshold - 判定閾値（メートル、デフォルト50m）
 * @returns {Object} 判定結果 {isOnRoute, distance, closestPoint}
 */
export const isOnRoute = (currentLocation, routeData, threshold = 50) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return { isOnRoute: false, distance: Infinity, closestPoint: null };
	}

	const coordinates = routeData.polyline.geometry.coordinates;
	let minDistance = Infinity;
	let closestPoint = null;

	// 各線分との距離を計算
	for (let i = 0; i < coordinates.length - 1; i++) {
		const distance = distanceToLineSegment(
			currentLocation,
			coordinates[i],
			coordinates[i + 1]
		);
		
		if (distance < minDistance) {
			minDistance = distance;
			closestPoint = {
				lat: coordinates[i][1],
				lng: coordinates[i][0],
				index: i
			};
		}
	}

	return {
		isOnRoute: minDistance <= threshold,
		distance: minDistance,
		closestPoint: closestPoint
	};
};

/**
 * 現在地からルートへの合流点を計算
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {Object} 合流点情報 {joinPoint, distance}
 */
export const calculateJoinPoint = (currentLocation, routeData) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return null;
	}

	const coordinates = routeData.polyline.geometry.coordinates;
	let minDistance = Infinity;
	let joinPoint = null;

	// ルート上の各点との距離を計算
	for (let i = 0; i < coordinates.length; i++) {
		const distance = calculateDistance(
			currentLocation.lat,
			currentLocation.lng,
			coordinates[i][1],
			coordinates[i][0]
		);
		
		if (distance < minDistance) {
			minDistance = distance;
			joinPoint = {
				lat: coordinates[i][1],
				lng: coordinates[i][0],
				index: i
			};
		}
	}

	return {
		joinPoint,
		distance: minDistance
	};
};

/**
 * 合流ルートの座標を生成
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} joinPoint - 合流点 {lat, lng}
 * @returns {Array} 合流ルートの座標配列
 */
export const generateRejoinRoute = (currentLocation, joinPoint) => {
	if (!currentLocation || !joinPoint) {
		return [];
	}

	// 現在地から合流点への直線ルートを生成
	return [
		[currentLocation.lng, currentLocation.lat], // 現在地
		[joinPoint.lng, joinPoint.lat] // 合流点
	];
};

/**
 * 道路に沿った合流ルートを生成（複数のウェイポイント）
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} joinPoint - 合流点 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {Array} 道路に沿った合流ルートの座標配列
 */
export const generateRoadFollowingRejoinRoute = (currentLocation, joinPoint, routeData) => {
	if (!currentLocation || !joinPoint || !routeData) return null;

	// 現在地から合流点までの複数のウェイポイントを生成
	const waypoints = [];
	const steps = 15; // 15個のウェイポイントで分割
	
	for (let i = 0; i <= steps; i++) {
		const ratio = i / steps;
		const lat = currentLocation.lat + (joinPoint.lat - currentLocation.lat) * ratio;
		const lng = currentLocation.lng + (joinPoint.lng - currentLocation.lng) * ratio;
		
		waypoints.push([lng, lat]);
	}
	
	return waypoints;
};

/**
 * 正規ルートと同じ道路を使用した合流ルートを生成
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {Array} 道路ベースの合流ルートの座標配列
 */
export const generateRoadBasedRejoinRoute = (currentLocation, routeData) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return null;
	}

	const routeCoords = routeData.polyline.geometry.coordinates;
	
	// 現在地に最も近いルート上の点を見つける
	let closestIndex = 0;
	let minDistance = Infinity;
	
	for (let i = 0; i < routeCoords.length; i++) {
		const coord = routeCoords[i];
		const distance = calculateDistance(
			currentLocation.lat, currentLocation.lng,
			coord[1], coord[0]
		);
		
		if (distance < minDistance) {
			minDistance = distance;
			closestIndex = i;
		}
	}
	
	// 現在地から最も近いルート上の点までの道路ベースのルートを生成
	const roadBasedRoute = [];
	
	// 現在地を起点に追加
	roadBasedRoute.push([currentLocation.lng, currentLocation.lat]);
	
	// 最も近いルート上の点を追加
	roadBasedRoute.push(routeCoords[closestIndex]);
	
	// 必要に応じて、その後のルート上の点も追加（より自然な道路ルートのため）
	const maxAdditionalPoints = Math.min(5, routeCoords.length - closestIndex - 1);
	for (let i = 1; i <= maxAdditionalPoints; i++) {
		if (closestIndex + i < routeCoords.length) {
			roadBasedRoute.push(routeCoords[closestIndex + i]);
		}
	}
	
	return roadBasedRoute;
};

/**
 * 正規ルートの道路セグメントを使用した高度な合流ルート生成
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {Object} 合流ルート情報 {route, joinPoint, distance}
 */
export const generateAdvancedRoadBasedRejoinRoute = (currentLocation, routeData) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return null;
	}

	const routeCoords = routeData.polyline.geometry.coordinates;
	
	// 現在地に最も近いルート上の点を見つける
	let closestIndex = 0;
	let minDistance = Infinity;
	
	for (let i = 0; i < routeCoords.length; i++) {
		const coord = routeCoords[i];
		const distance = calculateDistance(
			currentLocation.lat, currentLocation.lng,
			coord[1], coord[0]
		);
		
		if (distance < minDistance) {
			minDistance = distance;
			closestIndex = i;
		}
	}
	
	const joinPoint = {
		lat: routeCoords[closestIndex][1],
		lng: routeCoords[closestIndex][0],
		index: closestIndex
	};
	
	// 道路に沿った合流ルートを生成
	const roadBasedRoute = [];
	
	// 現在地を起点に追加
	roadBasedRoute.push([currentLocation.lng, currentLocation.lat]);
	
	// 現在地から合流点までの道路に沿った中間点を生成
	const intermediateSteps = Math.min(8, Math.max(3, Math.floor(routeCoords.length / 20)));
	
	for (let i = 1; i <= intermediateSteps; i++) {
		const ratio = i / (intermediateSteps + 1);
		
		// 現在地と合流点の間の点を計算
		const lat = currentLocation.lat + (joinPoint.lat - currentLocation.lat) * ratio;
		const lng = currentLocation.lng + (joinPoint.lng - currentLocation.lng) * ratio;
		
		// この点に最も近いルート上の点を見つけて、道路に沿わせる
		let nearestRouteIndex = 0;
		let nearestDistance = Infinity;
		
		for (let j = 0; j < routeCoords.length; j++) {
			const coord = routeCoords[j];
			const distance = calculateDistance(lat, lng, coord[1], coord[0]);
			
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestRouteIndex = j;
			}
		}
		
		// 道路に沿った点を追加（ただし、現在地と合流点の間の範囲内）
		if (nearestRouteIndex >= Math.max(0, closestIndex - 5) && 
			nearestRouteIndex <= Math.min(routeCoords.length - 1, closestIndex + 5)) {
			roadBasedRoute.push(routeCoords[nearestRouteIndex]);
		} else {
			// 範囲外の場合は補間点を使用
			roadBasedRoute.push([lng, lat]);
		}
	}
	
	// 合流点を追加
	roadBasedRoute.push(routeCoords[closestIndex]);
	
	// 合流後のルートも追加（より自然な道路ルートのため）
	const postJoinSteps = Math.min(3, routeCoords.length - closestIndex - 1);
	for (let i = 1; i <= postJoinSteps; i++) {
		if (closestIndex + i < routeCoords.length) {
			roadBasedRoute.push(routeCoords[closestIndex + i]);
		}
	}
	
	return {
		route: roadBasedRoute,
		joinPoint: joinPoint,
		distance: minDistance
	};
};

/**
 * 道路の形状に沿った自然な合流ルートを生成
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {Object} 合流ルート情報 {route, joinPoint, distance}
 */
export const generateNaturalRoadBasedRejoinRoute = (currentLocation, routeData) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return null;
	}

	const routeCoords = routeData.polyline.geometry.coordinates;
	
	// 現在地に最も近いルート上の点を見つける
	let closestIndex = 0;
	let minDistance = Infinity;
	
	for (let i = 0; i < routeCoords.length; i++) {
		const coord = routeCoords[i];
		const distance = calculateDistance(
			currentLocation.lat, currentLocation.lng,
			coord[1], coord[0]
		);
		
		if (distance < minDistance) {
			minDistance = distance;
			closestIndex = i;
		}
	}
	
	const joinPoint = {
		lat: routeCoords[closestIndex][1],
		lng: routeCoords[closestIndex][0],
		index: closestIndex
	};
	
	// 道路の形状を考慮した合流ルートを生成
	const naturalRoute = [];
	
	// 現在地を起点に追加
	naturalRoute.push([currentLocation.lng, currentLocation.lat]);
	
	// 現在地から合流点までの道路に沿った点を生成（高密度で滑らかなポリライン）
	const totalSteps = Math.min(50, Math.max(20, Math.floor(routeCoords.length / 4)));
	
	for (let i = 1; i <= totalSteps; i++) {
		const ratio = i / (totalSteps + 1);
		
		// 現在地と合流点の間の補間点
		const interpolatedLat = currentLocation.lat + (joinPoint.lat - currentLocation.lat) * ratio;
		const interpolatedLng = currentLocation.lng + (joinPoint.lng - currentLocation.lng) * ratio;
		
		// この補間点に最も近いルート上の点を見つける
		let bestRouteIndex = closestIndex;
		let bestDistance = Infinity;
		
		// より広い範囲で検索して滑らかなルートを生成
		const searchRange = Math.min(20, Math.floor(routeCoords.length / 4));
		const startIndex = Math.max(0, closestIndex - searchRange);
		const endIndex = Math.min(routeCoords.length - 1, closestIndex + searchRange);
		
		for (let j = startIndex; j <= endIndex; j++) {
			const coord = routeCoords[j];
			const distance = calculateDistance(interpolatedLat, interpolatedLng, coord[1], coord[0]);
			
			if (distance < bestDistance) {
				bestDistance = distance;
				bestRouteIndex = j;
			}
		}
		
		// 道路に沿った点を追加
		naturalRoute.push(routeCoords[bestRouteIndex]);
		
		// より滑らかなルートのために、複数の中間点を生成
		if (i < totalSteps && bestRouteIndex < routeCoords.length - 1) {
			const nextCoord = routeCoords[bestRouteIndex + 1];
			
			// 3つの中間点を生成
			for (let k = 1; k <= 3; k++) {
				const midRatio = k / 4;
				const midLat = routeCoords[bestRouteIndex][1] + (nextCoord[1] - routeCoords[bestRouteIndex][1]) * midRatio;
				const midLng = routeCoords[bestRouteIndex][0] + (nextCoord[0] - routeCoords[bestRouteIndex][0]) * midRatio;
				naturalRoute.push([midLng, midLat]);
			}
		}
	}
	
	// 合流点を追加
	naturalRoute.push(routeCoords[closestIndex]);
	
	// 合流後の道路も追加（高密度で滑らかな表示）
	const postJoinSteps = Math.min(15, routeCoords.length - closestIndex - 1);
	for (let i = 1; i <= postJoinSteps; i++) {
		if (closestIndex + i < routeCoords.length) {
			naturalRoute.push(routeCoords[closestIndex + i]);
			
			// 合流後の道路も中間点を追加
			if (i < postJoinSteps && closestIndex + i + 1 < routeCoords.length) {
				const currentCoord = routeCoords[closestIndex + i];
				const nextCoord = routeCoords[closestIndex + i + 1];
				
				// 2つの中間点を生成
				for (let k = 1; k <= 2; k++) {
					const midRatio = k / 3;
					const midLat = currentCoord[1] + (nextCoord[1] - currentCoord[1]) * midRatio;
					const midLng = currentCoord[0] + (nextCoord[0] - currentCoord[0]) * midRatio;
					naturalRoute.push([midLng, midLat]);
				}
			}
		}
	}
	
	return {
		route: naturalRoute,
		joinPoint: joinPoint,
		distance: minDistance
	};
};

/**
 * 超高密度の合流ルートを生成（Firebase制限なし）- 道路に沿った自然なルート
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {Object} 合流ルート情報 {route, joinPoint, distance}
 */
export const generateUltraDenseRejoinRoute = (currentLocation, routeData) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return null;
	}

	const routeCoords = routeData.polyline.geometry.coordinates;
	
	// 現在地に最も近いルート上の点を見つける
	let closestIndex = 0;
	let minDistance = Infinity;
	
	for (let i = 0; i < routeCoords.length; i++) {
		const coord = routeCoords[i];
		const distance = calculateDistance(
			currentLocation.lat, currentLocation.lng,
			coord[1], coord[0]
		);
		
		if (distance < minDistance) {
			minDistance = distance;
			closestIndex = i;
		}
	}
	
	const joinPoint = {
		lat: routeCoords[closestIndex][1],
		lng: routeCoords[closestIndex][0],
		index: closestIndex
	};
	
	// シンプルで確実に道路に沿った合流ルートを生成
	const roadBasedRoute = [];
	
	// 現在地を起点に追加
	roadBasedRoute.push([currentLocation.lng, currentLocation.lat]);
	
	// 現在地から合流点までの道路に沿ったルートを生成
	// 1. 現在地に最も近いルートセグメントを見つける
	let nearestSegmentStart = 0;
	let nearestSegmentEnd = 1;
	let nearestSegmentDistance = Infinity;
	
	for (let i = 0; i < routeCoords.length - 1; i++) {
		const segmentDistance = distanceToLineSegment(
			currentLocation,
			routeCoords[i],
			routeCoords[i + 1]
		);
		
		if (segmentDistance < nearestSegmentDistance) {
			nearestSegmentDistance = segmentDistance;
			nearestSegmentStart = i;
			nearestSegmentEnd = i + 1;
		}
	}
	
	// 2. 現在地から最も近いルートセグメントへの投影点を計算
	const segmentStart = routeCoords[nearestSegmentStart];
	const segmentEnd = routeCoords[nearestSegmentEnd];
	
	const A = currentLocation.lat - segmentStart[1];
	const B = currentLocation.lng - segmentStart[0];
	const C = segmentEnd[1] - segmentStart[1];
	const D = segmentEnd[0] - segmentStart[0];
	
	const dot = A * C + B * D;
	const lenSq = C * C + D * D;
	let param = 0;
	if (lenSq !== 0) {
		param = Math.max(0, Math.min(1, dot / lenSq));
	}
	
	const projectionPoint = {
		lat: segmentStart[1] + param * C,
		lng: segmentStart[0] + param * D
	};
	
	// 3. 投影点を追加（道路への最短距離点）
	roadBasedRoute.push([projectionPoint.lng, projectionPoint.lat]);
	
	// 4. 投影点から合流点までの道路に沿ったルートを生成
	// 投影点のインデックスを計算
	const projectionIndex = nearestSegmentStart + param;
	
	// 投影点から合流点までの実際のルート上の点を使用
	if (projectionIndex <= closestIndex) {
		// 前方へのルート
		const steps = Math.min(15, closestIndex - Math.floor(projectionIndex));
		for (let i = 1; i <= steps; i++) {
			const routeIndex = Math.floor(projectionIndex) + Math.floor((closestIndex - Math.floor(projectionIndex)) * i / steps);
			if (routeIndex < routeCoords.length && routeIndex >= 0) {
				roadBasedRoute.push(routeCoords[routeIndex]);
			}
		}
	} else {
		// 後方へのルート（Uターンなど）
		const steps = Math.min(15, Math.floor(projectionIndex) - closestIndex);
		for (let i = 1; i <= steps; i++) {
			const routeIndex = Math.floor(projectionIndex) - Math.floor((Math.floor(projectionIndex) - closestIndex) * i / steps);
			if (routeIndex >= 0 && routeIndex < routeCoords.length) {
				roadBasedRoute.push(routeCoords[routeIndex]);
			}
		}
	}
	
	// 5. 合流点を追加
	roadBasedRoute.push(routeCoords[closestIndex]);
	
	// 6. 合流後の道路も追加（より自然な表示のため）
	const postJoinSteps = Math.min(8, routeCoords.length - closestIndex - 1);
	for (let i = 1; i <= postJoinSteps; i++) {
		if (closestIndex + i < routeCoords.length) {
			roadBasedRoute.push(routeCoords[closestIndex + i]);
		}
	}
	
	return {
		route: roadBasedRoute,
		joinPoint: joinPoint,
		distance: minDistance
	};
};

/**
 * OSRM APIを使用した道路に沿った合流ルートを生成
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {Promise<Object>} 合流ルート情報 {route, joinPoint, distance}
 */
export const generateOSRMRejoinRoute = async (currentLocation, routeData) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return null;
	}

	const routeCoords = routeData.polyline.geometry.coordinates;
	
	// 現在地に最も近いルート上の点を見つける
	let closestIndex = 0;
	let minDistance = Infinity;
	
	for (let i = 0; i < routeCoords.length; i++) {
		const coord = routeCoords[i];
		const distance = calculateDistance(
			currentLocation.lat, currentLocation.lng,
			coord[1], coord[0]
		);
		
		if (distance < minDistance) {
			minDistance = distance;
			closestIndex = i;
		}
	}
	
	const joinPoint = {
		lat: routeCoords[closestIndex][1],
		lng: routeCoords[closestIndex][0],
		index: closestIndex
	};
	
	try {
		// OSRM APIを使用して現在地から合流点までの道路に沿ったルートを取得
		const response = await fetch(
			`https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${joinPoint.lng},${joinPoint.lat}?overview=simplified&geometries=geojson&steps=false`
		);
		
		if (response.ok) {
			const result = await response.json();
			if (result.routes && result.routes.length > 0) {
				const route = result.routes[0];
				const osrmRoute = route.geometry.coordinates.map(coord => [coord[0], coord[1]]);
				
				console.log('🛣️ OSRM API合流ルート生成成功:', {
					current: currentLocation,
					joinPoint: joinPoint,
					distance: minDistance.toFixed(1) + 'm',
					routePoints: osrmRoute.length,
					routeType: 'OSRM API道路ルート'
				});
				
				return {
					route: osrmRoute,
					joinPoint: joinPoint,
					distance: minDistance
				};
			}
		}
	} catch (error) {
		console.warn('⚠️ OSRM API合流ルート生成に失敗:', error);
	}
	
	// OSRM APIが失敗した場合は、従来の方法を使用
	console.log('🔄 OSRM API失敗、従来の方法で合流ルート生成');
	return generateUltraDenseRejoinRoute(currentLocation, routeData);
};

/**
 * 正規ルートまでの最短距離を計算
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @returns {Object} 最短距離情報 {distance, closestPoint}
 */
export const calculateShortestDistanceToRoute = (currentLocation, routeData) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return { distance: Infinity, closestPoint: null };
	}

	const routeCoords = routeData.polyline.geometry.coordinates;
	let minDistance = Infinity;
	let closestPoint = null;

	for (let i = 0; i < routeCoords.length - 1; i++) {
		const p1 = routeCoords[i]; // [lng, lat]
		const p2 = routeCoords[i + 1]; // [lng, lat]

		// 線分への投影点を計算
		const A = currentLocation.lat - p1[1];
		const B = currentLocation.lng - p1[0];
		const C = p2[1] - p1[1];
		const D = p2[0] - p1[0];

		const dot = A * C + B * D;
		const lenSq = C * C + D * D;
		let param = -1;
		if (lenSq !== 0) {
			param = dot / lenSq;
		}

		let xx, yy;
		if (param < 0) {
			xx = p1[0];
			yy = p1[1];
		} else if (param > 1) {
			xx = p2[0];
			yy = p2[1];
		} else {
			xx = p1[0] + param * D;
			yy = p1[1] + param * C;
		}

		const distance = calculateDistance(currentLocation.lat, currentLocation.lng, yy, xx);

		if (distance < minDistance) {
			minDistance = distance;
			closestPoint = {
				lat: yy,
				lng: xx,
				index: i
			};
		}
	}

	return { distance: minDistance, closestPoint };
};

/**
 * ルートの進行方向を計算
 * @param {Object} routeData - ルートデータ
 * @param {number} pointIndex - ルート上の点のインデックス
 * @returns {number} 方位角（0-360度）
 */
export const calculateRouteDirection = (routeData, pointIndex = 0) => {
	if (!routeData || !routeData.polyline?.geometry?.coordinates || 
		routeData.polyline.geometry.coordinates.length < 2) {
		return 0;
	}

	const coordinates = routeData.polyline.geometry.coordinates;
	const currentIndex = Math.min(pointIndex, coordinates.length - 2);
	const start = coordinates[currentIndex];
	const next = coordinates[currentIndex + 1];
	
	const lat1 = start[1] * Math.PI / 180;
	const lat2 = next[1] * Math.PI / 180;
	const deltaLng = (next[0] - start[0]) * Math.PI / 180;
	
	const y = Math.sin(deltaLng) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
	
	let bearing = Math.atan2(y, x) * 180 / Math.PI;
	return (bearing + 360) % 360;
};

/**
 * ルートの次の合流点を予測
 * @param {Object} currentLocation - 現在地 {lat, lng}
 * @param {Object} routeData - ルートデータ
 * @param {number} lookAhead - 先読みする距離（メートル）
 * @returns {Object} 次の合流点情報
 */
export const predictNextJoinPoint = (currentLocation, routeData, lookAhead = 1000) => {
	if (!currentLocation || !routeData || !routeData.polyline?.geometry?.coordinates) {
		return null;
	}

	const coordinates = routeData.polyline.geometry.coordinates;
	const joinInfo = calculateJoinPoint(currentLocation, routeData);
	
	if (!joinInfo) {
		return null;
	}

	// 合流点から先のルートを探索
	const startIndex = joinInfo.joinPoint.index;
	const totalDistance = lookAhead;
	let accumulatedDistance = 0;
	let nextJoinPoint = null;

	for (let i = startIndex; i < coordinates.length - 1; i++) {
		const segmentDistance = calculateDistance(
			coordinates[i][1], coordinates[i][0],
			coordinates[i + 1][1], coordinates[i + 1][0]
		);
		
		accumulatedDistance += segmentDistance;
		
		if (accumulatedDistance >= totalDistance) {
			nextJoinPoint = {
				lat: coordinates[i + 1][1],
				lng: coordinates[i + 1][0],
				index: i + 1,
				distance: accumulatedDistance
			};
			break;
		}
	}

	return nextJoinPoint;
};
