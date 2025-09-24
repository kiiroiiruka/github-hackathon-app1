import { DailyApi } from "@daily-co/daily-js";

const dailyApi = new DailyApi(env.DAILY_API_KEY);

export async function onRequest(context) {
	const { request, env } = context;

	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	try {
		const { roomId, userId, userName, userPhotoURL } = await request.json();

		if (!roomId || !userId) {
			return new Response("Missing required fields", { status: 400 });
		}

		// Generate meeting token for user
		const token = await dailyApi.createMeetingToken({
			properties: {
				room_name: `room-${roomId}`,
				user_id: userId,
				user_name: userName || "Anonymous",
				avatar_url: userPhotoURL || "",
				is_owner: false,
				exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 1 hour
				permissions: {
					canSend: true,
					canAdmin: false,
					canReceive: true,
				},
			},
		});

		return new Response(
			JSON.stringify({
				success: true,
				token: token.token,
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

export async function onRequestOptions() {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}
