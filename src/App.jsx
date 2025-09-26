import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { useAuthState } from "./hooks/useAuthState";
import Dashboard from "./pages/Dashboard";
import UserPolicy from "./pages/dashboard/policy/UserPolicy";
import LoginScreen from "./pages/LoginScreen";

function App() {
	const navigate = useNavigate(); //遷移先を指定
	const location = useLocation(); //現在のURLを取得

	// 認証状態を監視し、atomに反映
	useAuthState();

	//ログイン状態の変化に応じて遷移先が変わる関数
	const routeChange = useCallback(
		(user) => {
			if (user) {
				// ログイン済み: /dashboard 配下 もしくは 公開ページ(/policy)は許可
				const isDashboard = location.pathname.startsWith("/dashboard");
				const isPublic = location.pathname === "/policy";
				if (!isDashboard && !isPublic) {
					navigate("/dashboard", { replace: true });
				}
			} else {
				// 未ログイン: ルート(/) と 公開ページ(/policy)は許可
				const isRoot = location.pathname === "/";
				const isPublic = location.pathname === "/policy";
				if (!isRoot && !isPublic) {
					navigate("/", { replace: true });
				}
			}
		},
		[location.pathname, navigate],
	);

	useEffect(() => {
		// 開発・本番共通でFirebase認証状態を監視
		const unsub = onAuthStateChanged(auth, routeChange);
		return () => unsub();
	}, [routeChange]);

	return (
		<Routes>
			{/* ログイン画面 */}
			<Route path="/" element={<LoginScreen />} />
			{/* 公開ページ */}
			<Route path="/policy" element={<UserPolicy />} />
			{/* ダッシュボード画面（サブルーティング対応） */}
			<Route path="/dashboard/*" element={<Dashboard />} />
		</Routes>
	);
}
export default App;
