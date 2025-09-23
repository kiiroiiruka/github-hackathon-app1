import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { auth } from "./firebase/firebaseConfig";
import { useAuthState } from "./hooks/useAuthState";
import Dashboard from "./pages/Dashboard";
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
				// ログイン済みの場合、ダッシュボード系のパス以外は /dashboard にリダイレクト
				if (!location.pathname.startsWith("/dashboard")) {
					navigate("/dashboard", { replace: true });
				}
			} else {
				// 未ログインの場合、ログイン画面にリダイレクト
				navigate("/", { replace: true });
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
			{/* ダッシュボード画面（サブルーティング対応） */}
			<Route path="/dashboard/*" element={<Dashboard />} />
		</Routes>
	);
}
export default App;
