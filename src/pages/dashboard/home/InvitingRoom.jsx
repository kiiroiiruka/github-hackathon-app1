import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, rtdb } from "@/firebase";

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

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<h2 className="text-xl font-semibold">招待中のルーム</h2>
				{loading ? (
					<p className="text-gray-600">読み込み中...</p>
				) : invitedRooms.length === 0 ? (
					<p className="text-gray-600">招待中のルームはありません。</p>
				) : (
					<ul className="space-y-2">
						{invitedRooms.map((room) => (
							<li
								key={room.roomId}
								className="border rounded p-3 flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<img
										src={room.ownerPhotoURL || "/vite.svg"}
										alt={room.ownerName || "owner"}
										className="w-8 h-8 rounded-full"
									/>
									<div>
										<p className="font-medium">{room.name || "(名称未設定)"}</p>
										<p className="text-sm text-gray-600">ID: {room.roomId}</p>
										<p className="text-xs text-gray-600">
											作成者: {room.ownerName || "(名称未設定)"} (
											{room.ownerUid || "-"})
										</p>
										<p className="text-xs text-gray-500">
											作成時刻:{" "}
											{room.createdAt
												? new Date(room.createdAt).toLocaleString("ja-JP")
												: "-"}
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => handleAccept(room.roomId)}
									disabled={updatingId === room.roomId}
									className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
								>
									{updatingId === room.roomId ? "処理中..." : "参加する"}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="space-y-2">
				<h2 className="text-xl font-semibold">あなたが作成したルーム</h2>
				{loading ? (
					<p className="text-gray-600">読み込み中...</p>
				) : ownedRooms.length === 0 ? (
					<p className="text-gray-600">作成したルームはありません。</p>
				) : (
					<ul className="space-y-2">
						{ownedRooms.map((room) => (
							<li
								key={room.roomId}
								className="border rounded p-3 flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<img
										src={room.ownerPhotoURL || "/vite.svg"}
										alt={room.ownerName || "owner"}
										className="w-8 h-8 rounded-full"
									/>
									<div>
										<p className="font-medium">{room.name || "(名称未設定)"}</p>
										<p className="text-sm text-gray-600">ID: {room.roomId}</p>
										<p className="text-xs text-gray-600">
											作成者: {room.ownerName || "(名称未設定)"} (
											{room.ownerUid || "-"})
										</p>
										<p className="text-xs text-gray-500">
											作成時刻:{" "}
											{room.createdAt
												? new Date(room.createdAt).toLocaleString("ja-JP")
												: "-"}
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => navigate(`/dashboard/car/${room.roomId}`)}
									className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
								>
									カーナビへ
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};

export default InvitingRoom;
