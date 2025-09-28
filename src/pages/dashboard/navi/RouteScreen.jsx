import { useNavigate, useLocation } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import RoutingControl from "../../../components/ui/RoutingControl";
import MapSearch from "../../../components/ui/MapSearch";
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
    <div className="flex flex-col justify-center items-center p-5 h-screen bg-gray-100">
<<<<<<< HEAD
      <HeaderComponent title="通信" />
      <div className="text-center mb-4">
        <p className="text-gray-600 mb-3">ルート情報を表示します</p>
        
        {/* 出発地と目的地 */}
        <div className="flex justify-center gap-4 mb-3">
          {departureName && (
            <p className="text-green-600 font-semibold">
              🚀 出発地: {departureName}
            </p>
          )}
          {destinationName && (
            <p className="text-blue-600 font-semibold">
              🎯 目的地: {destinationName}
            </p>
          )}
        </div>
        
        {/* ルート情報 */}
        {routeInfo ? (
          <div className="space-y-3">
            <div className="flex justify-center gap-6 text-sm flex-wrap">
              <span className="text-gray-700">
                📏 距離: <strong>{typeof routeInfo.distanceKm === 'number' ? routeInfo.distanceKm.toFixed(2) : routeInfo.distanceKm}km</strong>
              </span>
              <span className="text-gray-700">
                ⏱️ 所要時間: <strong>{routeInfo.durationMin}分</strong>
              </span>
              <span className="text-gray-700">
                🕰️ 到着予定: <strong>{routeInfo.arrivalTime?.toLocaleTimeString?.() || '未定'}</strong>
              </span>
            </div>
            
            {/* ルート保存ボタン */}
            <div className="flex justify-center items-center gap-4">
              <button
                type="button"
                onClick={handleSaveRoute}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                <span className={`text-sm px-3 py-1 rounded-full ${
                  saveMessage.includes('失敗') || saveMessage.includes('既に') 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </div>
        ) : destination && (
          <div className="text-sm text-gray-500">
            ルートを計算中...
          </div>
        )}
      </div>
=======

        <HeaderComponent2 title="通信" />
      <p className="text-gray-600">ルート情報を表示します</p>
>>>>>>> origin/feat/#2
      <div className="flex flex-col gap-4 w-[90%] max-w-[900px] h-[90%] bg-white rounded-2xl shadow-lg overflow-hidden">
        
        {/* 地図エリア */}
        <div className="relative flex-1">
<<<<<<< HEAD
          {/* 目的地検索 */}
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <MapSearch
              onSelectDestination={(dest, name) => {
                setDestination(dest);
                setDestinationName(name);
                routeCalculatedRef.current = false; // ルート計算状態をリセット
                setRouteInfo(null); // ルート情報をリセット
=======
          {/* 地図内の検索窓 */}
          <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-center">
            <MapSearch
              onSelectDestination={(dest, name) => {
                setDestination(dest);
>>>>>>> origin/feat/#2
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
              <Marker position={departure}>
                <Popup>🚀 {departureName || "出発地"}</Popup>
              </Marker>
            )}

            {/* 目的地マーカー */}
            {destination && (
              <Marker position={destination}>
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

        <div className="flex justify-center gap-4 p-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/navi/room")}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteScreen;
