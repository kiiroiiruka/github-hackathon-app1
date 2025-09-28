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
						} 
					},
				);
			}

			// Delete Daily room using REST API
			const dailyResponse = await fetch(`https://api.daily.co/v1/rooms/${roomId}`, {
				method: "DELETE",
				headers: {
					"Authorization": `Bearer ${env.DAILY_API_KEY}`,
				},
			});

			if (!dailyResponse.ok) {
				const errorData = await dailyResponse.text();
				throw new Error(`Daily API error: ${dailyResponse.status} - ${errorData}`);
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
					} 
				},
			);
		}

		// Create Daily room using REST API
		const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${env.DAILY_API_KEY}`,
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

		if (!dailyResponse.ok) {
			const errorData = await dailyResponse.text();
			throw new Error(`Daily API error: ${dailyResponse.status} - ${errorData}`);
		}

		const dailyRoom = await dailyResponse.json();

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