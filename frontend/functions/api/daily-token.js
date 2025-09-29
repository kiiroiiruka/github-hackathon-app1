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
		const { roomId, userId, userName, userPhotoURL } = await request.json();

		if (!roomId || !userId) {
			return new Response(
				JSON.stringify({
					success: false,
					error: "Missing required fields: roomId, userId",
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

		// Generate meeting token using REST API
		const tokenResponse = await fetch(
			"https://api.daily.co/v1/meeting-tokens",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.DAILY_API_KEY}`,
				},
				body: JSON.stringify({
					properties: {
						room_name: roomId, // 参考プロジェクトと同じ形式
						user_name: userName || `User ${userId}`,
						is_owner: false,
						start_video_off: true, // 音声通話に最適化：ビデオはオフ
						start_audio_off: false, // 音声はオン
					},
				}),
			},
		);

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.text();
			throw new Error(
				`Daily API error: ${tokenResponse.status} - ${errorData}`,
			);
		}

		const tokenResult = await tokenResponse.json();

		return new Response(
			JSON.stringify({
				success: true,
				token: tokenResult.token,
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
		console.error("Daily token creation error:", error);
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
