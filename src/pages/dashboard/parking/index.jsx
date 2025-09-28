import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../components/layout/PageLayout";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import EmptyState from "../../../components/ui/EmptyState";
import { getLatestParkingInfo } from "../../../firebase/parkingget";

// Leaflet関連
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Leafletのデフォルトアイコンを設定（Markラベルを防ぐ）
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});


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
      createMarker: (i, wp) => L.marker(wp.latLng),
      show: false, // 案内パネルを表示しない
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
  const navigate = useNavigate();

  // カスタムアイコンの作成（外部CDNから確実に読み込み）
  const createCustomIcon = (color = '#3388ff', type = 'current') => {
    // 外部CDNから確実に読み込めるアイコンを使用
    const iconUrl = type === 'parking' 
      ? 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png'
      : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
    
    const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';
    
    return new Icon({
      iconUrl: iconUrl,
      shadowUrl: shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
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
    <PageLayout title="駐車場情報">
      {/* タイトルセクション */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🚗</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">駐車場情報</h1>
        <p className="text-gray-600">現在の駐車状況と位置情報を確認できます</p>
      </div>

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
                      // 同じ位置の場合は1つのピンのみ表示
                      return (
                        <Marker position={nowPosition}>
                          <Popup>
                            <div className="text-center">
                              <div className="text-lg mb-1">📍</div>
                              <div className="font-semibold">現在地・駐車場</div>
                              <div className="text-sm text-gray-600">同じ場所です</div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    } else {
                      // 異なる位置の場合は2つのピンを表示
                      return (
                        <>
                          <Marker position={nowPosition}>
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
                          <Marker position={parkingInfo.position}>
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
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleGoInput}
              icon="✏️"
            >
              駐車情報を編集
            </Button>
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
    </PageLayout>
  );
};

export default ParkingInfoDisplay;
