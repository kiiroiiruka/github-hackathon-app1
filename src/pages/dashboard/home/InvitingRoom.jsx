import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, rtdb } from "@/firebase";
import HeaderComponent from "@/components/Header/Header";

const InvitingRoom = () => {
	const navigate = useNavigate();
	const [invitedRooms, setInvitedRooms] = useState([]);
	const [ownedRooms, setOwnedRooms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [updatingId, setUpdatingId] = useState("");

	useEffect(() => {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			setRooms([]);
			setLoading(false);
			return;
		}

		const roomsRef = ref(rtdb, "rooms");
		const unsubscribe = onValue(
			roomsRef,
			(snapshot) => {
				const value = snapshot.val() || {};
				const list = Object.entries(value).map(([roomId, room]) => ({
					roomId,
					...room,
				}));
				const invited = list.filter(
					(room) =>
						room?.members?.[currentUser.uid] &&
						room.members[currentUser.uid].invited &&
						!room.members[currentUser.uid].accepted,
				);
				const owned = list.filter((room) => room?.ownerUid === currentUser.uid);
				setInvitedRooms(invited);
				setOwnedRooms(owned);
				setLoading(false);
			},
			() => setLoading(false),
		);

		return () => unsubscribe();
	}, []);

	const handleAccept = async (roomId) => {
		const currentUser = auth.currentUser;
		if (!currentUser) return;
		try {
			setUpdatingId(roomId);
			await update(ref(rtdb, `rooms/${roomId}/members/${currentUser.uid}`), {
				accepted: true,
			});
			navigate(`/dashboard/car/${roomId}`);
		} catch (e) {
			console.error("参加更新に失敗:", e);
			alert("参加処理に失敗しました。再試行してください。");
		} finally {
			setUpdatingId("");
		}
	};

	const handleBack = () => {
		navigate("/dashboard");
	};

	return (
		<div>
			<HeaderComponent title="招待連絡" onBack={handleBack} />
			<div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
				{/* 招待中のルームセクション */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-xl font-semibold mb-4 text-gray-800">
						招待中のルーム
					</h2>
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
							<span className="ml-3 text-gray-600">読み込み中...</span>
						</div>
					) : invitedRooms.length === 0 ? (
						<div className="text-center py-8">
							<div className="text-6xl mb-4">📭</div>
							<p className="text-gray-600 text-lg">招待中のルームはありません</p>
							<p className="text-gray-500 text-sm mt-2">
								友達から招待されると、ここに表示されます
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{invitedRooms.map((room) => (
								<div
									key={room.roomId}
									className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md transition-shadow"
								>
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-4">
											<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
												<img
													src={room.ownerPhotoURL || "/vite.svg"}
													alt={room.ownerName || "owner"}
													className="w-full h-full object-cover"
												/>
											</div>
											<div className="flex-1">
												<h3 className="font-semibold text-lg text-gray-800 mb-1">
													{room.name || "(名称未設定)"}
												</h3>
												<div className="space-y-1 text-sm text-gray-600">
													<p>
														<span className="font-medium">作成者:</span> {room.ownerName || "(名称未設定)"}
													</p>
													<p>
														<span className="font-medium">ルームID:</span> 
														<span className="font-mono bg-gray-100 px-2 py-1 rounded ml-1">
															{room.roomId}
														</span>
													</p>
													<p>
														<span className="font-medium">作成時刻:</span>{" "}
														{room.createdAt
															? new Date(room.createdAt).toLocaleString("ja-JP")
															: "-"}
													</p>
												</div>
											</div>
										</div>
										<button
											type="button"
											onClick={() => handleAccept(room.roomId)}
											disabled={updatingId === room.roomId}
											className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-60 flex items-center gap-2"
										>
											{updatingId === room.roomId ? (
												<>
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
													処理中...
												</>
											) : (
												<>
													<span>🚗</span>
													参加する
												</>
											)}
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* あなたが作成したルームセクション */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold mb-4 text-gray-800">
						あなたが作成したルーム
					</h2>
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
							<span className="ml-3 text-gray-600">読み込み中...</span>
						</div>
					) : ownedRooms.length === 0 ? (
						<div className="text-center py-8">
							<div className="text-6xl mb-4">🏗️</div>
							<p className="text-gray-600 text-lg">作成したルームはありません</p>
							<p className="text-gray-500 text-sm mt-2">
								ルームを作成すると、ここに表示されます
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{ownedRooms.map((room) => (
								<div
									key={room.roomId}
									className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-shadow"
								>
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-4">
											<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
												<img
													src={room.ownerPhotoURL || "/vite.svg"}
													alt={room.ownerName || "owner"}
													className="w-full h-full object-cover"
												/>
											</div>
											<div className="flex-1">
												<h3 className="font-semibold text-lg text-gray-800 mb-1">
													{room.name || "(名称未設定)"}
												</h3>
												<div className="space-y-1 text-sm text-gray-600">
													<p>
														<span className="font-medium">ルームID:</span> 
														<span className="font-mono bg-gray-100 px-2 py-1 rounded ml-1">
															{room.roomId}
														</span>
													</p>
													<p>
														<span className="font-medium">作成時刻:</span>{" "}
														{room.createdAt
															? new Date(room.createdAt).toLocaleString("ja-JP")
															: "-"}
													</p>
												</div>
											</div>
										</div>
										<button
											type="button"
											onClick={() => navigate(`/dashboard/car/${room.roomId}`)}
											className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
										>
											<span>🚗</span>
											カーナビへ
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default InvitingRoom;
