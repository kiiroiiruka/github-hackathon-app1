import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ButtonBool from "../../../components/ButtonBool/ButtonBool";
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

const TryPage = () => {
  const navigate = useNavigate();
  const [executed, setExecuted] = useState(false);
  const [position, setPosition] = useState([35.6812, 139.7671]); // 初期は東京駅
  const [destination, setDestination] = useState(null);

  const handleClick = () => {
    alert("使用済み");
    setExecuted(true);
  };

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
    <div className="flex justify-center items-center p-5 h-screen bg-gray-100">
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

        {/* ボタンエリア */}
        <div className="flex justify-around p-4 border-t border-gray-200">
          <ButtonBool
            label="クリック"
            afterlabel="使用済み"
            onClick={handleClick}
            executed={executed}
          />
          <ButtonBool 
            label="Homeに戻る" 
            onClick={() => navigate("/dashboard")} 
          />
        </div>
        
      </div>
    </div>
  );
};

export default TryPage;