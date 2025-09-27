import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCallRoom from "@/components/VideoCall/VideoCallRoom";
import { auth, rtdb } from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";

const CarNavigation = () => {
	const { roomId } = useParams();
	const navigate = useNavigate();
	const [members, setMembers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [roomData, setRoomData] = useState(null);
	const [showVideoCall, setShowVideoCall] = useState(false);
	const currentUserUid = useUserUid();

	useEffect(() => {
		if (!roomId || !currentUserUid) {
			setLoading(false);
			return;
		}

		// 画面入室時に自分の参加状態を true にする（作成者/参加者どちらも）
		if (currentUserUid) {
			void update(ref(rtdb, `rooms/${roomId}/members/${currentUserUid}`), {
				accepted: true,
			});
		}

		// ルーム情報とメンバー情報を取得
		const roomRef = ref(rtdb, `rooms/${roomId}`);
		const unsubscribe = onValue(
			roomRef,
			(snapshot) => {
				const room = snapshot.val();
				if (room) {
					setRoomData(room);
					const membersValue = room.members || {};
					const list = Object.values(membersValue).filter((m) => m?.accepted);
					setMembers(list);
				}
				setLoading(false);
			},
			() => setLoading(false),
		);

		return () => unsubscribe();
	}, [roomId, currentUserUid]);

	// 離脱時に自分の参加状態を false に戻す
	useEffect(() => {
		if (!roomId || !currentUserUid) return;

		const setAcceptedFalse = () => {
			try {
				return update(ref(rtdb, `rooms/${roomId}/members/${currentUserUid}`), {
					accepted: false,
				});
			} catch {
				// no-op
			}
		};

		const handleBeforeUnload = () => {
			void setAcceptedFalse();
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			void setAcceptedFalse();
		};
	}, [roomId, currentUserUid]);

	const handleCallEnd = () => {
		setShowVideoCall(false);
	};

	const handleLeaveRoom = () => {
		navigate("/dashboard/home");
	};

	return (
		<div className="p-4 space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">カーナビ</h1>
					{roomData && (
						<p className="text-gray-600">ルーム: {roomData.name || roomId}</p>
					)}
				</div>
				<button
					type="button"
					onClick={handleLeaveRoom}
					className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
				>
					ルームを出る
				</button>
			</div>

			{loading ? (
				<p className="text-gray-600">読み込み中...</p>
			) : (
				<>
					{/* 参加者一覧 */}
					<div className="bg-white rounded-lg shadow-md p-4">
						<h2 className="text-lg font-semibold mb-3">
							参加中のメンバー ({members.length}人)
						</h2>
						{members.length === 0 ? (
							<p className="text-gray-600">参加中のユーザーはいません。</p>
						) : (
							<ul className="space-y-2">
								{members.map((m) => (
									<li key={m.uid} className="flex items-center gap-3">
										<img
											src={m.photoURL || "/vite.svg"}
											alt={m.name || "user"}
											className="w-8 h-8 rounded-full"
										/>
										<span className="font-medium">{m.name || "(名無し)"}</span>
										{m.uid === roomData?.ownerUid && (
											<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
												作成者
											</span>
										)}
									</li>
								))}
							</ul>
						)}
					</div>

					{/* 通話機能 */}
					<div className="bg-white rounded-lg shadow-md p-4">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold">音声・ビデオ通話</h2>
							{!showVideoCall && roomData?.dailyRoom && (
								<button
									type="button"
									onClick={() => setShowVideoCall(true)}
									className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
								>
									通話を開始
								</button>
							)}
							{!roomData?.dailyRoom && (
								<p className="text-gray-500 text-sm">
									Daily.coルームが準備されていません
								</p>
							)}
						</div>

						{showVideoCall && roomData?.dailyRoom && (
							<VideoCallRoom
								roomId={roomId}
								roomName={roomData?.name || "カーナビルーム"}
								ownerUid={roomData?.ownerUid || ""}
								onCallEnd={handleCallEnd}
							/>
						)}
					</div>
				</>
			)}
		</div>
	);
};

export default CarNavigation;
