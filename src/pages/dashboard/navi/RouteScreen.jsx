import { useNavigate, useLocation } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import RoutingControl from "../../../components/ui/RoutingControl";
import MapSearch from "../../../components/ui/MapSearch";

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
  const routeCalculatedRef = useRef(false); // ルート計算完了フラグ
  const routeKeyRef = useRef(null); // ルート用の安定したkey

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
        ) : destination && (
          <div className="text-sm text-gray-500">
            ルートを計算中...
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 w-[90%] max-w-[900px] h-[90%] bg-white rounded-2xl shadow-lg overflow-hidden">
        
        {/* 地図エリア */}
        <div className="relative flex-1">
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

        <button
          type="button"
          onClick={() => navigate("/dashboard/navi/room")}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          戻る
        </button>
      </div>
    </div>
  );
};

export default RouteScreen;
