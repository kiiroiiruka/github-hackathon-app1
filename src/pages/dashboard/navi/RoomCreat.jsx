import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HeaderComponent2 from "../../../components/Header/Header2";
import ActionButton from "../../../components/RoomCreation/ActionButton";
import NavigationButton from "../../../components/RoomCreation/NavigationButton";
import RoomNameInput from "../../../components/RoomCreation/RoomNameInput";
import SectionCard from "../../../components/RoomCreation/SectionCard";
import SelectedFriendsDisplay from "../../../components/RoomCreation/SelectedFriendsDisplay";
import { createRoomWithInvites } from "../../../firebase";

const RoomCreat = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [roomName, setRoomName] = useState(() => {
		// ローカルストレージから初期値を取得
		const saved = localStorage.getItem("roomCreat_roomName");
		return saved || "";
	});
	const [selectedFriends, setSelectedFriends] = useState(() => {
		// ローカルストレージから初期値を取得
		const saved = localStorage.getItem("roomCreat_selectedFriends");
		return saved ? JSON.parse(saved) : [];
	});
	const [selectedLocation, setSelectedLocation] = useState(() => {
		// ローカルストレージから初期値を取得
		const saved = localStorage.getItem("roomCreat_selectedLocation");
		return saved ? JSON.parse(saved) : null;
	});
	const [selectedDeparture, setSelectedDeparture] = useState(() => {
		// ローカルストレージから初期値を取得
		const saved = localStorage.getItem("roomCreat_selectedDeparture");
		return saved ? JSON.parse(saved) : null;
	});

	// InviterPreferenceから戻ってきた時のフレンド情報を受け取る
	useEffect(() => {
		console.log("RoomCreat - location.state:", location.state);
		if (location.state?.selectedFriends) {
			console.log(
				"RoomCreat - selectedFriends受信:",
				location.state.selectedFriends,
			);
			setSelectedFriends(location.state.selectedFriends);
			// ローカルストレージに保存
			localStorage.setItem(
				"roomCreat_selectedFriends",
				JSON.stringify(location.state.selectedFriends),
			);
		}
		// PurlieuLocationやRouteSelectから選択された場所を受け取る
		if (location.state?.selectedLocation) {
			console.log(
				"RoomCreat - selectedLocation受信:",
				location.state.selectedLocation,
			);
			setSelectedLocation(location.state.selectedLocation);
			// ローカルストレージに保存
			localStorage.setItem(
				"roomCreat_selectedLocation",
				JSON.stringify(location.state.selectedLocation),
			);
		}
		// 出発地点を受け取る
		if (location.state?.selectedDeparture) {
			console.log(
				"RoomCreat - selectedDeparture受信:",
				location.state.selectedDeparture,
			);
			setSelectedDeparture(location.state.selectedDeparture);
			// ローカルストレージに保存
			localStorage.setItem(
				"roomCreat_selectedDeparture",
				JSON.stringify(location.state.selectedDeparture),
			);
		}
	}, [location.state]);

	// selectedFriendsが変更されたときにローカルストレージに保存
	useEffect(() => {
		localStorage.setItem(
			"roomCreat_selectedFriends",
			JSON.stringify(selectedFriends),
		);
	}, [selectedFriends]);

	// selectedLocationが変更されたときにローカルストレージに保存
	useEffect(() => {
		if (selectedLocation) {
			localStorage.setItem(
				"roomCreat_selectedLocation",
				JSON.stringify(selectedLocation),
			);
		} else {
			localStorage.removeItem("roomCreat_selectedLocation");
		}
	}, [selectedLocation]);

	// selectedDepartureが変更されたときにローカルストレージに保存
	useEffect(() => {
		if (selectedDeparture) {
			localStorage.setItem(
				"roomCreat_selectedDeparture",
				JSON.stringify(selectedDeparture),
			);
		} else {
			localStorage.removeItem("roomCreat_selectedDeparture");
		}
	}, [selectedDeparture]);

	// roomNameが変更されたときにローカルストレージに保存
	useEffect(() => {
		if (roomName.trim()) {
			localStorage.setItem("roomCreat_roomName", roomName);
		} else {
			localStorage.removeItem("roomCreat_roomName");
		}
	}, [roomName]);

	// フレンド選択ページに移動
	const handleInviterNavigation = () => {
		navigate("/dashboard/navi/inviter", {
			state: {
				selectedFriends,
				returnTo: "/dashboard/navi/room",
			},
		});
	};

	// 選択されたフレンドを削除
	const removeFriend = (friendToRemove) => {
		setSelectedFriends((prev) => {
			const updated = prev.filter((friend) => friend.uid !== friendToRemove.uid);
			// ローカルストレージも更新
			localStorage.setItem(
				"roomCreat_selectedFriends",
				JSON.stringify(updated),
			);
			return updated;
		});
	};

	// ルーム作成処理
	const handleCreateRoom = async () => {
		try {
			console.log("ルーム作成時のselectedFriends:", selectedFriends);
			const roomId = await createRoomWithInvites(
				roomName.trim(),
				selectedFriends,
			);
			console.log("ルーム作成成功:", roomId);
			
			// 成功時はすべてのローカルストレージをクリア
			localStorage.removeItem("roomCreat_selectedFriends");
			localStorage.removeItem("roomCreat_selectedLocation");
			localStorage.removeItem("roomCreat_selectedDeparture");
			localStorage.removeItem("roomCreat_roomName");

			navigate("/dashboard/navi/confirmation", {
				state: {
					roomId: roomId,
					roomName: roomName.trim(),
					selectedFriends,
					selectedLocation,
					selectedDeparture,
				},
			});
		} catch (e) {
			console.error("ルーム作成失敗:", e);
			alert("ルームの作成に失敗しました。ログイン状態を確認して再試行してください。");
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
			<HeaderComponent2 title="通信" />
			<div className="px-4 py-6">
				<div className="max-w-lg mx-auto">
					{/* タイトルセクション */}
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-gray-800 mb-2">
							🏠 ルーム作成
						</h1>
						<p className="text-gray-600">
							新しいルームを作成して友達と一緒に行動しよう
						</p>
					</div>

					<div className="space-y-6">
						{/* ルーム名セクション */}
						<RoomNameInput roomName={roomName} onChange={setRoomName} />

						{/* ルート選択セクション */}
						<SectionCard 
							icon="🗺️" 
							title="ルート選択"
							badge={
								<div className="flex gap-2">
									{selectedDeparture && (
										<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
											出発地設定済み
										</span>
									)}
									{selectedLocation && (
										<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
											目的地設定済み
										</span>
									)}
								</div>
							}
						>
							{/* 選択された場所の表示 */}
							<div className="space-y-3 mb-4">
								{selectedDeparture && (
									<div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
										<div className="flex items-center gap-2 mb-2">
											<span className="text-lg">🚀</span>
											<h3 className="font-semibold text-green-800">
												設定済み出発地
											</h3>
										</div>
										<p className="text-green-700 font-medium">
											{selectedDeparture.name}
										</p>
										<p className="text-sm text-green-600 mt-1">
											緯度: {selectedDeparture.coordinates[0].toFixed(4)}, 経度:{" "}
											{selectedDeparture.coordinates[1].toFixed(4)}
										</p>
										<button
											type="button"
											onClick={() => {
												setSelectedDeparture(null);
												localStorage.removeItem("roomCreat_selectedDeparture");
											}}
											className="mt-2 text-red-500 hover:text-red-700 text-sm font-medium"
										>
											出発地をクリア
										</button>
									</div>
								)}
								
								{selectedLocation && (
									<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
										<div className="flex items-center gap-2 mb-2">
											<span className="text-lg">🎯</span>
											<h3 className="font-semibold text-blue-800">
												設定済み目的地
											</h3>
										</div>
										<p className="text-blue-700 font-medium">
											{selectedLocation.name}
										</p>
										<p className="text-sm text-blue-600 mt-1">
											緯度: {selectedLocation.coordinates[0].toFixed(4)}, 経度:{" "}
											{selectedLocation.coordinates[1].toFixed(4)}
										</p>
										<button
											type="button"
											onClick={() => {
												setSelectedLocation(null);
												localStorage.removeItem("roomCreat_selectedLocation");
											}}
											className="mt-2 text-red-500 hover:text-red-700 text-sm font-medium"
										>
											目的地をクリア
										</button>
									</div>
								)}
							</div>

							<div className="grid gap-3">
								<NavigationButton
									icon="📍"
									title={selectedLocation ? "目的地を変更" : "ルートを選択"}
									description={selectedLocation ? "別の目的地を設定" : "目的地と経路を設定"}
									onClick={() =>
										navigate("/dashboard/navi/route", {
											state: {
												selectedLocation,
												returnTo: "/dashboard/navi/room",
											},
										})
									}
									hoverColor="blue"
								/>

								<NavigationButton
									icon="💫"
									title="お気に入りから選択"
									description="保存済みの場所から選択"
									onClick={() => navigate("/dashboard/navi/purlieu-location")}
									hoverColor="purple"
								/>

								<NavigationButton
									icon="🧭"
									title="ルート確認"
									description="地図でルートを確認"
									onClick={() =>
										navigate("/dashboard/navi/route-screen", {
											state: {
												destination: selectedLocation?.coordinates,
												destinationName: selectedLocation?.name,
												departure: selectedDeparture?.coordinates,
												departureName: selectedDeparture?.name,
												selectedDeparture: selectedDeparture,
												selectedLocation: selectedLocation,
												selectedFriends,
												roomName: roomName.trim(),
											},
										})
									}
									disabled={!selectedLocation}
									hoverColor="green"
								/>
							</div>
						</SectionCard>

						{/* 招待するユーザーセクション */}
						<SectionCard
							icon="👥"
							title="招待するユーザー"
							badge={
								selectedFriends.length > 0
									? `${selectedFriends.length}名選択中`
									: undefined
							}
						>
							<SelectedFriendsDisplay
								selectedFriends={selectedFriends}
								onRemoveFriend={removeFriend}
							/>

							<NavigationButton
								icon="✨"
								title={
									selectedFriends.length > 0
										? "フレンドを追加/変更"
										: "フレンドを選択"
								}
								description={
									selectedFriends.length > 0
										? "選択済みのフレンドを変更できます"
										: "一緒に行動する友達を招待"
								}
								onClick={handleInviterNavigation}
								hoverColor="purple"
								dashed={true}
							/>
						</SectionCard>

						{/* 作成ボタン */}
						<div className="pt-4">
							<ActionButton
								disabled={!roomName.trim()}
								onClick={handleCreateRoom}
							>
								<span className="flex items-center justify-center gap-3">
									<span className="text-2xl">🚀</span>
									{roomName.trim()
										? `「${roomName}」を作成`
										: "ルーム名を入力してください"}
								</span>
							</ActionButton>
						</div>

						{/* 戻るボタン */}
						<div className="text-center pt-2">
							<ActionButton
								variant="secondary"
								size="small"
								onClick={() => navigate("/dashboard/navi")}
							>
								戻る
							</ActionButton>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RoomCreat;
