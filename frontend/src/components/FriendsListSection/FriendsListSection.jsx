import PropTypes from "prop-types";
import FriendAvatar from "../FriendAvatar/FriendAvatar";

/**
 * フレンド一覧アイテムコンポーネント
 */
const FriendListItem = ({ friend, isSelected, onToggle }) => (
  <button
    type="button"
    className={`relative flex items-center gap-4 p-4 rounded-xl transition-all duration-200 w-full text-left transform hover:scale-[1.02] ${
      isSelected
        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
        : "bg-gray-50 hover:bg-gray-100 text-gray-800 hover:shadow-md"
    }`}
    onClick={() => onToggle(friend)}
  >
    <FriendAvatar friend={friend} size="w-12 h-12" isSelected={isSelected} />
    
    <div className="flex-1">
      <span className={`font-medium ${isSelected ? "text-white" : "text-gray-800"}`}>
        {friend.name}
      </span>
      <div className={`text-sm ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
        {isSelected ? "選択中" : "タップして選択"}
      </div>
    </div>
    
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
      isSelected ? "bg-white border-white" : "border-gray-300"
    }`}>
      {isSelected && <span className="text-blue-500 text-sm">✓</span>}
    </div>
  </button>
);

FriendListItem.propTypes = {
  friend: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

/**
 * フレンド一覧セクションコンポーネント
 */
const FriendsListSection = ({ friends, selectedFriends, onToggleFriend }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6">
    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <span className="text-2xl mr-2">👫</span>
      フレンド一覧
    </h2>
    
    <div className="max-h-[350px] overflow-y-auto">
      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <span className="text-6xl mb-4">😔</span>
          <p className="text-center text-lg">フレンドが見つかりません</p>
          <p className="text-center text-sm mt-2">まずはフレンドを追加してみましょう</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {friends.map((friend) => {
            const isSelected = selectedFriends.find((f) => f.uid === friend.uid);
            return (
              <FriendListItem
                key={friend.uid}
                friend={friend}
                isSelected={!!isSelected}
                onToggle={onToggleFriend}
              />
            );
          })}
        </div>
      )}
    </div>
  </div>
);

FriendsListSection.propTypes = {
  friends: PropTypes.array.isRequired,
  selectedFriends: PropTypes.array.isRequired,
  onToggleFriend: PropTypes.func.isRequired
};

export default FriendsListSection;