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
							errorMessage =
								"位置情報の許可が必要です。ブラウザの設定で位置情報を許可してください。";
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
					maximumAge: 300000, // 5分間キャッシュ
				},
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
		<div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
			<HeaderComponent title="駐車場情報入力" />

			<div
				className="flex flex-col items-center justify-center min-h-[calc(100vh-88px)] px-4"
				style={{ paddingTop: "88px" }}
			>
				<div className="w-full max-w-md bg-white/90 rounded-2xl p-6 shadow-xl border border-slate-200">
					{/* タイトル */}
					<div className="text-center mb-4">
						<h2 className="text-lg font-bold text-slate-800">
							🚗 駐車情報の記録
						</h2>
						<p className="text-xs text-slate-500 mt-1">
							駐車した時刻と場所を保存します
						</p>
					</div>

					{/* 到着日時表示 */}
					{arrivalTime && (
						<div className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg py-2">
							<span>駐車日時</span>
							<span className="font-bold">
								{arrivalTime.toLocaleString("ja-JP")}
							</span>
						</div>
					)}

					{/* 出発時間入力欄 */}
					<div className="mt-6">
						<label className="block text-slate-700 font-semibold mb-2">
							🕒 出発予定時刻
						</label>
						<div className="relative w-full">
							<input
								type="datetime-local"
								value={departureTime}
								onChange={(e) => setDepartureTime(e.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
							/>
						</div>
						<p className="text-xs text-slate-500 mt-1">あとから編集できます</p>
					</div>

					{/* 地図表示 */}
					<div className="mt-6">
						<label className="block text-slate-700 font-semibold mb-2">
							📍 駐車場所
						</label>
						<div className="w-full h-64 bg-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-200">
							{position ? (
								<iframe
									title="現在地マップ"
									width="100%"
									height="100%"
									style={{ border: 0 }}
									loading="lazy"
									allowFullScreen
									referrerPolicy="no-referrer-when-downgrade"
									src={`https://www.openstreetmap.org/export/embed.html?bbox=${position.lng - 0.005},${position.lat - 0.003},${position.lng + 0.005},${position.lat + 0.003}&layer=mapnik&marker=${position.lat},${position.lng}`}
								/>
							) : (
								<div className="flex items-center justify-center h-full text-slate-500">
									位置情報を取得中...
								</div>
							)}
						</div>
						{position && (
							<div className="text-[11px] text-slate-500 mt-2 text-right">
								{position.lat.toFixed(5)}, {position.lng.toFixed(5)}
							</div>
						)}
					</div>

					{/* アクション */}
					<div className="mt-8">
						<button
							type="button"
							onClick={handleGoHome}
							className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow hover:from-blue-600 hover:to-indigo-600 active:from-blue-700 active:to-indigo-700 transition-colors"
						>
							保存してホームへ
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Parkinginput;
