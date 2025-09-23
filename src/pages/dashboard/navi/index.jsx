import { useNavigate } from "react-router-dom";

const NaviCreateScreen = () => {
	const navigate = useNavigate();

	const handleTryPageClick = () => {
		navigate("/dashboard/navi/try");
	};

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">ナビ作成</h1>
			<button
				type="button"
				onClick={handleTryPageClick}
				className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
			>
				地図ページへ
			</button>
		</div>
	);
};

export default NaviCreateScreen;

