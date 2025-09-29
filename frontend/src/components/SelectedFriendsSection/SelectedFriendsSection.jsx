import PropTypes from "prop-types";
import FriendAvatar from "../FriendAvatar/FriendAvatar";

/**
 * 選択済みフレンド表示セクション
 */
const SelectedFriendsSection = ({ selectedFriends, clearAllSelection }) => (
	<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
		<div className="flex justify-between items-center mb-4">
			<h2 className="text-lg font-semibold text-gray-800 flex items-center">
				<span className="text-2xl mr-2">✅</span>
				選択中のフレンド ({selectedFriends.length}名)
			</h2>
			{selectedFriends.length > 0 && (
				<button
					type="button"
					onClick={clearAllSelection}
					className="px-3 py-1 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
				>
					全て削除
				</button>
			)}
		</div>

		<div className="min-h-[100px] border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
			{selectedFriends.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-full text-gray-400">
					<span className="text-4xl mb-2">👥</span>
					<p className="text-center">下からフレンドを選択してください</p>
				</div>
			) : (
				<div
					className="flex gap-3 overflow-x-auto pb-2"
					style={{ scrollbarWidth: "thin" }}
				>
					{selectedFriends.map((friend) => (
						<div
							key={friend.uid}
							className="flex flex-col items-center gap-2 p-3 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl shadow-sm min-w-[80px] flex-shrink-0"
						>
							<div className="relative">
								<FriendAvatar
									friend={friend}
									isSelected={false}
									size="w-12 h-12"
								/>
								<div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
									<span className="text-xs text-white">✓</span>
								</div>
							</div>
							<div className="text-center">
								<div
									className="text-xs font-medium text-gray-800 truncate max-w-[60px]"
									title={friend.name}
								>
									{friend.name}
								</div>
								<div className="text-xs text-gray-600">招待予定</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	</div>
);

SelectedFriendsSection.propTypes = {
	selectedFriends: PropTypes.array.isRequired,
	clearAllSelection: PropTypes.func.isRequired,
};

export default SelectedFriendsSection;
