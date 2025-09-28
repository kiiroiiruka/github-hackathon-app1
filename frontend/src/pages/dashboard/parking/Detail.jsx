import { useNavigate } from "react-router-dom";

const ParkingDetail = () => {
	const navigate = useNavigate();

	const handleBackClick = () => {
		navigate("/dashboard/parking");
	};

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">ページ遷移例</h1>
			<button
				type="button"
				onClick={handleBackClick}
				className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
			>
				一覧に戻る
			</button>
		</div>
	);
};

export default ParkingDetail;
