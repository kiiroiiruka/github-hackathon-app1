import { onValue, ref, update } from "firebase/database";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AudioCallRoom from "@/components/VideoCall/VideoCallRoom";
import AudioCallFooter from "@/components/Footer/AudioCallFooter";
import { auth, rtdb } from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";
import { getGooglePhotoURL } from "@/hooks/useUser";
import { checkAndDeleteRoomIfEmpty } from "@/firebase/room";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Icon } from "leaflet";
import { getMemosByUser } from "@/firebase";
import { isOnRoute, calculateJoinPoint, generateRejoinRoute, generateRoadFollowingRejoinRoute, generateAdvancedRoadBasedRejoinRoute, generateNaturalRoadBasedRejoinRoute, generateUltraDenseRejoinRoute, generateOSRMRejoinRoute, calculateShortestDistanceToRoute } from "@/utils/routeUtils";
import { getDirectionName } from "@/utils/mapRotationUtils";

// 固定ポップアップのCSSスタイル
const fixedPopupStyle = `
	.fixed-popup {
		transform-origin: center center !important;
	}
	.fixed-popup .leaflet-popup-content-wrapper {
		transform-origin: center center !important;
	}
	.fixed-popup .leaflet-popup-tip {
		transform-origin: center center !important;
	}
`;

// ルート上判定のしきい値（m）: 小さめにして軽微な逸脱でも合流ルートを表示
const ROUTE_THRESHOLD_METERS = 20;

// 緯度経度間の距離（m）
const getDistanceMeters = (a, b) => {
	const R = 6371000; // 地球半径(m)
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const sinDLat = Math.sin(dLat / 2);
	const sinDLng = Math.sin(dLng / 2);
	const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

// 地図コンテナ内でズームと中心を制御するコンポーネント（ボタンズームのみ有効版・フォーカス機能対応）
const MapController = ({ zoomLevel, center, currentLocation, focusedMember }) => {
	const map = useMap();
	
	useEffect(() => {
		if (map) {
			// すべてのズーム操作を無効化（ボタンズームのみ有効）
			map.dragging.disable(); // ドラッグ移動を無効化
			map.boxZoom.disable(); // ボックスズームを無効化
			map.keyboard.disable(); // キーボード操作を無効化
			map.touchZoom.disable(); // タッチズームを無効化
			map.doubleClickZoom.disable(); // ダブルクリックズームを無効化
			map.scrollWheelZoom.disable(); // マウスホイールズームを無効化
			
			// ズームレベルを設定
			if (zoomLevel !== undefined) {
				map.setZoom(zoomLevel);
			}
		}
	}, [map, zoomLevel]);

	useEffect(() => {
		if (map && center) {
			// フォーカス中のメンバーがいる場合はその位置を中心にする
			if (focusedMember) {
				map.setView(center, zoomLevel, {
					animate: true,
					duration: 0.8
				});
			} else if (currentLocation) {
				// 現在地がある場合は絶対に現在地を中心にする
				map.setView([currentLocation.lat, currentLocation.lng], zoomLevel, {
					animate: true,
					duration: 0.5
				});
			} else {
				map.setView(center, zoomLevel, {
					animate: true,
					duration: 0.5
				});
			}
		}
	}, [map, center, zoomLevel, currentLocation, focusedMember]);
	
	return null;
};

// 休憩地点設定用のマップクリックハンドラ
const MapClickHandler = ({ enabled, onClick }) => {
	const map = useMap();
	useEffect(() => {
		if (!map) return;
		const handler = (e) => {
			if (!enabled) return;
			onClick?.(e.latlng);
		};
		map.on('click', handler);
		return () => {
			map.off('click', handler);
		};
	}, [map, enabled, onClick]);
	return null;
};

// メモの自動スクロールコンポーネント
const MemoScroller = ({ memos }) => {
	const [currentMemoIndex, setCurrentMemoIndex] = useState(0);
	const [scrollPosition, setScrollPosition] = useState(0);
	const containerRef = useRef(null);
	const intervalRef = useRef(null);
	
	useEffect(() => {
		if (memos.length === 0) return;
		
		// 3秒間隔でメモを切り替え
		intervalRef.current = setInterval(() => {
			setCurrentMemoIndex((prev) => (prev + 1) % memos.length);
			setScrollPosition(0); // スクロール位置をリセット
		}, 5000);
		
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [memos.length]);
	
	useEffect(() => {
		if (!containerRef.current || memos.length === 0) return;
		
		const container = containerRef.current;
		const textWidth = container.scrollWidth;
		const containerWidth = container.clientWidth;
		
		if (textWidth <= containerWidth) return;
		
		// 2秒間隔でスクロール
		const scrollInterval = setInterval(() => {
			setScrollPosition((prev) => {
				const maxScroll = textWidth - containerWidth;
				if (prev >= maxScroll) {
					return 0; // 最初に戻る
				}
				return prev + 1;
			});
		}, 50);
		
		return () => clearInterval(scrollInterval);
	}, [currentMemoIndex, memos]);
	
	if (memos.length === 0) {
		return (
			<div className="bg-pink-200 border-2 border-pink-300 rounded-lg p-3 h-16 flex items-center justify-center">
				<span className="text-gray-600">メモがありません</span>
			</div>
		);
	}
	
	const currentMemo = memos[currentMemoIndex];
	
	return (
		<div 
			ref={containerRef}
			className="bg-pink-200 border-2 border-pink-300 rounded-lg p-3 h-16 overflow-hidden relative"
		>
			<div 
				className="whitespace-nowrap text-gray-800 font-medium"
				style={{ 
					transform: `translateX(-${scrollPosition}px)`,
					transition: 'transform 0.1s ease-out'
				}}
			>
				{currentMemo.content}
			</div>
		</div>
	);
};

const CarNavigation = () => {
	const { roomId } = useParams();
	const navigate = useNavigate();
	const [members, setMembers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [roomData, setRoomData] = useState(null);
	const [showAudioCall, setShowAudioCall] = useState(true); // デフォルトで通話開始
	const [isCallActive, setIsCallActive] = useState(false); // 通話状態
	const [callParticipants, setCallParticipants] = useState([]); // 通話参加者
	const [participantPhotoURLs, setParticipantPhotoURLs] = useState(new Map()); // 参加者のphotoURL情報
	const [routeData, setRouteData] = useState(null); // ルート情報
	const [memos, setMemos] = useState([]);
	const [activeTab, setActiveTab] = useState('main'); // 'main', 'locations', 'rest'
	const [mapZoom, setMapZoom] = useState(10);
	const [mapRotation, setMapRotation] = useState(0); // 地図の回転角度（常に0度で北向き）
	const [isLandscape, setIsLandscape] = useState(false);
	const [currentLocation, setCurrentLocation] = useState(null);
	const [isUsingMockLocation, setIsUsingMockLocation] = useState(true);
	const [mockLocationIndex, setMockLocationIndex] = useState(0);
	const [routeStatus, setRouteStatus] = useState({ isOnRoute: true, distance: 0 });
	const [rejoinRoute, setRejoinRoute] = useState(null);
	const [joinPoint, setJoinPoint] = useState(null);
	const [memberLocations, setMemberLocations] = useState(new Map()); // メンバーの位置情報
	const [moveDistance, setMoveDistance] = useState(0.001); // 移動距離（デフォルト100m）
	const [focusedMember, setFocusedMember] = useState(null); // フォーカス中のメンバー
	const [etaTime, setEtaTime] = useState(null); // 動的到着時刻
	const [etaSource, setEtaSource] = useState('route'); // 'route' | 'rejoin' | 'rest'
	const [restPoint, setRestPoint] = useState(null); // 休憩地点
	const [restRoute, setRestRoute] = useState(null); // 休憩地点への新ルート
	const currentUserUid = useUserUid();
	const updateTimeoutRef = useRef(null);
	const gpsIntervalRef = useRef(null);
	const rejoinCalcDebounceRef = useRef(null); // 現在地更新時のデバウンス
	const lastRecalcTimeRef = useRef(0); // 直近の合流ルート再計算時刻
	const lastRejoinInfoRef = useRef(null); // { start: {lat,lng}, joinPoint: {lat,lng} }
	const isUpdatingRejoinRef = useRef(false);

	// 初期状態で適当な座標をセット
	const setInitialMockLocation = () => {
		// 東京駅周辺の適当な座標をセット
		const initialLocation = {
			lat: 35.6812 + (Math.random() - 0.5) * 0.01, // ±0.005度の範囲
			lng: 139.7671 + (Math.random() - 0.5) * 0.01
		};
		setCurrentLocation(initialLocation);
		setIsUsingMockLocation(true);
		setMockLocationIndex(0);
		console.log('🎯 初期適当座標設定:', initialLocation);
	};

	// GPS位置情報の取得
	const getCurrentPosition = () => {
		if (!navigator.geolocation) {
			console.log('GPS not supported');
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				const newLocation = { lat: latitude, lng: longitude };
				setCurrentLocation(newLocation);
				setIsUsingMockLocation(false);
				console.log('📍 GPS位置取得:', { latitude, longitude });
				
				// Firebaseに位置情報を送信
				sendLocationToFirebase(newLocation);
			},
			(error) => {
				console.error('GPS error:', error);
				// GPSが失敗した場合はモック位置を使用
				setIsUsingMockLocation(true);
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 60000
			}
		);
	};

	// Firebaseに位置情報を送信
	const sendLocationToFirebase = async (location) => {
		if (!roomId || !currentUserUid || !location) return;

		try {
			const locationData = {
				lat: location.lat,
				lng: location.lng,
				timestamp: Date.now(),
				isUsingMockLocation: isUsingMockLocation,
				lastUpdated: new Date().toISOString()
			};

			await update(ref(rtdb, `rooms/${roomId}/memberLocations/${currentUserUid}`), locationData);
			console.log('📍 位置情報をFirebaseに送信:', locationData);
		} catch (error) {
			console.error('❌ 位置情報送信エラー:', error);
		}
	};

	// 5秒間隔でGPS位置情報を送信
	const startLocationSharing = () => {
		if (gpsIntervalRef.current) {
			clearInterval(gpsIntervalRef.current);
		}

		// 初回送信
		if (currentLocation) {
			sendLocationToFirebase(currentLocation);
		}

		// 5秒間隔で送信
		gpsIntervalRef.current = setInterval(() => {
			if (currentLocation) {
				sendLocationToFirebase(currentLocation);
			}
		}, 5000);

		console.log('🔄 GPS位置情報共有開始（5秒間隔）');
	};

	// 位置情報共有を停止
	const stopLocationSharing = () => {
		if (gpsIntervalRef.current) {
			clearInterval(gpsIntervalRef.current);
			gpsIntervalRef.current = null;
		}
		console.log('⏹️ GPS位置情報共有停止');
	};

	// テスト用の仮座標をルート上に生成
	const generateMockLocations = () => {
		if (!routeData || !routeData.polyline?.geometry?.coordinates) return [];
		
		const coordinates = routeData.polyline.geometry.coordinates;
		const mockLocations = [];
		
		// ルート上に等間隔でテスト座標を生成
		for (let i = 0; i < coordinates.length; i += Math.max(1, Math.floor(coordinates.length / 20))) {
			const coord = coordinates[i];
			mockLocations.push({
				lat: coord[1],
				lng: coord[0],
				index: i
			});
		}
		
		return mockLocations;
	};

	// モック位置を次の位置に移動
	const moveToNextMockLocation = () => {
		const mockLocations = generateMockLocations();
		if (mockLocations.length === 0) return;
		
		setMockLocationIndex((prev) => (prev + 1) % mockLocations.length);
		const nextLocation = mockLocations[(mockLocationIndex + 1) % mockLocations.length];
		setCurrentLocation(nextLocation);
		console.log('🎯 モック位置移動:', nextLocation);
		
		// 回転機能は無効化（常に北向き）
		console.log('🧭 回転機能は無効化されています - 常に北向きを維持');
	};

	// 開発用の位置操作関数
	const moveLocation = (direction) => {
		if (!currentLocation) return;
		
		const offset = moveDistance; // 設定された移動距離を使用
		let newLocation = { ...currentLocation };
		
		switch (direction) {
			case 'north':
				newLocation.lat += offset;
				break;
			case 'south':
				newLocation.lat -= offset;
				break;
			case 'east':
				newLocation.lng += offset;
				break;
			case 'west':
				newLocation.lng -= offset;
				break;
			case 'northeast':
				newLocation.lat += offset;
				newLocation.lng += offset;
				break;
			case 'northwest':
				newLocation.lat += offset;
				newLocation.lng -= offset;
				break;
			case 'southeast':
				newLocation.lat -= offset;
				newLocation.lng += offset;
				break;
			case 'southwest':
				newLocation.lat -= offset;
				newLocation.lng -= offset;
				break;
		}
		
		setCurrentLocation(newLocation);
		console.log(`🎮 位置移動 (${direction}, ${offset}度):`, newLocation);
		
		// 位置移動後、Firebaseに送信
		sendLocationToFirebase(newLocation);
	};

	// 地図のズーム制御
	const handleZoomIn = () => {
		setMapZoom(prev => Math.min(prev + 1, 18));
	};

	const handleZoomOut = () => {
		setMapZoom(prev => Math.max(prev - 1, 1));
	};

	// ズームレベルに応じた座標の最適化（実用上限対応）
	const getOptimizedCoordinates = (coordinates, zoomLevel) => {
		if (!coordinates || coordinates.length === 0) return [];
		
		// 1000点以下はそのまま返す
		if (coordinates.length <= 1000) return coordinates;
		
		// ズームレベルに応じて表示する点数を決定
		let maxPoints;
		if (zoomLevel >= 16) {
			maxPoints = Math.min(5000, coordinates.length); // 高ズーム: 最大5000点
		} else if (zoomLevel >= 14) {
			maxPoints = Math.min(3000, coordinates.length); // 中ズーム: 最大3000点
		} else if (zoomLevel >= 12) {
			maxPoints = Math.min(1500, coordinates.length); // 低ズーム: 最大1500点
		} else {
			maxPoints = Math.min(800, coordinates.length); // 超低ズーム: 最大800点
		}
		
		// 間引き計算
		const step = Math.max(1, Math.floor(coordinates.length / maxPoints));
		const optimized = [];
		
		// 最初の点を必ず含める
		optimized.push(coordinates[0]);
		
		// 曲がり角を検出して重要な点を保持
		for (let i = step; i < coordinates.length - step; i += step) {
			const prev = coordinates[i - step];
			const curr = coordinates[i];
			const next = coordinates[i + step];
			
			// 角度変化を計算
			const angle1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
			const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
			const angleDiff = Math.abs(angle1 - angle2);
			
			// 角度変化が大きい場合（曲がり角）は保持
			if (angleDiff > 0.1 || i % (step * 2) === 0) {
				optimized.push(curr);
			}
		}
		
		// 最後の点を必ず含める
		optimized.push(coordinates[coordinates.length - 1]);
		
		console.log(`🗺️ ポリライン最適化: ${coordinates.length}点 → ${optimized.length}点 (ズーム: ${zoomLevel})`);
		
		return optimized;
	};

// ルート判定と合流ルート計算（OSRM API使用版）
const updateRouteStatus = async (source = 'timer') => {
		if (!currentLocation || !routeData) return;

		// 高精度の最短距離で判定（20m閾値）
		const { distance } = calculateShortestDistanceToRoute(currentLocation, routeData);
		const onRoute = distance <= ROUTE_THRESHOLD_METERS;
		setRouteStatus({ isOnRoute: onRoute, distance: distance || 0 });

		if (!onRoute) {
			// 休憩タブ中は合流ルートを更新しない（UI要件）
			if (activeTab === 'rest') return;

			// 位置ノイズによるルートのコロコロ切替を抑制（ヒステリシス）
			const now = Date.now();
			const last = lastRejoinInfoRef.current;
			if (last) {
				const movedFromLastStart = getDistanceMeters(currentLocation, last.start);
				const elapsedMs = now - lastRecalcTimeRef.current;
				// 直近再計算から8秒以内かつ開始点からの移動が25m未満なら再計算をスキップ
				if (elapsedMs < 8000 && movedFromLastStart < 25) {
					return;
				}
			}
			if (isUpdatingRejoinRef.current) return;
			isUpdatingRejoinRef.current = true;
			// ルートから外れている場合、OSRM APIを使用して道路に沿った合流ルートを生成
			try {
				const osrmInfo = await generateOSRMRejoinRoute(currentLocation, routeData);
				if (osrmInfo) {
					setJoinPoint(osrmInfo.joinPoint);
					setRejoinRoute(osrmInfo.route);
					lastRejoinInfoRef.current = { start: { ...currentLocation }, joinPoint: osrmInfo.joinPoint };
					lastRecalcTimeRef.current = now;
					console.log('🛣️ OSRM API合流ルート生成:', {
						current: currentLocation,
						joinPoint: osrmInfo.joinPoint,
						distance: (osrmInfo.distance || distance).toFixed ? (osrmInfo.distance || distance).toFixed(1) + 'm' : `${Math.round(distance)}m`,
						routePoints: osrmInfo.route.length,
						routeType: 'OSRM API道路ルート'
					});

					// 合流までのETAをOSRMから取得
					try {
						const etaUrl = `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${osrmInfo.joinPoint.lng},${osrmInfo.joinPoint.lat}?overview=false&geometries=geojson`;
						const etaRes = await fetch(etaUrl);
						const etaData = await etaRes.json();
						const durSec = etaData?.routes?.[0]?.duration;
						if (typeof durSec === 'number') {
							setEtaTime(new Date(Date.now() + durSec * 1000));
							setEtaSource('rejoin');
						}
					} catch (_) {}
				}
			} catch (error) {
				console.warn('⚠️ OSRM API合流ルート生成エラー:', error);
				// フォールバック: 従来の方法を使用
				const ultraDenseInfo = generateUltraDenseRejoinRoute(currentLocation, routeData);
				if (ultraDenseInfo) {
					setJoinPoint(ultraDenseInfo.joinPoint);
					setRejoinRoute(ultraDenseInfo.route);
					console.log('🛣️ フォールバック合流ルート生成:', {
						current: currentLocation,
						joinPoint: ultraDenseInfo.joinPoint,
						distance: (ultraDenseInfo.distance || distance).toFixed ? (ultraDenseInfo.distance || distance).toFixed(1) + 'm' : `${Math.round(distance)}m`,
						routePoints: ultraDenseInfo.route.length,
						routeType: '従来の道路ベースルート'
					});
				}
			}
			finally {
				isUpdatingRejoinRef.current = false;
			}
		} else {
			// ルート上にいる場合、合流ルートをクリア
			setRejoinRoute(null);
			setJoinPoint(null);
			console.log('✅ ルート上にいます');
		}
	};

	// 現在地を中心とした地図の中心座標を計算（フォーカス機能対応）
	const getMapCenter = () => {
		// フォーカス中のメンバーがいる場合はその位置を中心にする
		if (focusedMember) {
			const memberLocation = memberLocations.get(focusedMember.uid);
			if (memberLocation) {
				return [memberLocation.lat, memberLocation.lng];
			}
		}
		
		if (currentLocation) {
			// 現在地を絶対に中心に固定
			return [currentLocation.lat, currentLocation.lng];
		}
		// デフォルト座標（東京駅周辺）
		return [35.6812, 139.7671];
	};

	// カスタムアイコンの設定
	const startIcon = new Icon({
		iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
		shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41]
	});

	const goalIcon = new Icon({
		iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
		shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41]
	});

	const currentLocationIcon = new Icon({
		iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
		shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
		iconSize: [30, 50],
		iconAnchor: [15, 50],
		popupAnchor: [1, -34],
		shadowSize: [50, 50]
	});

	const joinPointIcon = new Icon({
		iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
		shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41]
	});

	// メモデータを取得
	useEffect(() => {
		const loadMemos = async () => {
			if (!currentUserUid) return;
			try {
				const userMemos = await getMemosByUser(currentUserUid);
				setMemos(userMemos);
			} catch (error) {
				console.error("メモ取得エラー:", error);
			}
		};
		
		loadMemos();
	}, [currentUserUid]);

// 初期ETAをルート情報から設定
useEffect(() => {
	if (routeData?.routeInfo?.arrivalTime) {
		setEtaTime(new Date(routeData.routeInfo.arrivalTime));
		setEtaSource('route');
	}
}, [routeData?.routeInfo?.arrivalTime]);

	// 他のメンバーの位置情報をリアルタイム取得
	useEffect(() => {
		if (!roomId) return;

		const memberLocationsRef = ref(rtdb, `rooms/${roomId}/memberLocations`);
		const unsubscribe = onValue(
			memberLocationsRef,
			(snapshot) => {
				const locations = snapshot.val();
				if (locations) {
					const locationMap = new Map();
					
					Object.entries(locations).forEach(([uid, locationData]) => {
						// 自分の位置情報は除外
						if (uid !== currentUserUid && locationData) {
							// 5分以内の位置情報のみ有効
							const isRecent = Date.now() - locationData.timestamp < 5 * 60 * 1000;
							if (isRecent) {
								locationMap.set(uid, {
									lat: locationData.lat,
									lng: locationData.lng,
									timestamp: locationData.timestamp,
									isUsingMockLocation: locationData.isUsingMockLocation,
									lastUpdated: locationData.lastUpdated
								});
							}
						}
					});
					
					setMemberLocations(locationMap);
					console.log('📍 メンバー位置情報を更新:', {
						count: locationMap.size,
						locations: Array.from(locationMap.entries())
					});
				} else {
					setMemberLocations(new Map());
				}
			},
			(error) => {
				console.error('❌ メンバー位置情報取得エラー:', error);
			}
		);

		return () => unsubscribe();
	}, [roomId, currentUserUid]);

// 現在地変更時にルート状態をデバウンス更新（500ms）
useEffect(() => {
	if (!currentLocation || !routeData) return;
	if (rejoinCalcDebounceRef.current) {
		clearTimeout(rejoinCalcDebounceRef.current);
	}
	rejoinCalcDebounceRef.current = setTimeout(() => {
		updateRouteStatus('location');
	}, 500);
	return () => {
		if (rejoinCalcDebounceRef.current) {
			clearTimeout(rejoinCalcDebounceRef.current);
		}
	};
}, [currentLocation, routeData]);

	// 4秒間隔でルート判定とオレンジルート再計算を行うタイマー
	useEffect(() => {
		if (!currentLocation || !routeData) return;

		const routeCheckInterval = setInterval(async () => {
			console.log('🔄 4秒間隔ルート判定・オレンジルート再計算実行');
			await updateRouteStatus();
		}, 4000);

		return () => {
			clearInterval(routeCheckInterval);
		};
	}, [currentLocation, routeData]);

	// 初期状態で適当な座標をセット
	useEffect(() => {
		if (!currentLocation) {
			setInitialMockLocation();
		}
	}, []);

	// 位置情報共有の開始・停止制御
	useEffect(() => {
		if (roomId && currentUserUid && currentLocation) {
			// 位置情報共有を開始
			startLocationSharing();
		}

		// クリーンアップ
		return () => {
			stopLocationSharing();
		};
	}, [roomId, currentUserUid, currentLocation]);

	// 固定ポップアップのCSSスタイルを適用
	useEffect(() => {
		const styleElement = document.createElement('style');
		styleElement.textContent = fixedPopupStyle;
		document.head.appendChild(styleElement);
		
		return () => {
			document.head.removeChild(styleElement);
		};
	}, []);

	// 地図の移動とズーム操作を無効化するためのCSS（ボタンズームのみ有効）
	useEffect(() => {
		const disableMapInteractionStyle = `
			.leaflet-container {
				cursor: default !important;
			}
			.leaflet-container .leaflet-control-container {
				pointer-events: auto !important;
			}
			.leaflet-container .leaflet-popup {
				pointer-events: auto !important;
			}
			.leaflet-container .leaflet-marker-icon {
				pointer-events: auto !important;
			}
			/* カスタムズームボタンのみ有効 */
			.leaflet-container .leaflet-control-zoom {
				display: none !important;
			}
			/* マウスホイールズームを完全に無効化 */
			.leaflet-container {
				overflow: hidden !important;
			}
			/* タッチズームを無効化 */
			.leaflet-container.leaflet-touch {
				touch-action: none !important;
			}
		`;
		
		const styleElement = document.createElement('style');
		styleElement.textContent = disableMapInteractionStyle;
		document.head.appendChild(styleElement);
		
		return () => {
			document.head.removeChild(styleElement);
		};
	}, []);

	// 丸型アイコン用のCSSを注入
	useEffect(() => {
		const css = `
			.rounded-map-icon-wrapper { background: transparent; border: none; }
			.rounded-map-icon {
				border-radius: 9999px; /* fully rounded */
				object-fit: cover;
				display: block;
				border: 2px solid #ffffff;
				box-shadow: 0 0 0 2px rgba(59,130,246,0.6); /* blue ring */
			}
			@keyframes blinkFade { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
			.blink-text { animation: blinkFade 1.2s ease-in-out infinite; }
		`;
		const style = document.createElement('style');
		style.textContent = css;
		document.head.appendChild(style);
		return () => document.head.removeChild(style);
	}, []);

	// 丸型の写真アイコンを生成
	const createRoundedImageIcon = (url, sizePx) => {
		const size = Math.max(24, Math.min(96, sizePx || 32));
		const html = `<img src="${url}" alt="icon" class="rounded-map-icon" style="width:${size}px;height:${size}px;"/>`;
		return L.divIcon({
			html,
			className: 'rounded-map-icon-wrapper',
			iconSize: [size, size],
			iconAnchor: [size/2, size/2],
			popupAnchor: [0, -size/2]
		});
	};

	// タブ切り替え
	const handleTabChange = (tab) => {
		setActiveTab(tab);
		// タブ切り替え時にフォーカスをリセット
		if (tab !== 'locations') {
			setFocusedMember(null);
		}
	};

	// メンバーをフォーカスする関数
	const focusOnMember = (member) => {
		setFocusedMember(member);
		console.log('🎯 メンバーにフォーカス:', {
			name: member.name,
			uid: member.uid,
			hasLocation: memberLocations.has(member.uid)
		});
	};

	// フォーカスをリセットする関数
	const resetFocus = () => {
		setFocusedMember(null);
		console.log('🔄 フォーカスをリセット');
	};

	// 休憩地点クリック時: 現在地→休憩地点の経路をOSRMで取得
	const computeRestRoute = async (from, to) => {
		try {
			const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
			const res = await fetch(url);
			const data = await res.json();
			const coords = data?.routes?.[0]?.geometry?.coordinates || [];
			setRestRoute(coords.length > 0 ? coords : null);
			console.log('🟣 休憩地点ルート生成', { points: coords.length });
		const durationSec = data?.routes?.[0]?.duration;
		if (typeof durationSec === 'number') {
			setEtaTime(new Date(Date.now() + durationSec * 1000));
			setEtaSource('rest');
		}
		} catch (e) {
			console.warn('⚠️ 休憩地点ルート生成エラー', e);
		}
	};

	const handleRestPointSelected = async (latlng) => {
		if (!latlng) return;
		setRestPoint({ lat: latlng.lat, lng: latlng.lng });
		if (!currentLocation) return;
		await computeRestRoute(currentLocation, { lat: latlng.lat, lng: latlng.lng });
	};

	// 休憩地点の解除
	const clearRestPoint = () => {
		setRestPoint(null);
		setRestRoute(null);
	};

	// 休憩タブ時は紫ルートの維持と再計算（4秒）
	useEffect(() => {
		if (activeTab !== 'rest') return;
		if (!restPoint || !currentLocation) {
			setRestRoute(null);
			return;
		}

		const tick = async () => {
			// 既存の紫ルートに対してオンルート判定（なければ再計算）
			if (!restRoute || restRoute.length === 0) {
				await computeRestRoute(currentLocation, restPoint);
				return;
			}
			const restRouteData = { polyline: { geometry: { coordinates: restRoute } } };
			const { distance } = calculateShortestDistanceToRoute(currentLocation, restRouteData);
			const onRestRoute = (distance || 0) <= ROUTE_THRESHOLD_METERS;
			if (!onRestRoute) {
				await computeRestRoute(currentLocation, restPoint);
			}
		};

		tick();
		const id = setInterval(tick, 4000);
		return () => clearInterval(id);
	}, [activeTab, restPoint, currentLocation, restRoute]);

	// タブコンテンツのレンダリング
	const renderTabContent = () => {
		switch (activeTab) {
			case 'main':
				return (
					<div className="space-y-4">
						{/* GPS座標操作UI */}
							<div className="bg-yellow-50 border-2 border-yellow-200 p-3 rounded-md">
								<h3 className="font-semibold mb-2 text-yellow-800 text-sm">🔧 GPS座標操作（開発用）</h3>
							


							{/* 移動距離設定 */}
							<div className="mb-2">
								<label className="text-xs font-medium text-gray-700 mb-1 block">移動距離</label>
								<div className="flex gap-1.5">
									<button
										onClick={() => setMoveDistance(0.0001)}
										className={`px-2 py-1 rounded text-xs ${moveDistance === 0.0001 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
									>
										10m
									</button>
									<button
										onClick={() => setMoveDistance(0.001)}
										className={`px-2 py-1 rounded text-xs ${moveDistance === 0.001 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
									>
										100m
									</button>
									<button
										onClick={() => setMoveDistance(0.01)}
										className={`px-2 py-1 rounded text-xs ${moveDistance === 0.01 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
									>
										1km
									</button>
								</div>
							</div>

							{/* 方向操作ボタン */}
							<div className="mb-2">
								<div className="text-xs font-medium text-gray-700 mb-1">方向操作</div>
								<div className="grid grid-cols-3 gap-1.5">
									<button
										onClick={() => moveLocation('northwest')}
										className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold"
									>
										↖
									</button>
									<button
										onClick={() => moveLocation('north')}
										className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold"
									>
										↑
									</button>
									<button
										onClick={() => moveLocation('northeast')}
										className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold"
									>
										↗
									</button>
									<button
										onClick={() => moveLocation('west')}
										className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold"
									>
										←
									</button>
										<div className="bg-yellow-200 px-2 py-1 rounded text-xs text-center text-yellow-800 font-bold">
										📍
									</div>
									<button
										onClick={() => moveLocation('east')}
										className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold"
									>
										→
									</button>
									<button
										onClick={() => moveLocation('southwest')}
										className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold"
									>
										↙
									</button>
									<button
										onClick={() => moveLocation('south')}
										className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold"
									>
										↓
									</button>
									<button
										onClick={() => moveLocation('southeast')}
										className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-bold"
									>
										↘
									</button>
								</div>
							</div>

							{/* 特殊操作ボタン */}
							<div className="flex gap-2 flex-wrap">
								<button
									onClick={() => {
										if (routeData?.polyline?.geometry?.coordinates) {
											const coords = routeData.polyline.geometry.coordinates;
											const randomIndex = Math.floor(Math.random() * coords.length);
											const randomCoord = coords[randomIndex];
											const newLocation = {
												lat: randomCoord[1],
												lng: randomCoord[0]
											};
											setCurrentLocation(newLocation);
											sendLocationToFirebase(newLocation);
											console.log('🎯 ルート上ランダム位置に移動:', newLocation);
										}
									}}
									className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
									disabled={!routeData?.polyline?.geometry?.coordinates}
								>
									ルート上ランダム
								</button>
								<button
									onClick={() => {
										const newLocation = {
											lat: 35.6812 + (Math.random() - 0.5) * 0.1,
											lng: 139.7671 + (Math.random() - 0.5) * 0.1
										};
										setCurrentLocation(newLocation);
										sendLocationToFirebase(newLocation);
										console.log('🎯 東京周辺ランダム位置に移動:', newLocation);
									}}
									className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs"
								>
									東京周辺ランダム
								</button>
								<button
									onClick={() => {
										getCurrentPosition();
									}}
									className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
								>
									GPS取得
								</button>
							</div>
						</div>

						{/* 運転メモ */}
						<div className="bg-blue-50 p-4 rounded-lg">
							<h3 className="font-semibold mb-3">運転メモ</h3>
							<MemoScroller memos={memos} />
						</div>
					</div>
				);
			case 'locations':
				return (
					<div className="space-y-4">
							<div className="bg-gray-50 p-4 rounded-lg">
								<div className="flex items-center justify-between mb-3">
									<h3 className="font-semibold">他の車の位置</h3>
								{focusedMember && (
									<button
										onClick={resetFocus}
										className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
									>
										フォーカス解除
									</button>
								)}
							</div>
								<div className="space-y-2">
									{members.filter((m) => m.uid !== currentUserUid).map((member, index) => {
									const memberLocation = memberLocations.get(member.uid);
									const isOnline = memberLocation && (Date.now() - memberLocation.timestamp < 5 * 60 * 1000);
									const isFocused = focusedMember && focusedMember.uid === member.uid;
									
									return (
										<div 
											key={index} 
											className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all duration-200 ${
												isFocused 
													? 'bg-blue-100 border-2 border-blue-500 shadow-md' 
													: 'bg-white hover:bg-gray-50 border border-gray-200'
											}`}
											onClick={() => {
												if (memberLocation) {
													focusOnMember(member);
												}
											}}
										>
											<img 
												src={member.photoURL && !member.photoURL.includes("ui-avatars.com") 
													? member.photoURL 
													: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '?')}&background=4F46E5&color=fff&size=32&rounded=true`}
												alt={member.name}
												className="w-8 h-8 rounded-full"
											/>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="text-sm font-medium">{member.name}</span>
													<div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
													{isFocused && (
														<span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded">
															フォーカス中
														</span>
													)}
												</div>
												{memberLocation ? (
													<div className="text-xs text-gray-500">
														{memberLocation.isUsingMockLocation ? 'テスト位置' : 'GPS位置'} - 
														{new Date(memberLocation.timestamp).toLocaleTimeString('ja-JP', {
															hour: '2-digit',
															minute: '2-digit'
														})}
														<div className="text-xs text-gray-400 mt-1">
															{memberLocation.lat.toFixed(4)}, {memberLocation.lng.toFixed(4)}
														</div>
													</div>
												) : (
													<div className="text-xs text-gray-400">
														位置情報なし
													</div>
												)}
											</div>
											{memberLocation && (
												<div className="text-xs text-gray-400">
													👆 タップでフォーカス
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				);
			case 'rest':
				return (
					<div className="space-y-4">
						<div className="bg-gray-50 p-4 rounded-lg">
							<h3 className="font-semibold mb-3">休憩地点のセット</h3>
						<p className={`text-sm ${activeTab === 'rest' && !restPoint ? 'text-blue-700 blink-text' : 'text-gray-600'}`}>
								{activeTab === 'rest' && !restPoint ? 'マップをタップして休憩地点を設定してください（別ルート表示）' : 'マップをタップして休憩地点を設定します（別ルート表示）。'}
							</p>
						{restPoint && (
							<div className="mt-3 flex items-center justify-between">
								<div className="text-xs text-gray-600">
									現在の休憩地点: {restPoint.lat.toFixed(4)}, {restPoint.lng.toFixed(4)}
								</div>
								<button
									onClick={clearRestPoint}
									className="px-3 py-1.5 text-xs rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300"
								>
									解除
								</button>
							</div>
						)}
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	useEffect(() => {
		if (!roomId || !currentUserUid) {
			setLoading(false);
			return;
		}

		// 画面入室時に自分の参加状態を true にする（作成者/参加者どちらも）
		if (currentUserUid) {
			// 既存のメンバーデータを保持しつつ、accepted状態のみ更新
			void update(ref(rtdb, `rooms/${roomId}/members/${currentUserUid}`), {
				accepted: true
			});
		}

		// ルーム情報とメンバー情報を取得
		const roomRef = ref(rtdb, `rooms/${roomId}`);
		const unsubscribe = onValue(
			roomRef,
			(snapshot) => {
				const room = snapshot.val();
				if (room) {
					setRoomData(room);
					const membersValue = room.members || {};
					const list = Object.values(membersValue).filter((m) => m?.accepted);
					setMembers(list);
					
					// ルート情報を設定
					if (room.routeData) {
						setRouteData(room.routeData);
						console.log("🗺️ ルート情報を取得:", {
							hasRoute: !!room.routeData,
							hasPolyline: !!room.routeData?.polyline,
							distance: room.routeData?.routeInfo?.distanceKm,
							duration: room.routeData?.routeInfo?.durationMin,
							coordinatesCount: room.routeData?.polyline?.geometry?.coordinates?.length || 0,
							departureCoords: room.routeData?.departure?.coordinates,
							destinationCoords: room.routeData?.destination?.coordinates,
							firstPolylineCoord: room.routeData?.polyline?.geometry?.coordinates?.[0],
							lastPolylineCoord: room.routeData?.polyline?.geometry?.coordinates?.[room.routeData?.polyline?.geometry?.coordinates?.length - 1],
							polylineCoordsFormat: room.routeData?.polyline?.geometry?.coordinates?.[0] ? 
								`[${room.routeData.polyline.geometry.coordinates[0][0]}, ${room.routeData.polyline.geometry.coordinates[0][1]}]` : 'N/A'
						});
					}
					
					// 参加者のphotoURL情報を初期化
					const photoURLMap = new Map();
					Object.values(membersValue).forEach(member => {
						if (member?.uid) {
							// photoURLが存在する場合（空文字列も含む）は追加
							if (member.photoURL !== undefined && member.photoURL !== null) {
								photoURLMap.set(member.uid, member.photoURL);
								if (member.name) {
									photoURLMap.set(member.name, member.photoURL);
								}
							}
						}
					});
					setParticipantPhotoURLs(photoURLMap);
					
					console.log("🖼️ 参加者のphotoURL情報を初期化:", {
						membersCount: list.length,
						photoURLMapSize: photoURLMap.size,
						photoURLs: Array.from(photoURLMap.entries()),
						rawMembers: Object.values(membersValue).map(m => ({
							uid: m?.uid,
							name: m?.name,
							photoURL: m?.photoURL,
							photoURLType: typeof m?.photoURL
						}))
					});
				}
				setLoading(false);
			},
			() => setLoading(false),
		);

		return () => unsubscribe();
	}, [roomId, currentUserUid]);

	// 離脱時に自分の参加状態を false に戻す
	useEffect(() => {
		if (!roomId || !currentUserUid) return;

		const setAcceptedFalse = async () => {
			try {
				await update(ref(rtdb, `rooms/${roomId}/members/${currentUserUid}`), {
					accepted: false,
				});
				
				// 参加状態をfalseにした後、ルーム削除チェックを実行
				setTimeout(() => {
					checkAndDeleteRoomIfEmpty(roomId);
				}, 1000); // 1秒後にチェック（他の参加者の離脱処理を待つ）
			} catch (error) {
				console.error("❌ 参加状態の更新エラー:", error);
			}
		};

		const handleBeforeUnload = () => {
			void setAcceptedFalse();
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			void setAcceptedFalse();
		};
	}, [roomId, currentUserUid]);

	const handleCallEnd = () => {
		setShowAudioCall(false);
		setIsCallActive(false);
		setCallParticipants([]);
		// 通話終了時にルームからも抜ける
		handleLeaveRoom();
	};

	// 通話状態の更新ハンドラー（デバウンス付き）
	const handleCallStateUpdate = useCallback((state) => {
		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current);
		}
		
		updateTimeoutRef.current = setTimeout(() => {
			setIsCallActive(state.isActive);
			
			// 参加者の重複を防ぐため、session_idでユニークにする
			const uniqueParticipants = [];
			const seenSessionIds = new Set();
			
			(state.participants || []).forEach(participant => {
				if (!seenSessionIds.has(participant.session_id)) {
					seenSessionIds.add(participant.session_id);
					uniqueParticipants.push(participant);
				}
			});
			
			console.log("👥 通話参加者を更新:", {
				totalParticipants: uniqueParticipants.length,
				sessionIds: uniqueParticipants.map(p => p.session_id)
			});
			
			// 参加者のphotoURL情報を更新
			setParticipantPhotoURLs(prevPhotoURLs => {
				const newPhotoURLs = new Map(prevPhotoURLs);
				let hasChanges = false;
				
				uniqueParticipants.forEach(participant => {
					const sessionId = participant.session_id;
					const userName = participant.user_name;
					let photoURL = participant.photoURL;
					
					// photoURLが取得できない場合は、既存のmembers配列から同じ名前のユーザーのphotoURLを取得
					if ((!photoURL || photoURL === "" || photoURL === null) && userName) {
						const existingMember = members.find(member => member.name === userName);
						if (existingMember && existingMember.photoURL && existingMember.photoURL !== "") {
							photoURL = existingMember.photoURL;
							console.log("🖼️ 既存のmembers配列からphotoURLを取得:", {
								userName,
								photoURL,
								sessionId
							});
						} else {
							// Google認証からphotoURLを取得を試行
							const googlePhotoURL = getGooglePhotoURL(userName);
							if (googlePhotoURL) {
								photoURL = googlePhotoURL;
								console.log("🖼️ Google認証からphotoURLを取得:", {
									userName,
									photoURL,
									sessionId
								});
							}
						}
					}
					
					// 新しいphotoURLが取得できた場合は更新（生成されたアイコンは除外）
					if (photoURL !== undefined && photoURL !== null && !photoURL.includes("ui-avatars.com")) {
						if (newPhotoURLs.get(sessionId) !== photoURL) {
							newPhotoURLs.set(sessionId, photoURL);
							newPhotoURLs.set(userName, photoURL);
							hasChanges = true;
							console.log("🖼️ 参加者のphotoURLを更新:", {
								sessionId,
								userName,
								photoURL,
								photoURLType: typeof photoURL
							});
						}
					} else if (photoURL && photoURL.includes("ui-avatars.com")) {
						console.log("🖼️ 生成されたアイコンは除外:", {
							sessionId,
							userName,
							photoURL
						});
					}
				});
				
				if (hasChanges) {
					console.log("🖼️ 参加者のphotoURL情報を更新:", {
						totalPhotoURLs: newPhotoURLs.size,
						updatedPhotoURLs: Array.from(newPhotoURLs.entries())
					});
					return newPhotoURLs;
				}
				
				return prevPhotoURLs;
			});
			
			// 参加者データの安定性を向上させるため、既存のデータと比較して変更がある場合のみ更新
			setCallParticipants(prevParticipants => {
				// 参加者数が変わった場合は更新
				if (prevParticipants.length !== uniqueParticipants.length) {
					console.log("🔄 参加者数の変更を検出、データを更新:", {
						previous: prevParticipants.length,
						current: uniqueParticipants.length
					});
					return uniqueParticipants;
				}
				
				// 参加者のsession_idが変わった場合は更新
				const prevSessionIds = prevParticipants.map(p => p.session_id).sort();
				const currentSessionIds = uniqueParticipants.map(p => p.session_id).sort();
				if (JSON.stringify(prevSessionIds) !== JSON.stringify(currentSessionIds)) {
					console.log("🔄 参加者構成の変更を検出、データを更新:", {
						previous: prevSessionIds,
						current: currentSessionIds
					});
					return uniqueParticipants;
				}
				
				// 参加者の状態（audio等）が変わった場合は更新
				let hasStateChange = false;
				for (let i = 0; i < uniqueParticipants.length; i++) {
					const current = uniqueParticipants[i];
					const previous = prevParticipants.find(p => p.session_id === current.session_id);
					if (previous && (
						previous.audio !== current.audio ||
						previous.local !== current.local ||
						previous.user_name !== current.user_name
					)) {
						hasStateChange = true;
						break;
					}
				}
				
				if (hasStateChange) {
					console.log("🔄 参加者状態の変更を検出、データを更新");
					return uniqueParticipants;
				}
				
				// 変更がない場合は既存のデータを保持
				console.log("✅ 参加者データに変更なし、既存データを保持");
				return prevParticipants;
			});
		}, 50); // 50msのデバウンス
	}, []);

	// クリーンアップ
	useEffect(() => {
		return () => {
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, []);

	const handleLeaveRoom = async () => {
		// 参加状態をfalseに設定
		if (roomId && currentUserUid) {
			try {
				await update(ref(rtdb, `rooms/${roomId}/members/${currentUserUid}`), {
					accepted: false,
				});
				
				// 位置情報も削除
				await update(ref(rtdb, `rooms/${roomId}/memberLocations/${currentUserUid}`), null);
				
				// 参加状態をfalseにした後、ルーム削除チェックを実行
				setTimeout(() => {
					checkAndDeleteRoomIfEmpty(roomId);
				}, 1000); // 1秒後にチェック（他の参加者の離脱処理を待つ）
			} catch (error) {
				console.error("❌ 参加状態の更新エラー:", error);
			}
		}
		
		// 位置情報共有を停止
		stopLocationSharing();
		
		navigate("/dashboard/parking/input");
	};

	if (loading) {
	return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<p className="text-gray-600">読み込み中...</p>
					</div>
					</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* ヘッダー */}
			<div className="bg-green-500 text-white p-4">
				<div className="flex items-center justify-center">
						{(routeData || etaTime) && (
						<div className="bg-red-500 px-3 py-1 rounded text-sm">
								到着時刻: {(etaTime || routeData?.routeInfo?.arrivalTime) ?
									new Date(etaTime || routeData.routeInfo.arrivalTime).toLocaleTimeString('ja-JP', {
										hour: '2-digit',
										minute: '2-digit'
									}) : '○○:00'}
									</div>
								)}
										</div>
							</div>

			{/* メインコンテンツ */}
			<div className="h-[calc(100vh-80px)] flex flex-col">
				{/* 地図エリア - 正方形 */}
				<div className="w-full aspect-square relative overflow-hidden">
					{routeData && routeData.polyline?.geometry?.coordinates ? (
						<div 
							className="w-full h-full"
							style={{
								transform: `rotate(${mapRotation}deg)`,
								transformOrigin: 'center center',
								transition: 'transform 0.8s ease-in-out',
								width: '100%',
								height: '100%',
								marginLeft: '0%',
								marginTop: '0%'
							}}
						>
										<MapContainer
								center={getMapCenter()}
								zoom={currentLocation ? Math.max(mapZoom, 12) : mapZoom}
								style={{ 
									height: '100%', 
									width: '100%'
								}}
								zoomControl={false} // デフォルトのズームコントロールを無効化（カスタムボタンを使用）
								dragging={false} // ドラッグによる移動を無効化
								touchZoom={false} // タッチズームを無効化
								doubleClickZoom={false} // ダブルクリックズームを無効化
								scrollWheelZoom={false} // マウスホイールズームを無効化
								boxZoom={false} // ボックスズームを無効化
								keyboard={false} // キーボード操作を無効化
								attributionControl={false} // アトリビューション表示を無効化
										>
											<TileLayer
												url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
												attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
											/>

								{/* 休憩地点のためのマップクリック（休憩タブ有効時のみ） */}
								<MapClickHandler enabled={activeTab === 'rest'} onClick={handleRestPointSelected} />
											
							<MapController 
								zoomLevel={focusedMember ? Math.max(mapZoom, 14) : (currentLocation ? Math.max(mapZoom, 12) : mapZoom)} 
								center={getMapCenter()} 
								currentLocation={focusedMember ? null : currentLocation}
								focusedMember={focusedMember}
							/>
							
							{/* 赤い合流ルート表示（休憩タブ中は非表示） */}
							{rejoinRoute && rejoinRoute.length > 0 && !routeStatus.isOnRoute && activeTab !== 'rest' && (
								<>
											<Polyline
										positions={getOptimizedCoordinates(rejoinRoute, mapZoom).map(coord => [coord[1], coord[0]])}
									color="red"
										weight={5}
										opacity={0.9}
										dashArray="8, 4"
										smoothFactor={1.0}
									/>
								</>
							)}

							{/* 青い正規ルート表示（オレンジルートの上に表示・実用上限対応） */}
							<Polyline
								positions={getOptimizedCoordinates(routeData.polyline.geometry.coordinates, mapZoom).map(coord => [coord[1], coord[0]])}
												color="blue"
												weight={4}
												opacity={0.8}
											/>

							{/* 休憩地点への別ルート（紫）: 正規ルートとは独立して表示 */}
							{restPoint && restRoute && restRoute.length > 0 && (
								<Polyline
									positions={getOptimizedCoordinates(restRoute, mapZoom).map(coord => [coord[1], coord[0]])}
									color="#7c3aed" // violet-600
									weight={4}
									opacity={0.9}
									dashArray="6, 6"
									smoothFactor={1.0}
								/>
							)}
											
											{/* 出発地マーカー */}
											{routeData.departure && (
												<Marker 
													position={[routeData.departure.coordinates[0], routeData.departure.coordinates[1]]}
													icon={startIcon}
												>
									<Popup
										className="fixed-popup"
										style={{
											transform: `rotate(${-mapRotation}deg)`,
											transformOrigin: 'center center'
										}}
									>
										<div className="text-center max-w-32">
											<div className="text-sm">🚀</div>
											<div className="font-semibold text-green-600 text-xs">スタート地点</div>
											<div className="font-medium text-xs break-words">{routeData.departure.name}</div>
														</div>
													</Popup>
												</Marker>
											)}
											
											{/* 目的地マーカー */}
											{routeData.destination && (
												<Marker 
													position={[routeData.destination.coordinates[0], routeData.destination.coordinates[1]]}
													icon={goalIcon}
												>
									<Popup
										className="fixed-popup"
										style={{
											transform: `rotate(${-mapRotation}deg)`,
											transformOrigin: 'center center'
										}}
									>
										<div className="text-center max-w-32">
											<div className="text-sm">🚩</div>
											<div className="font-semibold text-red-600 text-xs">ゴール地点</div>
											<div className="font-medium text-xs break-words">{routeData.destination.name}</div>
										</div>
									</Popup>
								</Marker>
							)}

							{/* 現在地マーカー（自分のユーザーアイコン、丸型） */}
							{currentLocation && (
								<Marker
									position={[currentLocation.lat, currentLocation.lng]}
									icon={(() => {
										const currentMember = members.find(m => m.uid === currentUserUid);
										const url = currentMember?.photoURL && !currentMember.photoURL.includes("ui-avatars.com")
											? currentMember.photoURL
											: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentMember?.name || '?')}&background=4F46E5&color=fff&size=80&rounded=true`;
										return createRoundedImageIcon(url, 40);
									})()}
								>
									<Popup
										className="fixed-popup"
										style={{
											transform: `rotate(${-mapRotation}deg)`,
											transformOrigin: 'center center'
										}}
									>
										<div className="text-center max-w-40">
											<div className="flex items-center gap-2 mb-2">
												<img 
													src={(() => {
														const currentMember = members.find(m => m.uid === currentUserUid);
														return currentMember?.photoURL && !currentMember.photoURL.includes("ui-avatars.com") 
															? currentMember.photoURL 
															: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentMember?.name || '?')}&background=4F46E5&color=fff&size=24&rounded=true`;
													})()}
													alt="自分"
													className="w-6 h-6 rounded-full"
												/>
												<div className="font-semibold text-blue-600 text-xs">現在地（自分）</div>
											</div>
											<div className="text-xs text-gray-600 mb-1">
												{isUsingMockLocation ? 'テスト位置' : 'GPS位置'}
											</div>
											<div className="text-xs text-gray-500 break-all">
												{currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
											</div>
											<div className="text-xs mt-1">
												{routeStatus.isOnRoute ? (
													<span className="text-green-600">✅ ルート上</span>
												) : (
													<span className="text-red-600">❌ ルート外 ({routeStatus.distance.toFixed(0)}m)</span>
												)}
											</div>
											<div className="text-xs text-gray-400 mt-1">
												5秒間隔で更新中
															</div>
														</div>
													</Popup>
												</Marker>
											)}

							{/* 合流点マーカー（ルート外の時のみ表示） */}
							{joinPoint && !routeStatus.isOnRoute && (
								<Marker
									position={[joinPoint.lat, joinPoint.lng]}
									icon={joinPointIcon}
								>
									<Popup
										className="fixed-popup"
										style={{
											transform: `rotate(${-mapRotation}deg)`,
											transformOrigin: 'center center'
										}}
									>
										<div className="text-center max-w-32">
											<div className="text-sm">🛣️</div>
											<div className="font-semibold text-orange-600 text-xs">合流点</div>
											<div className="text-xs text-gray-500">
												道路に沿ったルート<br />
												自然な合流パス
									</div>
								</div>
									</Popup>
								</Marker>
							)}

							{/* 休憩地点ピン */}
							{restPoint && (
								<Marker position={[restPoint.lat, restPoint.lng]} icon={new Icon({
									iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
									shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
									iconSize: [25, 41],
									iconAnchor: [12, 41],
									popupAnchor: [1, -34],
									shadowSize: [41, 41]
								})}>
									<Popup className="fixed-popup">
										<div className="text-xs">休憩地点</div>
									</Popup>
								</Marker>
							)}

							{/* メンバーの位置マーカー（丸型） */}
							{Array.from(memberLocations.entries()).map(([uid, location]) => {
								const member = members.find(m => m.uid === uid);
								if (!member) return null;

								const isFocused = focusedMember && focusedMember.uid === uid;

								const url = member.photoURL && !member.photoURL.includes("ui-avatars.com")
									? member.photoURL
									: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '?')}&background=4F46E5&color=fff&size=${isFocused ? 96 : 64}&rounded=true`;
								const memberIcon = createRoundedImageIcon(url, isFocused ? 48 : 32);

								return (
									<Marker
										key={uid}
										position={[location.lat, location.lng]}
										icon={memberIcon}
									>
										<Popup
											className="fixed-popup"
											style={{
												transform: `rotate(${-mapRotation}deg)`,
												transformOrigin: 'center center'
											}}
										>
											<div className="text-center max-w-40">
												<div className="flex items-center gap-2 mb-2">
													<img 
														src={member.photoURL && !member.photoURL.includes("ui-avatars.com") 
															? member.photoURL 
															: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '?')}&background=4F46E5&color=fff&size=24&rounded=true`}
														alt={member.name}
														className="w-6 h-6 rounded-full"
													/>
													<div className="font-semibold text-blue-600 text-xs">{member.name}</div>
													{isFocused && (
														<span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded">
															フォーカス中
														</span>
													)}
												</div>
												<div className="text-xs text-gray-600 mb-1">
													{location.isUsingMockLocation ? 'テスト位置' : 'GPS位置'}
												</div>
												<div className="text-xs text-gray-500 break-all">
													{location.lat.toFixed(4)}, {location.lng.toFixed(4)}
												</div>
												<div className="text-xs text-gray-400 mt-1">
													{new Date(location.timestamp).toLocaleTimeString('ja-JP', {
														hour: '2-digit',
														minute: '2-digit',
														second: '2-digit'
													})}
												</div>
											</div>
										</Popup>
									</Marker>
								);
							})}
						</MapContainer>
						</div>
					) : (
						<div className="h-full flex items-center justify-center bg-gray-100">
							<div className="text-center text-gray-600">
								<div className="text-4xl mb-2">🗺️</div>
								<p>ルート情報がありません</p>
							</div>
						</div>
					)}
				</div>

				{/* 地図下のコントロールパネル */}
				<div className="bg-white border-t border-gray-200 p-4 flex-1">
					{/* コントロールボタン（均等配置） */}
						<div className="flex items-center justify-between mb-4">
						{/* 左側：ズームコントロール */}
						<div className="flex items-center gap-3">
							<div className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium">
								Zoom: {mapZoom}
								{focusedMember && (
									<div className="text-xs text-blue-600 mt-1">
										{focusedMember.name} をフォーカス中
									</div>
								)}
								{routeData?.polyline?.geometry?.coordinates && (
									<div className="text-xs text-gray-600 mt-1">
										{routeData.polyline.geometry.coordinates.length > 1000 ? 
											`最適化: ${getOptimizedCoordinates(routeData.polyline.geometry.coordinates, mapZoom).length}点` :
											`${routeData.polyline.geometry.coordinates.length}点`
										}
									</div>
								)}
							</div>
							<button
								onClick={handleZoomOut}
								className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white w-10 h-10 rounded-lg shadow-lg flex items-center justify-center font-bold text-lg transition-colors duration-200"
								title="ズームアウト"
							>
								−
							</button>
							<button
								onClick={handleZoomIn}
								className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white w-10 h-10 rounded-lg shadow-lg flex items-center justify-center font-bold text-lg transition-colors duration-200"
								title="ズームイン"
							>
								+
							</button>
						</div>

						{/* 右側：通話終了ボタン */}
						<button
							onClick={handleCallEnd}
							className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm"
						>
							通話終了&到着
						</button>
					</div>

					{/* タブコンテンツ */}
					<div className="mb-4">
						{renderTabContent()}
					</div>

					{/* タブボタン */}
					<div className="flex gap-2">
						<button
							onClick={() => handleTabChange('main')}
							className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 ${
								activeTab === 'main' 
									? 'bg-blue-100 border-blue-500 text-blue-700' 
									: 'bg-gray-100 border-gray-300 text-gray-700'
							}`}
						>
							メインナビ
						</button>
						<button
							onClick={() => handleTabChange('locations')}
							className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 ${
								activeTab === 'locations' 
									? 'bg-blue-100 border-blue-500 text-blue-700' 
									: 'bg-gray-100 border-gray-300 text-gray-700'
							}`}
							>
								他の車の位置
						</button>
						<button
							onClick={() => handleTabChange('rest')}
							className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 ${
								activeTab === 'rest' 
									? 'bg-blue-100 border-blue-500 text-blue-700' 
									: 'bg-gray-100 border-gray-300 text-gray-700'
							}`}
						>
							休憩地点のセット
						</button>
					</div>
				</div>
			</div>

			{/* 音声通話機能 */}
						{roomData?.dailyRoom && (
							<AudioCallRoom
								roomId={roomId}
								roomName={roomData?.name || "カーナビルーム"}
								ownerUid={roomData?.ownerUid || ""}
								members={members}
								onCallEnd={handleCallEnd}
								onCallStateUpdate={handleCallStateUpdate}
							/>
						)}
			
			{/* Audio Call Footer */}
			<AudioCallFooter
				participants={(() => {
					if (callParticipants.length > 0) {
						return callParticipants;
					}
					
					if (members.length > 0) {
						return members.map(member => ({
							session_id: member.uid,
							user_name: member.name,
							audio: false,
							photoURL: member.photoURL,
							local: member.uid === currentUserUid
						}));
					}
					
					return [];
				})()}
				participantPhotoURLs={participantPhotoURLs}
			/>
		</div>
	);
};

export default CarNavigation;
