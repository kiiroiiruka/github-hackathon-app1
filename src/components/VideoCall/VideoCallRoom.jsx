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
	const currentUserUid = useUserUid();

	// 参加者管理フック
	const { handleParticipantUpdate, getActiveParticipants } =
		useParticipantManager(roomId);

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

				// Daily.co通話機能を一時的に無効化（参考プロジェクトの成功パターンに合わせる）
				// TODO: 後でDaily.co統合を追加
				console.log("Mock video call initialized for room:", roomId);

				// 通話セッション開始（Firebaseのみ）
				await startCallSession(roomId, currentUser.uid, {
					name: currentUser.displayName || "Anonymous",
					photoURL: currentUser.photoURL || "",
				});

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
		};
	}, [roomId, currentUserUid, callDuration]);

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
			{/* ルーム情報表示 */}
			<div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
				<div className="flex justify-between items-center">
					<div>
						<h3 className="text-lg font-semibold text-green-800">{roomName}</h3>
						<p className="text-sm text-green-600">ルームID: {roomId}</p>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 bg-green-500 rounded-full"></div>
						<span className="text-sm text-green-600">ルーム作成完了</span>
					</div>
				</div>
			</div>

			{/* 通話機能のモック表示 */}
			<div className="relative">
				<div className="w-full h-96 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-blue-300 flex items-center justify-center">
					<div className="text-center">
						<div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg
								className="w-8 h-8 text-white"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
							</svg>
						</div>
						<h3 className="text-xl font-semibold text-blue-800 mb-2">
							通話機能
						</h3>
						<p className="text-blue-600 mb-4">ルーム作成が完了しました</p>
						<p className="text-sm text-blue-500">Daily.co統合は後で追加予定</p>
					</div>
				</div>

				{/* ルーム終了ボタン */}
				<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
					<button
						type="button"
						onClick={handleLeaveCall}
						className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
					>
						ルームを終了
					</button>
				</div>
			</div>

			{/* ルーム情報 */}
			<div className="mt-4 p-3 bg-gray-50 rounded-lg">
				<p className="text-sm text-gray-600 mb-2">ルーム作成者: {ownerUid}</p>
				<p className="text-xs text-gray-500">
					Firebase Realtime Database にルーム情報が保存されました
				</p>
			</div>
		</div>
	);
};

export default VideoCallRoom;
