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

	// イベントリスナーの設定
	const setupEventListeners = useCallback((callObject) => {
		callObject
			.on("joined-meeting", async (event) => {
				console.log("🎉 Joined meeting:", event);
				setIsJoined(true);
				setIsConnecting(false);
				setError(null);
				startDurationTimer();
				
				// 参加成功をログに記録
				console.log("✅ Daily.coルームに正常に参加しました");

				// 音声トラックの確実な初期化
				try {
					// 音声を明示的に有効化
					await callObject.setLocalAudio(true);
					console.log("🎤 通話開始時は音声有効状態で開始");
					
					// 音声トラックの状態を確認
					const audioTrack = callObject.getLocalAudioTrack();
					if (audioTrack) {
						console.log("🎤 ローカル音声トラックの状態:", {
							enabled: audioTrack.enabled,
							muted: audioTrack.muted,
							readyState: audioTrack.readyState
						});
					}
					
					// 現在の参加者リストを更新
					const currentParticipants = callObject.participants();
					const participantMap = new Map();
					Object.entries(currentParticipants).forEach(([id, participant]) => {
						participantMap.set(id, participant);
					});
					setParticipants(participantMap);
					
				} catch (audioError) {
					console.warn("音声の有効化に失敗:", audioError);
					setError("マイクの初期化に失敗しました。ブラウザの設定を確認してください。");
				}
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
					
					// リモート参加者の音声を有効にする試み
					setTimeout(() => {
						try {
							console.log("🔄 リモート参加者の音声を有効にしようとしています...");
							// 注意: リモート参加者の音声は直接制御できません
							// これは参加者自身がマイクを許可する必要があります
							console.log("💡 リモート参加者にマイクの許可を促してください");
						} catch (error) {
							console.error("❌ リモート参加者の音声有効化エラー:", error);
						}
					}, 3000);
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
					
					// 音声トラックの安定性を監視
					setTimeout(() => {
						if (event.track && event.track.readyState === 'live') {
							console.log("✅ 音声トラックが安定しています:", {
								participant: event.participant?.user_name,
								trackId: event.track.id,
								readyState: event.track.readyState
							});
						}
					}, 2000);
					
					// リモート参加者の音声トラックの場合、再生状況を確認
					if (!event.participant?.local) {
						console.log("🎧 リモート参加者の音声トラックが開始されました");
						
						// 音声トラックが無効な場合の対処法
						if (!event.track.enabled) {
							console.warn("⚠️ リモート参加者の音声トラックが無効です");
							console.warn("💡 相手に以下を確認してもらってください：");
							console.warn("   1. ブラウザでマイクの許可を確認");
							console.warn("   2. マイクが他のアプリで使用されていないか確認");
							console.warn("   3. ブラウザの音声設定を確認");
							
							// 音声トラックの有効化を試行（3秒後に再試行）
							setTimeout(() => {
								try {
									console.log("🔄 リモート参加者の音声トラックを有効化しようとしています...");
									// 注意: リモート参加者の音声は直接制御できません
									// これは参加者自身がマイクを許可する必要があります
									console.log("💡 リモート参加者にマイクの許可を促してください");
								} catch (error) {
									console.error("❌ リモート参加者の音声有効化エラー:", error);
								}
							}, 3000);
						} else {
							console.log("✅ リモート参加者の音声トラックが有効です");
							console.log("💡 もし音声が聞こえない場合：");
							console.log("   1. ブラウザの音量設定を確認");
							console.log("   2. システムの音量設定を確認");
							console.log("   3. ヘッドフォン/スピーカーの接続を確認");
						}
					}
				}
			})
			.on("track-stopped", (event) => {
				console.log("🔇 Track stopped:", {
					participant: event.participant?.user_name || "Unknown",
					track: event.track?.kind || "Unknown",
					local: event.participant?.local || false
				});
				
				// 音声トラックが停止した場合の詳細情報
				if (event.track?.kind === 'audio') {
					console.warn("⚠️ 音声トラックが停止しました:", {
						participant: event.participant?.user_name,
						trackId: event.track.id,
						reason: event.track.readyState,
						local: event.participant?.local
					});
					
					if (!event.participant?.local) {
						console.warn("💡 リモート参加者の音声が停止しました。ネットワーク接続を確認してください。");
					}
				}
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
	}, [
		startDurationTimer,
		stopDurationTimer,
		onParticipantUpdate,
		currentUserUid,
	]);

	// Daily.coインスタンスの初期化（簡素化）
	const initializeDaily = useCallback(async () => {
		if (daily) {
			console.log("✅ Dailyインスタンスは既に存在します");
			return daily;
		}

		console.log("🚀 Daily.coインスタンスを初期化中...");
		// 実際のcallObject作成はjoinRoomで行う
		return null;
	}, [daily]);

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
				console.log("🚀 ルームに参加を開始します:", { roomUrl: urlToUse, token: token.substring(0, 20) + "..." });
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

				console.log("🚀 Daily.coルームに参加中:", { url: urlToUse, token: token.substring(0, 20) + "..." });
				
				// Daily.coの正しい設定（音声トラック安定性を重視）
				const callObject = DailyIframe.createCallObject({
					url: urlToUse,
					token: token,
					startAudioOff: false,
					startVideoOff: true,
					showLeaveButton: false,
					showFullscreenButton: false,
					// 音声トラックの安定性を向上させる設定
					audioSource: true,
					videoSource: false,
				});
				
				// Dailyインスタンスを設定
				setDaily(callObject);
				
				// イベントリスナーを設定
				setupEventListeners(callObject);
				
				// 参加
				await callObject.join();
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
