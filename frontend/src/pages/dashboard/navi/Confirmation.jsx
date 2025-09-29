import { get, push, ref, serverTimestamp, set } from "firebase/database";
import { useLocation, useNavigate } from "react-router-dom";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import { auth, rtdb } from "../../../firebase/firebaseConfig";

const Confirmation = () => {
	console.log("🚀🚀🚀 Confirmation.jsx LOADED - VERSION 2025-09-29-11:25 🚀🚀🚀");
	const navigate = useNavigate();
	const location = useLocation();
	const {
		roomId,
		roomName,
		selectedFriends,
		selectedLocation,
		selectedDeparture,
	} = location.state || {};

	// デバッグ情報
	console.log("Confirmation - 全体のlocation.state:", location.state);
	console.log("Confirmation - selectedFriends:", selectedFriends);
	console.log("Confirmation - selectedFriendsの型:", typeof selectedFriends);
	console.log("Confirmation - selectedFriendsの長さ:", selectedFriends?.length);
	console.log("Confirmation - selectedLocation:", selectedLocation);
	console.log("Confirmation - selectedDeparture:", selectedDeparture);

	return (
		<PageLayout title="ルーム情報の再チェック">
			{/* 確認メッセージ */}
			<div className="text-center mb-8">
				<div className="text-6xl mb-4">📋</div>
				<h1 className="text-3xl font-bold text-gray-800 mb-2">
					ルーム情報の再チェック
				</h1>
				<p className="text-gray-600">作成するルームの情報を確認してください</p>
			</div>

			{/* ルーム情報 */}
			<Card className="mb-6">
				<h2 className="text-lg font-semibold text-gray-800 mb-4">
					🏠 作成予定のルーム
				</h2>
				<div className="space-y-4">
					<div className="flex items-center gap-3">
						<span className="text-blue-500 font-medium">ルーム名:</span>
						<span className="text-gray-800 font-semibold">
							{roomName || "未設定"}
						</span>
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
							<span className="text-blue-500 font-medium mb-2 block">
								設定されたルート:
							</span>
							<div className="space-y-3">
								{selectedDeparture && (
									<div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
										<div className="flex items-center gap-2 mb-1">
											<span className="text-lg">�</span>
											<span className="font-medium text-green-800">出発地</span>
										</div>
										<p className="text-green-700 font-medium">
											{selectedDeparture.name}
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
											{selectedLocation.name}
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
								<div className="text-sm opacity-90">
									出発地→目的地のルートを表示
								</div>
							)}
						</div>
					) : (
						"目的地が設定されていません"
					)}
				</Button>

                {/* ルーム作成決定ボタン */}
				<Button
					variant="primary"
					size="lg"
					className="w-full"
					onClick={async () => {
						console.log("🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀");
						console.log("🚀 NEW CONFIRMATION CODE EXECUTED! 🚀");
						console.log("🚀 THIS IS THE UPDATED VERSION! 🚀");
						console.log("🚀 TIMESTAMP: 2025-09-29-11:25:00 🚀");
						console.log("🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀");
						alert("✅ 新しいコードが実行されました！\n\nルート情報を段階的に保存します。\n\nタイムスタンプ: 2025-09-29-11:25:00");
						const currentUser = auth.currentUser;
						if (!currentUser || !currentUser.uid) {
							alert("ログインが必要です。");
							return;
						}

						if (!roomName.trim()) {
							alert("ルーム名を入力してください。");
							return;
						}

						try {
							console.log("🔥 Firebase側のみでルーム作成開始（ルート情報含む）:", {
								roomName: roomName.trim(),
								selectedFriends,
								selectedLocation,
								selectedDeparture,
								ownerUid: currentUser.uid,
							});

							// ルームID作成
							const roomRef = push(ref(rtdb, "rooms"));
							const roomId = roomRef.key;

							// メンバー一覧: 作成者も含める（デフォルトaccepted: true）
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
									accepted: false, // 初期状態: 未参加
								};
							}

							// ルート情報を構築
							let routeData = null;
							console.log("🗺️ ルート情報構築開始:", {
								selectedLocation: !!selectedLocation,
								selectedDeparture: !!selectedDeparture,
								selectedLocationCoords: selectedLocation?.coordinates,
								selectedDepartureCoords: selectedDeparture?.coordinates,
							});
							
							// テスト用: 最小限のルートデータを作成
							if (selectedLocation && selectedDeparture) {
								// 最小限のルートデータ（テスト用）
								routeData = {
									departure: {
										name: selectedDeparture.name || "出発地",
										lat: selectedDeparture.coordinates[0], // 緯度を分離
										lng: selectedDeparture.coordinates[1], // 経度を分離
									},
									destination: {
										name: selectedLocation.name || "目的地",
										lat: selectedLocation.coordinates[0], // 緯度を分離
										lng: selectedLocation.coordinates[1], // 経度を分離
									},
									distance: 0,
									duration: 0,
									test: true,
								};
								
								console.log("🗺️ 最小限ルートデータ作成完了:", {
									hasRouteData: !!routeData,
									routeDataSize: JSON.stringify(routeData).length,
									routeDataStructure: Object.keys(routeData),
								});
							}
							
							// 詳細なルート計算を試行（オプション）
							if (selectedLocation && selectedDeparture && false) { // 無効化
								// ルート計算（OSRM API使用）
								try {
									const apiUrl = `https://router.project-osrm.org/route/v1/driving/${selectedDeparture.coordinates[1]},${selectedDeparture.coordinates[0]};${selectedLocation.coordinates[1]},${selectedLocation.coordinates[0]}?overview=simplified&geometries=geojson&steps=false`;
									console.log("🌐 OSRM API呼び出し:", apiUrl);
									
									const routeResponse = await fetch(apiUrl);
									console.log("🌐 OSRM API レスポンス:", {
										ok: routeResponse.ok,
										status: routeResponse.status,
										statusText: routeResponse.statusText,
									});

									if (routeResponse.ok) {
										const routeResult = await routeResponse.json();
										console.log("🌐 OSRM API 結果:", {
											routesCount: routeResult.routes?.length || 0,
											hasRoutes: !!routeResult.routes,
										});
										
										if (routeResult.routes && routeResult.routes.length > 0) {
											const route = routeResult.routes[0];
											console.log("🌐 ルート詳細:", {
												distance: route.distance,
												duration: route.duration,
												hasGeometry: !!route.geometry,
												geometryCoordinatesCount: route.geometry?.coordinates?.length || 0,
											});
											
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
													distanceKm: Math.round((route.distance / 1000) * 10) / 10,
													durationMin: Math.round(route.duration / 60),
													arrivalTime: new Date(
														Date.now() + route.duration * 1000,
													).toISOString(),
												},
												// ポリライン情報を含む詳細なルートデータ（実用上限版・高品質保持）
												polyline: {
													// 道の形状を保持しながら座標点を間引く（実用上限版）
													geometry: route.geometry
														? {
																type: route.geometry.type,
																coordinates: (() => {
																	const coords = route.geometry.coordinates;
																	if (coords.length <= 1000) return coords; // 1000点以下はそのまま

																	const simplified = [];
																	const maxPoints = 50000; // 実用上限：最大5万点に制限
																	const step = Math.max(
																		1,
																		Math.floor(coords.length / maxPoints),
																	);

																	// 最初の点を必ず含める
																	simplified.push(coords[0]);

																	// 曲がり角を検出して重要な点を保持（高品質保持）
																	for (
																		let i = step;
																		i < coords.length - step;
																		i += step
																	) {
																		const prev = coords[i - step];
																		const curr = coords[i];
																		const next = coords[i + step];

																		// 角度変化を計算
																		const angle1 = Math.atan2(
																			curr[1] - prev[1],
																			curr[0] - prev[0],
																		);
																		const angle2 = Math.atan2(
																			next[1] - curr[1],
																			next[0] - curr[0],
																		);
																		const angleDiff = Math.abs(angle1 - angle2);

																		// 角度変化が大きい場合（曲がり角）は保持（より細かく保持）
																		if (angleDiff > 0.02 || i % (step * 1.2) === 0) {
																			simplified.push(curr);
																		}
																	}

																	// 最後の点を必ず含める
																	simplified.push(coords[coords.length - 1]);

																	return simplified;
																})(),
															}
														: null,
													// ステップ情報を簡略化（重要な情報のみ）
													steps:
														route.legs[0]?.steps?.map((step) => ({
															distance: step.distance,
															duration: step.duration,
															maneuver: step.maneuver?.type,
															name: step.name,
														})) || [],
													// ウェイポイント情報を簡略化
													waypoints:
														route.waypoints?.map((wp) => ({
															location: wp.location,
															name: wp.name,
														})) || [],
													summary: {
														distance: route.distance, // メートル
														duration: route.duration, // 秒
														profile: "driving",
													},
												},
												createdAt: new Date().toISOString(),
											};
											// データサイズの計算とログ出力（実用上限版）
											const dataSize = JSON.stringify(routeData).length;
											const dataSizeKB = Math.round((dataSize / 1024) * 100) / 100;
											const dataSizeMB =
												Math.round((dataSize / (1024 * 1024)) * 100) / 100;
											console.log("🗺️ ルート情報を取得（実用上限版）:", {
												dataSize: `${dataSizeKB}KB (${dataSizeMB}MB)`,
												coordinatesCount: route.geometry?.coordinates?.length || 0,
												simplifiedCount: routeData.polyline.geometry.coordinates.length,
												compressionRatio: `${Math.round((routeData.polyline.geometry.coordinates.length / (route.geometry?.coordinates?.length || 1)) * 100)}%`,
												stepsCount: route.legs[0]?.steps?.length || 0,
												waypointsCount: route.waypoints?.length || 0,
												maxPoints: 50000,
												qualityLevel: "実用上限（高品質保持）",
											});
										}
									}
								} catch (routeError) {
									console.warn("⚠️ ルート計算に失敗しました:", routeError);
									// ルート計算に失敗してもルーム作成は続行
								}
							}

							const roomData = {
								name: roomName.trim(),
								createdAt: serverTimestamp(),
								ownerUid: currentUser.uid,
								ownerName: currentUser.displayName || "",
								ownerPhotoURL: currentUser.photoURL || "",
								// Daily側の情報は含めない（テスト用）
								members,
								testMode: true, // テストモードであることを明示
								// ルート情報を含める
								routeData: routeData,
								hasRoute: !!routeData, // ルート情報があるかどうかのフラグ
							};

							console.log("🔍 保存前のroomData確認:", {
								roomId,
								hasRouteData: !!routeData,
								routeDataSize: routeData ? JSON.stringify(routeData).length : 0,
								routeDataSizeKB: routeData ? Math.round((JSON.stringify(routeData).length / 1024) * 100) / 100 : 0,
								routeDataSizeMB: routeData ? Math.round((JSON.stringify(routeData).length / (1024 * 1024)) * 100) / 100 : 0,
								routeDataKeys: routeData ? Object.keys(routeData) : null,
								fullRoomDataSize: JSON.stringify(roomData).length,
								fullRoomDataSizeKB: Math.round((JSON.stringify(roomData).length / 1024) * 100) / 100,
								fullRoomDataSizeMB: Math.round((JSON.stringify(roomData).length / (1024 * 1024)) * 100) / 100,
							});

							try {
								// 段階的にデータを保存してテスト
								console.log("🔍 段階的保存テスト開始");
								
								// 1. 基本的なルームデータのみ
								const basicRoomData = {
									name: roomName.trim(),
									createdAt: serverTimestamp(),
									ownerUid: currentUser.uid,
									ownerName: currentUser.displayName || "",
									ownerPhotoURL: currentUser.photoURL || "",
									members,
									testMode: true,
								};
								
								await set(roomRef, basicRoomData);
								console.log("✅ 基本ルームデータ保存成功");
								
								// 2. ルートデータを別途追加
								if (routeData) {
									const routeRef = ref(rtdb, `rooms/${roomId}/routeData`);
									await set(routeRef, routeData);
									console.log("✅ ルートデータ保存成功");
									
									// 3. hasRouteフラグを追加
									const hasRouteRef = ref(rtdb, `rooms/${roomId}/hasRoute`);
									await set(hasRouteRef, true);
									console.log("✅ hasRouteフラグ保存成功");
								}
								
								console.log("✅ Firebase段階的保存成功");
							} catch (writeError) {
								console.error("❌ Firebase書き込みエラー:", writeError);
								console.error("❌ 書き込みエラー詳細:", {
									code: writeError.code,
									message: writeError.message,
									stack: writeError.stack,
									errorType: writeError.constructor.name,
								});
								throw writeError;
							}

							// 保存後にFirebaseから実際のデータを確認
							const savedRoomRef = ref(rtdb, `rooms/${roomId}`);
							const savedSnapshot = await get(savedRoomRef);
							const savedData = savedSnapshot.val();
							
							console.log("🔍 保存後のFirebaseデータ確認:", {
								roomId,
								hasRouteData: !!savedData?.routeData,
								routeDataKeys: savedData?.routeData ? Object.keys(savedData.routeData) : null,
								routeDataSize: savedData?.routeData ? JSON.stringify(savedData.routeData).length : 0,
								hasRoute: savedData?.hasRoute,
								testMode: savedData?.testMode,
								fullSavedData: savedData,
							});

							console.log("✅ Firebase側のみでルーム作成完了（ルート情報含む）:", {
								roomId,
								roomName: roomName.trim(),
								membersCount: Object.keys(members).length,
								hasRoute: !!routeData,
								routeInfo: routeData
									? {
											distance: routeData.routeInfo.distanceKm,
											duration: routeData.routeInfo.durationMin,
											polylinePoints: routeData.polyline.geometry.coordinates.length,
										}
									: null,
								testMode: true,
							});

							const routeMessage = routeData
								? `\n\n🗺️ ルート情報も保存されました（実用上限版・高品質保持）:\n距離: ${routeData.routeInfo.distanceKm}km\n所要時間: ${routeData.routeInfo.durationMin}分\nポリラインポイント数: ${routeData.polyline.geometry.coordinates.length}個\nデータサイズ: ${Math.round((JSON.stringify(routeData).length / 1024) * 100) / 100}KB (${Math.round((JSON.stringify(routeData).length / (1024 * 1024)) * 100) / 100}MB)\n品質レベル: 実用上限（最大5万点）`
								: "\n\n⚠️ ルート情報は保存されませんでした（出発地・目的地が未設定）";

							alert(
								`Firebase側のみでルーム「${roomName.trim()}」を作成しました！\nルームID: ${roomId}${routeMessage}\n\n※Daily側ではルーム作成されていません（テスト用）`,
							);

							// ホーム画面に遷移
							navigate("/dashboard");
						} catch (error) {
							console.error("❌ Firebase側のみルーム作成エラー:", error);
							alert(`Firebase側のみルーム作成に失敗しました: ${error.message}`);
						}
					}}
					icon="🚀"
				>
					ルーム作成を決定
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
