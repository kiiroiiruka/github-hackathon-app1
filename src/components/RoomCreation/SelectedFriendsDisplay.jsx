import PropTypes from "prop-types";
import FriendAvatar from "../FriendAvatar/FriendAvatar";

/**
 * 選択済みフレンド表示コンポーネント
 */
const SelectedFriendsDisplay = ({ selectedFriends, onRemoveFriend }) => {
  if (selectedFriends.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedFriends.map((friend) => (
          <div
            key={friend.uid}
            className="flex items-center bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full px-3 py-2 text-sm"
          >
            <div className="flex items-center">
              <div className="mr-2">
                <FriendAvatar 
                  friend={{
                    name: friend.displayName,
                    photoURL: friend.photoURL
                  }}
                  size="w-6 h-6"
                />
              </div>
              <span className="text-gray-800 font-medium">{friend.displayName}</span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveFriend(friend)}
              className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

SelectedFriendsDisplay.propTypes = {
  selectedFriends: PropTypes.array.isRequired,
  onRemoveFriend: PropTypes.func.isRequired
};

export default SelectedFriendsDisplay;