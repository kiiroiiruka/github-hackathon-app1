import PropTypes from "prop-types";

/**
 * フレンドアバターコンポーネント
 */
const FriendAvatar = ({ friend, size = "w-10 h-10", isSelected = false }) => {
  const sizeClass = size;
  const textSize = size.includes("12") ? "text-lg" : "text-sm";

  if (friend.photoURL) {
    return (
      <img 
        src={friend.photoURL} 
        alt={friend.name} 
        className={`${sizeClass} rounded-full border-2 shadow-sm ${
          isSelected ? "border-white" : "border-gray-200"
        }`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center border-2 shadow-sm ${
      isSelected 
        ? "bg-white border-white text-blue-500" 
        : "bg-gradient-to-br from-gray-300 to-gray-400 border-gray-200 text-white"
    }`}>
      <span className={`${textSize} font-bold`}>
        {friend.name?.charAt(0)}
      </span>
    </div>
  );
};

FriendAvatar.propTypes = {
  friend: PropTypes.shape({
    name: PropTypes.string,
    photoURL: PropTypes.string
  }).isRequired,
  size: PropTypes.string,
  isSelected: PropTypes.bool
};

export default FriendAvatar;