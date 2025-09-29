import PropTypes from "prop-types";
import FriendAvatar from "../FriendAvatar/FriendAvatar";

/**
 * 選択済みフレンド表示コンポーネント
 */
const SelectedFriendsDisplay = ({ selectedFriends, onRemoveFriend }) => {
	console.log("SelectedFriendsDisplay - selectedFriends:", selectedFriends);
	console.log(
		"SelectedFriendsDisplay - selectedFriends.length:",
		selectedFriends?.length,
	);

	if (!selectedFriends || selectedFriends.length === 0) return null;

	return (
		<div className="mb-4">
			<div className="relative">
				<div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
					{selectedFriends.map((friend) => (
						<div
							key={friend.uid}
							className="flex items-center bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full px-3 py-2 text-sm flex-shrink-0 min-w-fit"
						>
							<div className="flex items-center">
								<div className="mr-2">
									<FriendAvatar
										friend={{
											name: friend.displayName,
											photoURL: friend.photoURL,
										}}
										size="w-6 h-6"
									/>
								</div>
								<span className="text-gray-800 font-medium whitespace-nowrap">
									{friend.displayName}
								</span>
							</div>
							<button
								type="button"
								onClick={() => onRemoveFriend(friend)}
								className="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
							>
								×
							</button>
						</div>
					))}
				</div>
				{/* スクロールインジケーター */}
				{selectedFriends.length > 2 && (
					<div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none flex items-center justify-center">
						<span className="text-gray-400 text-xs">→</span>
					</div>
				)}
			</div>
		</div>
	);
};

SelectedFriendsDisplay.propTypes = {
	selectedFriends: PropTypes.array.isRequired,
	onRemoveFriend: PropTypes.func.isRequired,
};

export default SelectedFriendsDisplay;
