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
	const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
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
					
					// Daily.coの接続状態を詳細に確認
					console.log("🔍 Daily.co接続状態の詳細分析:");
					console.log("📊 接続状態:", {
						meetingState: callObject.meetingState(),
						participants: callObject.participants(),
						localAudio: callObject.localAudio(),
						localVideo: callObject.localVideo()
					});
					
					// 現在の参加者リストを更新
					const currentParticipants = callObject.participants();
					const participantMap = new Map();
					Object.entries(currentParticipants).forEach(([id, participant]) => {
						participantMap.set(id, participant);
						
						// ローカル参加者の音声トラック状態を確認
						if (participant.local) {
							console.log("🎤 ローカル参加者の音声状態:", {
								user_name: participant.user_name,
								audio: participant.audio,
								video: participant.video,
								local: participant.local
							});
							
							// ローカル参加者の音声状態を状態管理に反映
							setIsMicrophoneEnabled(participant.audio);
						}
					});
					setParticipants(participantMap);
					
					// 音声状態の定期監視を開始
					const audioStateMonitor = setInterval(() => {
						try {
							const participants = callObject.participants();
							const localParticipant = Object.values(participants).find(p => p.local);
							
							if (localParticipant && localParticipant.audio !== isMicrophoneEnabled) {
								console.log("🔄 音声状態の変更を検出:", {
									user_name: localParticipant.user_name,
									previousState: isMicrophoneEnabled,
									currentState: localParticipant.audio
								});
								setIsMicrophoneEnabled(localParticipant.audio);
							}
							
							// 参加者の状態を同期（UIの更新を確実にするため）
							setParticipants((prev) => {
								const newMap = new Map();
								Object.entries(participants).forEach(([id, participant]) => {
									newMap.set(id, participant);
								});
								
								// 前の状態と比較して変更があった場合のみ更新
								let hasChanges = false;
								if (prev.size !== newMap.size) {
									hasChanges = true;
								} else {
									for (const [id, participant] of newMap) {
										const prevParticipant = prev.get(id);
										if (!prevParticipant || 
											prevParticipant.audio !== participant.audio ||
											prevParticipant.video !== participant.video) {
											hasChanges = true;
											break;
										}
									}
								}
								
								return hasChanges ? newMap : prev;
							});
						} catch (error) {
							console.error("❌ 音声状態監視エラー:", error);
						}
					}, 2000);
					
					// クリーンアップ用のタイマーIDを保存
					callObject._audioStateMonitor = audioStateMonitor;
					
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
					
					// リモート参加者の音声状態を継続的に監視
					const monitorAudioState = (attempts = 0) => {
						if (attempts >= 15) {
							console.log("🔄 音声状態の監視を終了しました");
							return;
						}
						
						setTimeout(() => {
							try {
								const currentParticipants = callObject.participants();
								const currentParticipant = currentParticipants[event.participant.session_id];
								
								if (currentParticipant) {
									console.log(`🔍 音声状態チェック (${attempts + 1}/15):`, {
										user_name: currentParticipant.user_name,
										audio: currentParticipant.audio,
										video: currentParticipant.video,
										session_id: currentParticipant.session_id
									});
									
									// 音声が有効になった場合
									if (currentParticipant.audio) {
										console.log("✅ 参加者の音声が有効になりました！");
										
										// 音声トラックの詳細確認（Daily.coのtrack-startedイベントで処理される）
										console.log("🎵 音声トラックの詳細は track-started イベントで確認されます");
										
										return;
									}
									
									// まだ無効な場合、再試行
									if (attempts < 14) {
										monitorAudioState(attempts + 1);
									} else {
										console.log("💡 リモート参加者にマイクの許可を促してください");
										console.log("📋 確認事項:");
										console.log("   1. ブラウザのアドレスバー横のマイクアイコンをクリック");
										console.log("   2. マイクの許可を選択");
										console.log("   3. 他のアプリでマイクを使用していないか確認");
										console.log("   4. ブラウザを再起動してから再度試行");
									}
								}
							} catch (error) {
								console.error("❌ 音声状態監視エラー:", error);
								if (attempts < 14) {
									monitorAudioState(attempts + 1);
								}
							}
						}, 2000 * (attempts + 1)); // 試行間隔を徐々に増やす
					};
					
					// 音声状態の監視を開始
					monitorAudioState();
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
			.on("participant-updated", (event) => {
				console.log("🔄 Participant updated:", {
					session_id: event.participant.session_id,
					user_name: event.participant.user_name,
					audio: event.participant.audio,
					video: event.participant.video,
					local: event.participant.local
				});
				
				// 参加者の状態を更新
				setParticipants((prev) => {
					const newMap = new Map(prev);
					newMap.set(event.participant.session_id, event.participant);
					return newMap;
				});

				if (onParticipantUpdate) {
					onParticipantUpdate({
						type: "participant-updated",
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
					
					// 参加者の状態を更新してUIに反映
					if (event.participant) {
						setParticipants((prev) => {
							const newMap = new Map(prev);
							newMap.set(event.participant.session_id, event.participant);
							return newMap;
						});
					}
					
					// 音声トラックの安定性を監視
					setTimeout(() => {
						if (event.track && event.track.readyState === 'live') {
							console.log("✅ 音声トラックが安定しています:", {
								participant: event.participant?.user_name,
								trackId: event.track.id,
								readyState: event.track.readyState,
								enabled: event.track.enabled,
								muted: event.track.muted
							});
							
							// ローカル参加者の音声トラックの場合、追加の確認
							if (event.participant?.local) {
								console.log("🎤 ローカル音声トラックの詳細:", {
									trackId: event.track.id,
									enabled: event.track.enabled,
									muted: event.track.muted,
									readyState: event.track.readyState
								});
							}
						}
					}, 2000);
					
					// リモート参加者の音声トラックの場合、再生状況を確認
					if (!event.participant?.local) {
						console.log("🎧 リモート参加者の音声トラックが開始されました");
						
						// 音声トラックの有効化を確実に行う
						const ensureAudioEnabled = async (attempts = 0) => {
							if (attempts >= 10) {
								console.log("🔄 音声トラック有効化の最大試行回数に達しました");
								return;
							}
							
							try {
								// 現在の参加者情報を取得
								const currentParticipants = callObject.participants();
								const currentParticipant = currentParticipants[event.participant.session_id];
								
								if (currentParticipant) {
									console.log(`🔍 音声状態チェック (${attempts + 1}/10):`, {
										user_name: currentParticipant.user_name,
										audio: currentParticipant.audio,
										video: currentParticipant.video
									});
									
									// 音声が有効になった場合
									if (currentParticipant.audio) {
										console.log("✅ 参加者の音声が有効になりました！");
										
										// 音声トラックの詳細分析
										setTimeout(() => {
											try {
												console.log("🔍 音声トラックの詳細分析を開始...");
												console.log("📊 音声トラックのプロパティ:", {
													trackId: event.track.id,
													enabled: event.track.enabled,
													muted: event.track.muted,
													readyState: event.track.readyState,
													kind: event.track.kind,
													label: event.track.label,
													id: event.track.id
												});
												
												// 音声トラックの制約を確認（存在する場合のみ）
												if (event.track && typeof event.track.getConstraints === 'function') {
													try {
														const constraints = event.track.getConstraints();
														console.log("⚙️ 音声トラックの制約:", constraints);
													} catch (err) {
														console.log("⚙️ 制約の取得に失敗:", err);
													}
												}
												
												// 音声トラックの設定を確認（存在する場合のみ）
												if (event.track && typeof event.track.getSettings === 'function') {
													try {
														const settings = event.track.getSettings();
														console.log("🔧 音声トラックの設定:", settings);
													} catch (err) {
														console.log("🔧 設定の取得に失敗:", err);
													}
												}
												
												// 音声トラックの実際の音声データを監視
												if (event.track && event.track.readyState === 'live') {
													console.log("🎵 音声トラックが正常に動作しています");
													console.log("💡 もし音声が聞こえない場合：");
													console.log("   1. ブラウザの音量設定を確認");
													console.log("   2. システムの音量設定を確認");
													console.log("   3. ヘッドフォン/スピーカーの接続を確認");
													console.log("   4. 他のアプリで音声が再生されるかテスト");
												}
												
											} catch (error) {
												console.error("❌ 音声トラック分析エラー:", error);
											}
										}, 1000);
										
										return;
									}
									
									// まだ無効な場合、再試行
									if (attempts < 9) {
										setTimeout(() => {
											ensureAudioEnabled(attempts + 1);
										}, 2000 * (attempts + 1)); // 試行間隔を徐々に増やす
									} else {
										console.log("💡 リモート参加者にマイクの許可を促してください");
										console.log("📋 確認事項:");
										console.log("   1. ブラウザのアドレスバー横のマイクアイコンをクリック");
										console.log("   2. マイクの許可を選択");
										console.log("   3. 他のアプリでマイクを使用していないか確認");
									}
								}
							} catch (error) {
								console.error("❌ 音声状態監視エラー:", error);
								if (attempts < 9) {
									setTimeout(() => {
										ensureAudioEnabled(attempts + 1);
									}, 2000 * (attempts + 1));
								}
							}
						};
						
						// 音声有効化の監視を開始
						ensureAudioEnabled();
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
						
						// 音声トラックの再開を試行
						const tryRestartAudio = async (attempts = 0) => {
							if (attempts >= 3) {
								console.log("🔄 音声トラック再開の最大試行回数に達しました");
								return;
							}
							
							try {
								// 現在の参加者情報を取得
								const currentParticipants = callObject.participants();
								const currentParticipant = currentParticipants[event.participant.session_id];
								
								if (currentParticipant && currentParticipant.audio) {
									console.log("✅ 音声トラックが再開されました！");
									return;
								}
								
								// まだ停止している場合、再試行
								if (attempts < 2) {
									setTimeout(() => {
										tryRestartAudio(attempts + 1);
									}, 3000 * (attempts + 1));
								} else {
									console.log("💡 リモート参加者に以下を確認してもらってください：");
									console.log("   1. ネットワーク接続の安定性");
									console.log("   2. ブラウザのマイク許可設定");
									console.log("   3. 他のアプリでマイクを使用していないか");
								}
							} catch (error) {
								console.error("❌ 音声トラック再開エラー:", error);
								if (attempts < 2) {
									setTimeout(() => {
										tryRestartAudio(attempts + 1);
									}, 3000 * (attempts + 1));
								}
							}
						};
						
						// 音声トラック再開を試行
						tryRestartAudio();
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
					// トラブルシューティングガイドを表示
					showAudioTroubleshootingGuide();
				} else if (event.error?.includes("network") || event.error?.includes("connection")) {
					console.error("🌐 ネットワークエラー:", event.error);
					setError("ネットワーク接続に問題があります。インターネット接続を確認してください。");
				} else if (event.error?.includes("track") || event.error?.includes("audio")) {
					console.error("🎵 音声トラックエラー:", event.error);
					setError("音声トラックに問題があります。ページを再読み込みしてから再度試行してください。");
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

	// 音声トラブルシューティングガイドを表示
	const showAudioTroubleshootingGuide = useCallback(() => {
		console.log("🔧 音声通話トラブルシューティングガイド:");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("🎤 マイクの問題:");
		console.log("   1. ブラウザのアドレスバー横の🔒アイコンをクリック");
		console.log("   2. マイクの許可を「許可」に設定");
		console.log("   3. ページを再読み込み");
		console.log("");
		console.log("🔊 音声が聞こえない場合:");
		console.log("   1. システムの音量を確認");
		console.log("   2. ブラウザの音量を確認");
		console.log("   3. ヘッドフォン/スピーカーの接続を確認");
		console.log("   4. 他のアプリで音声が再生されるかテスト");
		console.log("");
		console.log("🌐 ネットワークの問題:");
		console.log("   1. インターネット接続を確認");
		console.log("   2. VPNを使用している場合は一時的に無効化");
		console.log("   3. ファイアウォール設定を確認");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	}, []);

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
					// 接続の安定性向上
					receiveSettings: {
						audio: {
							enabled: true,
							volume: 1.0
						}
					}
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

	// マイクの切り替え
	const toggleMicrophone = useCallback(async () => {
		if (!daily || !isJoined) return;

		try {
			const newState = !isMicrophoneEnabled;
			await daily.setLocalAudio(newState);
			setIsMicrophoneEnabled(newState);
			
			console.log(`🎤 マイクを${newState ? '有効化' : '無効化'}しました`);
			
			// 参加者の状態を即座に更新
			setParticipants((prev) => {
				const newMap = new Map(prev);
				const currentParticipants = daily.participants();
				Object.entries(currentParticipants).forEach(([id, participant]) => {
					newMap.set(id, participant);
				});
				return newMap;
			});
			
			// 音声状態の変更を他の参加者に確実に伝えるため、少し待ってから状態を再確認
			setTimeout(() => {
				try {
					const currentParticipants = daily.participants();
					const localParticipant = Object.values(currentParticipants).find(p => p.local);
					
					if (localParticipant) {
						console.log("🔄 マイク状態の再確認:", {
							user_name: localParticipant.user_name,
							audio: localParticipant.audio,
							local: localParticipant.local,
							expectedState: newState
						});
						
						// 状態が期待値と異なる場合は修正
						if (localParticipant.audio !== newState) {
							console.warn("⚠️ マイク状態の不整合を検出。修正を試行します。");
							daily.setLocalAudio(newState);
						}
						
						// 参加者の状態を再度更新
						setParticipants((prev) => {
							const newMap = new Map(prev);
							newMap.set(localParticipant.session_id, localParticipant);
							return newMap;
						});
					}
				} catch (error) {
					console.error("❌ マイク状態再確認エラー:", error);
				}
			}, 1000);
			
			return newState;
		} catch (err) {
			console.error("❌ マイク切り替えエラー:", err);
			throw err;
		}
	}, [daily, isJoined, isMicrophoneEnabled]);

	// クリーンアップ
	const destroyDaily = useCallback(() => {
		if (daily) {
			// 音声状態監視を停止
			if (daily._audioStateMonitor) {
				clearInterval(daily._audioStateMonitor);
				daily._audioStateMonitor = null;
			}
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
		isMicrophoneEnabled,
		joinRoom,
		leaveRoom,
		destroyDaily,
		toggleMicrophone,
		showAudioTroubleshootingGuide,
	};
};
