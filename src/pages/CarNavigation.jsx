import { onValue, ref, update } from "firebase/database";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AudioCallRoom from "@/components/VideoCall/VideoCallRoom";
import AudioCallFooter from "@/components/Footer/AudioCallFooter";
import { auth, rtdb } from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";

const CarNavigation = () => {
	const { roomId } = useParams();
	const navigate = useNavigate();
	const [members, setMembers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [roomData, setRoomData] = useState(null);
	const [showAudioCall, setShowAudioCall] = useState(true); // デフォルトで通話開始
	const [isCallActive, setIsCallActive] = useState(false); // 通話状態
	const [callParticipants, setCallParticipants] = useState([]); // 通話参加者
	const currentUserUid = useUserUid();
	const updateTimeoutRef = useRef(null);

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
		setShowAudioCall(false);
		setIsCallActive(false);
		setCallParticipants([]);
		// 通話終了時にルームからも抜ける
		handleLeaveRoom();
	};

	// 通話状態の更新ハンドラー（デバウンス付き）
	const handleCallStateUpdate = useCallback((state) => {
		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current);
		}
		
		updateTimeoutRef.current = setTimeout(() => {
			setIsCallActive(state.isActive);
			
			// 参加者の重複を防ぐため、session_idでユニークにする
			const uniqueParticipants = [];
			const seenSessionIds = new Set();
			
			(state.participants || []).forEach(participant => {
				if (!seenSessionIds.has(participant.session_id)) {
					seenSessionIds.add(participant.session_id);
					uniqueParticipants.push(participant);
				}
			});
			
			console.log("👥 通話参加者を更新:", {
				totalParticipants: uniqueParticipants.length,
				sessionIds: uniqueParticipants.map(p => p.session_id)
			});
			
			setCallParticipants(uniqueParticipants);
		}, 50); // 50msのデバウンス
	}, []);

	// クリーンアップ
	useEffect(() => {
		return () => {
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, []);

	const handleLeaveRoom = () => {
		navigate("/dashboard/home");
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Main Content with bottom padding to account for footer */}
			<div className="pb-24 p-4 space-y-4">
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
					{/* 音声通話機能 */}
					<div className="bg-white rounded-lg shadow-md p-4">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold">🎤 音声通話</h2>
							{!roomData?.dailyRoom && (
								<p className="text-gray-500 text-sm">
									Daily.coルームが準備されていません
								</p>
							)}
						</div>

						{roomData?.dailyRoom && (
							<AudioCallRoom
								roomId={roomId}
								roomName={roomData?.name || "カーナビルーム"}
								ownerUid={roomData?.ownerUid || ""}
								members={members}
								onCallEnd={handleCallEnd}
								onCallStateUpdate={handleCallStateUpdate}
							/>
						)}
					</div>
				</>
			)}
			</div>
			
			{/* Audio Call Footer */}
			<AudioCallFooter
				participants={(() => {
					// 通話参加者がいる場合はそれを使用
					if (callParticipants.length > 0) {
						console.log("🎤 通話参加者データを使用:", callParticipants.length);
						return callParticipants;
					}
					
					// 通話参加者がいない場合は、メンバーから参加者データを作成
					// ただし、音声状態は適切に初期化
					const fallbackParticipants = members.map(member => {
						console.log("📝 フォールバック参加者データを作成:", member.name);
						return {
							session_id: member.uid,
							user_name: member.name,
							audio: member.uid === currentUserUid ? true : false, // ローカルユーザーのみ音声ON
							photoURL: member.photoURL,
							local: member.uid === currentUserUid
						};
					});
					
					console.log("📝 フォールバック参加者数:", fallbackParticipants.length);
					return fallbackParticipants;
				})()}
			/>
		</div>
	);
};

export default CarNavigation;
