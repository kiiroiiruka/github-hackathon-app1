import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { saveParkingInfo } from "../../../firebase/parkinginfo"; // 追加: 保存関数をインポート

const Parkinginput = () => {
    const [arrivalTime, setArrivalTime] = useState(null);
    const [departureTime, setDepartureTime] = useState(""); // 出発時間（文字列）
    const [position, setPosition] = useState(null); // 位置情報
    const navigate = useNavigate();

    useEffect(() => {
        // ページを開いた時刻を取得
        const now = new Date();
        setArrivalTime(now);

        // 現在地を取得
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition({
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
                    
                    console.warn("⚠️ 位置情報エラー:", errorMessage);
                    
                    // デフォルト位置（東京）を設定
                    setPosition({
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
        }
    }, []);

    // ホームに戻るボタン押下時に保存
    const handleGoHome = async () => {
        try {
            await saveParkingInfo({
                position,
                arrivalTime,
                departureTime,
            });
            navigate("/dashboard/home");
        } catch (e) {
            alert("データの保存に失敗しました");
        }
    };

    return (
        <div>
            <HeaderComponent title="駐車場情報入力" />

            <div
                className="flex flex-col items-center justify-center min-h-[calc(100vh-88px)]"
                style={{ paddingTop: "88px" }}
            >
                <div className="w-full max-w-md bg-white rounded-lg p-6 flex flex-col items-center space-y-6">
                    {/* 到着日時表示 */}
                    {arrivalTime && (
                        <div className="text-base font-semibold text-blue-700">
                            駐車日時: {arrivalTime.toLocaleString("ja-JP")}
                        </div>
                    )}

                    {/* 出発時間入力欄 */}
                    <div className="w-full">
                        <label className="block text-gray-700 font-semibold mb-2 text-center">
                            出発予定時刻
                        </label>
                        <div className="relative w-full max-w-xs mx-auto">
                            <input
                                type="datetime-local"
                                value={departureTime}
                                onChange={(e) => setDepartureTime(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 w-full"
                            />
                        </div>
                    </div>

                    {/* 地図表示 */}
                    <div className="w-full">
                        <label className="block text-gray-700 font-semibold mb-2 text-center">
                            駐車場
                        </label>
                        <div className="w-full max-w-xs h-64 bg-gray-200 rounded overflow-hidden mx-auto">
                            {position ? (
                                <iframe
                                    title="現在地マップ"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${position.lng-0.005},${position.lat-0.003},${position.lng+0.005},${position.lat+0.003}&layer=mapnik&marker=${position.lat},${position.lng}`}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    位置情報を取得中...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ホームに戻るボタン */}
                    <button
                        type="button"
                        onClick={handleGoHome}
                        className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mt-4"
                    >
                        ホームに戻る
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Parkinginput;