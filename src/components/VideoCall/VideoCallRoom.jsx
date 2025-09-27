import { get, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { auth, rtdb } from "@/firebase";
import {
	endCallSession,
	getDailyToken,
	startCallSession,
	updateCallDuration,
} from "@/firebase/room";
import { useDailyConnection } from "@/hooks/useDailyConnection";
import { useParticipantManager } from "@/hooks/useParticipantManager";
import { useUserUid } from "@/hooks/useUserUid";

const VideoCallRoom = ({ roomId, roomName, ownerUid, onCallEnd }) => {
	const iframeRef = useRef(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [dailyRoomUrl, setDailyRoomUrl] = useState(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [sessionStarted, setSessionStarted] = useState(false);
	const currentUserUid = useUserUid();

	// 参加者管理フック
	const {
		handleParticipantUpdate,
		getActiveParticipants,
		startParticipantSession,
	} = useParticipantManager(roomId);

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
		if (daily && iframeRef.current) {
			console.log("Setting up Daily iframe:", {
				daily: !!daily,
				iframe: !!iframeRef.current,
				iframeElement: iframeRef.current,
			});
			daily.setCustomIntegrations({ iframe: iframeRef.current });
		}
	}, [daily]);

	useEffect(() => {
		// 初期化済みの場合は実行しない
		if (isInitialized) return;

		const initializeCall = async () => {
			try {
				setIsLoading(true);
				setError(null);
				setIsInitialized(true); // 初期化開始フラグを設定

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
					currentUser.photoURL || "",
				);

				// 通話セッション開始（既に開始済みでない場合のみ）
				if (!sessionStarted) {
					await startParticipantSession(currentUser.uid, {
						name: currentUser.displayName || "Anonymous",
						photoURL: currentUser.photoURL || "",
					});
					setSessionStarted(true);
				}

				// Join the room (既に接続中でない場合のみ)
				if (!isJoined && !isConnecting) {
					await joinRoom(token);

					// iframe の状態を確認
					setTimeout(() => {
						console.log("After joinRoom - iframe state:", {
							daily: !!daily,
							iframe: !!iframeRef.current,
							isJoined,
							isConnecting,
						});
					}, 1000);
				}
				setIsLoading(false);
			} catch (err) {
				console.error("Video call initialization error:", err);
				setError(err.message);
				setIsLoading(false);
				setIsInitialized(false); // エラー時は初期化フラグをリセット
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
	}, [roomId, currentUserUid, joinRoom, destroyDaily, isInitialized]); // isInitialized を依存配列に追加

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
		<div className="w-full h-full flex flex-col items-center justify-center p-6">
			{/* 音声通話のメイン表示 */}
			<div className="text-center mb-8">
				<div className="w-32 h-32 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
					<svg
						className="w-16 h-16 text-blue-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
						/>
					</svg>
				</div>

				<h2 className="text-2xl font-bold text-gray-800 mb-2">音声通話中</h2>
				<p className="text-gray-600 mb-4">{roomName}</p>

				{/* 通話時間表示 */}
				{isJoined && (
					<div className="mb-4 p-3 bg-blue-50 rounded-lg">
						<p className="text-sm text-blue-600">
							通話時間:{" "}
							<span className="font-mono font-semibold text-lg">
								{formattedDuration}
							</span>
						</p>
						<div className="flex items-center justify-center gap-2 mt-2">
							<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
							<span className="text-sm text-red-600">通話中</span>
						</div>
					</div>
				)}
			</div>

			{/* 音声制御ボタン */}
			{isJoined && (
				<div className="flex gap-4 mb-6">
					<button
						type="button"
						onClick={() => {
							if (daily) {
								daily.setLocalAudio(!daily.localAudio());
							}
						}}
						className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg"
					>
						マイク切り替え
					</button>
					<button
						type="button"
						onClick={handleLeaveCall}
						className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
					>
						通話を終了
					</button>
				</div>
			)}

			{/* 参加者情報 */}
			{participants.length > 0 && (
				<div className="w-full max-w-md p-4 bg-gray-50 rounded-lg">
					<p className="text-sm text-gray-600 mb-3 text-center">
						参加者: {participants.length}人
					</p>
					<div className="flex flex-wrap gap-2 justify-center">
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

			{/* 隠しiframe（Daily.co用） */}
			<div ref={iframeRef} className="hidden" />
		</div>
	);
};

export default VideoCallRoom;
