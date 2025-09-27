import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { getLatestParkingInfo } from "../../../firebase/parkingget";

const ParkingInfoDisplay = () => {
    const [parkingInfo, setParkingInfo] = useState(null);
    const [nowPosition, setNowPosition] = useState(null);       // 現在地
    const [timeDiff, setTimeDiff] = useState("");               // 出発までの時間
    const [walkingTime, setWalkingTime] = useState("");         // 徒歩時間 ←追加
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

    // 現在地を取得
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setNowPosition({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    });
                },
                () => {
                    setNowPosition(null);
                }
            );
        }
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

    // 徒歩時間を計算 ←追加
    useEffect(() => {
        if (nowPosition && parkingInfo?.position) {
            const R = 6371e3; // 地球の半径(m)
            const toRad = (deg) => (deg * Math.PI) / 180;

            const lat1 = toRad(nowPosition.lat);
            const lat2 = toRad(parkingInfo.position.lat);
            const dLat = toRad(parkingInfo.position.lat - nowPosition.lat);
            const dLng = toRad(parkingInfo.position.lng - nowPosition.lng);

            // ハーバーサインの公式で距離を算出
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

    // OpenStreetMapのルートマップURL
    const getOsmRouteMapUrl = () => {
        if (!nowPosition || !parkingInfo?.position) return "";
        const minLat = Math.min(nowPosition.lat, parkingInfo.position.lat) - 0.003;
        const maxLat = Math.max(nowPosition.lat, parkingInfo.position.lat) + 0.003;
        const minLng = Math.min(nowPosition.lng, parkingInfo.position.lng) - 0.005;
        const maxLng = Math.max(nowPosition.lng, parkingInfo.position.lng) + 0.005;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${nowPosition.lat},${nowPosition.lng}&marker=${parkingInfo.position.lat},${parkingInfo.position.lng}`;
    };

    // GoogleマップナビURL
    const getGoogleMapUrl = () => {
        if (!nowPosition || !parkingInfo?.position) return "#";
        return `https://www.google.com/maps/dir/?api=1&origin=${nowPosition.lat},${nowPosition.lng}&destination=${parkingInfo.position.lat},${parkingInfo.position.lng}&travelmode=walking`;
    };

    // 入力ページへ遷移
    const handleGoInput = () => {
        navigate("/dashboard/parking/input");
    };

    return (
        <div>
            <HeaderComponent title="駐車場情報" />

            <div
                className="flex flex-col items-center justify-center min-h-[calc(100vh-88px)]"
                style={{ paddingTop: "88px" }}
            >
                <div className="mb-6 w-full max-w-xs text-center">
                    {parkingInfo ? (
                        <>
                            <div className="text-base font-semibold text-blue-700 mb-2">
                                到着日時:{" "}
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

                {nowPosition && parkingInfo?.position && (
                    <div className="mb-6 w-full max-w-xs h-64">
                        <iframe
                            title="ルートマップ"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={getOsmRouteMapUrl()}
                        />
                    </div>
                )}

                <a
                    href={getGoogleMapUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-6 px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                    駐車場までナビ
                </a>

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
