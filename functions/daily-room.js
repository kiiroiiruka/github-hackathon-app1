import { DailyApi } from "@daily-co/daily-js";

// Daily API configuration
const dailyApi = new DailyApi(env.DAILY_API_KEY);

export async function onRequest(context) {
	const { request, env } = context;

	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	try {
		const { roomId, roomName, ownerUid } = await request.json();

		if (!roomId || !roomName || !ownerUid) {
			return new Response("Missing required fields", { status: 400 });
		}

		// Create Daily room
		const dailyRoom = await dailyApi.createRoom({
			name: `room-${roomId}`,
			privacy: "private",
			properties: {
				enable_recording: false,
				enable_chat: true,
				enable_screenshare: true,
				enable_knocking: false,
				enable_prejoin_ui: true,
				start_video_off: false,
				start_audio_off: false,
				max_participants: 20,
				nbf: Math.floor(Date.now() / 1000), // Room available now
				exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Expires in 24 hours
				owner_id: ownerUid,
				room_metadata: {
					firebase_room_id: roomId,
					room_name: roomName,
				},
			},
		});

		return new Response(
			JSON.stringify({
				success: true,
				dailyRoom: {
					id: dailyRoom.id,
					name: dailyRoom.name,
					url: dailyRoom.url,
					token: dailyRoom.token,
				},
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

// Handle preflight requests
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
