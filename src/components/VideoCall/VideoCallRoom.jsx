import { useEffect, useRef, useState } from "react";
import { get, ref } from "firebase/database";
import { auth, rtdb } from "@/firebase";
import { getDailyToken, startCallSession, endCallSession, updateCallDuration } from "@/firebase/room";
import { useUserUid } from "@/hooks/useUserUid";
import { useDailyConnection } from "@/hooks/useDailyConnection";
import { useParticipantManager } from "@/hooks/useParticipantManager";

const VideoCallRoom = ({ roomId, roomName, ownerUid, onCallEnd }) => {
	const iframeRef = useRef(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [dailyRoomUrl, setDailyRoomUrl] = useState(null);
	const currentUserUid = useUserUid();

	// 参加者管理フック
	const { handleParticipantUpdate, getActiveParticipants } = useParticipantManager(roomId);

	// Daily.co接続フック
	const {
		daily,
		isJoined,
		isConnecting,
		error: dailyError,
		participants,
		callDuration,
		formattedDuration,
		joinRoom,
		leaveRoom,
		destroyDaily,
	} = useDailyConnection(roomId, dailyRoomUrl, handleParticipantUpdate);

	// 通話時間の定期更新
	useEffect(() => {
		if (isJoined && callDuration > 0 && currentUserUid) {
			// 10秒ごとに通話時間を更新
			if (callDuration % 10 === 0) {
				updateCallDuration(roomId, currentUserUid, callDuration);
			}
		}
	}, [isJoined, callDuration, currentUserUid, roomId]);

	// Daily iframeの設定
	useEffect(() => {
		if (daily && iframeRef.current && !daily.iframe) {
			daily.setCustomIntegrations({ iframe: iframeRef.current });
		}
	}, [daily]);

	useEffect(() => {
		const initializeCall = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Get current user info
				if (!currentUserUid) {
					throw new Error("User not authenticated");
				}

				const currentUser = auth.currentUser;
				if (!currentUser) {
					throw new Error("User not authenticated");
				}

				// FirebaseからDaily.coルーム情報を取得
				const roomRef = ref(rtdb, `rooms/${roomId}`);
				const roomSnapshot = await get(roomRef);
				const firebaseRoomData = roomSnapshot.val();

				if (!firebaseRoomData || !firebaseRoomData.dailyRoom) {
					throw new Error("Daily room not found in Firebase");
				}

				const dailyRoomInfo = firebaseRoomData.dailyRoom;
				setDailyRoomUrl(dailyRoomInfo.url);

				// Get user token
				const token = await getDailyToken(
					roomId,
					currentUser.uid,
					currentUser.displayName || "Anonymous",
					currentUser.photoURL || ""
				);

				// 通話セッション開始
				await startCallSession(roomId, currentUser.uid, {
					name: currentUser.displayName || "Anonymous",
					photoURL: currentUser.photoURL || "",
				});

				// Join the room
				await joinRoom(token);
				setIsLoading(false);
			} catch (err) {
				console.error("Video call initialization error:", err);
				setError(err.message);
				setIsLoading(false);
			}
		};

		initializeCall();

		// Cleanup on unmount
		return () => {
			if (currentUserUid && callDuration > 0) {
				endCallSession(roomId, currentUserUid, callDuration);
			}
			destroyDaily();
		};
	}, [roomId, currentUserUid, joinRoom, destroyDaily, callDuration]);

	const handleLeaveCall = async () => {
		if (currentUserUid && callDuration > 0) {
			await endCallSession(roomId, currentUserUid, callDuration);
		}
		await leaveRoom();
		onCallEnd?.();
	};

	// エラー表示の統合
	const displayError = error || dailyError;

	if (displayError) {
		return (
			<div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
				<div className="text-red-600 text-center">
					<p className="text-lg font-semibold mb-2">通話エラー</p>
					<p className="text-sm">{displayError}</p>
					<button
						type="button"
						onClick={handleLeaveCall}
						className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
					>
						閉じる
					</button>
				</div>
			</div>
		);
	}

	if (isLoading || isConnecting) {
		return (
			<div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<p className="text-gray-600">
						{isLoading ? "通話を開始しています..." : "接続中..."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full">
			{/* 通話時間表示 */}
			{isJoined && (
				<div className="mb-4 p-3 bg-blue-50 rounded-lg">
					<div className="flex justify-between items-center">
						<p className="text-sm text-blue-600">
							通話時間: <span className="font-mono font-semibold">{formattedDuration}</span>
						</p>
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
							<span className="text-sm text-red-600">通話中</span>
						</div>
					</div>
				</div>
			)}

			<div className="relative">
				{/* Daily iframe container */}
				<div
					ref={iframeRef}
					className="w-full h-96 rounded-lg overflow-hidden bg-gray-900"
				/>

				{/* Call controls overlay */}
				{isJoined && (
					<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
						<button
							type="button"
							onClick={handleLeaveCall}
							className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
						>
							通話を終了
						</button>
					</div>
				)}
			</div>

			{/* Participants info */}
			{participants.length > 0 && (
				<div className="mt-4 p-3 bg-gray-50 rounded-lg">
					<p className="text-sm text-gray-600 mb-2">
						参加者: {participants.length}人
					</p>
					<div className="flex flex-wrap gap-2">
						{participants.map((participant) => (
							<div
								key={participant.session_id}
								className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
							>
								{participant.user_name || "Anonymous"}
								{participant.local && (
									<span className="text-blue-600">(あなた)</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default VideoCallRoom;
