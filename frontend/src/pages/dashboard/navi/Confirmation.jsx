import { get, push, ref, serverTimestamp, set } from "firebase/database";
import { useLocation, useNavigate } from "react-router-dom";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import { auth, rtdb } from "../../../firebase/firebaseConfig";
import { createRoomWithInvitesAndRoute } from "../../../firebase/room";

const Confirmation = () => {
	const navigate = useNavigate();
	const location = useLocation();
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
											<span className="text-lg">�</span>
											<span className="font-medium text-green-800">出発地</span>
										</div>
                    <p className="text-green-700 font-medium">{selectedDeparture.name}</p>
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
                    <p className="text-blue-700 font-medium">{selectedLocation.name}</p>
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
					onClick={async () => {
            console.log("🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀");
            console.log("🚀 NEW CONFIRMATION CODE EXECUTED! 🚀");
            console.log("🚀 THIS IS THE UPDATED VERSION! 🚀");
            console.log("🚀 TIMESTAMP: 2025-09-29-11:25:00 🚀");
            console.log("🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀");
            alert(
              "✅ 新しいコードが実行されました！\n\nルート情報を段階的に保存します。\n\nタイムスタンプ: 2025-09-29-11:25:00"
            );
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUser.uid) {
              alert("ログインが必要です。");
              return;
            }

            if (!String(roomName || "").trim()) {
              alert("ルーム名を入力してください。");
              return;
            }

            let createdRoomId = null;

            try {
              console.log("🎤 通話機能付きルーム作成開始:", roomName);

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

              // 実際のルートデータを取得
              if (selectedLocation && selectedDeparture) {
                // ルート計算（OSRM API使用）
                try {
                  console.log("🗺️ ルート計算開始:", {
                    departure: selectedDeparture,
                    destination: selectedLocation,
                  });
                  
                  const apiUrl = `https://router.project-osrm.org/route/v1/driving/${selectedDeparture.coordinates[1]},${selectedDeparture.coordinates[0]};${selectedLocation.coordinates[1]},${selectedLocation.coordinates[0]}?overview=full&geometries=geojson&steps=true`;
                  console.log("🗺️ OSRM API URL:", apiUrl);

                  const routeResponse = await fetch(apiUrl);
                  console.log("🗺️ OSRM API response status:", routeResponse.status);

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
                    } else {
                      console.warn("⚠️ ルートが見つかりません");
                    }
                  } else {
                    console.warn("⚠️ ルート計算エラー:", routeResponse.status);
                  }
                } catch (_routeError) {
                  console.warn("⚠️ ルート計算に失敗、直線ルートを使用");
                  // エラー時は直線ルートを作成
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
                        coordinates: [selectedDeparture.coordinates, selectedLocation.coordinates],
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
                    test: true,
                  };
                  console.log("🗺️ 直線ルートで作成");
                }
              }

              // ルートデータ構築完了

              const _roomData = {
                name: String(roomName || "").trim(),
                createdAt: serverTimestamp(),
                ownerUid: currentUser.uid,
                ownerName: currentUser.displayName || "",
                ownerPhotoURL: currentUser.photoURL || "",
                members,
                testMode: false, // 通話機能を有効にする
                // ルート情報を含める
                routeData: routeData,
                hasRoute: !!routeData, // ルート情報があるかどうかのフラグ
              };

              try {
                // Daily.coルーム作成とFirebase保存を同時実行

                // Daily.coルーム作成
                createdRoomId = await createRoomWithInvitesAndRoute(
                  String(roomName || "").trim(),
							selectedFriends || [],
                  selectedLocation,
                  selectedDeparture
                );

                // testModeをfalseに変更して通話機能を有効にする
                const testModeRef = ref(rtdb, `rooms/${createdRoomId}/testMode`);
                await set(testModeRef, false);

                // Firebaseにルート情報を追加保存
                if (routeData) {
                  const routeRef = ref(rtdb, `rooms/${createdRoomId}/routeData`);
                  await set(routeRef, routeData);

                  // hasRouteフラグを追加
                  const hasRouteRef = ref(rtdb, `rooms/${createdRoomId}/hasRoute`);
                  await set(hasRouteRef, true);
                }
              } catch (writeError) {
                console.error("❌ ルーム作成エラー:", writeError.message);
                throw writeError;
              }

              // 保存後にFirebaseから実際のデータを確認
              const actualRoomId = createdRoomId || roomId;
              const savedRoomRef = ref(rtdb, `rooms/${actualRoomId}`);
              const savedSnapshot = await get(savedRoomRef);
              const savedData = savedSnapshot.val();

              console.log("✅ 通話機能付きルーム作成完了:", actualRoomId);

              const routeMessage = routeData
                ? `\n\n🗺️ ルート情報: ${routeData.routeInfo?.distanceKm || 0}km, ${routeData.routeInfo?.durationMin || 0}分`
                : "\n\n⚠️ ルート情報なし";

							alert(
                `通話機能付きルーム「${String(roomName || "").trim()}」を作成しました！\nルームID: ${actualRoomId}${routeMessage}\n\n🎤 通話機能が有効になっています！\n📞 Daily.coルームURL: ${savedData?.dailyRoom?.url || "作成中..."}`
							);

							// ホーム画面に遷移
							navigate("/dashboard");
						} catch (error) {
              console.error("❌ ルーム作成エラー:", error.message);
              alert(`ルーム作成に失敗しました: ${error.message}`);
						}
					}}
					icon="🚀"
				>
					音声付きでルーム作成を決定
				</Button>

				{/* 音声なしでルーム作成ボタン（テスト用） */}

				<Button
					variant="warning"
					size="lg"
					className="w-full shadow-lg"
					onClick={async () => {
						console.log("🔥 音声なしルーム作成開始");
						const currentUser = auth.currentUser;
						if (!currentUser || !currentUser.uid) {
							alert("ログインが必要です。");
							return;
						}

						if (!String(roomName || "").trim()) {
							alert("ルーム名を入力してください。");
							return;
						}

						try {
							console.log("🔥 Firebase側のみでルーム作成:", roomName);

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
									
									const apiUrl = `https://router.project-osrm.org/route/v1/driving/${selectedDeparture.coordinates[1]},${selectedDeparture.coordinates[0]};${selectedLocation.coordinates[1]},${selectedLocation.coordinates[0]}?overview=full&geometries=geojson&steps=true`;
									console.log("🗺️ OSRM API URL（音声なし）:", apiUrl);

									const routeResponse = await fetch(apiUrl);
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
									console.warn("⚠️ ルート計算に失敗:", routeError);
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
							console.error("❌ ルーム作成エラー:", error);
							alert(`ルーム作成に失敗しました: ${error.message}`);
						}
					}}
					icon="🔥"
				>
					音声なしでルーム作成
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
