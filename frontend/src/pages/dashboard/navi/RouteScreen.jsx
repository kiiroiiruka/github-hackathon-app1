import { useAtom } from "jotai";
import { Icon } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useLocation, useNavigate } from "react-router-dom";
import { isLoggedInAtom, userUidAtom } from "../../../atom/userAtom";
import HeaderComponent from "../../../components/Header/Header";
import Card from "../../../components/ui/Card";
import RoutingControl from "../../../components/ui/RoutingControl";
import { auth } from "../../../firebase/firebaseConfig";
import { formatRouteData, saveUserRoute } from "../../../firebase/route";
import { addSearchHistory } from "../../../firebase/users";
import { useAuthState } from "../../../hooks/useAuthState";

const _RecenterMap = ({ position }) => {
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
  const _navigate = useNavigate();
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

  // 出発地アイコン（車マーク + START）
  const departureIcon = L.divIcon({
    html: `
      <div style="
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.4));
      ">
        <div style="font-size: 40px; margin-bottom: 2px;">🚗</div>
        <div style="
          font-size: 9px;
          font-weight: 900;
          color: #fff;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          padding: 2px 8px;
          border-radius: 10px;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">START</div>
      </div>
    `,
    className: 'custom-departure-icon',
    iconSize: [60, 65],
    iconAnchor: [30, 60],
    popupAnchor: [0, -60],
  });

  // 旗アイコン（拡大縮小 + GOAL!点滅）
  const destinationIcon = L.divIcon({
    html: `
      <div style="
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.4));
      ">
        <div style="
          font-size: 48px;
          animation: flagPulse 1.5s ease-in-out infinite;
          margin-bottom: 2px;
        ">🚩</div>
        <div style="
          font-size: 10px;
          font-weight: 900;
          color: #fff;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          padding: 3px 10px;
          border-radius: 10px;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          animation: textBlink 1s ease-in-out infinite;
        ">GOAL!</div>
      </div>
      <style>
        @keyframes flagPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        @keyframes textBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      </style>
    `,
    className: 'custom-flag-icon',
    iconSize: [70, 75],
    iconAnchor: [35, 70],
    popupAnchor: [0, -70],
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
    } else if (location.state?.selectedDeparture) {
      setDeparture(location.state.selectedDeparture.coordinates);
      setDepartureName(location.state.selectedDeparture.name || "");
    }
    // デフォルト出発地は設定しない（GPS自動取得に任せる）
  }, [location.state]);

  // 🆕 出発地・目的地を検索履歴として自動保存
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // 出発地を履歴に保存
    if (departure && departureName) {
      addSearchHistory(currentUser.uid, departureName, departure);
    }

    // 目的地を履歴に保存
    if (destination && destinationName) {
      addSearchHistory(currentUser.uid, destinationName, destination);
    }
  }, [departure, destination, departureName, destinationName]);

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
      alert("ルートが計算されていません");
      return;
    }

    if (!isLoggedIn || !userUid) {
      // ログインしていない場合はローカルストレージに保存（1つまで）
      const routeData = formatRouteData(
        { name: departureName, coordinates: departure },
        { name: destinationName, coordinates: destination },
        routeInfo
      );

      const savedRoutes = JSON.parse(localStorage.getItem("savedRoutes") || "[]");

      // 重複チェック
      const isDuplicate = savedRoutes.some(
        (route) =>
          Math.abs(route.departure.coordinates[0] - departure[0]) < 0.000001 &&
          Math.abs(route.departure.coordinates[1] - departure[1]) < 0.000001 &&
          Math.abs(route.destination.coordinates[0] - destination[0]) < 0.000001 &&
          Math.abs(route.destination.coordinates[1] - destination[1]) < 0.000001
      );

      if (isDuplicate) {
        setSaveMessage("同じルートが既に保存されています");
        setTimeout(() => setSaveMessage(""), 3000);
        return;
      }

      // 1つまでの制限：既存のルートを置き換え
      const newSavedRoutes = [routeData]; // 常に1つだけ保存
      localStorage.setItem("savedRoutes", JSON.stringify(newSavedRoutes));

      if (savedRoutes.length > 0) {
        setSaveMessage("既存のルートを置き換えて保存しました");
      } else {
        setSaveMessage("ルートをローカルに保存しました");
      }
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const routeData = formatRouteData(
        { name: departureName, coordinates: departure },
        { name: destinationName, coordinates: destination },
        routeInfo
      );

      const docId = await saveUserRoute(userUid, routeData);

      if (docId) {
        setSaveMessage("ルートを保存しました！");
        console.log("ルート保存成功:", docId);
      } else {
        setSaveMessage("同じルートが既に保存されています");
      }
    } catch (error) {
      console.error("ルート保存エラー:", error);
      setSaveMessage("ルートの保存に失敗しました");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  // コンポーネントのアンマウント時にルートをクリーンアップ
  useEffect(() => {
    return () => {
      // MapContainerのインスタンスを取得してルートをクリーンアップ
      const mapContainer = document.querySelector(".leaflet-container");
      if (mapContainer?._leaflet_map) {
        const map = mapContainer._leaflet_map;
        if (map._routeCleanupFunctions) {
          map._routeCleanupFunctions.forEach((cleanup) => {
            try {
              cleanup();
            } catch (error) {
              console.warn("ルートクリーンアップエラー:", error);
            }
          });
          map._routeCleanupFunctions = [];
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <HeaderComponent title="ルート表示" />

      <div className="px-4 py-6 pt-20">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mb-4 shadow-lg">
              <span className="text-2xl text-white">🗺️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">ルート表示</h1>
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
                        {typeof routeInfo.distanceKm === "number"
                          ? routeInfo.distanceKm.toFixed(2)
                          : routeInfo.distanceKm}
                        km
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl mb-2">⏱️</div>
                      <div className="text-sm text-gray-600 mb-1">所要時間</div>
                      <div className="text-lg font-bold text-gray-800">
                        {routeInfo.durationMin}分
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl mb-2">🕰️</div>
                      <div className="text-sm text-gray-600 mb-1">到着予定</div>
                      <div className="text-lg font-bold text-gray-800">
                        {routeInfo.arrivalTime?.toLocaleTimeString?.() || "未定"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                destination && (
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
                )
              )}
            </div>
          </Card>
          {/* 地図セクション */}
          <Card className="mb-6" variant="default">
            <div className="h-96 md:h-[500px] relative rounded-lg overflow-hidden">
              {/* leaflet-routing-machineのUIを完全に非表示にするCSS */}
              <style>{`
                .leaflet-routing-container {
                  display: none !important;
                }
                .leaflet-routing-alternatives-container {
                  display: none !important;
                }
                .leaflet-control-container .leaflet-routing-container {
                  display: none !important;
                }
              `}</style>

              <MapContainer
                center={departure || destination || [35.6812, 139.7671]} // 出発地、または目的地、またはデフォルト（東京駅）
                zoom={departure && destination ? 10 : destination ? 12 : 6} // 両方設定: 詳細表示、目的地のみ: やや詳細、どちらもなし: 日本全体
                style={{ height: "100%", width: "100%" }}
                maxBounds={[
                  [24.0, 123.0],
                  [46.0, 146.0],
                ]} // 日本の境界（沖縄から北海道まで）
                maxBoundsViscosity={1.0} // 境界を超えないようにする
                attributionControl={true} // ライセンス表記を表示（法的に必要）
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

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
                      (departure[1] + destination[1]) / 2,
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
