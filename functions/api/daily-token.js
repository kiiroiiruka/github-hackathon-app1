import { DailyApi } from "@daily-co/daily-js";

export async function onRequest(context) {
	const { request, env } = context;

	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
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
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Initialize Daily API with environment variable
		const dailyApi = new DailyApi(env.DAILY_API_KEY);

		// Generate meeting token for user
		const tokenResult = await dailyApi.createMeetingToken({
			properties: {
				room_name: `room-${roomId}`,
				user_id: userId,
				user_name: userName || "Anonymous",
				is_owner: false,
				exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 1 hour
				enable_recording: "cloud",
				start_video_off: false,
				start_audio_off: false,
			},
		});

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
					"Access-Control-Allow-Headers": "Content-Type",
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