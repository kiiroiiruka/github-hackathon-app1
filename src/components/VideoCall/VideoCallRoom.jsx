import DailyIframe from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import { get, ref } from "firebase/database";
import {
	auth,
	rtdb,
	endDailyRoomSession,
	syncDailyRoomState,
	updateMemberDailyStatus,
} from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";

const VideoCallRoom = ({ roomId, roomName, ownerUid, onCallEnd }) => {
	const iframeRef = useRef(null);
	const dailyRef = useRef(null);
	const [isJoined, setIsJoined] = useState(false);
	const [participants, setParticipants] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const currentUserUid = useUserUid();

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

				// Get user token
				const tokenResponse = await fetch("/api/daily-token", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						roomId,
						userId: currentUser.uid,
						userName: currentUser.displayName || "Anonymous",
						userPhotoURL: currentUser.photoURL || "",
					}),
				});

				const tokenData = await tokenResponse.json();

				if (!tokenData.success) {
					throw new Error(tokenData.error || "Failed to get token");
				}

				// Initialize Daily call
				dailyRef.current = DailyIframe.createCallObject({
					showLeaveButton: true,
					showFullscreenButton: true,
					showLocalVideo: true,
					showParticipantsBar: true,
					theme: {
						accent: "#005fff",
						accentText: "#ffffff",
						background: "#1a1a1a",
						backgroundAccent: "#2d2d2d",
						baseText: "#ffffff",
						border: "#3d3d3d",
						mainAreaBg: "#1a1a1a",
						supportiveText: "#b3b3b3",
					},
				});

				// Set up event listeners
				dailyRef.current
					.on("joined-meeting", () => {
						setIsJoined(true);
						setIsLoading(false);
						// Sync with Firebase
						syncDailyRoomState(roomId, dailyRoomInfo);
						if (currentUserUid) {
							updateMemberDailyStatus(roomId, currentUserUid, true);
						}
					})
					.on("left-meeting", () => {
						setIsJoined(false);
						// Update Firebase status
						if (currentUserUid) {
							updateMemberDailyStatus(roomId, currentUserUid, false);
						}
						onCallEnd?.();
					})
					.on("participant-joined", (event) => {
						setParticipants((prev) => [...prev, event.participant]);
						// Update participant status in Firebase
						const participant = event.participant;
						if (participant.user_id) {
							updateMemberDailyStatus(roomId, participant.user_id, true);
						}
					})
					.on("participant-left", (event) => {
						setParticipants((prev) =>
							prev.filter((p) => p.user_id !== event.participant.user_id),
						);
						// Update participant status in Firebase
						const participant = event.participant;
						if (participant.user_id) {
							updateMemberDailyStatus(roomId, participant.user_id, false);
						}
					})
					.on("error", (event) => {
						setError(event.error);
						setIsLoading(false);
					});

				// Join the meeting
				await dailyRef.current.join({
					url: dailyRoomInfo.url,
					token: tokenData.token,
				});
			} catch (err) {
				console.error("Video call initialization error:", err);
				setError(err.message);
				setIsLoading(false);
			}
		};

		initializeCall();

		// Cleanup on unmount
		return () => {
			if (dailyRef.current) {
				dailyRef.current.destroy();
			}
			// End Daily room session in Firebase
			endDailyRoomSession(roomId);
		};
	}, [roomId, roomName, ownerUid, onCallEnd, currentUserUid]);

	const handleLeaveCall = () => {
		if (dailyRef.current) {
			dailyRef.current.leave();
		}
		// Update Firebase status when manually leaving
		if (currentUserUid) {
			updateMemberDailyStatus(roomId, currentUserUid, false);
		}
	};

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
				<div className="text-red-600 text-center">
					<p className="text-lg font-semibold mb-2">通話エラー</p>
					<p className="text-sm">{error}</p>
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

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<p className="text-gray-600">通話を開始しています...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full">
			<div className="relative">
				{/* Daily iframe will be rendered here */}
				<div
					ref={iframeRef}
					className="w-full h-96 rounded-lg overflow-hidden"
				></div>

				{/* Call controls overlay */}
				{isJoined && (
					<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
						<button
							type="button"
							onClick={handleLeaveCall}
							className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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
							<span
								key={participant.user_id}
								className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
							>
								{participant.user_name || "Anonymous"}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default VideoCallRoom;
