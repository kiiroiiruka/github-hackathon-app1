import PropTypes from "prop-types";

/**
 * ルーム名入力コンポーネント
 */
const RoomNameInput = ({ roomName, onChange }) => {
	return (
		<div className="bg-white rounded-2xl shadow-lg p-6">
			<div className="flex items-center mb-4">
				<span className="text-2xl mr-3">📝</span>
				<h2 className="text-xl font-semibold text-gray-800">ルーム名</h2>
			</div>
			<div className="relative">
				<input
					type="text"
					value={roomName}
					onChange={(e) => onChange(e.target.value)}
					placeholder="ルーム名を入力してください..."
					className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-gray-800 placeholder-gray-400"
				/>
				{roomName && (
					<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
						<span className="text-green-500">✓</span>
					</div>
				)}
			</div>
			<p className="text-sm text-gray-500 mt-2">
				友達にわかりやすい名前をつけましょう
			</p>
		</div>
	);
};

RoomNameInput.propTypes = {
	roomName: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
};

export default RoomNameInput;
