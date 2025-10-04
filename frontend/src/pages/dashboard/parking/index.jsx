import { Icon } from "leaflet";
import React, { useCallback, useEffect, useRef, useState } from "react";
// Leaflet関連
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { isDebugModeEnabled } from "@/utils/env";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { getLatestParkingInfo } from "../../../firebase/parkingget";
import { getUser } from "../../../firebase/users";
import { useCurrentUser } from "../../../hooks/useUser";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Leafletのデフォルトアイコンを無効化（カスタムアイコンのみ使用）
delete L.Icon.Default.prototype._getIconUrl;

// ユーザーアイコンマーカーのスタイル
const userIconStyle = `
  .user-icon-marker {
    border-radius: 50% !important;
    border: 2px solid white !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
  }
`;

// スタイルを追加
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = userIconStyle;
  document.head.appendChild(style);
}

// ⭐ ルート描画コンポーネント（案内非表示、メモ化）
const RoutingControl = React.memo(({ from, to }) => {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) return;

    // 既存ルート削除
    map.eachLayer((layer) => {
      if (layer._router) map.removeControl(layer);
    });

    // ルートのみ表示
    const control = L.Routing.control({
      waypoints: [L.latLng(from.lat, from.lng), L.latLng(to.lat, to.lng)],
      routeWhileDragging: false,
      showAlternatives: false,
      addWaypoints: false,
      draggableWaypoints: false,
      createMarker: () => null, // ルートマーカーを作成しない
      show: false, // 案内パネルを表示しない
      lineOptions: {
        styles: [{ color: "#3388ff", weight: 4, opacity: 0.8 }], // 青色のルート線
      },
    }).addTo(map);

    // 案内パネルDOMを非表示
    const panels = document.getElementsByClassName("leaflet-routing-container");
    Array.from(panels).forEach((panel) => (panel.style.display = "none"));

    return () => {
      map.removeControl(control);
    };
  }, [from, to, map]);

  return null;
}, (prevProps, nextProps) => {
  // カスタム比較関数：位置が大きく変わった場合のみ再描画
  if (!prevProps.from || !nextProps.from || !prevProps.to || !nextProps.to) {
    return false;
  }
  
  const fromDistance = Math.abs(prevProps.from.lat - nextProps.from.lat) + 
                      Math.abs(prevProps.from.lng - nextProps.from.lng);
  const toDistance = Math.abs(prevProps.to.lat - nextProps.to.lat) + 
                    Math.abs(prevProps.to.lng - nextProps.to.lng);
  
  // 0.001度（約100m）以上の変化がある場合のみ再描画
  return fromDistance < 0.001 && toDistance < 0.001;
});

// ⭐ 地図コントローラー（ズームと中心を制御）
const MapController = ({ center, zoom, onCenterChange }) => {
  const map = useMap();
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (map && center && zoom !== undefined) {
      isAnimatingRef.current = true;
      map.setView(center, zoom, {
        animate: true,
        duration: 0.8,
      });
      // アニメーション完了後にフラグをリセット
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 1000);
    }
  }, [map, center, zoom]);

  useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      // アニメーション中は状態更新をスキップ
      if (isAnimatingRef.current) return;
      
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      
      // 現在の状態と異なる場合のみ更新
      const newCenter = {
        lat: currentCenter.lat,
        lng: currentCenter.lng,
        zoom: currentZoom,
      };
      
      // 微小な差は無視（無限ループ防止）
      if (center && Math.abs(center.lat - newCenter.lat) < 0.000001 && 
          Math.abs(center.lng - newCenter.lng) < 0.000001 && 
          Math.abs(zoom - newCenter.zoom) < 0.1) {
        return;
      }
      
      onCenterChange(newCenter);
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, onCenterChange, center, zoom]);

  return null;
};

// ⭐ メインコンポーネント
const ParkingInfoDisplay = () => {
  const [parkingInfo, setParkingInfo] = useState(null);
  const [nowPosition, setNowPosition] = useState(null);
  const [timeDiff, setTimeDiff] = useState("");
  const [walkingTime, setWalkingTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [_isDebugMode, _setIsDebugMode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [stableNowPosition, setStableNowPosition] = useState(null);
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const gpsIntervalRef = useRef(null);
  const lastValidLocationRef = useRef(null);
  const lastValidAccuracyRef = useRef(null);
  const routeUpdateTimeoutRef = useRef(null);

  // 緯度経度間の距離（m）
  const getDistanceMeters = useCallback((a, b) => {
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
  }, []);

  // GPS位置・精度フィルタリング関数（精度が悪い時のブレ抑制）
  const filterGpsLocation = useCallback((newLocation, accuracy) => {
    const lastValid = lastValidLocationRef.current;
    const lastValidAccuracy = lastValidAccuracyRef.current;

    // 初回または精度が良い場合はそのまま使用
    if (!lastValid || accuracy <= 30) {
      lastValidLocationRef.current = newLocation;
      lastValidAccuracyRef.current = accuracy;
      return { location: newLocation, accuracy };
    }

    // 精度が悪い場合の距離チェック
    const distance = getDistanceMeters(lastValid, newLocation);

    // 精度が悪い場合の閾値設定
    let maxDistance;
    if (accuracy <= 50) {
      maxDistance = 20; // 精度50m以下：20m以内の移動のみ許可
    } else if (accuracy <= 100) {
      maxDistance = 15; // 精度100m以下：15m以内の移動のみ許可
    } else {
      maxDistance = 10; // 精度100m超：10m以内の移動のみ許可
    }

    // 移動距離が閾値を超えている場合は前回の位置を維持
    if (distance > maxDistance) {
      console.log(`📍 GPS位置フィルタリング: 移動距離${distance.toFixed(1)}m > 閾値${maxDistance}m、前回位置を維持`);
      return { location: lastValid, accuracy: lastValidAccuracy };
    }

    // 精度の急激な変化を抑制（前回の精度から80%以上変化した場合は段階的に調整）
    let filteredAccuracy = accuracy;
    if (lastValidAccuracy && lastValidAccuracy > 30) {
      const accuracyChangeRatio = Math.abs(accuracy - lastValidAccuracy) / lastValidAccuracy;
      
      // 精度が良くなった場合はより積極的に採用
      if (accuracy < lastValidAccuracy && accuracyChangeRatio > 0.3) {
        // 精度が良くなった場合は70%の重みで新値を採用
        filteredAccuracy = (lastValidAccuracy * 0.3 + accuracy * 0.7);
        console.log(`📍 GPS精度フィルタリング: 精度改善を検出 ${lastValidAccuracy.toFixed(1)}m → ${accuracy.toFixed(1)}m、改善値 ${filteredAccuracy.toFixed(1)}m を使用`);
      } else if (accuracyChangeRatio > 0.8) {
        // 精度が悪くなった場合は前回値を重視
        filteredAccuracy = (lastValidAccuracy * 0.7 + accuracy * 0.3);
        console.log(`📍 GPS精度フィルタリング: 急激な変化を検出 ${lastValidAccuracy.toFixed(1)}m → ${accuracy.toFixed(1)}m、調整値 ${filteredAccuracy.toFixed(1)}m を使用`);
      }
    }

    // 閾値以内の場合は新しい位置を採用
    lastValidLocationRef.current = newLocation;
    lastValidAccuracyRef.current = filteredAccuracy;
    return { location: newLocation, accuracy: filteredAccuracy };
  }, [getDistanceMeters]);

  // ユーザー情報を取得
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (currentUser?.uid) {
        try {
          const user = await getUser(currentUser.uid);
          setUserInfo(user);
        } catch (error) {
          console.error("ユーザー情報の取得に失敗しました:", error);
        }
      }
    };
    fetchUserInfo();
  }, [currentUser?.uid]);

  // カスタムアイコンの作成（色分け対応）
  const createCustomIcon = (color = "#3388ff", type = "current") => {
    if (type === "current") {
      // 現在地の場合は実際のユーザーアイコンまたはデフォルトアイコン
      if (userInfo?.photoURL) {
        // 実際のユーザーアイコンを使用
        return new Icon({
          iconUrl: userInfo.photoURL,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15],
          className: "user-icon-marker",
        });
      } else {
        // デフォルトのユーザーアイコン
        const svgIcon = `
          <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="15" y="19" text-anchor="middle" font-size="12" fill="white">👤</text>
          </svg>
        `;

        return new Icon({
          iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIcon)}`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15],
        });
      }
    } else if (type === "parking") {
      // 駐車場の場合は車マーク + 駐車場ラベル（目立つ色 + 点滅効果）
      const svgIcon = `
        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>
              .parking-label {
                fill: #ff4444;
                font-size: 8px;
                font-family: Arial, sans-serif;
                font-weight: bold;
                animation: blink 1.5s infinite;
              }
              @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
              }
            </style>
          </defs>
          <text x="15" y="12" text-anchor="middle" class="parking-label">駐車場</text>
          <text x="15" y="32" text-anchor="middle" font-size="18" fill="${color}">🚗</text>
        </svg>
      `;

      return new Icon({
        iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIcon)}`,
        iconSize: [30, 40],
        iconAnchor: [15, 35],
        popupAnchor: [0, -35],
      });
    }
  };

  // 現在地をずらす関数（デバッグ用）
  const shiftCurrentLocation = (direction) => {
    if (!nowPosition) return;

    const shiftAmount = 0.001; // 約100m程度のずれ
    let newLat = nowPosition.lat;
    let newLng = nowPosition.lng;

    switch (direction) {
      case "north":
        newLat += shiftAmount;
        break;
      case "south":
        newLat -= shiftAmount;
        break;
      case "east":
        newLng += shiftAmount;
        break;
      case "west":
        newLng -= shiftAmount;
        break;
    }

    setNowPosition({ lat: newLat, lng: newLng });
    console.log(`現在地を${direction}にずらしました:`, {
      lat: newLat,
      lng: newLng,
    });
  };

  // 現在地をリセットする関数（デバッグ用）
  const resetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const newLocation = { lat: latitude, lng: longitude };

          // GPS位置・精度フィルタリングを適用
          const filteredData = filterGpsLocation(newLocation, accuracy);

          setNowPosition(filteredData.location);
          setGpsAccuracy(filteredData.accuracy);
          
          console.log("現在地をリセットしました:", {
            lat: latitude,
            lng: longitude,
            accuracy: `${accuracy.toFixed(1)}m`,
            filteredAccuracy: `${filteredData.accuracy.toFixed(1)}m`
          });
        },
        (err) => {
          console.error("位置情報の取得に失敗しました:", err);
          // デフォルト位置（東京）にリセット
          setNowPosition({
            lat: 35.6762,
            lng: 139.6503,
          });
          console.log("デフォルト位置にリセットしました");
        }
      );
    }
  };

  // Firestoreから最新の駐車情報を取得
  useEffect(() => {
    const fetchParkingInfo = async () => {
      try {
        setLoading(true);
        const info = await getLatestParkingInfo();
        setParkingInfo(info);
      } catch (e) {
        alert(`駐車情報の取得に失敗しました: ${e.message}`);
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchParkingInfo();
  }, []);

  // リアルタイムGPS位置情報監視を開始（2秒間隔で更新）
  const startLocationSharing = useCallback(() => {
    // デバッグモードの場合はGPS監視をスキップ
    if (isDebugModeEnabled()) {
      console.log("📍 デバッグモード: GPS監視をスキップ");
      return;
    }

    // 既存のGPS監視を停止
    if (gpsIntervalRef.current) {
      navigator.geolocation.clearWatch(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }

    if (!navigator.geolocation) {
      console.log("GPS not supported");
      return;
    }

    // 初回取得
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };

        // GPS位置・精度フィルタリングを適用
        const filteredData = filterGpsLocation(newLocation, accuracy);

        setNowPosition(filteredData.location);
        setGpsAccuracy(filteredData.accuracy);
        console.log("📍 GPS位置取得（初回）:", {
          latitude,
          longitude,
          accuracy: `${accuracy.toFixed(1)}m`,
          filteredAccuracy: `${filteredData.accuracy.toFixed(1)}m`
        });
      },
      (error) => {
        console.error("GPS error:", error);
        // デフォルト位置（東京）を設定
        setNowPosition({
          lat: 35.6762,
          lng: 139.6503,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // キャッシュを使わずに常に最新の位置を取得
      }
    );

    // リアルタイムGPS監視を開始（watchPositionを使用）
    gpsIntervalRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };

        // GPS位置・精度フィルタリングを適用
        const filteredData = filterGpsLocation(newLocation, accuracy);

        // フィルタリングされた位置情報を反映
        setNowPosition(filteredData.location);
        setGpsAccuracy(filteredData.accuracy);
        
        // 頻繁すぎるログはコメントアウト
        // console.log("📍 GPS位置リアルタイム更新:", { 
        //   latitude, 
        //   longitude, 
        //   accuracy: `${accuracy.toFixed(1)}m`,
        //   filteredAccuracy: `${filteredData.accuracy.toFixed(1)}m`
        // });
      },
      (error) => {
        console.error("❌ GPS監視エラー:", error.message);
      },
      {
        enableHighAccuracy: true, // 高精度モード
        timeout: 5000, // タイムアウト5秒
        maximumAge: 0, // キャッシュを使わずに常に最新の位置を取得
      }
    );

    console.log("🔄 リアルタイムGPS監視開始（駐車場画面）");
  }, [filterGpsLocation]);

  // 位置情報共有を停止
  const stopLocationSharing = useCallback(() => {
    if (gpsIntervalRef.current) {
      navigator.geolocation.clearWatch(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    console.log("⏹️ GPS位置情報共有停止");
  }, []);

  // GPS監視の開始・停止制御
  useEffect(() => {
    // リアルタイムGPS監視を開始（デバッグモードOFFの場合のみ）
    if (!isDebugModeEnabled()) {
      startLocationSharing();
    }

    // クリーンアップ
    return () => {
      stopLocationSharing();
    };
  }, [startLocationSharing, stopLocationSharing]);

  // 出発までの時間を計算（リアルタイム更新）
  useEffect(() => {
    if (parkingInfo?.departureTime && parkingInfo?.arrivalTime) {
      const dep = new Date(parkingInfo.departureTime);
      const arr = new Date(parkingInfo.arrivalTime);
      const now = new Date();
      
      // 現在時刻と出発時刻を比較
      const timeToDeparture = dep - now;
      
      if (timeToDeparture > 0) {
        // 出発時刻まで時間がある場合
        const diffMs = dep - arr;
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeDiff(`${hours}時間${minutes}分`);
        } else {
          setTimeDiff("出発時刻が到着時刻より前です");
        }
        setIsOverdue(false);
      } else {
        // 出発時刻を過ぎている場合
        const overdueMinutes = Math.floor(Math.abs(timeToDeparture) / (1000 * 60));
        setTimeDiff(`過ぎています ${overdueMinutes}分`);
        setIsOverdue(true);
      }
    } else {
      setTimeDiff("");
      setIsOverdue(false);
    }
  }, [parkingInfo]);

  // 出発時刻チェックを1分ごとに更新
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (parkingInfo?.departureTime) {
        const dep = new Date(parkingInfo.departureTime);
        const now = new Date();
        const timeToDeparture = dep - now;
        
        if (timeToDeparture <= 0) {
          const overdueMinutes = Math.floor(Math.abs(timeToDeparture) / (1000 * 60));
          setTimeDiff(`過ぎています ${overdueMinutes}分`);
          setIsOverdue(true);
        } else {
          setIsOverdue(false);
        }
      }
    }, 60000); // 1分ごと

    return () => clearInterval(intervalId);
  }, [parkingInfo?.departureTime]);

  // 徒歩時間を計算（GPS更新に応じてリアルタイム更新）
  useEffect(() => {
    if (nowPosition && parkingInfo?.position) {
      const distance = getDistanceMeters(nowPosition, parkingInfo.position);
      
      const walkSpeed = 83; // m/分（約5km/h）
      const minutes = Math.round(distance / walkSpeed);
      
      // 距離も表示に含める
      const distanceKm = (distance / 1000).toFixed(1);
      setWalkingTime(`徒歩 約${minutes}分 (${distanceKm}km)`);
    } else {
      setWalkingTime("");
    }
  }, [nowPosition, parkingInfo, getDistanceMeters]);

  // ルート描画用の安定した位置を更新（デバウンス）
  useEffect(() => {
    if (!nowPosition) return;

    // 既存のタイムアウトをクリア
    if (routeUpdateTimeoutRef.current) {
      clearTimeout(routeUpdateTimeoutRef.current);
    }

    // 3秒後に安定した位置を更新（ルートの点滅を防ぐ）
    routeUpdateTimeoutRef.current = setTimeout(() => {
      setStableNowPosition(nowPosition);
    }, 3000);

    return () => {
      if (routeUpdateTimeoutRef.current) {
        clearTimeout(routeUpdateTimeoutRef.current);
      }
    };
  }, [nowPosition]);

  const handleGoInput = () => {
    navigate("/dashboard/parking/input");
  };

  // 地図の中心位置を取得（初期値は現在地）
  const getMapCenter = () => {
    return mapCenter || nowPosition || { lat: 35.6762, lng: 139.6503 };
  };

  // 地図中心位置変更ハンドラー
  const handleMapCenterChange = useCallback((newCenter) => {
    // 現在の状態と異なる場合のみ更新（無限ループ防止）
    if (!mapCenter || 
        Math.abs(mapCenter.lat - newCenter.lat) > 0.000001 || 
        Math.abs(mapCenter.lng - newCenter.lng) > 0.000001 || 
        Math.abs(mapZoom - newCenter.zoom) > 0.1) {
      setMapCenter(newCenter);
      setMapZoom(newCenter.zoom);
    }
  }, [mapCenter, mapZoom]);

  // 現在地にフォーカス
  const focusOnCurrentLocation = () => {
    if (nowPosition) {
      setMapCenter({
        lat: nowPosition.lat,
        lng: nowPosition.lng,
        zoom: 16,
      });
      console.log("📍 現在地にフォーカス:", nowPosition);
    }
  };

  // 駐車場にフォーカス
  const focusOnParkingLocation = () => {
    if (parkingInfo?.position) {
      setMapCenter({
        lat: parkingInfo.position.lat,
        lng: parkingInfo.position.lng,
        zoom: 16,
      });
      console.log("🅿️ 駐車場にフォーカス:", parkingInfo.position);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-6">
        {/* タイトルセクション */}

        {loading ? (
          <LoadingSpinner text="駐車情報を読み込み中..." />
        ) : parkingInfo ? (
          <>
            {/* 駐車情報カード */}
            <Card className="mb-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">📍</div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">駐車情報</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-2xl">🕐</span>
                  <div>
                    <div className="font-semibold text-blue-800">駐車日時</div>
                    <div className="text-blue-700">
                      {parkingInfo.arrivalTime
                        ? new Date(parkingInfo.arrivalTime).toLocaleString("ja-JP")
                        : "未設定"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <div className="font-semibold text-green-800">出発予定</div>
                    <div className="text-green-700">
                      {parkingInfo.departureTime
                        ? new Date(parkingInfo.departureTime).toLocaleString("ja-JP")
                        : "未設定"}
                    </div>
                  </div>
                </div>

                {timeDiff && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${isOverdue 
                    ? "bg-red-50 border-2 border-red-200 animate-pulse" 
                    : "bg-yellow-50"
                  }`}>
                    <span className="text-2xl">{isOverdue ? "⚠️" : "⏰"}</span>
                    <div>
                      <div className={`font-semibold ${isOverdue ? "text-red-800" : "text-yellow-800"}`}>
                        {isOverdue ? "出発時刻を過ぎています！" : "出発までの時間"}
                      </div>
                      <div className={`${isOverdue ? "text-red-700 font-bold text-lg" : "text-yellow-700"}`}>
                        {timeDiff}
                      </div>
                    </div>
                  </div>
                )}

                {walkingTime && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <span className="text-2xl">🚶</span>
                    <div>
                      <div className="font-semibold text-purple-800">現在地からの距離</div>
                      <div className="text-purple-700">{walkingTime}</div>
                    </div>
                  </div>
                )}

                {gpsAccuracy && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-2xl">📡</span>
                    <div>
                      <div className="font-semibold text-blue-800">GPS精度</div>
                      <div className={`text-blue-700 ${gpsAccuracy > 100 ? "font-bold text-red-600" : gpsAccuracy > 50 ? "text-orange-600" : ""}`}>
                        ±{gpsAccuracy.toFixed(0)}m
                        {gpsAccuracy > 100 && <span className="text-xs ml-1">(低精度)</span>}
                        {gpsAccuracy > 50 && gpsAccuracy <= 100 && <span className="text-xs ml-1">(やや低め)</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* デバッグ用の現在地調整ボタン */}
            {nowPosition && isDebugModeEnabled() && (
              <Card className="mb-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🔧 デバッグモード</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    現在地を意図的にずらしてテストできます
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => shiftCurrentLocation("north")}
                      className="w-full"
                    >
                      ↑ 北にずらす
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => shiftCurrentLocation("south")}
                      className="w-full"
                    >
                      ↓ 南にずらす
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => shiftCurrentLocation("west")}
                      className="w-full"
                    >
                      ← 西にずらす
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => shiftCurrentLocation("east")}
                      className="w-full"
                    >
                      → 東にずらす
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    現在地: {nowPosition.lat.toFixed(6)}, {nowPosition.lng.toFixed(6)}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetCurrentLocation}
                    className="w-full"
                  >
                    🔄 GPS位置を更新
                  </Button>
                </div>
              </Card>
            )}

            {/* 地図カード */}
            {nowPosition && parkingInfo?.position && (
              <Card className="mb-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🗺️</div>
                  <h2 className="text-xl font-bold text-gray-800">位置情報</h2>
                  <p className="text-gray-600 text-sm">現在地から駐車場へのルート</p>
                </div>

                <div className="h-64 rounded-lg overflow-hidden shadow-md relative z-0">
                  {/* ズームボタン（地図内に残す） */}
                  <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
                    <button
                      onClick={() => setMapZoom(Math.min(mapZoom + 1, 18))}
                      className="bg-white hover:bg-gray-50 text-gray-700 w-10 h-10 rounded-lg shadow-lg flex items-center justify-center font-bold text-lg transition-colors duration-200"
                      title="ズームイン"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setMapZoom(Math.max(mapZoom - 1, 1))}
                      className="bg-white hover:bg-gray-50 text-gray-700 w-10 h-10 rounded-lg shadow-lg flex items-center justify-center font-bold text-lg transition-colors duration-200"
                      title="ズームアウト"
                    >
                      −
                    </button>
                  </div>
                  <MapContainer
                    center={getMapCenter()}
                    zoom={mapZoom}
                    style={{ height: "100%", width: "100%", position: "relative", zIndex: 0 }}
                    attributionControl={true} // ライセンス表記を表示（法的に必要）
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    <MapController
                      center={getMapCenter()}
                      zoom={mapZoom}
                      onCenterChange={handleMapCenterChange}
                    />
                    {/* 現在地と駐車場の位置を比較して適切に表示 */}
                    {(() => {
                      const isSameLocation =
                        Math.abs(nowPosition.lat - parkingInfo.position.lat) < 0.0001 &&
                        Math.abs(nowPosition.lng - parkingInfo.position.lng) < 0.0001;

                      if (isSameLocation) {
                        // 同じ位置の場合は駐車場のピンを表示（赤色で目立つ）
                        return (
                          <Marker
                            key="parking-same-location"
                            position={nowPosition}
                            icon={createCustomIcon("#ff6b6b", "parking")}
                          >
                            <Popup>
                              <div className="text-center">
                                <div className="text-lg mb-1">🅿️</div>
                                <div className="font-semibold">現在地・駐車場</div>
                                <div className="text-sm text-gray-600">同じ場所です</div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      } else {
                        // 異なる位置の場合は2つのピンを表示（少しずらして重なりを防ぐ）
                        const offset = 0.00005; // 約5m程度のずれ
                        return (
                          <>
                            <Marker
                              key="current-location"
                              position={[nowPosition.lat + offset, nowPosition.lng]}
                              icon={createCustomIcon("#3388ff", "current")}
                            >
                              <Popup>
                                <div className="text-center">
                                  <div className="text-lg mb-1">📍</div>
                                  <div className="font-semibold">現在地</div>
                                  <div className="text-sm text-gray-600">
                                    {nowPosition.lat.toFixed(6)}, {nowPosition.lng.toFixed(6)}
                                  </div>
                                </div>
                              </Popup>
                            </Marker>
                            <Marker
                              key="parking-location"
                              position={[
                                parkingInfo.position.lat - offset,
                                parkingInfo.position.lng,
                              ]}
                              icon={createCustomIcon("#ff6b6b", "parking")}
                            >
                              <Popup>
                                <div className="text-center">
                                  <div className="text-lg mb-1">🅿️</div>
                                  <div className="font-semibold">駐車場</div>
                                  <div className="text-sm text-gray-600">
                                    {parkingInfo.position.lat.toFixed(6)},{" "}
                                    {parkingInfo.position.lng.toFixed(6)}
                                  </div>
                                </div>
                              </Popup>
                            </Marker>
                          </>
                        );
                      }
                    })()}
                    {/* ルート描画は異なる位置の場合のみ表示（安定した位置を使用） */}
                    {(() => {
                      const routePosition = stableNowPosition || nowPosition;
                      
                      if (!routePosition || !parkingInfo?.position) return null;
                      
                      const isSameLocation =
                        Math.abs(routePosition.lat - parkingInfo.position.lat) < 0.0001 &&
                        Math.abs(routePosition.lng - parkingInfo.position.lng) < 0.0001;

                      if (!isSameLocation) {
                        return <RoutingControl from={routePosition} to={parkingInfo.position} />;
                      }
                      return null;
                    })()}
                  </MapContainer>
                </div>

                {/* 地図遷移ボタン（地図の下に配置） */}
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    onClick={focusOnCurrentLocation}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 flex-1 max-w-[200px]"
                    title="現在地にフォーカス"
                  >
                    <span className="text-lg">📍</span>
                    現在地にセット
                  </button>
                  <button
                    onClick={focusOnParkingLocation}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 flex-1 max-w-[200px]"
                    title="駐車場にフォーカス"
                  >
                    <span className="text-lg">🅿️</span>
                    駐車場にセット
                  </button>
                </div>
              </Card>
            )}

            {/* アクションボタン */}
            <div className="space-y-4"></div>
          </>
        ) : (
          <EmptyState
            icon="🚗"
            title="駐車情報がありません"
            description="駐車場の情報を登録して、位置情報を管理しましょう"
            actionLabel="駐車情報を登録"
            actionOnClick={handleGoInput}
          />
        )}
      </div>
    </div>
  );
};

export default ParkingInfoDisplay;
