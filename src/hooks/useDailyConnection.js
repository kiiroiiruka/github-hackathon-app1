import DailyIframe from "@daily-co/daily-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserUid } from "./useUserUid";

/**
 * Daily.co接続とセッション管理のカスタムフック
 */
export const useDailyConnection = (
	roomId,
	dailyRoomUrl,
	onParticipantUpdate,
	members = [],
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
	const participantUpdateTimeoutRef = useRef(null);

	// メンバーデータからphotoURLを取得する関数（useMemoで安定化）
	const photoURLMap = useMemo(() => {
		const map = new Map();
		
		// members配列からphotoURLマップを作成
		members.forEach(member => {
			if (member.name && member.uid) {
				// 名前とUIDの両方でマッピング
				map.set(member.name, member.photoURL);
				map.set(member.uid, member.photoURL);
			}
		});
		
		console.log("🖼️ photoURLマップを更新:", {
			membersCount: members.length,
			mapSize: map.size,
			members: members.map(m => ({ name: m.name, uid: m.uid, photoURL: m.photoURL }))
		});
		
		return map;
	}, [members]);

	const getMemberPhotoURL = useCallback((userName, uid) => {
		console.log("🔍 getMemberPhotoURL呼び出し:", {
			userName,
			uid,
			mapSize: photoURLMap.size
		});
		
		// まず名前で検索
		let photoURL = photoURLMap.get(userName);
		
		// 名前で見つからない場合はUIDで検索
		if (!photoURL && uid) {
			photoURL = photoURLMap.get(uid);
		}
		
		console.log("🔍 getMemberPhotoURL結果:", {
			userName,
			uid,
			foundPhotoURL: !!photoURL,
			photoURL: photoURL
		});
		
		// メンバーが見つからない場合は、デフォルトのアバターURLを返す
		if (!photoURL && userName) {
			// FirebaseドキュメントIDのような長い文字列の場合は、より短い表示名を使用
			let displayName = userName;
			if (userName.length > 20 || /^[a-zA-Z0-9_-]{20,}$/.test(userName)) {
				// 長いIDのような文字列の場合は、最初の文字を使用
				displayName = userName.charAt(0).toUpperCase();
				console.log("🖼️ 長いID文字列を検出、短縮表示名を使用:", { userName, displayName });
			}
			
			console.log("🖼️ メンバーが見つからないため、デフォルトアバターを使用:", { userName, displayName });
			return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=96`;
		}
		
		return photoURL;
	}, [photoURLMap]);

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

	// 参加者の状態更新をデバウンスする関数
	const debouncedParticipantUpdate = useCallback((participantData, delay = 100) => {
		// 既存のタイムアウトをクリア
		if (participantUpdateTimeoutRef.current) {
			clearTimeout(participantUpdateTimeoutRef.current);
		}
		
		// 新しいタイムアウトを設定
		participantUpdateTimeoutRef.current = setTimeout(() => {
			setParticipants((prev) => {
				const newMap = new Map(prev);
				// 既存の参加者のみ更新（新しい参加者は追加しない）
				if (newMap.has(participantData.session_id)) {
					const existingParticipant = newMap.get(participantData.session_id);
					
					// 既存のphotoURLを保持し、新しいphotoURLが取得できる場合はそれを使用
					let photoURL = existingParticipant?.photoURL;
					
					// 既存のphotoURLがない場合のみ、新しいphotoURLを取得
					if (!photoURL || photoURL === "" || photoURL === null) {
						// ローカル参加者の場合は特別処理
						if (participantData.local && currentUserUid) {
							photoURL = getMemberPhotoURL(participantData.user_name, currentUserUid);
						} else {
							photoURL = getMemberPhotoURL(participantData.user_name, participantData.session_id);
						}
						
						// 生成されたアイコンが返された場合は、既存のphotoURLを保持
						if (photoURL && photoURL.includes("ui-avatars.com")) {
							console.log("🔄 生成されたアイコンが返されたため、既存のphotoURLを保持:", {
								user_name: participantData.user_name,
								existingPhotoURL: existingParticipant?.photoURL
							});
							photoURL = existingParticipant?.photoURL || null;
						}
					}
					
					const participantWithPhoto = {
						...participantData,
						photoURL: photoURL
					};
					
					newMap.set(participantData.session_id, participantWithPhoto);
					console.log(`🔄 デバウンス: 参加者 ${participantData.user_name} の状態を更新しました`, {
						audio: participantData.audio,
						photoURL: photoURL,
						keptExistingPhotoURL: !!existingParticipant?.photoURL,
						isLocal: participantData.local
					});
				}
				return newMap;
			});
		}, delay);
	}, [getMemberPhotoURL, currentUserUid]);

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

				// ローカル参加者のデータにphotoURLを追加
				setParticipants((prev) => {
					const newMap = new Map(prev);
					// 既存の参加者データを更新
					for (const [sessionId, participant] of newMap) {
						if (participant.local) {
							newMap.set(sessionId, {
								...participant,
								photoURL: getMemberPhotoURL(participant.user_name, sessionId)
							});
						}
					}
					return newMap;
				});

				// 音声トラックの確実な初期化
				try {
				// 音声を明示的に有効化
				await callObject.setLocalAudio(true);
				console.log("🎤 通話開始時は音声有効状態で開始");
				
				// 設定後の状態を確認して、実際の状態に合わせて内部状態を更新
				setTimeout(() => {
					const actualAudioState = callObject.localAudio();
					console.log("🔍 setLocalAudio(true)後の状態確認:", {
						dailyLocalAudio: actualAudioState,
						participants: callObject.participants(),
						timestamp: new Date().toISOString()
					});
					
					// Daily.coの実際の状態に合わせて内部状態を更新
					setIsMicrophoneEnabled(actualAudioState);
					console.log("🎤 マイク状態をDaily.coの実際の状態に合わせて更新:", actualAudioState);
				}, 100);
					
					// 音声状態の変化を詳細に監視
					console.log("🔍 音声状態監視を開始 - 初期状態:", {
						dailyLocalAudio: callObject.localAudio(),
						stateMicrophoneEnabled: true,
						participants: Object.keys(callObject.participants()).length
					});
					
					// 音声出力の確認と設定
					try {
						// 音声出力デバイスの確認
						if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
							const devices = await navigator.mediaDevices.enumerateDevices();
							const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
							console.log("🔊 利用可能な音声出力デバイス:", audioOutputs.length);
						}
						
						// Daily.coの音声要素を確実に作成・設定
						setTimeout(() => {
							const audioElements = document.querySelectorAll('audio');
							console.log(`🎵 Daily.co音声要素数: ${audioElements.length}`);
							
							// 音声要素が存在しない場合は手動で作成
							if (audioElements.length === 0) {
								console.log("🔧 音声要素が存在しないため、手動で作成します");
								
								// 現在の参加者を確認
								const currentParticipants = callObject.participants();
								Object.values(currentParticipants).forEach(participant => {
									if (!participant.local && participant.audio) {
										console.log(`🎧 参加者 ${participant.user_name} の音声要素を作成中...`);
										
										// 音声要素を作成
										const audioElement = document.createElement('audio');
										audioElement.setAttribute('data-participant', participant.session_id);
										audioElement.setAttribute('data-user-name', participant.user_name);
										audioElement.autoplay = true;
										audioElement.muted = false;
										audioElement.volume = 1.0;
										audioElement.style.display = 'none';
										
										// Daily.coの音声トラックを取得
										try {
											const remoteTracks = callObject.getRemoteAudioTracks();
											const participantTrack = remoteTracks.find(track => 
												track && track.participantId === participant.session_id
											);
											
											if (participantTrack) {
												const mediaStream = new MediaStream([participantTrack]);
												audioElement.srcObject = mediaStream;
												document.body.appendChild(audioElement);
												
												audioElement.play().catch(error => {
													console.warn(`⚠️ 参加者 ${participant.user_name} の音声再生に失敗:`, error);
												});
												
												console.log(`✅ 参加者 ${participant.user_name} の音声要素を作成しました`);
											}
										} catch (error) {
											console.error(`❌ 参加者 ${participant.user_name} の音声要素作成エラー:`, error);
										}
									}
								});
							}
							
							// 既存の音声要素の設定を最適化
							const updatedAudioElements = document.querySelectorAll('audio');
							updatedAudioElements.forEach((audio, index) => {
								console.log(`🎵 音声要素 ${index + 1}:`, {
									src: audio.src || 'MediaStream',
									muted: audio.muted,
									volume: audio.volume,
									paused: audio.paused,
									autoplay: audio.autoplay,
									participant: audio.getAttribute('data-participant')
								});
								
								// 音声要素の設定を最適化
								audio.muted = false;
								audio.volume = 1.0;
								audio.autoplay = true;
								
								// 音声の再生を試行
								if (audio.paused) {
									audio.play().catch(error => {
										console.warn("⚠️ 音声の自動再生が制限されています:", error);
									});
								}
							});
						}, 1000);
						
						console.log("🔊 音声出力設定を完了しました");
					} catch (audioError) {
						console.warn("⚠️ 音声出力設定エラー:", audioError);
					}
					
					// Daily.coの接続状態を詳細に確認
					console.log("🔍 Daily.co接続状態の詳細分析:");
					console.log("📊 接続状態:", {
						meetingState: callObject.meetingState(),
						participants: callObject.participants(),
						localAudio: callObject.localAudio(),
						localVideo: callObject.localVideo()
					});
					
					// 現在の参加者リストを更新（重複を防ぐ）
					const currentParticipants = callObject.participants();
					console.log("🔍 joined-meeting時の参加者データ:", {
						participants: currentParticipants,
						participantCount: Object.keys(currentParticipants).length
					});
					
					// 参加者リストを確実に更新
					const participantMap = new Map();
					Object.entries(currentParticipants).forEach(([id, participant]) => {
						console.log("🔍 joined-meeting参加者処理:", {
							id,
							user_name: participant.user_name,
							session_id: participant.session_id,
							local: participant.local
						});
						
						// photoURLを追加（ローカル参加者の場合は特別処理）
						let photoURL = getMemberPhotoURL(participant.user_name, participant.session_id);
						
						// ローカル参加者でphotoURLが見つからない場合は、currentUserUidを使用して再試行
						if (!photoURL && participant.local && currentUserUid) {
							console.log("🖼️ ローカル参加者のphotoURLが見つからないため、currentUserUidで再試行:", {
								user_name: participant.user_name,
								session_id: participant.session_id,
								currentUserUid: currentUserUid
							});
							photoURL = getMemberPhotoURL(participant.user_name, currentUserUid);
						}
						
						const participantWithPhoto = {
							...participant,
							photoURL: photoURL
						};
						
						console.log("🔍 参加者にphotoURLを追加:", {
							user_name: participant.user_name,
							photoURL: photoURL,
							local: participant.local
						});
						
						participantMap.set(id, participantWithPhoto);
						
						// ローカル参加者の音声トラック状態を確認
						if (participant.local) {
							console.log("🎤 ローカル参加者の音声状態:", {
								user_name: participant.user_name,
								audio: participant.audio,
								video: participant.video,
								local: participant.local,
								session_id: id
							});
							
							// ローカル参加者の音声状態を状態管理に反映
							// ただし、初期接続時は明示的にtrueに設定済みなので、実際の状態と異なる場合のみ更新
							if (participant.audio !== isMicrophoneEnabled) {
								console.log("🔄 ローカル参加者の音声状態を更新:", {
									previousState: isMicrophoneEnabled,
									newState: participant.audio,
									session_id: id
								});
								setIsMicrophoneEnabled(participant.audio);
							}
						}
					});
					
					console.log("👥 参加者リストを更新:", {
						totalParticipants: participantMap.size,
						participantIds: Array.from(participantMap.keys())
					});
					
					setParticipants(participantMap);
					
					// 音声状態の定期監視を開始（頻度を下げてログを削減）
					const audioStateMonitor = setInterval(() => {
						try {
							const participants = callObject.participants();
							const localParticipant = Object.values(participants).find(p => p.local);
							
							if (localParticipant) {
								// 音声状態の不一致がある場合のみログ出力
								if (localParticipant.audio !== isMicrophoneEnabled) {
									console.log("🚨 音声状態の不一致を検出！修正します:", {
										user_name: localParticipant.user_name,
										previousState: isMicrophoneEnabled,
										currentState: localParticipant.audio,
										timeSinceStart: callDuration
									});
									setIsMicrophoneEnabled(localParticipant.audio);
								}
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
				
				// リモート参加者の場合、Firebaseのmembersデータを更新
				if (!event.participant.local && roomId && currentUserUid) {
					console.log("🔥 リモート参加者のFirebase membersデータを更新:", {
						user_name: event.participant.user_name,
						session_id: event.participant.session_id,
						photoURL: event.participant.photoURL,
						roomId: roomId
					});
					
					// Firebaseのmembersデータを更新
					import("firebase/database").then(({ ref, update, get }) => {
						const memberRef = ref(rtdb, `rooms/${roomId}/members/${event.participant.session_id}`);
						
						// 既存のメンバーデータを取得してphotoURLを保持
						get(memberRef).then((snapshot) => {
							const existingData = snapshot.val();
							let photoURL = event.participant.photoURL;
							
							// Daily.coからphotoURLが取得できない場合は、既存のphotoURLを使用
							if (!photoURL && existingData && existingData.photoURL) {
								photoURL = existingData.photoURL;
								console.log("🖼️ 既存のphotoURLを使用:", photoURL);
							}
							
							// 既存のphotoURLもない場合は、Google認証から取得を試行
							if (!photoURL || photoURL === "" || photoURL === null) {
								console.log("🔄 Google認証からphotoURLを取得を試行:", {
									user_name: event.participant.user_name,
									session_id: event.participant.session_id
								});
								
								// ユーザー名からGoogle認証のphotoURLを推測（実際の実装では、より確実な方法が必要）
								// ここでは、参加者の名前が既知のユーザーと一致する場合の処理
								// 実際のアプリケーションでは、ユーザーIDとGoogle認証のマッピングが必要
							}
							
							update(memberRef, {
								name: event.participant.user_name,
								uid: event.participant.session_id,
								photoURL: photoURL || null,
								accepted: true,
								joinedAt: Date.now()
							}).then(() => {
								console.log("✅ リモート参加者のFirebase membersデータを更新完了:", {
									photoURL: photoURL
								});
							}).catch((error) => {
								console.error("❌ リモート参加者のFirebase membersデータ更新エラー:", error);
							});
						}).catch((error) => {
							console.error("❌ 既存メンバーデータ取得エラー:", error);
							// エラーの場合は、photoURLなしで更新
							update(memberRef, {
								name: event.participant.user_name,
								uid: event.participant.session_id,
								photoURL: event.participant.photoURL || null,
								accepted: true,
								joinedAt: Date.now()
							});
						});
					});
				}
				
				// 参加者を即座に状態管理に追加（photoURLを含む）
				setParticipants((prev) => {
					const newMap = new Map(prev);
					
					console.log("🔍 participant-joined参加者処理:", {
						user_name: event.participant.user_name,
						session_id: event.participant.session_id,
						local: event.participant.local
					});
					
					// まず参加者を追加（photoURLは後で更新）
					const participantWithPhoto = {
						...event.participant,
						photoURL: event.participant.photoURL || null
					};
					
					newMap.set(event.participant.session_id, participantWithPhoto);
					
					// photoURLを取得して更新
					const photoURL = getMemberPhotoURL(event.participant.user_name, event.participant.session_id);
					if (photoURL) {
						setParticipants((prev) => {
							const newMap = new Map(prev);
							const existingParticipant = newMap.get(event.participant.session_id);
							if (existingParticipant) {
								newMap.set(event.participant.session_id, {
									...existingParticipant,
									photoURL: photoURL
								});
							}
							return newMap;
						});
						
						console.log("🔍 participant-joined参加者にphotoURLを追加:", {
							user_name: event.participant.user_name,
							photoURL: photoURL,
							local: event.participant.local
						});
					}
					
					return newMap;
				});

				// リモート参加者の音声状態を監視（初期状態に関係なく）
				if (!event.participant.local) {
					console.log("🔍 リモート参加者の音声状態を監視開始:", event.participant.user_name);
					
					// 音声状態の監視（より短い間隔で）
					const monitorAudioState = (attempts = 0) => {
						if (attempts >= 10) {
							console.log("🔄 音声状態の監視を終了しました");
							return;
						}
						
						setTimeout(() => {
							try {
								const currentParticipants = callObject.participants();
								const currentParticipant = currentParticipants[event.participant.session_id];
								
								if (currentParticipant) {
									console.log(`🔍 音声状態チェック (${attempts + 1}/10):`, {
										user_name: currentParticipant.user_name,
										audio: currentParticipant.audio,
										video: currentParticipant.video,
										session_id: currentParticipant.session_id
									});
									
									// 参加者の状態を更新（デバウンスを使用して一瞬の重複を防ぐ）
									// 既存のphotoURLを保持して参加者データを更新
									debouncedParticipantUpdate(currentParticipant, 100);
									
									// 音声が有効になった場合
									if (currentParticipant.audio) {
										console.log("✅ 参加者の音声が有効になりました！");
										
										// 音声要素の確認
										setTimeout(() => {
											const audioElements = document.querySelectorAll('audio');
											console.log(`🎵 音声要素数: ${audioElements.length}`);
											
											audioElements.forEach((audio, index) => {
												if (!audio.muted && audio.volume > 0) {
													console.log(`🔊 音声要素 ${index + 1} は正常に設定されています`);
												}
											});
										}, 500);
										
										return;
									}
									
									// まだ無効な場合、再試行
									if (attempts < 9) {
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
								if (attempts < 9) {
									monitorAudioState(attempts + 1);
								}
							}
						}, 1000); // より短い間隔で監視
					};
					
					// 音声状態の監視を開始
					monitorAudioState();
				}

				if (onParticipantUpdate) {
					onParticipantUpdate({
						type: "participant-joined",
						participant: event.participant,
					});
				}
			})
			.on("participant-left", (event) => {
				console.log("👥 Participant left:", {
					session_id: event.participant.session_id,
					user_name: event.participant.user_name,
					local: event.participant.local
				});
				
				// リモート参加者の場合、Firebaseのmembersデータを削除
				if (!event.participant.local && roomId && currentUserUid) {
					console.log("🔥 リモート参加者のFirebase membersデータを削除:", {
						user_name: event.participant.user_name,
						session_id: event.participant.session_id,
						roomId: roomId
					});
					
					// Firebaseのmembersデータを削除
					import("firebase/database").then(({ ref, remove }) => {
						const memberRef = ref(rtdb, `rooms/${roomId}/members/${event.participant.session_id}`);
						remove(memberRef).then(() => {
							console.log("✅ リモート参加者のFirebase membersデータを削除完了");
							
							// 参加者が離脱した後、ルーム削除チェックを実行
							setTimeout(() => {
								import("@/firebase/room").then(({ checkAndDeleteRoomIfEmpty }) => {
									checkAndDeleteRoomIfEmpty(roomId);
								});
							}, 1000); // 1秒後にチェック
						}).catch((error) => {
							console.error("❌ リモート参加者のFirebase membersデータ削除エラー:", error);
						});
					});
				}
				
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
					local: event.participant.local,
					timestamp: new Date().toISOString(),
					currentState: isMicrophoneEnabled
				});
				
				// 音声状態の変化を特に詳細に追跡
				if (event.participant.local) {
					console.log("🚨 ローカル参加者の音声状態が変更されました！", {
						user_name: event.participant.user_name,
						newAudioState: event.participant.audio,
						currentState: isMicrophoneEnabled,
						timeSinceStart: callDuration,
						reason: event.participant.audio !== isMicrophoneEnabled ? "状態不一致" : "状態一致"
					});
				}
				
				// ローカル参加者の音声状態が変更された場合、即座に状態を更新
				if (event.participant.local) {
					console.log("🎤 ローカル参加者の音声状態が変更されました:", {
						user_name: event.participant.user_name,
						audio: event.participant.audio,
						previousState: isMicrophoneEnabled,
						session_id: event.participant.session_id
					});
					
					// 音声状態を即座に更新（デバウンスしない）
					setIsMicrophoneEnabled(event.participant.audio);
					
					// 参加者の状態も即座に更新（重複を防ぐ）
					setParticipants((prev) => {
						const newMap = new Map();
						// 既存の参加者をコピーし、該当する参加者の状態のみ更新
						for (const [sessionId, participant] of prev) {
							if (sessionId === event.participant.session_id) {
								// 既存のphotoURLを保持し、新しいphotoURLが取得できる場合はそれを使用
								let photoURL = participant?.photoURL;
								if (!photoURL) {
									// ローカル参加者の場合は特別処理
									if (event.participant.local && currentUserUid) {
										photoURL = getMemberPhotoURL(event.participant.user_name, currentUserUid);
									} else {
										photoURL = getMemberPhotoURL(event.participant.user_name, event.participant.session_id);
									}
								}
								
								const participantWithPhoto = {
									...event.participant,
									photoURL: photoURL
								};
								
								newMap.set(sessionId, participantWithPhoto);
								console.log("🔄 参加者状態を更新:", {
									sessionId,
									user_name: event.participant.user_name,
									audio: event.participant.audio,
									photoURL: photoURL,
									keptExistingPhotoURL: !!participant?.photoURL
								});
							} else {
								// 他の参加者はそのままコピー
								newMap.set(sessionId, participant);
							}
						}
						return newMap;
					});
				} else {
					// リモート参加者の場合はデバウンスを使用
					debouncedParticipantUpdate(event.participant, 150);
					
					// photoURLが取得できていない場合は、再取得を試行
					if (!event.participant.photoURL) {
						console.log("🔄 participant-updated参加者のphotoURL再取得を試行:", {
							user_name: event.participant.user_name,
							session_id: event.participant.session_id
						});
						
						const photoURL = getMemberPhotoURL(event.participant.user_name, event.participant.session_id);
						
						// 生成されたアイコンが返された場合は、既存のphotoURLを保持
						if (photoURL && !photoURL.includes("ui-avatars.com")) {
							setParticipants((prev) => {
								const newMap = new Map(prev);
								const existingParticipant = newMap.get(event.participant.session_id);
								if (existingParticipant) {
									newMap.set(event.participant.session_id, {
										...existingParticipant,
										photoURL: photoURL
									});
								}
								return newMap;
							});
							
							console.log("🔄 participant-updated参加者のphotoURL再取得成功:", {
								user_name: event.participant.user_name,
								photoURL: photoURL
							});
						} else if (photoURL && photoURL.includes("ui-avatars.com")) {
							console.log("🔄 生成されたアイコンが返されたため、既存のphotoURLを保持:", {
								user_name: event.participant.user_name,
								session_id: event.participant.session_id
							});
						}
					}
				}

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
					
					// 参加者の状態を更新してUIに反映（デバウンスを使用して一瞬の重複を防ぐ）
					if (event.participant) {
						// 既存のphotoURLを保持して参加者データを更新
						debouncedParticipantUpdate(event.participant, 100);
					}
					
					// 音声要素の確実な再生を保証
					if (event.track && event.track.readyState === 'live') {
						console.log("🔊 音声トラックの再生を確認中...");
						
						// 音声要素を手動で作成
						const createAudioElement = () => {
							try {
								// 既存の音声要素を確認
								const existingAudio = document.querySelector(`audio[data-participant="${event.participant.session_id}"]`);
								if (existingAudio) {
									console.log("🎵 既存の音声要素が見つかりました");
									return existingAudio;
								}
								
								// 新しい音声要素を作成
								const audioElement = document.createElement('audio');
								audioElement.setAttribute('data-participant', event.participant.session_id);
								audioElement.setAttribute('data-track-id', event.track.id);
								audioElement.autoplay = true;
								audioElement.muted = false;
								audioElement.volume = 1.0;
								audioElement.style.display = 'none';
								
								// MediaStreamを音声要素に接続
								if (event.track && typeof event.track.getMediaStream === 'function') {
									const mediaStream = event.track.getMediaStream();
									audioElement.srcObject = mediaStream;
									console.log("🎵 MediaStreamを音声要素に接続しました");
								} else {
									// Daily.coの音声トラックを直接使用
									const mediaStream = new MediaStream([event.track]);
									audioElement.srcObject = mediaStream;
									console.log("🎵 音声トラックからMediaStreamを作成しました");
								}
								
								// DOMに追加
								document.body.appendChild(audioElement);
								
								// 再生を試行
								audioElement.play().then(() => {
									console.log(`✅ 参加者 ${event.participant.user_name} の音声要素を作成・再生しました`);
								}).catch(error => {
									console.warn("⚠️ 音声要素の再生に失敗:", error);
								});
								
								return audioElement;
							} catch (error) {
								console.error("❌ 音声要素作成エラー:", error);
								return null;
							}
						};
						
						// 音声要素を作成
						const audioElement = createAudioElement();
						
						// 音声要素の確認と設定を複数回試行
						const ensureAudioPlayback = (attempts = 0) => {
							if (attempts >= 3) {
								console.log("🔄 音声要素確認の最大試行回数に達しました");
								return;
							}
							
							setTimeout(() => {
								try {
									// 音声要素の存在確認
									const audioElements = document.querySelectorAll('audio');
									console.log(`🎵 ページ内の音声要素数: ${audioElements.length}`);
									
									audioElements.forEach((audio, index) => {
										console.log(`🎵 音声要素 ${index + 1}:`, {
											src: audio.src || 'MediaStream',
											muted: audio.muted,
											volume: audio.volume,
											paused: audio.paused,
											currentTime: audio.currentTime,
											duration: audio.duration || 'N/A',
											autoplay: audio.autoplay,
											participant: audio.getAttribute('data-participant')
										});
										
										// 音声要素の設定を最適化
										audio.muted = false;
										audio.volume = 1.0;
										audio.autoplay = true;
										
										// 音声要素が一時停止されている場合は再生
										if (audio.paused) {
											console.log("▶️ 音声要素の再生を開始します");
											audio.play().catch(error => {
												console.warn("⚠️ 音声の自動再生が失敗しました:", error);
											});
										}
									});
									
									// Daily.coの音声出力レベルを確認
									if (callObject && typeof callObject.getReceiveSettings === 'function') {
										callObject.getReceiveSettings().then(receiveSettings => {
											console.log("🔊 Daily.co音声受信設定:", receiveSettings);
										}).catch(error => {
											console.warn("⚠️ 音声受信設定の取得に失敗:", error);
										});
									}
									
								} catch (error) {
									console.error("❌ 音声要素確認エラー:", error);
									if (attempts < 2) {
										ensureAudioPlayback(attempts + 1);
									}
								}
							}, 1000 * (attempts + 1)); // 試行間隔を徐々に増やす
						};
						
						// 音声要素の確認を開始
						ensureAudioPlayback();
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
		console.log("   5. ブラウザの自動再生設定を確認");
		console.log("   6. 別のブラウザで試行");
		console.log("");
		console.log("🌐 ネットワークの問題:");
		console.log("   1. インターネット接続を確認");
		console.log("   2. VPNを使用している場合は一時的に無効化");
		console.log("   3. ファイアウォール設定を確認");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		
		// 音声要素の詳細診断
		setTimeout(() => {
			console.log("🔍 音声要素の詳細診断:");
			const audioElements = document.querySelectorAll('audio');
			console.log(`音声要素数: ${audioElements.length}`);
			
			audioElements.forEach((audio, index) => {
				console.log(`音声要素 ${index + 1}:`, {
					src: audio.src || 'MediaStream',
					muted: audio.muted,
					volume: audio.volume,
					paused: audio.paused,
					readyState: audio.readyState,
					networkState: audio.networkState
				});
			});
		}, 1000);
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
			
			// 状態を即座に更新
			setIsMicrophoneEnabled(newState);
			
			console.log(`🎤 マイクを${newState ? '有効化' : '無効化'}しました`);
			
			// 参加者の状態も即座に更新（重複を防ぐ）
			setParticipants((prev) => {
				const newMap = new Map();
				// 既存の参加者をコピーし、ローカル参加者の状態のみ更新
				for (const [sessionId, participant] of prev) {
					if (participant.local) {
						// ローカル参加者の状態を更新
						newMap.set(sessionId, {
							...participant,
							audio: newState
						});
						console.log("🎤 ローカル参加者の状態を更新:", {
							sessionId,
							user_name: participant.user_name,
							audio: newState
						});
					} else {
						// リモート参加者はそのままコピー
						newMap.set(sessionId, participant);
					}
				}
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
							// 状態を再設定
							setIsMicrophoneEnabled(newState);
						}
					}
				} catch (error) {
					console.error("❌ マイク状態再確認エラー:", error);
				}
			}, 500); // タイムアウトを短縮
			
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
		
		// 参加者更新のタイムアウトをクリア
		if (participantUpdateTimeoutRef.current) {
			clearTimeout(participantUpdateTimeoutRef.current);
			participantUpdateTimeoutRef.current = null;
		}
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

	// 参加者データを配列化（デバッグログ付き）
	const participantsArray = Array.from(participants.values()).map(participant => {
		// Daily.coから取得した参加者データのlocalプロパティを確実に保持
		// ただし、localプロパティが明示的にfalseの場合は、それを尊重する
		const isLocal = participant.local === true;
		
		console.log("🔍 参加者のlocal判定:", {
			user_name: participant.user_name,
			participantLocal: participant.local,
			isLocal: isLocal,
			session_id: participant.session_id
		});
		
		return {
			...participant,
			local: isLocal
		};
	});
	
	console.log("👥 useDailyConnection participantsArray:", {
		totalParticipants: participantsArray.length,
		participants: participantsArray.map(p => ({
			user_name: p.user_name,
			audio: p.audio,
			local: p.local,
			session_id: p.session_id
		}))
	});

	return {
		daily,
		isJoined,
		isConnecting,
		error,
		participants: participantsArray,
		callDuration,
		formattedDuration: formatDuration(callDuration),
		isMicrophoneEnabled,
		joinRoom,
		leaveRoom,
		destroyDaily,
		toggleMicrophone,
		showAudioTroubleshootingGuide,
		// 音声テスト機能を追加
		testAudio: useCallback(async () => {
			console.log("🔊 音声テストを開始します...");
			
			try {
				// システム音声のテスト
				const audioContext = new (window.AudioContext || window.webkitAudioContext)();
				const oscillator = audioContext.createOscillator();
				const gainNode = audioContext.createGain();
				
				oscillator.connect(gainNode);
				gainNode.connect(audioContext.destination);
				
				oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4音
				gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // 低音量
				
				oscillator.start();
				console.log("🔊 テスト音を再生中... (440Hz, 1秒間)");
				
				setTimeout(() => {
					oscillator.stop();
					console.log("✅ 音声テスト完了 - 音が聞こえた場合は音声出力は正常です");
				}, 1000);
				
			} catch (error) {
				console.error("❌ 音声テストエラー:", error);
			}
		}, []),
		// 音声要素の強制作成機能を追加
		forceAudioElements: useCallback(() => {
			console.log("🔧 音声要素の強制作成を試行中...");
			
			if (daily && isJoined) {
				try {
					// Daily.coの音声トラックを取得
					const participants = daily.participants();
					console.log("👥 現在の参加者:", Object.keys(participants).length);
					
					Object.values(participants).forEach(participant => {
						console.log(`🔍 参加者 ${participant.user_name} の状態:`, {
							local: participant.local,
							audio: participant.audio,
							session_id: participant.session_id
						});
						
						// リモート参加者で音声が有効な場合
						if (!participant.local && participant.audio) {
							console.log(`🎧 参加者 ${participant.user_name} の音声トラックを確認中...`);
							
							// 既存の音声要素を確認
							const existingAudio = document.querySelector(`audio[data-participant="${participant.session_id}"]`);
							if (existingAudio) {
								console.log(`✅ 参加者 ${participant.user_name} の音声要素は既に存在します`);
								return;
							}
							
							// Daily.coの音声トラックを取得
							const remoteTracks = daily.getRemoteAudioTracks();
							console.log("🎵 リモート音声トラック:", remoteTracks);
							
							// 該当する参加者の音声トラックを探す
							const participantTrack = remoteTracks.find(track => {
								// Daily.coのトラックオブジェクトから参加者IDを取得
								return track && track.participantId === participant.session_id;
							});
							
							if (participantTrack) {
								console.log(`🎵 参加者 ${participant.user_name} の音声トラックを発見:`, participantTrack);
								
								// 音声要素を手動で作成
								const audioElement = document.createElement('audio');
								audioElement.setAttribute('data-participant', participant.session_id);
								audioElement.setAttribute('data-user-name', participant.user_name);
								audioElement.autoplay = true;
								audioElement.muted = false;
								audioElement.volume = 1.0;
								audioElement.style.display = 'none';
								
								// MediaStreamを作成して音声要素に接続
								const mediaStream = new MediaStream([participantTrack]);
								audioElement.srcObject = mediaStream;
								
								// DOMに追加
								document.body.appendChild(audioElement);
								
								// 再生を試行
								audioElement.play().then(() => {
									console.log(`✅ 参加者 ${participant.user_name} の音声要素を作成・再生しました`);
								}).catch(error => {
									console.warn(`⚠️ 参加者 ${participant.user_name} の音声要素の再生に失敗:`, error);
								});
								
								// 音声要素の状態をログ出力
								setTimeout(() => {
									console.log(`🎵 参加者 ${participant.user_name} の音声要素状態:`, {
										muted: audioElement.muted,
										volume: audioElement.volume,
										paused: audioElement.paused,
										readyState: audioElement.readyState,
										srcObject: !!audioElement.srcObject
									});
								}, 1000);
								
							} else {
								console.warn(`⚠️ 参加者 ${participant.user_name} の音声トラックが見つかりません`);
							}
						}
					});
					
					// 作成された音声要素の総数を確認
					setTimeout(() => {
						const allAudioElements = document.querySelectorAll('audio');
						console.log(`🎵 作成された音声要素の総数: ${allAudioElements.length}`);
						
						allAudioElements.forEach((audio, index) => {
							console.log(`🎵 音声要素 ${index + 1}:`, {
								participant: audio.getAttribute('data-participant'),
								user_name: audio.getAttribute('data-user-name'),
								muted: audio.muted,
								volume: audio.volume,
								paused: audio.paused,
								readyState: audio.readyState
							});
						});
					}, 2000);
					
				} catch (error) {
					console.error("❌ 音声要素強制作成エラー:", error);
				}
			} else {
				console.warn("⚠️ Daily.coインスタンスが存在しないか、ルームに参加していません");
			}
		}, [daily, isJoined]),
	};
};
