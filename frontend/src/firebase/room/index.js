import {
	get,
	push,
	ref,
	remove,
	serverTimestamp,
	set,
} from "firebase/database";
import { auth, rtdb } from "../firebaseConfig";

/**
 * ルームを作成し、選択されたユーザーを招待メンバーとして保存する（Realtime Database）
 * 同時にDaily.coのビデオルームも作成する。
 * 出発地・目的地が指定されている場合は routeData も保存する。
 * rooms/{roomId}
 *  - name: ルーム名
 *  - createdAt: タイムスタンプ
 *  - ownerUid: 作成者UID
 *  - dailyRoom: { id, name, url } - Daily.coルーム情報
 *  - members: { [uid]: { uid, name, photoURL, invited: true, accepted: false } }
 *  - routeData?: { departure, destination, routeInfo, polyline, createdAt }
 *  - hasRoute?: boolean
 * @param {string} roomName
 * @param {Array<{uid:string,name:string,photoURL?:string}>} selectedFriends
 * @param {{name?:string, coordinates:[number,number]}|null} selectedLocation
 * @param {{name?:string, coordinates:[number,number]}|null} selectedDeparture
 * @returns {Promise<string>} 新規roomId
 */
export const createRoomWithInvites = async (
    roomName,
    selectedFriends = [],
    selectedLocation = null,
    selectedDeparture = null,
) => {
	const currentUser = auth.currentUser;
	if (!currentUser || !currentUser.uid) {
		throw new Error("ログインが必要です。ユーザー情報を取得できません。");
	}

	console.log("Room creation - Current User:", {
		uid: currentUser.uid,
		displayName: currentUser.displayName,
		email: currentUser.email,
	});

	try {
		// ルームID作成
		const roomRef = push(ref(rtdb, "rooms"));
		const roomId = roomRef.key;

		// Daily.coのビデオルームを作成
		// 一時的に本番環境のエンドポイントを使用（Cloudflare Functionsサーバーが起動していないため）
		const apiBaseUrl = window.location.origin; // 本番環境のエンドポイント（Cloudflare Pages Functions - 現在のドメイン）
		const dailyResponse = await fetch(`${apiBaseUrl}/api/daily-room`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				roomId: roomId,
				roomName: roomName,
				ownerUid: currentUser.uid,
			}),
		});

		const dailyResult = await dailyResponse.json();
		if (!dailyResult.success) {
			throw new Error(`Daily room creation failed: ${dailyResult.error}`);
		}

		// メンバー一覧: 作成者も含める（デフォルトaccepted: true）
		const members = {
			[currentUser.uid]: {
				uid: currentUser.uid,
				name: currentUser.displayName || "",
				photoURL: currentUser.photoURL || "",
				invited: true,
				accepted: true,
			},
		};

		console.log("Room creation - Owner member data:", members[currentUser.uid]);

		for (const friend of selectedFriends) {
			members[friend.uid] = {
				uid: friend.uid,
				name: friend.name || friend.displayName || "",
				photoURL: friend.photoURL || "",
				invited: true,
				accepted: false, // 初期状態: 未参加
			};
		}

		console.log("Room creation - All members:", members);

        // ルート情報の作成（任意）: OSRM失敗時も最小情報は保持
        let routeData = null;
        if (selectedLocation || selectedDeparture) {
            // 最小構造
            routeData = {
                departure: selectedDeparture
                    ? {
                            name: selectedDeparture.name || "出発地",
                            coordinates: selectedDeparture.coordinates,
                      }
                    : null,
                destination: selectedLocation
                    ? {
                            name: selectedLocation.name || "目的地",
                            coordinates: selectedLocation.coordinates,
                      }
                    : null,
                routeInfo: null,
                polyline: null,
                createdAt: new Date().toISOString(),
            };

            // 両方揃っている場合のみ詳細計算を試行
            if (selectedLocation && selectedDeparture) {
                try {
                    const routeResponse = await fetch(
                        `https://router.project-osrm.org/route/v1/driving/${selectedDeparture.coordinates[1]},${selectedDeparture.coordinates[0]};${selectedLocation.coordinates[1]},${selectedLocation.coordinates[0]}?overview=simplified&geometries=geojson&steps=false`,
                    );
                    if (routeResponse.ok) {
                        const routeResult = await routeResponse.json();
                        if (routeResult.routes && routeResult.routes.length > 0) {
                            const route = routeResult.routes[0];
                            routeData.routeInfo = {
                                distanceKm: Math.round((route.distance / 1000) * 10) / 10,
                                durationMin: Math.round(route.duration / 60),
                                arrivalTime: new Date(Date.now() + route.duration * 1000).toISOString(),
                            };
                            routeData.polyline = {
                                geometry: route.geometry
                                    ? {
                                            type: route.geometry.type,
                                            coordinates: (() => {
                                                const coords = route.geometry.coordinates;
                                                if (coords.length <= 1000) return coords;
                                                const simplified = [];
                                                const maxPoints = 50000;
                                                const step = Math.max(1, Math.floor(coords.length / maxPoints));
                                                simplified.push(coords[0]);
                                                for (let i = step; i < coords.length - step; i += step) {
                                                    const prev = coords[i - step];
                                                    const curr = coords[i];
                                                    const next = coords[i + step];
                                                    const angle1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
                                                    const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
                                                    const angleDiff = Math.abs(angle1 - angle2);
                                                    if (angleDiff > 0.02 || i % Math.floor(step * 1.2) === 0) {
                                                        simplified.push(curr);
                                                    }
                                                }
                                                simplified.push(coords[coords.length - 1]);
                                                return simplified;
                                            })(),
                                      }
                                    : null,
                                steps:
                                    route.legs[0]?.steps?.map((step) => ({
                                        distance: step.distance,
                                        duration: step.duration,
                                        maneuver: step.maneuver?.type,
                                        name: step.name,
                                    })) || [],
                                waypoints:
                                    route.waypoints?.map((wp) => ({
                                        location: wp.location,
                                        name: wp.name,
                                    })) || [],
                                summary: {
                                    distance: route.distance,
                                    duration: route.duration,
                                    profile: "driving",
                                },
                            };
                        }
                    }
                } catch (routeError) {
                    console.warn("⚠️ ルート計算に失敗しました:", routeError);
                }
            }
        }

        const roomData = {
			name: roomName,
			createdAt: serverTimestamp(),
			ownerUid: currentUser.uid,
			ownerName: currentUser.displayName || "",
			ownerPhotoURL: currentUser.photoURL || "",
			dailyRoom: dailyResult.dailyRoom, // Daily.coルーム情報を追加
			members,
            // ルート情報（任意）
            routeData,
            hasRoute: !!routeData,
		};

		await set(roomRef, roomData);
		console.log("Room created with Daily integration:", {
			roomId,
			dailyRoom: dailyResult.dailyRoom,
			ownerUid: currentUser.uid,
			membersCount: Object.keys(roomData.members).length,
		});
		console.log("Room data saved:", roomData);
		return roomId;
	} catch (error) {
		console.error("Room creation error:", error);
		throw error;
	}
};

/**
 * Firebase側のみでルーム作成（Daily連携なし）し、必要に応じてルート情報も保存する
 * rooms/{roomId}
 *  - name, createdAt, owner*, members
 *  - testMode: true
 *  - routeData: { departure, destination, routeInfo, polyline, createdAt }
 *  - hasRoute: boolean
 * @param {string} roomName
 * @param {Array<{uid:string,name?:string,displayName?:string,photoURL?:string}>} selectedFriends
 * @param {{name?:string, coordinates:[number,number]}|null} selectedLocation
 * @param {{name?:string, coordinates:[number,number]}|null} selectedDeparture
 * @returns {Promise<string>} 新規roomId
 */
export const createFirebaseRoomWithRoute = async (
	roomName,
	selectedFriends = [],
	selectedLocation = null,
	selectedDeparture = null,
) => {
	const currentUser = auth.currentUser;
	if (!currentUser || !currentUser.uid) {
		throw new Error("ログインが必要です。ユーザー情報を取得できません。");
	}

	if (!roomName || !roomName.trim()) {
		throw new Error("ルーム名を入力してください。");
	}

	// ルームID作成
	const roomRef = push(ref(rtdb, "rooms"));
	const roomId = roomRef.key;

	// メンバー作成（作成者 + 招待したフレンド）
	const members = {
		[currentUser.uid]: {
			uid: currentUser.uid,
			name: currentUser.displayName || "",
			photoURL: currentUser.photoURL || "",
			invited: true,
			accepted: true,
		},
	};
	for (const friend of selectedFriends) {
		members[friend.uid] = {
			uid: friend.uid,
			name: friend.name || friend.displayName || "",
			photoURL: friend.photoURL || "",
			invited: true,
			accepted: false,
		};
	}

    // ルート情報の作成（任意）: OSRM失敗時も最小情報は保持
    let routeData = null;
    if (selectedLocation || selectedDeparture) {
        routeData = {
            departure: selectedDeparture
                ? {
                        name: selectedDeparture.name || "出発地",
                        coordinates: selectedDeparture.coordinates,
                  }
                : null,
            destination: selectedLocation
                ? {
                        name: selectedLocation.name || "目的地",
                        coordinates: selectedLocation.coordinates,
                  }
                : null,
            routeInfo: null,
            polyline: null,
            createdAt: new Date().toISOString(),
        };

        if (selectedLocation && selectedDeparture) {
            try {
                const routeResponse = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${selectedDeparture.coordinates[1]},${selectedDeparture.coordinates[0]};${selectedLocation.coordinates[1]},${selectedLocation.coordinates[0]}?overview=simplified&geometries=geojson&steps=false`,
                );
                if (routeResponse.ok) {
                    const routeResult = await routeResponse.json();
                    if (routeResult.routes && routeResult.routes.length > 0) {
                        const route = routeResult.routes[0];
                        routeData.routeInfo = {
                            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
                            durationMin: Math.round(route.duration / 60),
                            arrivalTime: new Date(Date.now() + route.duration * 1000).toISOString(),
                        };
                        routeData.polyline = {
                            geometry: route.geometry
                                ? {
                                        type: route.geometry.type,
                                        coordinates: (() => {
                                            const coords = route.geometry.coordinates;
                                            if (coords.length <= 1000) return coords;
                                            const simplified = [];
                                            const maxPoints = 50000;
                                            const step = Math.max(1, Math.floor(coords.length / maxPoints));
                                            simplified.push(coords[0]);
                                            for (let i = step; i < coords.length - step; i += step) {
                                                const prev = coords[i - step];
                                                const curr = coords[i];
                                                const next = coords[i + step];
                                                const angle1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
                                                const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
                                                const angleDiff = Math.abs(angle1 - angle2);
                                                if (angleDiff > 0.02 || i % Math.floor(step * 1.2) === 0) {
                                                    simplified.push(curr);
                                                }
                                            }
                                            simplified.push(coords[coords.length - 1]);
                                            return simplified;
                                        })(),
                                  }
                                : null,
                            steps:
                                route.legs[0]?.steps?.map((step) => ({
                                        distance: step.distance,
                                        duration: step.duration,
                                        maneuver: step.maneuver?.type,
                                        name: step.name,
                                    })) || [],
                            waypoints:
                                route.waypoints?.map((wp) => ({
                                        location: wp.location,
                                        name: wp.name,
                                    })) || [],
                            summary: {
                                distance: route.distance,
                                duration: route.duration,
                                profile: "driving",
                            },
                        };
                    }
                }
            } catch (routeError) {
                console.warn("⚠️ ルート計算に失敗しました:", routeError);
            }
        }
    }

	const roomData = {
		name: roomName.trim(),
		createdAt: serverTimestamp(),
		ownerUid: currentUser.uid,
		ownerName: currentUser.displayName || "",
		ownerPhotoURL: currentUser.photoURL || "",
		members,
		testMode: true,
		routeData: routeData,
		hasRoute: !!routeData,
	};

	await set(roomRef, roomData);
	return roomId;
};

/**
 * Daily連携ありのルーム作成 + ルート情報保存
 * - createRoomWithInvites の挙動に routeData 保存を追加
 */
export const createRoomWithInvitesAndRoute = async (
	roomName,
	selectedFriends = [],
	selectedLocation = null,
	selectedDeparture = null,
) => {
	const currentUser = auth.currentUser;
	if (!currentUser || !currentUser.uid) {
		throw new Error("ログインが必要です。ユーザー情報を取得できません。");
	}
	if (!roomName || !roomName.trim()) {
		throw new Error("ルーム名を入力してください。");
	}

	// ルームID作成
	const roomRef = push(ref(rtdb, "rooms"));
	const roomId = roomRef.key;

	// Daily.coのビデオルームを作成
	const apiBaseUrl = window.location.origin;
	const dailyResponse = await fetch(`${apiBaseUrl}/api/daily-room`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ roomId, roomName, ownerUid: currentUser.uid }),
	});
	const dailyResult = await dailyResponse.json();
	if (!dailyResult.success) {
		throw new Error(`Daily room creation failed: ${dailyResult.error}`);
	}

	// メンバー
	const members = {
		[currentUser.uid]: {
			uid: currentUser.uid,
			name: currentUser.displayName || "",
			photoURL: currentUser.photoURL || "",
			invited: true,
			accepted: true,
		},
	};
	for (const friend of selectedFriends) {
		members[friend.uid] = {
			uid: friend.uid,
			name: friend.name || friend.displayName || "",
			photoURL: friend.photoURL || "",
			invited: true,
			accepted: false,
		};
	}

	// ルート情報（任意）: OSRM失敗時も最小情報は保持（テスト関数と同等の処理）
	let routeData = null;
	if (selectedLocation && selectedDeparture) {
		try {
			const routeResponse = await fetch(
				`https://router.project-osrm.org/route/v1/driving/${selectedDeparture.coordinates[1]},${selectedDeparture.coordinates[0]};${selectedLocation.coordinates[1]},${selectedLocation.coordinates[0]}?overview=simplified&geometries=geojson&steps=false`,
			);
			if (routeResponse.ok) {
				const routeResult = await routeResponse.json();
				if (routeResult.routes && routeResult.routes.length > 0) {
					const route = routeResult.routes[0];
					routeData = {
						departure: {
							name: selectedDeparture.name || "出発地",
							coordinates: selectedDeparture.coordinates,
						},
						destination: {
							name: selectedLocation.name || "目的地",
							coordinates: selectedLocation.coordinates,
						},
						routeInfo: {
							distanceKm: Math.round((route.distance / 1000) * 10) / 10,
							durationMin: Math.round(route.duration / 60),
							arrivalTime: new Date(Date.now() + route.duration * 1000).toISOString(),
						},
						polyline: {
							geometry: route.geometry
								? {
										type: route.geometry.type,
										coordinates: (() => {
											const coords = route.geometry.coordinates || [];
											if (coords.length <= 1000) return coords;
											const simplified = [];
											const maxPoints = 50000;
											const step = Math.max(1, Math.floor(coords.length / maxPoints));
											simplified.push(coords[0]);
											for (let i = step; i < coords.length - step; i += step) {
												const prev = coords[i - step];
												const curr = coords[i];
												const next = coords[i + step];
												const angle1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
												const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
												const angleDiff = Math.abs(angle1 - angle2);
												if (angleDiff > 0.02 || i % Math.floor(step * 1.2) === 0) {
													simplified.push(curr);
												}
											}
											simplified.push(coords[coords.length - 1]);
											return simplified;
										})(),
							  }
							: null,
							steps:
								route.legs?.[0]?.steps?.map((step) => ({
									distance: step.distance,
									duration: step.duration,
									maneuver: step.maneuver?.type,
									name: step.name,
								})) || [],
							waypoints:
								route.waypoints?.map((wp) => ({
									location: wp.location,
									name: wp.name,
								})) || [],
							summary: {
								distance: route.distance,
								duration: route.duration,
								profile: "driving",
							},
						},
						createdAt: new Date().toISOString(),
					};
				}
			}
		} catch (routeError) {
			console.warn("⚠️ ルート計算に失敗しました:", routeError);
		}
	} else if (selectedLocation || selectedDeparture) {
		// どちらかだけでも最小構造を保存
		routeData = {
			departure: selectedDeparture
				? { name: selectedDeparture.name || "出発地", coordinates: selectedDeparture.coordinates }
				: null,
			destination: selectedLocation
				? { name: selectedLocation.name || "目的地", coordinates: selectedLocation.coordinates }
				: null,
			routeInfo: null,
			polyline: null,
			createdAt: new Date().toISOString(),
		};
	}

	const roomData = {
		name: roomName.trim(),
		createdAt: serverTimestamp(),
		ownerUid: currentUser.uid,
		ownerName: currentUser.displayName || "",
		ownerPhotoURL: currentUser.photoURL || "",
		dailyRoom: dailyResult.dailyRoom,
		members,
		testMode: true,
		routeData,
		hasRoute: !!routeData,
	};

	await set(roomRef, roomData);
    console.log("✅ Room saved (with routeData?):", { roomId, hasRoute: !!routeData, hasPolyline: !!routeData?.polyline });
	return roomId;
};

/**
 * 既存のFirebaseルームにDaily.coルーム情報を後付けで紐付ける
 * @param {string} roomId FirebaseのroomId（既に作成済み）
 * @param {string} roomName ルーム名
 * @returns {Promise<void>}
 */
export const attachDailyRoomToExisting = async (roomId, roomName) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.uid) {
        throw new Error("ログインが必要です。ユーザー情報を取得できません。");
    }

    // Daily.coのビデオルームを作成
    const apiBaseUrl = window.location.origin;
    const response = await fetch(`${apiBaseUrl}/api/daily-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, roomName, ownerUid: currentUser.uid }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(`Daily room creation failed: ${result.error || response.statusText}`);
    }

    // Firebase上の既存ルームにdailyRoomフィールドを追加
    const dailyRoomRef = ref(rtdb, `rooms/${roomId}/dailyRoom`);
    await set(dailyRoomRef, result.dailyRoom);
};

/**
 * Daily.coの参加トークンを取得する
 * @param {string} roomId Firebase room ID
 * @param {string} userId User ID
 * @param {string} userName User name
 * @param {string} userPhotoURL User photo URL
 * @returns {Promise<string>} Daily.co参加トークン
 */
export const getDailyToken = async (roomId, userId, userName, userPhotoURL) => {
	try {
		// 一時的に本番環境のエンドポイントを使用（Cloudflare Functionsサーバーが起動していないため）
		const apiBaseUrl = window.location.origin; // 本番環境のエンドポイント（Cloudflare Pages Functions - 現在のドメイン）

		console.log("🔗 Daily token API request:", {
			apiBaseUrl,
			env: {
				DEV: import.meta.env.DEV,
				NODE_ENV: import.meta.env.NODE_ENV,
				MODE: import.meta.env.MODE,
			},
			roomId,
			userId,
			userName,
		});

		// APIエンドポイントが利用できない場合のフォールバック
		if (!apiBaseUrl) {
			console.warn(
				"⚠️ APIエンドポイントが設定されていません。フォールバックトークンを使用します。",
			);
			// フォールバック用のダミートークン（実際の通話はできませんが、エラーを防ぎます）
			return `fallback-token-${roomId}-${userId}-${Date.now()}`;
		}

		const response = await fetch(`${apiBaseUrl}/api/daily-token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				roomId: roomId,
				userId: userId,
				userName: userName,
				userPhotoURL: userPhotoURL,
			}),
		});

		// レスポンスの状態をチェック
		if (!response.ok) {
			const errorText = await response.text();
			console.error("❌ API Response Error:", {
				status: response.status,
				statusText: response.statusText,
				body: errorText,
			});

			// APIが利用できない場合のフォールバック
			if (response.status === 404) {
				console.warn(
					"⚠️ APIエンドポイントが見つかりません。フォールバックトークンを使用します。",
				);
				return `fallback-token-${roomId}-${userId}-${Date.now()}`;
			}

			throw new Error(
				`API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const result = await response.json();
		if (!result.success) {
			throw new Error(`Token generation failed: ${result.error}`);
		}

		console.log("✅ Daily token generated successfully");
		return result.token;
	} catch (error) {
		console.error("❌ Daily token generation error:", error);

		// ネットワークエラーやAPIエンドポイントが利用できない場合のフォールバック
		const isNetworkError =
			error.message.includes("Failed to fetch") ||
			error.message.includes("404") ||
			error.message.includes("ERR_CONNECTION_REFUSED") ||
			error.message.includes("NetworkError") ||
			error.message.includes("TypeError");

		if (isNetworkError) {
			console.warn(
				"⚠️ APIエンドポイントにアクセスできません。フォールバックトークンを使用します。",
			);
			console.warn(
				"💡 Cloudflare Pages Functionsが正しく設定されているか確認してください。",
			);
			console.warn(
				"💡 functions/api/daily-token.js が正しくデプロイされているか確認してください。",
			);
			return `fallback-token-${roomId}-${userId}-${Date.now()}`;
		}

		throw error;
	}
};

/**
 * 通話セッションを開始する
 * @param {string} roomId Firebase room ID
 * @param {string} userId User ID
 * @param {Object} participantInfo 参加者情報
 */
export const startCallSession = async (
	roomId,
	userId,
	participantInfo = {},
) => {
	try {
		const sessionData = {
			joinedAt: serverTimestamp(),
			isActive: true,
			participantInfo: {
				name: participantInfo.name || "Anonymous",
				photoURL: participantInfo.photoURL || "",
				sessionId: participantInfo.sessionId || "",
			},
			callDuration: 0,
		};

		// セッションデータを保存
		const sessionRef = ref(rtdb, `rooms/${roomId}/sessions/${userId}`);
		await set(sessionRef, sessionData);

		// 参加者の通話状態を更新
		const memberRef = ref(rtdb, `rooms/${roomId}/members/${userId}/inCall`);
		await set(memberRef, true);

		console.log("Call session started:", { roomId, userId });
	} catch (error) {
		console.error("Failed to start call session:", error);
		throw error;
	}
};

/**
 * 通話セッションを終了する
 * @param {string} roomId Firebase room ID
 * @param {string} userId User ID
 * @param {number} callDuration 通話時間（秒）
 */
export const endCallSession = async (roomId, userId, callDuration = 0) => {
	try {
		// セッションデータを更新
		const sessionRef = ref(rtdb, `rooms/${roomId}/sessions/${userId}`);
		const sessionData = {
			leftAt: serverTimestamp(),
			isActive: false,
			callDuration: callDuration,
		};

		await set(sessionRef, sessionData);

		// 参加者の通話状態を更新
		const memberRef = ref(rtdb, `rooms/${roomId}/members/${userId}/inCall`);
		await set(memberRef, false);

		// 通話履歴を保存
		const historyRef = ref(
			rtdb,
			`rooms/${roomId}/callHistory/${userId}/${Date.now()}`,
		);
		await set(historyRef, {
			duration: callDuration,
			endedAt: serverTimestamp(),
		});

		console.log("Call session ended:", { roomId, userId, callDuration });
	} catch (error) {
		console.error("Failed to end call session:", error);
		throw error;
	}
};

/**
 * 通話時間を更新する
 * @param {string} roomId Firebase room ID
 * @param {string} userId User ID
 * @param {number} duration 通話時間（秒）
 */
export const updateCallDuration = async (roomId, userId, duration) => {
	try {
		const sessionRef = ref(
			rtdb,
			`rooms/${roomId}/sessions/${userId}/callDuration`,
		);
		await set(sessionRef, duration);
	} catch (error) {
		console.error("Failed to update call duration:", error);
	}
};

/**
 * Daily.coのルームを削除する
 * @param {string} dailyRoomId Daily.co room ID
 */
const deleteDailyRoom = async (dailyRoomId) => {
	try {
		// 一時的に本番環境のエンドポイントを使用（Cloudflare Functionsサーバーが起動していないため）
		const apiBaseUrl = window.location.origin; // 本番環境のエンドポイント（Cloudflare Pages Functions - 現在のドメイン）

		console.log("🌐 Daily.coルーム削除API呼び出し:", {
			apiBaseUrl,
			dailyRoomId,
		});

		const response = await fetch(`${apiBaseUrl}/api/daily-room`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				roomId: dailyRoomId,
			}),
		});

		console.log("📊 API Response Status:", response.status);
		console.log(
			"📊 API Response Headers:",
			Object.fromEntries(response.headers.entries()),
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.log("📊 API Response Error:", {
				status: response.status,
				statusText: response.statusText,
				errorText: errorText,
				dailyRoomId: dailyRoomId,
			});

			// 404エラーの場合は成功として扱う（ルームが既に削除済み）
			if (response.status === 404) {
				console.log(
					"✅ Daily.coルームは既に削除済みまたは存在しません:",
					dailyRoomId,
				);
				return {
					success: true,
					message: `Room ${dailyRoomId} was already deleted or does not exist`,
				};
			}

			console.error("❌ API Response Error (非404):", {
				status: response.status,
				statusText: response.statusText,
				errorText: errorText,
				dailyRoomId: dailyRoomId,
			});
			throw new Error(
				`Daily room deletion failed: ${response.status} ${response.statusText} - ${errorText}`,
			);
		}

		const result = await response.json();
		console.log("✅ API Response Success:", result);

		if (!result.success) {
			throw new Error(`Daily room deletion failed: ${result.error}`);
		}

		return result;
	} catch (error) {
		console.error("❌ Daily.coルーム削除エラー:", {
			error: error.message,
			dailyRoomId: dailyRoomId,
			stack: error.stack,
		});
		throw error;
	}
};

// ルーム削除処理の重複実行を防ぐためのMap
const roomDeletionInProgress = new Map();

/**
 * ルームの全メンバーの参加状態をチェックし、全員がfalseの場合はルームを削除する
 * @param {string} roomId Firebase room ID
 */
export const checkAndDeleteRoomIfEmpty = async (roomId) => {
	// 既に削除処理が進行中の場合はスキップ
	if (roomDeletionInProgress.has(roomId)) {
		console.log("🔄 ルーム削除処理が既に進行中です:", roomId);
		return;
	}

	// 削除処理開始をマーク
	roomDeletionInProgress.set(roomId, true);
	try {
		const roomRef = ref(rtdb, `rooms/${roomId}`);
		const snapshot = await get(roomRef);
		const roomData = snapshot.val();

		if (!roomData || !roomData.members) {
			console.log("🔄 ルームデータまたはメンバーが見つかりません:", roomId);
			return;
		}

		const members = roomData.members;
		const memberValues = Object.values(members);

		// 全メンバーの参加状態をチェック
		const allMembersInactive = memberValues.every(
			(member) => member.accepted === false || member.accepted === undefined,
		);

		if (allMembersInactive && memberValues.length > 0) {
			console.log("🗑️ 全メンバーが非参加状態のため、ルームを削除します:", {
				roomId,
				memberCount: memberValues.length,
				members: memberValues.map((m) => ({
					name: m.name,
					accepted: m.accepted,
				})),
			});

			// Daily.coのルームも削除
			if (roomData.dailyRoom && roomData.dailyRoom.id) {
				try {
					console.log("🗑️ Daily.coルームも削除します:", roomData.dailyRoom.id);
					const deleteResult = await deleteDailyRoom(roomData.dailyRoom.id);
					console.log("✅ Daily.coルーム削除処理完了:", {
						roomId: roomData.dailyRoom.id,
						result: deleteResult,
					});
				} catch (error) {
					console.error("❌ Daily.coルーム削除エラー:", error);
					// Daily.coルームの削除に失敗しても、Firebaseルームは削除を続行
				}
			}

			// Firebaseルームを削除
			await remove(roomRef);
			console.log("✅ Firebaseルームを削除しました:", roomId);
		} else {
			console.log("🔄 ルームはまだアクティブなメンバーがいます:", {
				roomId,
				activeMembers: memberValues.filter((m) => m.accepted === true).length,
				totalMembers: memberValues.length,
			});
		}
	} catch (error) {
		console.error("❌ ルーム削除チェックエラー:", error);
	} finally {
		// 削除処理完了をマーク
		roomDeletionInProgress.delete(roomId);
	}
};
