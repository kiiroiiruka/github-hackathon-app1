import DailyIframe from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUserUid } from "./useUserUid";

/**
 * Daily.co接続とセッション管理のカスタムフック
 */
export const useDailyConnection = (
	roomId,
	dailyRoomUrl,
	onParticipantUpdate,
) => {
	const [daily, setDaily] = useState(null);
	const [isJoined, setIsJoined] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [error, setError] = useState(null);
	const [participants, setParticipants] = useState(new Map());
	const [callDuration, setCallDuration] = useState(0);
	const callStartTimeRef = useRef(null);
	const durationIntervalRef = useRef(null);
	const currentUserUid = useUserUid();

	// 通話時間の更新
	const startDurationTimer = useCallback(() => {
		callStartTimeRef.current = Date.now();
		durationIntervalRef.current = setInterval(() => {
			if (callStartTimeRef.current) {
				const duration = Math.floor(
					(Date.now() - callStartTimeRef.current) / 1000,
				);
				setCallDuration(duration);
			}
		}, 1000);
	}, []);

	const stopDurationTimer = useCallback(() => {
		if (durationIntervalRef.current) {
			clearInterval(durationIntervalRef.current);
			durationIntervalRef.current = null;
		}
		callStartTimeRef.current = null;
	}, []);

	// Daily.coインスタンスの初期化
	const initializeDaily = useCallback(async () => {
		if (daily) {
			console.log("✅ Dailyインスタンスは既に存在します");
			return daily;
		}

		console.log("🚀 Daily.coインスタンスを初期化中...");

		try {
			const dailyInstance = DailyIframe.createCallObject({
				startAudioOff: false, // 音声を有効で開始（マイク許可を取得）
				startVideoOff: true, // ビデオは無効
				showLeaveButton: false,
				showFullscreenButton: false,
				showLocalVideo: false, // ローカルビデオは非表示
				showParticipantsBar: false, // 参加者バーは非表示
				// マイク許可の取得を確実にするための追加設定
				audioConfig: {
					enableMic: true,
					enableCam: false,
				},
			});

			console.log("✅ Dailyインスタンスが作成されました:", !!dailyInstance);

			// イベントリスナーの設定
			dailyInstance
				.on("joined-meeting", async (event) => {
					console.log("Joined meeting:", event);
					setIsJoined(true);
					setIsConnecting(false);
					setError(null);
					startDurationTimer();

					// 音声を確実に有効にする
					try {
						await dailyInstance.setLocalAudio(true);
						console.log("🎤 音声を有効にしました");
						
						// マイクの状態を確認
						const audioState = dailyInstance.localAudio();
						console.log("🎤 マイク状態:", audioState ? "ON" : "OFF");
						
						if (!audioState) {
							console.warn("⚠️ マイクが無効になっています");
							setError("マイクが無効になっています。ブラウザの設定でマイクを許可してください。");
						}
					} catch (audioError) {
						console.warn("音声の有効化に失敗:", audioError);
						setError("マイクの初期化に失敗しました。ブラウザの設定を確認してください。");
					}

					// 現在の参加者リストを更新
					const currentParticipants = dailyInstance.participants();
					const participantMap = new Map();
					Object.entries(currentParticipants).forEach(([id, participant]) => {
						participantMap.set(id, participant);
					});
					setParticipants(participantMap);
				})
			.on("left-meeting", (event) => {
				console.log("Left meeting:", event);
				setIsJoined(false);
				setIsConnecting(false);
				stopDurationTimer();
				setParticipants(new Map());

				if (onParticipantUpdate) {
					onParticipantUpdate({
						type: "user-left",
						userId: currentUserUid,
						duration: callDuration,
					});
				}
			})
			.on("participant-joined", (event) => {
				console.log("Participant joined:", event);
				setParticipants((prev) => {
					const newMap = new Map(prev);
					newMap.set(event.participant.session_id, event.participant);
					return newMap;
				});

				if (onParticipantUpdate) {
					onParticipantUpdate({
						type: "participant-joined",
						participant: event.participant,
					});
				}
			})
			.on("participant-left", (event) => {
				console.log("Participant left:", event);
				setParticipants((prev) => {
					const newMap = new Map(prev);
					newMap.delete(event.participant.session_id);
					return newMap;
				});

				if (onParticipantUpdate) {
					onParticipantUpdate({
						type: "participant-left",
						participant: event.participant,
					});
				}
			})
			.on("camera-error", (event) => {
				console.warn("Camera error (expected for audio-only):", event);
				// カメラエラーは音声のみモードでは無視
			})
			.on("error", (event) => {
				if (
					event.error?.includes("microphone") ||
					event.error?.includes("audio")
				) {
					console.error("マイクエラー:", event.error);
					setError(
						"マイクのアクセス許可が必要です。ブラウザの設定でマイクを許可してください。",
					);
				} else {
					console.error("Daily error:", event);
					setError(event.error);
				}
				setIsConnecting(false);
				stopDurationTimer();
			})
			.on("call-instance-destroyed", () => {
				console.log("Call instance destroyed");
				setDaily(null);
				setIsJoined(false);
				setIsConnecting(false);
				stopDurationTimer();
				setParticipants(new Map());
			});

			setDaily(dailyInstance);
			return dailyInstance;
		} catch (error) {
			console.error("❌ Dailyインスタンスの初期化に失敗:", error);
			setError(`Dailyライブラリの初期化に失敗しました: ${error.message}`);
			throw error;
		}
	}, [
		daily,
		startDurationTimer,
		stopDurationTimer,
		onParticipantUpdate,
		currentUserUid,
	]);

	// マイク許可を要求
	const requestMicrophonePermission = useCallback(async () => {
		try {
			console.log("🎤 マイクの許可を要求しています...");
			
			// getUserMediaを使って明示的にマイク許可を要求
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false
			});
			
			console.log("✅ マイクの許可が得られました");
			
			// ストリームを停止（許可を得るためだけに使用）
			stream.getTracks().forEach(track => track.stop());
			
			return true;
		} catch (error) {
			console.error("❌ マイクの許可が得られませんでした:", error);
			
			if (error.name === 'NotAllowedError') {
				setError("マイクのアクセスが拒否されました。ブラウザの設定でマイクを許可してください。");
			} else if (error.name === 'NotFoundError') {
				setError("マイクが見つかりません。マイクが接続されているか確認してください。");
			} else if (error.name === 'NotReadableError') {
				setError("マイクが他のアプリケーションで使用中です。他のアプリケーションを閉じてから再試行してください。");
			} else {
				setError(`マイクエラー: ${error.message}`);
			}
			
			return false;
		}
	}, []);

	// ルームに参加
	const joinRoom = useCallback(
		async (token, roomUrl = null) => {
			const urlToUse = roomUrl || dailyRoomUrl;
			if (!urlToUse || isConnecting || isJoined) {
				console.log("🚫 joinRoom skipped:", { urlToUse: !!urlToUse, isConnecting, isJoined });
				return;
			}

			try {
				console.log("🎤 マイク許可を要求しています...");
				setIsConnecting(true);
				setError(null);

				// まず明示的にマイクの許可を要求
				const micPermissionGranted = await requestMicrophonePermission();
				if (!micPermissionGranted) {
					console.log("❌ マイク許可が得られませんでした");
					setIsConnecting(false);
					return;
				}

				console.log("✅ マイク許可が得られました。Daily.coに接続中...");
				const dailyInstance = await initializeDaily();

				console.log("🚀 Daily.coルームに参加中:", { url: urlToUse, token: token.substring(0, 20) + "..." });
				await dailyInstance.join({
					url: urlToUse,
					token: token,
					startAudioOff: false, // 音声を有効で開始（マイク許可を取得）
					startVideoOff: true, // ビデオは無効
				});
			} catch (err) {
				console.error("❌ Failed to join room:", err);
				setError(err.message);
				setIsConnecting(false);
			}
		},
		[dailyRoomUrl, isConnecting, isJoined, initializeDaily, requestMicrophonePermission],
	);

	// ルームから退出
	const leaveRoom = useCallback(async () => {
		if (!daily || !isJoined) return;

		try {
			await daily.leave();
		} catch (err) {
			console.error("Failed to leave room:", err);
		}
	}, [daily, isJoined]);

	// クリーンアップ
	const destroyDaily = useCallback(() => {
		if (daily) {
			daily.destroy();
		}
		stopDurationTimer();
	}, [daily, stopDurationTimer]);

	// コンポーネントのアンマウント時のクリーンアップ
	useEffect(() => {
		return () => {
			destroyDaily();
		};
	}, [destroyDaily]);

	// 通話時間をフォーマット
	const formatDuration = useCallback((seconds) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`;
	}, []);

	return {
		daily,
		isJoined,
		isConnecting,
		error,
		participants: Array.from(participants.values()),
		callDuration,
		formattedDuration: formatDuration(callDuration),
		joinRoom,
		leaveRoom,
		destroyDaily,
	};
};
