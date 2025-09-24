import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "../../../components/Header/Header2";
import { useState, useEffect } from "react";
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

const RouteScreen = () => {
  const navigate = useNavigate();
  const [position, setPosition] = useState([35.6812, 139.7671]); // 初期は東京駅
  const [destination, setDestination] = useState(null);

  // ★ 現在地を追跡
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.error(err),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center p-5 h-screen bg-gray-100">
      <HeaderComponent2 title="通信" />
      <p className="text-gray-600">ルート情報を表示します</p>
      <div className="flex flex-col gap-4 w-[90%] max-w-[900px] h-[90%] bg-white rounded-2xl shadow-lg overflow-hidden">
        
        {/* 地図エリア */}
        <div className="relative flex-1">
          {/* ★ 検索窓 */}
          <MapSearch
            onSelectDestination={(dest, name) => {
              setDestination(dest);
              console.log("選択された目的地:", name, dest);
            }}
          />

          <MapContainer
            center={position}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* 現在地マーカー */}
            <Marker position={position}>
              <Popup>現在地</Popup>
            </Marker>

            {/* 目的地マーカー */}
            {destination && (
              <Marker position={destination}>
                <Popup>目的地</Popup>
              </Marker>
            )}

            {/* 地図中心を現在地に追従 */}
            <RecenterMap position={position} />

            {/* ルート描画 */}
            {destination && (
              <RoutingControl
                position={position}
                destination={destination}
                onRouteInfo={(info) => {
                  console.log("距離:", info.distanceKm, "km");
                  console.log("所要時間:", info.durationMin, "分");
                  console.log("到着予定:", info.arrivalTime.toLocaleTimeString());
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
