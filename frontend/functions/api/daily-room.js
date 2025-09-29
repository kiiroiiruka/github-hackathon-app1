export async function onRequest(context) {
	const { request, env } = context;

	// Handle CORS preflight request
	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Max-Age": "86400",
			},
		});
	}

	if (request.method !== "POST" && request.method !== "DELETE") {
		return new Response("Method not allowed", { status: 405 });
	}

	try {
		// DELETEメソッドの処理
		if (request.method === "DELETE") {
			const { roomId } = await request.json();

			if (!roomId) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Missing required field: roomId",
					}),
					{
						status: 400,
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
						},
					},
				);
			}

			// Delete Daily room using REST API
			console.log(`🗑️ Daily.coルーム削除を試行: ${roomId}`);
			console.log(`🔑 API Key exists: ${!!env.DAILY_API_KEY}`);
			console.log(
				`🔑 API Key prefix: ${env.DAILY_API_KEY ? env.DAILY_API_KEY.substring(0, 10) + "..." : "undefined"}`,
			);

			const dailyResponse = await fetch(
				`https://api.daily.co/v1/rooms/${roomId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${env.DAILY_API_KEY}`,
					},
				},
			);

			console.log(`📊 Daily API Response Status: ${dailyResponse.status}`);
			console.log(
				`📊 Daily API Response Headers:`,
				Object.fromEntries(dailyResponse.headers.entries()),
			);

			// レスポンスの内容を取得（成功・失敗に関わらず）
			const responseText = await dailyResponse.text();
			console.log(`📊 Daily API Response Body:`, responseText);

			// Cloudflare Functionsのログに出力（ブラウザのコンソールでは見えない）
			console.log(`🔍 CLOUDFLARE LOG - Daily API Response:`, {
				status: dailyResponse.status,
				statusText: dailyResponse.statusText,
				headers: Object.fromEntries(dailyResponse.headers.entries()),
				body: responseText,
				roomId: roomId,
				timestamp: new Date().toISOString(),
			});

			if (!dailyResponse.ok) {
				console.log(`📊 Daily API Error Details:`, {
					status: dailyResponse.status,
					statusText: dailyResponse.statusText,
					responseText: responseText,
					roomId: roomId,
				});

				// 404エラー（ルームが見つからない）の場合は成功として扱う
				if (dailyResponse.status === 404) {
					console.log(
						`✅ Daily.coルームは既に削除済みまたは存在しません: ${roomId}`,
					);
					return new Response(
						JSON.stringify({
							success: true,
							message: `Room ${roomId} was already deleted or does not exist`,
						}),
						{
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
								"Access-Control-Allow-Headers": "Content-Type, Authorization",
							},
						},
					);
				}

				console.error(`❌ Daily API Error (非404):`, {
					status: dailyResponse.status,
					statusText: dailyResponse.statusText,
					responseText: responseText,
					roomId: roomId,
				});
				throw new Error(
					`Daily API error: ${dailyResponse.status} - ${responseText}`,
				);
			}

			// 成功時のレスポンスを解析
			let result;
			try {
				result = JSON.parse(responseText);
				console.log(`✅ Daily.coルーム削除成功:`, result);
			} catch (parseError) {
				console.log(`📊 Daily.coルーム削除成功（JSON解析失敗）:`, {
					responseText: responseText,
					parseError: parseError.message,
				});
				result = { success: true, message: "Room deleted successfully" };
			}

			return new Response(
				JSON.stringify({
					success: true,
					message: `Room ${roomId} deleted successfully`,
				}),
				{
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Authorization",
					},
				},
			);
		}

		// POSTメソッドの処理（既存のルーム作成処理）
		const { roomId, roomName, ownerUid } = await request.json();

		if (!roomId || !roomName || !ownerUid) {
			return new Response(
				JSON.stringify({
					success: false,
					error: "Missing required fields: roomId, roomName, ownerUid",
				}),
				{
					status: 400,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		// Create Daily room using REST API
		console.log(`🏗️ Daily.coルーム作成を試行:`, {
			roomId: roomId,
			roomName: roomName,
			ownerUid: ownerUid,
			timestamp: new Date().toISOString(),
		});

		const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.DAILY_API_KEY}`,
			},
			body: JSON.stringify({
				name: roomId, // 参考プロジェクトと同じ形式
				privacy: "private",
				properties: {
					enable_chat: false, // チャット無効
					enable_screenshare: false, // 画面共有無効
					enable_prejoin_ui: true, // 事前参加UI有効（音声設定確認用）
					start_video_off: true, // ビデオオフ
					start_audio_off: false, // 音声オン
					max_participants: 10, // 参加者数を削減
				},
			}),
		});

		console.log(
			`📊 Daily Room Creation Response Status: ${dailyResponse.status}`,
		);
		console.log(
			`📊 Daily Room Creation Response Headers:`,
			Object.fromEntries(dailyResponse.headers.entries()),
		);

		if (!dailyResponse.ok) {
			const errorData = await dailyResponse.text();
			console.error(`❌ Daily Room Creation Error:`, {
				status: dailyResponse.status,
				statusText: dailyResponse.statusText,
				errorData: errorData,
				roomId: roomId,
			});
			throw new Error(
				`Daily API error: ${dailyResponse.status} - ${errorData}`,
			);
		}

		const dailyRoom = await dailyResponse.json();
		console.log(`✅ Daily Room Created Successfully:`, {
			roomId: roomId,
			dailyRoom: dailyRoom,
			timestamp: new Date().toISOString(),
		});

		return new Response(
			JSON.stringify({
				success: true,
				dailyRoom: {
					id: dailyRoom.id,
					name: dailyRoom.name,
					url: dailyRoom.url,
				},
			}),
			{
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			},
		);
	} catch (error) {
		console.error("Daily room operation error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error.message,
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			},
		);
	}
}
