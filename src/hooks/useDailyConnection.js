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
				// 音声とビデオの初期設定
				audioSource: true, // 音声ソースを有効
				videoSource: false, // ビデオソースを無効
			});

			console.log("✅ Dailyインスタンスが作成されました:", !!dailyInstance);

			// イベントリスナーの設定
			dailyInstance
			.on("joined-meeting", async (event) => {
				console.log("🎉 Joined meeting:", event);
				setIsJoined(true);
				setIsConnecting(false);
				setError(null);
				startDurationTimer();
				
				// 参加成功をログに記録
				console.log("✅ Daily.coルームに正常に参加しました");

					// 音声を確実に有効にする
					try {
						// まず現在の音声状態を確認
						const initialAudioState = dailyInstance.localAudio();
						console.log("🎤 参加時の初期マイク状態:", initialAudioState ? "ON" : "OFF");
						
						// 音声を強制的に有効にする
						await dailyInstance.setLocalAudio(true);
						console.log("🎤 音声を有効にしました");
						
						// 少し待ってから状態を再確認
						setTimeout(async () => {
							try {
								const audioState = dailyInstance.localAudio();
								console.log("🎤 マイク状態（1秒後）:", audioState ? "ON" : "OFF");
								
								// 参加者情報も確認
								const participants = dailyInstance.participants();
								console.log("👥 現在の参加者:", Object.keys(participants).length, "人");
								
								// 各参加者の音声状態を確認
								Object.entries(participants).forEach(([id, participant]) => {
									console.log(`👤 参加者 ${id}:`, {
										user_name: participant.user_name,
										audio: participant.audio,
										video: participant.video,
										local: participant.local
									});
								});
								
								if (!audioState) {
									console.warn("⚠️ マイクが無効になっています");
									setError("マイクが無効になっています。ブラウザの設定でマイクを許可してください。");
								} else {
									console.log("✅ マイクが正常に有効になっています");
								}
							} catch (checkError) {
								console.error("❌ 音声状態確認エラー:", checkError);
							}
						}, 1000);
						
						// 音声レベルの監視を開始（5秒後）
						setTimeout(() => {
							try {
								console.log("🔊 音声レベル監視を開始します...");
								
								// 参加者の音声レベルを確認
								const participants = dailyInstance.participants();
								Object.entries(participants).forEach(([id, participant]) => {
									if (participant.audioTrack) {
										console.log(`🎤 ${participant.user_name}の音声トラック:`, {
											enabled: participant.audioTrack.enabled,
											muted: participant.audioTrack.muted,
											readyState: participant.audioTrack.readyState
										});
									}
								});
								
								// ローカルの音声レベルも確認
								const localAudioTrack = dailyInstance.localAudio();
								console.log("🎤 ローカル音声レベル:", localAudioTrack);
								
							} catch (levelError) {
								console.error("❌ 音声レベル確認エラー:", levelError);
							}
						}, 5000);
						
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
				console.log("👥 Participant joined:", {
					session_id: event.participant.session_id,
					user_name: event.participant.user_name,
					audio: event.participant.audio,
					video: event.participant.video,
					local: event.participant.local
				});
				
				// 参加者の音声がオフの場合は警告を表示
				if (!event.participant.local && !event.participant.audio) {
					console.warn("⚠️ 参加者の音声がオフです:", event.participant.user_name);
					console.warn("💡 参加者がブラウザでマイクを許可していない可能性があります");
				}
				
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
			.on("track-started", (event) => {
				console.log("🎵 Track started:", {
					participant: event.participant?.user_name || "Unknown",
					track: event.track?.kind || "Unknown",
					local: event.participant?.local || false
				});
				
				// 音声トラックの場合、詳細情報をログ出力
				if (event.track?.kind === 'audio') {
					console.log("🔊 Audio track details:", {
						participant: event.participant?.user_name,
						trackId: event.track.id,
						enabled: event.track.enabled,
						muted: event.track.muted,
						readyState: event.track.readyState
					});
					
					// リモート参加者の音声トラックの場合、再生状況を確認
					if (!event.participant?.local) {
						console.log("🎧 リモート参加者の音声トラックが開始されました");
						console.log("💡 もし音声が聞こえない場合：");
						console.log("   1. ブラウザの音量設定を確認");
						console.log("   2. システムの音量設定を確認");
						console.log("   3. ヘッドフォン/スピーカーの接続を確認");
					}
				}
			})
			.on("track-stopped", (event) => {
				console.log("🔇 Track stopped:", {
					participant: event.participant?.user_name || "Unknown",
					track: event.track?.kind || "Unknown",
					local: event.participant?.local || false
				});
			})
			.on("error", (event) => {
				console.error("❌ Daily.co エラー:", event);
				
				if (
					event.error?.includes("microphone") ||
					event.error?.includes("audio") ||
					event.error?.includes("NotAllowedError")
				) {
					console.error("🎤 マイクエラー:", event.error);
					setError(
						"マイクのアクセス許可が必要です。ブラウザの設定でマイクを許可してください。",
					);
				} else if (event.error?.includes("network") || event.error?.includes("connection")) {
					console.error("🌐 ネットワークエラー:", event.error);
					setError("ネットワーク接続に問題があります。インターネット接続を確認してください。");
				} else {
					console.error("🔧 Daily.co エラー:", event.error);
					setError(`通話エラー: ${event.error}`);
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
