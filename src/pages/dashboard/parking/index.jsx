import { useNavigate } from "react-router-dom";

const ParkingScreen = () => {
	const navigate = useNavigate();

	const handleDetailClick = (parkingId) => {
		navigate(`/dashboard/parking/${parkingId}`);
	};

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">駐車場一覧</h1>
			<button
				type="button"
				onClick={() => handleDetailClick(456)}
				className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
			>
				ページに遷移するボタン
			</button>
		</div>
	);
};

export default ParkingScreen;
