export async function onRequest(context) {
	const { request, env } = context;

	// Handle CORS preflight request
	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Max-Age": "86400",
			},
		});
	}

	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	try {
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
				name: `room-${roomId}`,
				privacy: "private",
				properties: {
					enable_recording: false,
					enable_chat: false, // チャット無効
					enable_screenshare: false, // 画面共有無効
					enable_knocking: false,
					enable_prejoin_ui: true, // 事前参加UI有効（音声設定確認用）
					start_video_off: true, // ビデオオフ
					start_audio_off: false, // 音声オン
					max_participants: 10, // 参加者数を削減
					nbf: Math.floor(Date.now() / 1000), // Room available now
					exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Expires in 24 hours
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
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			},
		);
	} catch (error) {
		console.error("Daily room creation error:", error);
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
				},
			},
		);
	}
}