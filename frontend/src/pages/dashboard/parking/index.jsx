import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "../../../components/Header/Header2";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import EmptyState from "../../../components/ui/EmptyState";
import { getLatestParkingInfo } from "../../../firebase/parkingget";
import { getUser } from "../../../firebase/users";
import { useCurrentUser } from "../../../hooks/useUser";

// Leaflet関連
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
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
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = userIconStyle;
  document.head.appendChild(style);
}


// ⭐ ルート描画コンポーネント（案内非表示）
const RoutingControl = ({ from, to }) => {
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
        styles: [{ color: '#3388ff', weight: 4, opacity: 0.8 }] // 青色のルート線
      }
    }).addTo(map);

    // 案内パネルDOMを非表示
    const panels = document.getElementsByClassName("leaflet-routing-container");
    Array.from(panels).forEach((panel) => (panel.style.display = "none"));

    return () => {
      map.removeControl(control);
    };
  }, [from, to, map]);

  return null;
};


// ⭐ メインコンポーネント
const ParkingInfoDisplay = () => {
  const [parkingInfo, setParkingInfo] = useState(null);
  const [nowPosition, setNowPosition] = useState(null);
  const [timeDiff, setTimeDiff] = useState("");
  const [walkingTime, setWalkingTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

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
  const createCustomIcon = (color = '#3388ff', type = 'current') => {
    if (type === 'current') {
      // 現在地の場合は実際のユーザーアイコンまたはデフォルトアイコン
      if (userInfo?.photoURL) {
        // 実際のユーザーアイコンを使用
        return new Icon({
          iconUrl: userInfo.photoURL,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15],
          className: 'user-icon-marker'
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
          popupAnchor: [0, -15]
        });
      }
    } else if (type === 'parking') {
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
        popupAnchor: [0, -35]
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
      case 'north':
        newLat += shiftAmount;
        break;
      case 'south':
        newLat -= shiftAmount;
        break;
      case 'east':
        newLng += shiftAmount;
        break;
      case 'west':
        newLng -= shiftAmount;
        break;
    }
    
    setNowPosition({ lat: newLat, lng: newLng });
    console.log(`現在地を${direction}にずらしました:`, { lat: newLat, lng: newLng });
  };

  // 現在地をリセットする関数（デバッグ用）
  const resetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNowPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          console.log("現在地をリセットしました:", { lat: pos.coords.latitude, lng: pos.coords.longitude });
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
        alert("駐車情報の取得に失敗しました: " + e.message);
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchParkingInfo();
  }, []);

  // ⭐ 現在地を取得（ブラウザのGeolocation API）
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("このブラウザでは位置情報がサポートされていません。");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNowPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.error("位置情報の取得に失敗しました:", err);
        
        // エラーの種類に応じて適切なメッセージを表示
        let errorMessage = "現在地を取得できませんでした。";
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "位置情報の許可が必要です。ブラウザの設定で位置情報を許可してください。";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "位置情報が利用できません。";
            break;
          case err.TIMEOUT:
            errorMessage = "位置情報の取得がタイムアウトしました。";
            break;
        }
        
        // アラートではなく、より優しい通知に変更
        console.warn("⚠️ 位置情報エラー:", errorMessage);
        
        // デフォルト位置（東京）を設定
        setNowPosition({
          lat: 35.6762,
          lng: 139.6503,
        });
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000, // 10秒でタイムアウト
        maximumAge: 300000 // 5分間キャッシュ
      }
    );
  }, []);

  // 出発までの時間を計算
  useEffect(() => {
    if (parkingInfo?.departureTime && parkingInfo?.arrivalTime) {
      const dep = new Date(parkingInfo.departureTime);
      const arr = new Date(parkingInfo.arrivalTime);
      const diffMs = dep - arr;
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeDiff(`${hours}時間${minutes}分`);
      } else {
        setTimeDiff("出発時刻が到着時刻より前です");
      }
    } else {
      setTimeDiff("");
    }
  }, [parkingInfo]);

  // 徒歩時間を計算（簡易計算）
  useEffect(() => {
    if (nowPosition && parkingInfo?.position) {
      const R = 6371e3; // 地球の半径(m)
      const toRad = (deg) => (deg * Math.PI) / 180;

      const lat1 = toRad(nowPosition.lat);
      const lat2 = toRad(parkingInfo.position.lat);
      const dLat = toRad(parkingInfo.position.lat - nowPosition.lat);
      const dLng = toRad(parkingInfo.position.lng - nowPosition.lng);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // m

      const walkSpeed = 83; // m/分（約5km/h）
      const minutes = Math.round(distance / walkSpeed);
      setWalkingTime(`徒歩 約${minutes}分`);
    } else {
      setWalkingTime("");
    }
  }, [nowPosition, parkingInfo]);

  const handleGoInput = () => {
    navigate("/dashboard/parking/input");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <HeaderComponent2 title="駐車場"/>
      
      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-6" style={{ paddingTop: '100px' }}>
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
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <div className="font-semibold text-yellow-800">出発までの時間</div>
                    <div className="text-yellow-700">{timeDiff}</div>
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
            </div>
          </Card>

          {/* デバッグ用の現在地調整ボタン */}
          {nowPosition && (
            <Card className="mb-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🔧 デバッグモード</h3>
                <p className="text-sm text-gray-600 mb-4">現在地を意図的にずらしてテストできます</p>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => shiftCurrentLocation('north')}
                    className="w-full"
                  >
                    ↑ 北にずらす
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => shiftCurrentLocation('south')}
                    className="w-full"
                  >
                    ↓ 南にずらす
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => shiftCurrentLocation('west')}
                    className="w-full"
                  >
                    ← 西にずらす
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => shiftCurrentLocation('east')}
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
                  🔄 現在地をリセット
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

              <div className="h-64 rounded-lg overflow-hidden shadow-md">
            <MapContainer
              center={nowPosition}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
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
                          icon={createCustomIcon('#ff6b6b', 'parking')}
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
                            icon={createCustomIcon('#3388ff', 'current')}
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
                            position={[parkingInfo.position.lat - offset, parkingInfo.position.lng]} 
                            icon={createCustomIcon('#ff6b6b', 'parking')}
                          >
                            <Popup>
                              <div className="text-center">
                                <div className="text-lg mb-1">🅿️</div>
                                <div className="font-semibold">駐車場</div>
                                <div className="text-sm text-gray-600">
                                  {parkingInfo.position.lat.toFixed(6)}, {parkingInfo.position.lng.toFixed(6)}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        </>
                      );
                    }
                  })()}
                  {/* ルート描画は異なる位置の場合のみ表示 */}
                  {(() => {
                    const isSameLocation = 
                      Math.abs(nowPosition.lat - parkingInfo.position.lat) < 0.0001 && 
                      Math.abs(nowPosition.lng - parkingInfo.position.lng) < 0.0001;
                    
                    if (!isSameLocation) {
                      return <RoutingControl from={nowPosition} to={parkingInfo.position} />;
                    }
                    return null;
                  })()}
            </MapContainer>
          </div>
            </Card>
          )}

          {/* アクションボタン */}
          <div className="space-y-4">
      </div>
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
