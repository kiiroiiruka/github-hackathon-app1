import { useNavigate, useLocation } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import RoutingControl from "../../../components/ui/RoutingControl";
import MapSearch from "../../../components/ui/MapSearch";
import Card from "../../../components/ui/Card";
import { useAuthState } from "../../../hooks/useAuthState";
import { useAtom } from "jotai";
import { userUidAtom, isLoggedInAtom } from "../../../atom/userAtom";
import { saveUserRoute, formatRouteData } from "../../../firebase/route";


const RecenterMap = ({ position }) => {
    const map = useMap();
    useEffect(() => {
      if (position) {
        map.setView(position, map.getZoom());
      }
    }, [position, map]);
    return null;
  };

const RecenterMapWithZoom = ({ position, zoom }) => {
    const map = useMap();
    useEffect(() => {
      if (position && zoom) {
        map.setView(position, zoom);
      }
    }, [position, zoom, map]);
    return null;
  };

const RouteScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [departure, setDeparture] = useState(null);
  const [destination, setDestination] = useState(null);
  const [departureName, setDepartureName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [routeInfo, setRouteInfo] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const routeCalculatedRef = useRef(false); // ルート計算完了フラグ
  const routeKeyRef = useRef(null); // ルート用の安定したkey
  
  // カスタムアイコンの設定
  const departureIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const destinationIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  
  // Firebase認証状態を監視
  useAuthState();
  const [userUid] = useAtom(userUidAtom);
  const [isLoggedIn] = useAtom(isLoggedInAtom);

  // RoomCreatから渡された出発地点と目的地を受け取る
  useEffect(() => {
    // 目的地の設定
    if (location.state?.destination) {
      setDestination(location.state.destination);
      setDestinationName(location.state.destinationName || "");
    }
    // selectedLocationオブジェクトから値を取得する場合の対応
    else if (location.state?.selectedLocation) {
      setDestination(location.state.selectedLocation.coordinates);
      setDestinationName(location.state.selectedLocation.name || "");
    }
    
    // 出発地点の設定
    if (location.state?.departure) {
      setDeparture(location.state.departure);
      setDepartureName(location.state.departureName || "");
    }
    else if (location.state?.selectedDeparture) {
      setDeparture(location.state.selectedDeparture.coordinates);
      setDepartureName(location.state.selectedDeparture.name || "");
    }
    else {
      // デフォルト出発地点（日本の中央）を設定
      setDeparture([36.2048, 138.2529]);
      setDepartureName("日本中央部");
    }
  }, [location.state]);

  // 出発地や目的地が変更されたときにルート計算状態をリセット
  useEffect(() => {
    if (departure && destination) {
      const newRouteKey = `${departure[0]}-${departure[1]}-${destination[0]}-${destination[1]}`;
      if (routeKeyRef.current !== newRouteKey) {
        routeCalculatedRef.current = false;
        routeKeyRef.current = newRouteKey;
        setRouteInfo(null); // ルート情報をリセット
      }
    }
  }, [departure, destination]);

  // ルート保存関数
  const handleSaveRoute = async () => {
    if (!departure || !destination || !routeInfo) {
      alert('ルートが計算されていません');
      return;
    }

    if (!isLoggedIn || !userUid) {
      // ログインしていない場合はローカルストレージに保存（1つまで）
      const routeData = formatRouteData(
        { name: departureName, coordinates: departure },
        { name: destinationName, coordinates: destination },
        routeInfo
      );
      
      const savedRoutes = JSON.parse(localStorage.getItem('savedRoutes') || '[]');
      
      // 重複チェック
      const isDuplicate = savedRoutes.some(route => 
        Math.abs(route.departure.coordinates[0] - departure[0]) < 0.000001 &&
        Math.abs(route.departure.coordinates[1] - departure[1]) < 0.000001 &&
        Math.abs(route.destination.coordinates[0] - destination[0]) < 0.000001 &&
        Math.abs(route.destination.coordinates[1] - destination[1]) < 0.000001
      );
      
      if (isDuplicate) {
        setSaveMessage('同じルートが既に保存されています');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      
      // 1つまでの制限：既存のルートを置き換え
      const newSavedRoutes = [routeData]; // 常に1つだけ保存
      localStorage.setItem('savedRoutes', JSON.stringify(newSavedRoutes));
      
      if (savedRoutes.length > 0) {
        setSaveMessage('既存のルートを置き換えて保存しました');
      } else {
        setSaveMessage('ルートをローカルに保存しました');
      }
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const routeData = formatRouteData(
        { name: departureName, coordinates: departure },
        { name: destinationName, coordinates: destination },
        routeInfo
      );
      
      const docId = await saveUserRoute(userUid, routeData);
      
      if (docId) {
        setSaveMessage('ルートを保存しました！');
        console.log('ルート保存成功:', docId);
      } else {
        setSaveMessage('同じルートが既に保存されています');
      }
    } catch (error) {
      console.error('ルート保存エラー:', error);
      setSaveMessage('ルートの保存に失敗しました');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // コンポーネントのアンマウント時にルートをクリーンアップ
  useEffect(() => {
    return () => {
      // MapContainerのインスタンスを取得してルートをクリーンアップ
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer && mapContainer._leaflet_map) {
        const map = mapContainer._leaflet_map;
        if (map._routeCleanupFunctions) {
          map._routeCleanupFunctions.forEach(cleanup => {
            try {
              cleanup();
            } catch (error) {
              console.warn('ルートクリーンアップエラー:', error);
            }
          });
          map._routeCleanupFunctions = [];
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <HeaderComponent title="通信" />
      
      <div className="px-4 py-6 pt-20">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mb-4 shadow-lg">
              <span className="text-2xl text-white">🗺️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ルート表示
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              選択されたルートの詳細情報と地図を表示します
            </p>
          </div>

          {/* ルート情報カード */}
          <Card className="mb-6" variant="info">
            <div className="space-y-4">
              {/* 出発地と目的地 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departureName && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🚀</span>
                      <span className="font-semibold text-green-800">出発地</span>
                    </div>
                    <p className="text-green-700 font-medium">{departureName}</p>
                  </div>
                )}
                {destinationName && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🎯</span>
                      <span className="font-semibold text-blue-800">目的地</span>
                    </div>
                    <p className="text-blue-700 font-medium">{destinationName}</p>
                  </div>
                )}
              </div>
              
              {/* ルート詳細情報 */}
              {routeInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl mb-2">📏</div>
                      <div className="text-sm text-gray-600 mb-1">距離</div>
                      <div className="text-lg font-bold text-gray-800">
                        {typeof routeInfo.distanceKm === 'number' ? routeInfo.distanceKm.toFixed(2) : routeInfo.distanceKm}km
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl mb-2">⏱️</div>
                      <div className="text-sm text-gray-600 mb-1">所要時間</div>
                      <div className="text-lg font-bold text-gray-800">{routeInfo.durationMin}分</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl mb-2">🕰️</div>
                      <div className="text-sm text-gray-600 mb-1">到着予定</div>
                      <div className="text-lg font-bold text-gray-800">
                        {routeInfo.arrivalTime?.toLocaleTimeString?.() || '未定'}
                      </div>
                    </div>
                  </div>
                  
                  {/* ルート保存ボタン */}
                  <div className="flex justify-center items-center gap-4">
                    <button
                      type="button"
                      onClick={handleSaveRoute}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          保存中...
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          ルートを保存
                        </>
                      )}
                    </button>
                    
                    {saveMessage && (
                      <span className={`text-sm px-4 py-2 rounded-full font-medium ${
                        saveMessage.includes('失敗') || saveMessage.includes('既に') 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {saveMessage}
                      </span>
                    )}
                  </div>
                </div>
              ) : destination && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4 opacity-50">⏳</div>
                  <p className="text-gray-500 text-lg">ルートを計算中...</p>
                  <p className="text-sm text-gray-400 mt-2">
                    出発地: {departureName} → 目的地: {destinationName}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    OSRMサーバーに接続してルートを計算しています
                  </p>
                </div>
              )}
            </div>
          </Card>
          {/* 地図セクション */}
          <Card className="mb-6" variant="default">
            <div className="h-96 md:h-[500px] relative rounded-lg overflow-hidden">
              {/* 目的地検索 */}
              <div className="absolute top-4 left-4 right-4 z-[1000]">
                <MapSearch
                  onSelectDestination={(dest, name) => {
                    setDestination(dest);
                    setDestinationName(name);
                    routeCalculatedRef.current = false; // ルート計算状態をリセット
                    setRouteInfo(null); // ルート情報をリセット
                    console.log("選択された目的地:", name, dest);
                  }}
                />
              </div>

              <MapContainer
                center={departure || [36.2048, 138.2529]} // 日本の中央（長野県付近）
                zoom={departure && destination ? 10 : 6} // 両方設定されている場合は詳細表示、そうでなければ日本全体表示
                style={{ height: "100%", width: "100%" }}
                maxBounds={[[24.0, 123.0], [46.0, 146.0]]} // 日本の境界（沖縄から北海道まで）
                maxBoundsViscosity={1.0} // 境界を超えないようにする
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* 出発地マーカー */}
                {departure && (
                  <Marker position={departure} icon={departureIcon}>
                    <Popup>🚀 {departureName || "出発地"}</Popup>
                  </Marker>
                )}

                {/* 目的地マーカー */}
                {destination && (
                  <Marker position={destination} icon={destinationIcon}>
                    <Popup>🎯 {destinationName || "目的地"}</Popup>
                  </Marker>
                )}

                {/* 地図中心を出発地点と目的地の中間に設定 */}
                {destination && departure && (
                  <RecenterMapWithZoom 
                    position={[
                      (departure[0] + destination[0]) / 2,
                      (departure[1] + destination[1]) / 2
                    ]}
                    zoom={10}
                  />
                )}

                {/* ルート描画 */}
                {destination && departure && (
                  <RoutingControl
                    key={routeKeyRef.current} // 安定したkeyで不必要な再マウントを防ぐ
                    position={departure}
                    destination={destination}
                    onRouteInfo={(info) => {
                      if (!routeCalculatedRef.current) {
                        console.log("距離:", info.distanceKm, "km");
                        console.log("所要時間:", info.durationMin, "分");
                        console.log("到着予定:", info.arrivalTime.toLocaleTimeString());
                        setRouteInfo(info); // ルート情報を保存
                        routeCalculatedRef.current = true; // ルート計算完了フラグを設定
                        console.log("ルート計算完了 - このルートを保持します");
                      }
                    }}
                  />
                )}
              </MapContainer>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default RouteScreen;
