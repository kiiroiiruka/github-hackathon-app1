import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "../../../components/Header/Header2";

const ParkingScreen = () => {
	const navigate = useNavigate();

	const handleDetailClick = (parkingId) => {
		navigate(`/dashboard/parking/${parkingId}`);
	};

	return (
		<div>
			<HeaderComponent2 title="駐車場一覧" />
			<div className="p-4 space-y-4" style={{ paddingTop: "88px" }}>
				<button
					type="button"
					onClick={() => handleDetailClick(456)}
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
				>
					ページに遷移するボタン
				</button>
			</div>
		</div>
	);
};

export default ParkingScreen;
