import { onRequest as __api_daily_room_js_onRequest } from "C:\\Users\\kiiro\\Github\\github-hackathon-app1\\functions\\api\\daily-room.js"
import { onRequest as __api_daily_token_js_onRequest } from "C:\\Users\\kiiro\\Github\\github-hackathon-app1\\functions\\api\\daily-token.js"

export const routes = [
    {
      routePath: "/api/daily-room",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_daily_room_js_onRequest],
    },
  {
      routePath: "/api/daily-token",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_daily_token_js_onRequest],
    },
  ]