import { onValue, ref, update } from "firebase/database";
import { Icon } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useNavigate, useParams } from "react-router-dom";
import AudioCallFooter from "@/components/Footer/AudioCallFooter";
import AudioCallRoom from "@/components/VideoCall/VideoCallRoom";
import { getMemosByUser, rtdb } from "@/firebase";
import { checkAndDeleteRoomIfEmpty } from "@/firebase/room";
import { getGooglePhotoURL } from "@/hooks/useUser";
import { useUserUid } from "@/hooks/useUserUid";
import {
  generateOSRMRejoinRoute,
  generateUltraDenseRejoinRoute,
  isOnRoute,
} from "@/utils/routeUtils";

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

// 地図コンテナ内でズームと中心を制御するコンポーネント（ボタンズームのみ有効版）
const MapController = ({ zoomLevel, center, currentLocation }) => {
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
      // 現在地がある場合は絶対に現在地を中心にする
      if (currentLocation) {
        map.setView([currentLocation.lat, currentLocation.lng], zoomLevel, {
          animate: true,
          duration: 0.5,
        });
      } else {
        map.setView(center, zoomLevel, {
          animate: true,
          duration: 0.5,
        });
      }
    }
  }, [map, center, zoomLevel, currentLocation]);

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
  }, [memos]);

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
          transition: "transform 0.1s ease-out",
        }}
      >
        {currentMemo.content}
      </div>
    </div>
  );
};

const CarNavigationAdvanced = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState(null);
  const [_showAudioCall, setShowAudioCall] = useState(true);
  const [_isCallActive, setIsCallActive] = useState(false);
  const [callParticipants, setCallParticipants] = useState([]);
  const [participantPhotoURLs, setParticipantPhotoURLs] = useState(new Map());
  const [routeData, setRouteData] = useState(null);
  const [memos, setMemos] = useState([]);
  const [activeTab, setActiveTab] = useState("main"); // 'main', 'locations', 'rest'
  const [mapZoom, setMapZoom] = useState(10);
  const [mapRotation, setMapRotation] = useState(0); // 地図の回転角度（常に0度で北向き）
  const [_isLandscape, setIsLandscape] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [_isUsingMockLocation, setIsUsingMockLocation] = useState(true);
  const [mockLocationIndex, setMockLocationIndex] = useState(0);
  const [routeStatus, setRouteStatus] = useState({
    isOnRoute: true,
    distance: 0,
  });
  const [rejoinRoute, setRejoinRoute] = useState(null);
  const [joinPoint, setJoinPoint] = useState(null);
  const currentUserUid = useUserUid();
  const updateTimeoutRef = useRef(null);

  // 初期状態で適当な座標をセット
  const setInitialMockLocation = () => {
    // 東京駅周辺の適当な座標をセット
    const initialLocation = {
      lat: 35.6812 + (Math.random() - 0.5) * 0.01, // ±0.005度の範囲
      lng: 139.7671 + (Math.random() - 0.5) * 0.01,
    };
    setCurrentLocation(initialLocation);
    setIsUsingMockLocation(true);
    setMockLocationIndex(0);
    console.log("🎯 初期適当座標設定:", initialLocation);
  };

  // GPS位置情報の取得
  const _getCurrentPosition = () => {
    if (!navigator.geolocation) {
      console.log("GPS not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setIsUsingMockLocation(false);
        console.log("📍 GPS位置取得:", { latitude, longitude });
      },
      (error) => {
        console.error("GPS error:", error);
        // GPSが失敗した場合はモック位置を使用
        setIsUsingMockLocation(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
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
        index: i,
      });
    }

    return mockLocations;
  };

  // モック位置を次の位置に移動
  const _moveToNextMockLocation = () => {
    const mockLocations = generateMockLocations();
    if (mockLocations.length === 0) return;

    setMockLocationIndex((prev) => (prev + 1) % mockLocations.length);
    const nextLocation = mockLocations[(mockLocationIndex + 1) % mockLocations.length];
    setCurrentLocation(nextLocation);
    console.log("🎯 モック位置移動:", nextLocation);

    // 回転機能は無効化（常に北向き）
    console.log("🧭 回転機能は無効化されています - 常に北向きを維持");
  };

  // 開発用の位置操作関数
  const moveLocation = (direction) => {
    if (!currentLocation) return;

    const offset = 0.001; // 約100m
    const newLocation = { ...currentLocation };

    switch (direction) {
      case "north":
        newLocation.lat += offset;
        break;
      case "south":
        newLocation.lat -= offset;
        break;
      case "east":
        newLocation.lng += offset;
        break;
      case "west":
        newLocation.lng -= offset;
        break;
      case "northeast":
        newLocation.lat += offset;
        newLocation.lng += offset;
        break;
      case "northwest":
        newLocation.lat += offset;
        newLocation.lng -= offset;
        break;
      case "southeast":
        newLocation.lat -= offset;
        newLocation.lng += offset;
        break;
      case "southwest":
        newLocation.lat -= offset;
        newLocation.lng -= offset;
        break;
    }

    setCurrentLocation(newLocation);
    console.log(`🎮 位置移動 (${direction}):`, newLocation);
  };

  // 現在地が変更された時に地図の中心を強制更新
  useEffect(() => {
    if (currentLocation) {
      console.log("📍 現在地更新、地図中心を強制調整:", currentLocation);
      // 地図の中心を現在地に強制的に設定
      const mapElement = document.querySelector(".leaflet-container");
      if (mapElement) {
        // 地図要素が存在する場合は中心を更新
        console.log("🗺️ 地図中心を現在地に強制設定");

        // ズーム操作は可能にしつつ、移動は無効化
        mapElement.style.cursor = "default";
      }
    }
  }, [currentLocation]);

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

    const styleElement = document.createElement("style");
    styleElement.textContent = disableMapInteractionStyle;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // ルート判定と合流ルート計算（OSRM API使用版）
  const updateRouteStatus = async () => {
    if (!currentLocation || !routeData) return;

    const status = isOnRoute(currentLocation, routeData, 50); // 50m閾値
    setRouteStatus(status);

    if (!status.isOnRoute) {
      // ルートから外れている場合、OSRM APIを使用して道路に沿った合流ルートを生成
      try {
        const osrmInfo = await generateOSRMRejoinRoute(currentLocation, routeData);
        if (osrmInfo) {
          setJoinPoint(osrmInfo.joinPoint);
          setRejoinRoute(osrmInfo.route);
          console.log("🛣️ OSRM API合流ルート生成:", {
            current: currentLocation,
            joinPoint: osrmInfo.joinPoint,
            distance: `${osrmInfo.distance.toFixed(1)}m`,
            routePoints: osrmInfo.route.length,
            routeType: "OSRM API道路ルート",
          });
        }
      } catch (error) {
        console.warn("⚠️ OSRM API合流ルート生成エラー:", error);
        // フォールバック: 従来の方法を使用
        const ultraDenseInfo = generateUltraDenseRejoinRoute(currentLocation, routeData);
        if (ultraDenseInfo) {
          setJoinPoint(ultraDenseInfo.joinPoint);
          setRejoinRoute(ultraDenseInfo.route);
          console.log("🛣️ フォールバック合流ルート生成:", {
            current: currentLocation,
            joinPoint: ultraDenseInfo.joinPoint,
            distance: `${ultraDenseInfo.distance.toFixed(1)}m`,
            routePoints: ultraDenseInfo.route.length,
            routeType: "従来の道路ベースルート",
          });
        }
      }
    } else {
      // ルート上にいる場合、合流ルートをクリア
      setRejoinRoute(null);
      setJoinPoint(null);
      console.log("✅ ルート上にいます");
    }
  };

  // 現在地変更時にルート状態を更新
  useEffect(() => {
    updateRouteStatus();
  }, [updateRouteStatus]);

  // 3秒間隔でルート判定とオレンジルート再計算を行うタイマー
  useEffect(() => {
    if (!currentLocation || !routeData) return;

    const routeCheckInterval = setInterval(async () => {
      console.log("🔄 3秒間隔ルート判定・オレンジルート再計算実行");
      await updateRouteStatus();
    }, 3000);

    return () => {
      clearInterval(routeCheckInterval);
    };
  }, [currentLocation, routeData, updateRouteStatus]);

  // 回転関連の関数（無効化されているが、UI互換性のため残す）
  const _resetMapToNorth = () => {
    setMapRotation(0);
    console.log("🧭 地図は常に北向きです");
  };

  const _rotateMapToRoute = () => {
    setMapRotation(0);
    console.log("🧭 地図は常に北向きです");
  };

  // 画面の向きを監視
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);

    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  // 初期状態で適当な座標をセット
  useEffect(() => {
    if (!currentLocation) {
      setInitialMockLocation();
    }
  }, [currentLocation, setInitialMockLocation]);

  // 固定ポップアップのCSSスタイルを適用
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = fixedPopupStyle;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // 地図サイズを固定（回転しないため常に100%）
  const calculateMapSize = () => {
    return {
      width: "100%",
      height: "100%",
      marginLeft: "0%",
      marginTop: "0%",
    };
  };

  // 現在地を中心とした地図の中心座標を計算（絶対固定）
  const getMapCenter = () => {
    if (currentLocation) {
      // 現在地を絶対に中心に固定
      return [currentLocation.lat, currentLocation.lng];
    }
    // デフォルト座標（東京駅周辺）
    return [35.6812, 139.7671];
  };

  // カスタムアイコンの設定
  const startIcon = new Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const goalIcon = new Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const currentLocationIcon = new Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [30, 50],
    iconAnchor: [15, 50],
    popupAnchor: [1, -34],
    shadowSize: [50, 50],
  });

  const joinPointIcon = new Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
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

  // ルーム情報とメンバー情報を取得
  useEffect(() => {
    if (!roomId || !currentUserUid) {
      setLoading(false);
      return;
    }

    // 画面入室時に自分の参加状態を true にする
    if (currentUserUid) {
      void update(ref(rtdb, `rooms/${roomId}/members/${currentUserUid}`), {
        accepted: true,
      });
    }

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
            // ルートが読み込まれたら初期位置を設定（現在地がない場合のみ）
            if (!currentLocation) {
              const mockLocations = generateMockLocations();
              if (mockLocations.length > 0) {
                setCurrentLocation(mockLocations[0]);
                console.log("🎯 ルートベース初期位置設定:", mockLocations[0]);
              } else {
                // ルートがない場合は適当な座標をセット
                setInitialMockLocation();
              }
            }
            // 回転機能は無効化（常に北向きを維持）
            console.log("🗺️ 地図は常に北向きで表示されます");
          }

          // 参加者のphotoURL情報を初期化
          const photoURLMap = new Map();
          Object.values(membersValue).forEach((member) => {
            if (member?.uid) {
              if (member.photoURL !== undefined && member.photoURL !== null) {
                photoURLMap.set(member.uid, member.photoURL);
                if (member.name) {
                  photoURLMap.set(member.name, member.photoURL);
                }
              }
            }
          });
          setParticipantPhotoURLs(photoURLMap);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [
    roomId,
    currentUserUid,
    currentLocation,
    generateMockLocations, // ルートがない場合は適当な座標をセット
    setInitialMockLocation,
  ]);

  // 離脱時の処理
  useEffect(() => {
    if (!roomId || !currentUserUid) return;

    const setAcceptedFalse = async () => {
      try {
        await update(ref(rtdb, `rooms/${roomId}/members/${currentUserUid}`), {
          accepted: false,
        });

        setTimeout(() => {
          checkAndDeleteRoomIfEmpty(roomId);
        }, 1000);
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
    handleLeaveRoom();
  };

  // 通話状態の更新ハンドラー
  const handleCallStateUpdate = useCallback(
    (state) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        setIsCallActive(state.isActive);

        const uniqueParticipants = [];
        const seenSessionIds = new Set();

        (state.participants || []).forEach((participant) => {
          if (!seenSessionIds.has(participant.session_id)) {
            seenSessionIds.add(participant.session_id);
            uniqueParticipants.push(participant);
          }
        });

        setParticipantPhotoURLs((prevPhotoURLs) => {
          const newPhotoURLs = new Map(prevPhotoURLs);
          let hasChanges = false;

          uniqueParticipants.forEach((participant) => {
            const sessionId = participant.session_id;
            const userName = participant.user_name;
            let photoURL = participant.photoURL;

            if ((!photoURL || photoURL === "" || photoURL === null) && userName) {
              const existingMember = members.find((member) => member.name === userName);
              if (existingMember?.photoURL && existingMember.photoURL !== "") {
                photoURL = existingMember.photoURL;
              } else {
                const googlePhotoURL = getGooglePhotoURL(userName);
                if (googlePhotoURL) {
                  photoURL = googlePhotoURL;
                }
              }
            }

            if (
              photoURL !== undefined &&
              photoURL !== null &&
              !photoURL.includes("ui-avatars.com")
            ) {
              if (newPhotoURLs.get(sessionId) !== photoURL) {
                newPhotoURLs.set(sessionId, photoURL);
                newPhotoURLs.set(userName, photoURL);
                hasChanges = true;
              }
            }
          });

          return hasChanges ? newPhotoURLs : prevPhotoURLs;
        });

        setCallParticipants((prevParticipants) => {
          if (prevParticipants.length !== uniqueParticipants.length) {
            return uniqueParticipants;
          }

          const prevSessionIds = prevParticipants.map((p) => p.session_id).sort();
          const currentSessionIds = uniqueParticipants.map((p) => p.session_id).sort();
          if (JSON.stringify(prevSessionIds) !== JSON.stringify(currentSessionIds)) {
            return uniqueParticipants;
          }

          let hasStateChange = false;
          for (let i = 0; i < uniqueParticipants.length; i++) {
            const current = uniqueParticipants[i];
            const previous = prevParticipants.find((p) => p.session_id === current.session_id);
            if (
              previous &&
              (previous.audio !== current.audio ||
                previous.local !== current.local ||
                previous.user_name !== current.user_name)
            ) {
              hasStateChange = true;
              break;
            }
          }

          return hasStateChange ? uniqueParticipants : prevParticipants;
        });
      }, 50);
    },
    [members.find]
  );

  const handleLeaveRoom = async () => {
    if (roomId && currentUserUid) {
      try {
        await update(ref(rtdb, `rooms/${roomId}/members/${currentUserUid}`), {
          accepted: false,
        });

        setTimeout(() => {
          checkAndDeleteRoomIfEmpty(roomId);
        }, 1000);
      } catch (error) {
        console.error("❌ 参加状態の更新エラー:", error);
      }
    }

    navigate("/dashboard/home");
  };

  // 地図のズーム制御
  const handleZoomIn = () => {
    setMapZoom((prev) => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setMapZoom((prev) => Math.max(prev - 1, 1));
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

    console.log(
      `🗺️ ポリライン最適化: ${coordinates.length}点 → ${optimized.length}点 (ズーム: ${zoomLevel})`
    );

    return optimized;
  };

  // 地図の向き制御（常に北向き）
  const _handleRotationChange = (_rotation) => {
    // 回転を無効化（常に0度で北向き）
    setMapRotation(0);
  };

  // タブ切り替え
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // タブコンテンツのレンダリング
  const renderTabContent = () => {
    switch (activeTab) {
      case "main":
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              {/* 現在地コントロール */}
              <div className="mb-4">
                {/* 開発用位置操作ボタン */}
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">開発用位置操作</h4>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => moveLocation("northwest")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      ↖
                    </button>
                    <button
                      onClick={() => moveLocation("north")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveLocation("northeast")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      ↗
                    </button>
                    <button
                      onClick={() => moveLocation("west")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      ←
                    </button>
                    <div className="bg-gray-200 px-2 py-1 rounded text-xs text-center text-gray-600">
                      📍
                    </div>
                    <button
                      onClick={() => moveLocation("east")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      →
                    </button>
                    <button
                      onClick={() => moveLocation("southwest")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      ↙
                    </button>
                    <button
                      onClick={() => moveLocation("south")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => moveLocation("southeast")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      ↘
                    </button>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold mb-3">運転メモ</h3>
              <MemoScroller memos={memos} />
            </div>
          </div>
        );
      case "locations":
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">全員の位置</h3>
              <div className="space-y-2">
                {members.map((member, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-white rounded">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {member.name?.charAt(0) || "?"}
                    </div>
                    <span className="text-sm">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "rest":
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">休憩地点のセット</h3>
              <p className="text-gray-600 text-sm">休憩地点の設定機能は準備中です。</p>
            </div>
          </div>
        );
      default:
        return null;
    }
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
          {routeData && (
            <div className="bg-red-500 px-3 py-1 rounded text-sm">
              到着時刻:{" "}
              {routeData.routeInfo?.arrivalTime
                ? new Date(routeData.routeInfo.arrivalTime).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "○○:00"}
            </div>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="h-[calc(100vh-80px)] flex flex-col">
        {/* 地図エリア - 正方形 */}
        <div className="w-full aspect-square relative overflow-hidden">
          {routeData?.polyline?.geometry?.coordinates ? (
            <div
              className="w-full h-full"
              style={{
                transform: `rotate(${mapRotation}deg)`,
                transformOrigin: "center center",
                transition: "transform 0.8s ease-in-out",
                ...calculateMapSize(),
              }}
            >
              <MapContainer
                center={getMapCenter()}
                zoom={currentLocation ? Math.max(mapZoom, 12) : mapZoom}
                style={{
                  height: "100%",
                  width: "100%",
                }}
                zoomControl={false} // デフォルトのズームコントロールを無効化（カスタムボタンを使用）
                dragging={false} // ドラッグによる移動を無効化
                touchZoom={false} // タッチズームを無効化
                doubleClickZoom={false} // ダブルクリックズームを無効化
                scrollWheelZoom={false} // マウスホイールズームを無効化
                boxZoom={false} // ボックスズームを無効化
                keyboard={false} // キーボード操作を無効化
                attributionControl={true} // ライセンス表記を表示（法的に必要）
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapController
                  zoomLevel={currentLocation ? Math.max(mapZoom, 12) : mapZoom}
                  center={getMapCenter()}
                  currentLocation={currentLocation}
                />

                {/* 赤い合流ルート表示（正規ルートの下に表示、ルート外の時のみ表示・実用上限対応） */}
                {rejoinRoute && rejoinRoute.length > 0 && !routeStatus.isOnRoute && (
                  <>
                    <Polyline
                      positions={getOptimizedCoordinates(rejoinRoute, mapZoom).map((coord) => [
                        coord[1],
                        coord[0],
                      ])}
                      color="red"
                      weight={5}
                      opacity={0.9}
                      dashArray="8, 4"
                      smoothFactor={1.0}
                    />
                    {/* デバッグ用の合流ルート情報 */}
                    {console.log("🛣️ 道路ベース合流ルート描画（最適化済み）:", {
                      originalPoints: rejoinRoute.length,
                      optimizedPoints: getOptimizedCoordinates(rejoinRoute, mapZoom).length,
                      zoomLevel: mapZoom,
                      routeType: "道路に沿った自然なルート（実用上限対応）",
                      isOnRoute: routeStatus.isOnRoute,
                    })}
                  </>
                )}

                {/* 青い正規ルート表示（オレンジルートの上に表示・実用上限対応） */}
                <Polyline
                  positions={getOptimizedCoordinates(
                    routeData.polyline.geometry.coordinates,
                    mapZoom
                  ).map((coord) => [coord[1], coord[0]])}
                  color="blue"
                  weight={4}
                  opacity={0.8}
                />

                {/* 出発地マーカー */}
                {routeData.departure && (
                  <Marker
                    position={[
                      routeData.departure.coordinates[0],
                      routeData.departure.coordinates[1],
                    ]}
                    icon={startIcon}
                  >
                    <Popup
                      className="fixed-popup"
                      style={{
                        transform: `rotate(${-mapRotation}deg)`,
                        transformOrigin: "center center",
                      }}
                    >
                      <div className="text-center max-w-32">
                        <div className="text-sm">🚀</div>
                        <div className="font-semibold text-green-600 text-xs">スタート地点</div>
                        <div className="font-medium text-xs break-words">
                          {routeData.departure.name}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* 目的地マーカー */}
                {routeData.destination && (
                  <Marker
                    position={[
                      routeData.destination.coordinates[0],
                      routeData.destination.coordinates[1],
                    ]}
                    icon={goalIcon}
                  >
                    <Popup
                      className="fixed-popup"
                      style={{
                        transform: `rotate(${-mapRotation}deg)`,
                        transformOrigin: "center center",
                      }}
                    >
                      <div className="text-center max-w-32">
                        <div className="text-sm">🚩</div>
                        <div className="font-semibold text-red-600 text-xs">ゴール地点</div>
                        <div className="font-medium text-xs break-words">
                          {routeData.destination.name}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* 現在地マーカー */}
                {currentLocation && (
                  <Marker
                    position={[currentLocation.lat, currentLocation.lng]}
                    icon={currentLocationIcon}
                  >
                    <Popup
                      className="fixed-popup"
                      style={{
                        transform: `rotate(${-mapRotation}deg)`,
                        transformOrigin: "center center",
                      }}
                    >
                      <div className="text-center max-w-40">
                        <div className="text-xs text-gray-500 break-all">
                          {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                        </div>
                        <div className="text-xs mt-1">
                          {routeStatus.isOnRoute ? (
                            <span className="text-green-600">✅ ルート上</span>
                          ) : (
                            <span className="text-red-600">
                              ❌ ルート外 ({routeStatus.distance.toFixed(0)}m)
                            </span>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* 合流点マーカー（ルート外の時のみ表示） */}
                {joinPoint && !routeStatus.isOnRoute && (
                  <Marker position={[joinPoint.lat, joinPoint.lng]} icon={joinPointIcon}>
                    <Popup
                      className="fixed-popup"
                      style={{
                        transform: `rotate(${-mapRotation}deg)`,
                        transformOrigin: "center center",
                      }}
                    >
                      <div className="text-center max-w-32">
                        <div className="text-sm">🛣️</div>
                        <div className="font-semibold text-orange-600 text-xs">合流点</div>
                        <div className="text-xs text-gray-500">
                          道路に沿ったルート
                          <br />
                          自然な合流パス
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
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
                {routeData?.polyline?.geometry?.coordinates && (
                  <div className="text-xs text-gray-600 mt-1">
                    {routeData.polyline.geometry.coordinates.length > 1000
                      ? `最適化: ${getOptimizedCoordinates(routeData.polyline.geometry.coordinates, mapZoom).length}点`
                      : `${routeData.polyline.geometry.coordinates.length}点`}
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
          <div className="mb-4">{renderTabContent()}</div>

          {/* タブボタン */}
          <div className="flex gap-2">
            <button
              onClick={() => handleTabChange("main")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 ${
                activeTab === "main"
                  ? "bg-blue-100 border-blue-500 text-blue-700"
                  : "bg-gray-100 border-gray-300 text-gray-700"
              }`}
            >
              メインナビ
            </button>
            <button
              onClick={() => handleTabChange("locations")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 ${
                activeTab === "locations"
                  ? "bg-blue-100 border-blue-500 text-blue-700"
                  : "bg-gray-100 border-gray-300 text-gray-700"
              }`}
            >
              全員の位置
            </button>
            <button
              onClick={() => handleTabChange("rest")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 ${
                activeTab === "rest"
                  ? "bg-blue-100 border-blue-500 text-blue-700"
                  : "bg-gray-100 border-gray-300 text-gray-700"
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
            return members.map((member) => ({
              session_id: member.uid,
              user_name: member.name,
              audio: false,
              photoURL: member.photoURL,
              local: member.uid === currentUserUid,
            }));
          }

          return [];
        })()}
        participantPhotoURLs={participantPhotoURLs}
      />
    </div>
  );
};

export default CarNavigationAdvanced;
