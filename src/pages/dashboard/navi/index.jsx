import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "../../../components/Header/Header2";

const NaviCreateScreen = () => {
	const navigate = useNavigate();

	const handleTryPageClick = () => {
		navigate("/dashboard/navi/try");
	};

	const handleRoomCreateClick = () => {
		navigate("/dashboard/navi/room");
	};

	const handleApprovalClick = () => {
		navigate("/dashboard/navi/approval");
	};

	return (
		<div>
			<HeaderComponent2 title="ナビ作成" />
			<div className="p-4 space-y-4" style={{ paddingTop: "88px" }}>
				<button
					type="button"
					onClick={handleTryPageClick}
					className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
				>
					地図ページへ
				</button>
				<button
					type="button"
					onClick={handleRoomCreateClick}
					className="block w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
				>
					ルーム作成へ
				</button>
				<button
					type="button"
					onClick={handleApprovalClick}
					className="block w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
				>
					🤝 承認管理ページへ
				</button>
			</div>
		</div>
	);
};

export default NaviCreateScreen;
