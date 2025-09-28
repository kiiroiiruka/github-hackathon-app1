import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { getLatestParkingInfo } from "../../../firebase/parkingget";

// Leaflet関連
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";


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
  const navigate = useNavigate();

  // Firestoreから最新の駐車情報を取得
  useEffect(() => {
    const fetchParkingInfo = async () => {
      try {
        const info = await getLatestParkingInfo();
        setParkingInfo(info);
      } catch (e) {
        alert("駐車情報の取得に失敗しました: " + e.message);
        console.error(e);
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
        alert("現在地を取得できませんでした。");
      },
      { enableHighAccuracy: true } // 高精度を有効に
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
    <div>
      <HeaderComponent title="駐車場情報" />

      <div
        className="flex flex-col items-center justify-start min-h-[calc(100vh-88px)]"
        style={{ paddingTop: "88px" }}
      >
        <div className="mb-4 w-full max-w-xs text-center">
          {parkingInfo ? (
            <>
              <div className="text-base font-semibold text-blue-700 mb-2">
                駐車日時:{" "}
                {parkingInfo.arrivalTime
                  ? new Date(parkingInfo.arrivalTime).toLocaleString("ja-JP")
                  : "未設定"}
              </div>
              <div className="text-base text-blue-600 mb-2">
                出発予定:{" "}
                {parkingInfo.departureTime
                  ? new Date(parkingInfo.departureTime).toLocaleString("ja-JP")
                  : "未設定"}
              </div>
              {timeDiff && (
                <div className="text-base text-green-700 mb-2">
                  出発までの時間: {timeDiff}
                </div>
              )}
              {walkingTime && (
                <div className="text-base text-purple-700 mb-2">
                  {walkingTime}
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500">駐車情報がありません</div>
          )}
        </div>

        {/* 地図（ルート表示） */}
        {nowPosition && parkingInfo?.position && (
          <div className="mb-6 w-full max-w-xs h-64">
            <MapContainer
              center={nowPosition}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              />
              <Marker position={nowPosition} />
              <Marker position={parkingInfo.position} />
              <RoutingControl from={nowPosition} to={parkingInfo.position} />
            </MapContainer>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoInput}
          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          入力ページへ
        </button>
      </div>
    </div>
  );
};

export default ParkingInfoDisplay;
