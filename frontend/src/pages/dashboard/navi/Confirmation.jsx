import { push, ref, serverTimestamp, set } from "firebase/database";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import { auth, rtdb } from "../../../firebase/firebaseConfig";
import { createRoomWithInvitesAndRoute } from "../../../firebase/room";

const Confirmation = () => {
	const navigate = useNavigate();
	const location = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const { roomId, roomName, selectedFriends, selectedLocation, selectedDeparture } =
    location.state || {};

	return (
		<PageLayout title="ルーム情報の再チェック">
			{/* 確認メッセージ */}
			<div className="text-center mb-8">
				<div className="text-6xl mb-4">📋</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">ルーム情報の再チェック</h1>
				<p className="text-gray-600">作成するルームの情報を確認してください</p>
			</div>

			{/* ルーム情報 */}
			<Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">🏠 作成予定のルーム</h2>
				<div className="space-y-4">
					<div className="flex items-center gap-3">
						<span className="text-blue-500 font-medium">ルーム名:</span>
            <span className="text-gray-800 font-semibold">{roomName || "未設定"}</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-blue-500 font-medium">ルームID:</span>
						<span className="text-gray-600 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
							作成後に表示されます
						</span>
					</div>

					{/* ルート情報 */}
					{(selectedDeparture || selectedLocation) && (
						<div>
              <span className="text-blue-500 font-medium mb-2 block">設定されたルート:</span>
							<div className="space-y-3">
								{selectedDeparture && (
									<div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
										<div className="flex items-center gap-2 mb-1">
											<span className="text-lg">🚀</span>
											<span className="font-medium text-green-800">出発地</span>
										</div>
										<p className="text-green-700 font-medium">
											{selectedDeparture.name || selectedDeparture.display_name || "住所情報なし"}
										</p>
										<p className="text-sm text-green-600">
											緯度: {selectedDeparture.coordinates[0].toFixed(4)}, 経度:{" "}
											{selectedDeparture.coordinates[1].toFixed(4)}
										</p>
									</div>
								)}

								{selectedLocation && (
									<div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
										<div className="flex items-center gap-2 mb-1">
											<span className="text-lg">🎯</span>
											<span className="font-medium text-blue-800">目的地</span>
										</div>
										<p className="text-blue-700 font-medium">
											{selectedLocation.name || selectedLocation.display_name || "住所情報なし"}
										</p>
										<p className="text-sm text-blue-600">
											緯度: {selectedLocation.coordinates[0].toFixed(4)}, 経度:{" "}
											{selectedLocation.coordinates[1].toFixed(4)}
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{selectedFriends && selectedFriends.length > 0 && (
						<div>
							<span className="text-blue-500 font-medium mb-2 block">
								招待メンバー ({selectedFriends.length}名):
							</span>
							<div className="grid grid-cols-2 gap-2">
								{selectedFriends.map((friend, index) => (
									<div
										key={friend.uid || index}
										className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg"
									>
										<img
											src={friend.photoURL || "/default-avatar.png"}
											alt={friend.displayName}
											className="w-6 h-6 rounded-full"
										/>
										<span className="text-blue-800 text-sm font-medium truncate">
											{friend.displayName || friend.email}
										</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</Card>

			{/* アクションボタン */}
			<div className="space-y-4">
				{/* ルート確認ボタン */}
				<Button
					variant="primary"
					size="lg"
					className="w-full"
					onClick={() =>
						navigate("/dashboard/navi/route-screen", {
							state: {
								roomId,
								roomName,
								destination: selectedLocation?.coordinates,
								destinationName: selectedLocation?.name,
								departure: selectedDeparture?.coordinates,
								departureName: selectedDeparture?.name,
								selectedDeparture,
								selectedLocation,
								selectedFriends,
							},
						})
					}
					disabled={!selectedLocation}
					icon="🗺️"
				>
					{selectedLocation ? (
						<div className="text-center">
							<div>ルートを確認する</div>
							{selectedDeparture && (
                <div className="text-sm opacity-90">出発地→目的地のルートを表示</div>
							)}
						</div>
					) : (
						"目的地が設定されていません"
					)}
				</Button>

				{/* ルーム作成決定ボタン（通話機能あり） */}
				<Button
					variant="primary"
					size="lg"
					className="w-full"
					disabled={isCreating}
					onClick={async () => {
            if (isCreating) return;

            const currentUser = auth.currentUser;
            if (!currentUser?.uid) {
              alert("ログインが必要です。");
              return;
            }

            const trimmedRoomName = String(roomName || "").trim();
            if (!trimmedRoomName) {
              alert("ルーム名を入力してください。");
              return;
            }

            setIsCreating(true);

            try {
              const createdRoomId = await createRoomWithInvitesAndRoute(
                trimmedRoomName,
                selectedFriends || [],
                selectedLocation,
                selectedDeparture
              );

              await set(ref(rtdb, `rooms/${createdRoomId}/testMode`), false);

              navigate("/dashboard");
            } catch (error) {
              console.error("ルーム作成エラー:", error);
              alert(`ルーム作成に失敗しました: ${error.message}`);
            } finally {
              setIsCreating(false);
            }
					}}
					icon="🚀"
				>
					{isCreating ? "作成中..." : "音声付きでルーム作成を決定"}
				</Button>

				{/* 音声なしでルーム作成ボタン（テスト用） */}

				<Button
					variant="warning"
					size="lg"
					className="w-full shadow-lg"
					disabled={isCreating}
					onClick={async () => {
						if (isCreating) return;

						const currentUser = auth.currentUser;
						if (!currentUser || !currentUser.uid) {
							alert("ログインが必要です。");
							return;
						}

						if (!String(roomName || "").trim()) {
							alert("ルーム名を入力してください。");
							return;
						}

						setIsCreating(true);

						try {
							// ルームID作成
							const roomRef = push(ref(rtdb, "rooms"));
							const roomId = roomRef.key;

							// メンバー一覧: 作成者も含める
							const members = {
								[currentUser.uid]: {
									uid: currentUser.uid,
									name: currentUser.displayName || "",
									photoURL: currentUser.photoURL || "",
									invited: true,
									accepted: true,
								},
							};

							// 選択されたフレンドを追加
							for (const friend of selectedFriends || []) {
								members[friend.uid] = {
									uid: friend.uid,
									name: friend.name || friend.displayName || "",
									photoURL: friend.photoURL || "",
									invited: true,
									accepted: false,
								};
							}

							// ルート情報を構築
							let routeData = null;

							if (selectedLocation && selectedDeparture) {
								try {
									console.log("🗺️ ルート計算開始（音声なし）:", {
										departure: selectedDeparture,
										destination: selectedLocation,
									});
									
									const apiUrl = `https://router.project-osrm.org/route/v1/driving/${selectedDeparture.coordinates[1]},${selectedDeparture.coordinates[0]};${selectedLocation.coordinates[1]},${selectedLocation.coordinates[0]}?overview=simplified&geometries=geojson&steps=false`;
									console.log("🗺️ OSRM API URL（音声なし）:", apiUrl);

									// タイムアウト付きfetch (30秒に延長、APIレート制限対策）
									const controller = new AbortController();
									const timeoutId = setTimeout(() => controller.abort(), 30000);
									const routeResponse = await fetch(apiUrl, { signal: controller.signal });
									clearTimeout(timeoutId);
									console.log("🗺️ OSRM API response status（音声なし）:", routeResponse.status);

									if (routeResponse.ok) {
										const routeResult = await routeResponse.json();

										if (routeResult.routes && routeResult.routes.length > 0) {
											const route = routeResult.routes[0];
											const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
											const durationMin = Math.round(route.duration / 60);

											routeData = {
												departure: {
													name: selectedDeparture.name || "出発地",
													coordinates: selectedDeparture.coordinates,
												},
												destination: {
													name: selectedLocation.name || "目的地",
													coordinates: selectedLocation.coordinates,
												},
												routeInfo: {
													distanceKm,
													durationMin,
													arrivalTime: new Date(Date.now() + route.duration * 1000).toISOString(),
												},
												polyline: {
													geometry: route.geometry,
													steps: route.legs?.[0]?.steps || [],
													waypoints: routeResult.waypoints || [],
													summary: {
														distance: route.distance,
														duration: route.duration,
														profile: "driving",
													},
												},
												createdAt: new Date().toISOString(),
												test: false,
											};

											console.log("🗺️ ルート情報取得完了:", `${distanceKm}km, ${durationMin}分`);
										}
									}
								} catch (routeError) {
									const errorType = routeError.name === 'AbortError' ? 'タイムアウト' : routeError.message;
									console.warn("⚠️ ルート計算に失敗、直線ルートで作成:", errorType);
									
									// ユーザーに分かりやすいメッセージを表示
									if (routeError.name === 'AbortError') {
										alert("⚠️ ルート計算がタイムアウトしました。\n\nOSRM APIが混雑している可能性があります。\n5〜10分待ってから再度お試しください。\n\n今回は簡易ルート（直線）で作成されます。");
									} else if (errorType.includes('Failed to fetch')) {
										alert("⚠️ ルート計算サーバーに接続できませんでした。\n\nネットワーク接続を確認するか、しばらく待ってから再度お試しください。\n\n今回は簡易ルート（直線）で作成されます。");
									}
									
									// エラー時は直線ルートを作成（地図表示のため）
									routeData = {
										departure: {
											name: selectedDeparture.name || "出発地",
											coordinates: selectedDeparture.coordinates,
										},
										destination: {
											name: selectedLocation.name || "目的地",
											coordinates: selectedLocation.coordinates,
										},
										routeInfo: {
											distanceKm: 0,
											durationMin: 0,
											arrivalTime: new Date().toISOString(),
										},
										polyline: {
											geometry: {
												type: "LineString",
												coordinates: [
													[selectedDeparture.coordinates[1], selectedDeparture.coordinates[0]],
													[selectedLocation.coordinates[1], selectedLocation.coordinates[0]]
												],
											},
											steps: [],
											waypoints: [],
											summary: {
												distance: 0,
												duration: 0,
												profile: "driving",
											},
										},
										createdAt: new Date().toISOString(),
										test: true, // 直線ルートフラグ
									};
									console.log("🗺️ 直線ルートで作成（タイムアウト対策）");
								}
							}

							// Firebaseにルームデータを保存（音声機能なし）
							const roomData = {
								name: String(roomName || "").trim(),
								createdAt: serverTimestamp(),
								ownerUid: currentUser.uid,
								ownerName: currentUser.displayName || "",
								ownerPhotoURL: currentUser.photoURL || "",
								members,
								testMode: true, // 音声機能を無効にする
								routeData: routeData,
								hasRoute: !!routeData,
								dailyRoom: null, // Daily.coルームなし
							};

							await set(roomRef, roomData);

							console.log("✅ 音声なしルーム作成完了:", roomId);

							const routeMessage = routeData
								? `\n\n🗺️ ルート情報: ${routeData.routeInfo?.distanceKm || 0}km, ${routeData.routeInfo?.durationMin || 0}分`
								: "\n\n⚠️ ルート情報なし";

							alert(
								`音声なしルーム「${String(roomName || "").trim()}」を作成しました！\nルームID: ${roomId}${routeMessage}\n\n🔇 音声機能は無効です（テスト用）`
							);

							// ホーム画面に遷移
							navigate("/dashboard");
						} catch (error) {
							console.error("ルーム作成エラー:", error);
							alert(`ルーム作成に失敗しました: ${error.message}`);
						} finally {
							setIsCreating(false);
						}
					}}
					icon="🔥"
				>
					{isCreating ? "作成中..." : "音声なしでルーム作成"}
				</Button>
				

				{/* ルーム編集ボタン */}
				<Button
					variant="secondary"
					size="lg"
					className="w-full"
					onClick={() =>
						navigate("/dashboard/navi", {
							state: {
								roomName,
								selectedFriends,
								selectedLocation,
								selectedDeparture,
							},
						})
					}
					icon="✏️"
				>
					ルーム設定を編集
				</Button>
			</div>
		</PageLayout>
	);
};

export default Confirmation;
