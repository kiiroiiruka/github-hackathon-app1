import PropTypes from "prop-types";
import ProfileImage from "../ui/ProfileImage";

/**
 * フレンドアバターコンポーネント
 */
const FriendAvatar = ({ friend, size = "w-10 h-10", isSelected = false }) => {
	const sizeClass = size;
	const textSize = size.includes("12") ? "text-lg" : "text-sm";

	// カスタムフォールバック表示を持つProfileImageを使用
	return (
		<div className={`${sizeClass} rounded-full overflow-hidden border-2 shadow-sm ${
			isSelected ? "border-white" : "border-gray-200"
		}`}>
			{friend.photoURL ? (
				<ProfileImage
					src={friend.photoURL}
					alt={friend.name}
					className={`${sizeClass} rounded-full`}
					fallbackText={friend.name?.charAt(0) || "?"}
				/>
			) : (
				<div
					className={`${sizeClass} rounded-full flex items-center justify-center ${
						isSelected
							? "bg-white text-blue-500"
							: "bg-gradient-to-br from-gray-300 to-gray-400 text-white"
					}`}
				>
					<span className={`${textSize} font-bold`}>{friend.name?.charAt(0) || "?"}</span>
				</div>
			)}
		</div>
	);
};

FriendAvatar.propTypes = {
  friend: PropTypes.shape({
    name: PropTypes.string,
    photoURL: PropTypes.string,
  }).isRequired,
  size: PropTypes.string,
  isSelected: PropTypes.bool,
};

export default FriendAvatar;
