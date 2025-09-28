import React from "react";

const ParticipantCard = ({ participant, isLocal = false }) => {
	const { user_name, audio, photoURL, uid } = participant;
	
	// ユーザー名が長すぎる場合は省略
	const displayName = user_name && user_name.length > 8 
		? `${user_name.substring(0, 8)}...` 
		: user_name || "ユーザー名";

	return (
		<div style={styles.card}>
			{/* マイク状態アイコン */}
			<div style={styles.micIcon}>
				{audio ? (
					<div style={styles.micOnIcon}>🔊</div>
				) : (
					<div style={styles.micOffIcon}>🔇</div>
				)}
			</div>
			
			{/* プロフィール画像 */}
			<div style={styles.profileImage}>
				{photoURL ? (
					<img
						src={photoURL}
						alt={user_name || "User"}
						style={styles.profileImg}
					/>
				) : (
					<div style={styles.defaultAvatar}>
						{user_name ? user_name.charAt(0).toUpperCase() : "?"}
					</div>
				)}
			</div>
			
			{/* ユーザー名 */}
			<div style={styles.userName}>
				{isLocal ? `${displayName} (あなた)` : displayName}
			</div>
		</div>
	);
};

const styles = {
	card: {
		minWidth: "90px",
		height: "60px",
		backgroundColor: "#f8f9fa",
		borderRadius: "8px",
		padding: "6px",
		marginRight: "6px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
		border: "1px solid #e9ecef",
		boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
	},
	micIcon: {
		position: "absolute",
		top: "3px",
		right: "3px",
		width: "12px",
		height: "12px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	micOnIcon: {
		fontSize: "10px",
		color: "#28a745",
	},
	micOffIcon: {
		fontSize: "10px",
		color: "#dc3545",
	},
	profileImage: {
		width: "24px",
		height: "24px",
		marginBottom: "3px",
	},
	profileImg: {
		width: "100%",
		height: "100%",
		borderRadius: "50%",
		objectFit: "cover",
		border: "2px solid #ffffff",
		boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
	},
	defaultAvatar: {
		width: "100%",
		height: "100%",
		borderRadius: "50%",
		backgroundColor: "#667eea",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		color: "#ffffff",
		fontSize: "10px",
		fontWeight: "bold",
		border: "1px solid #ffffff",
		boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
	},
	userName: {
		fontSize: "9px",
		fontWeight: "500",
		color: "#495057",
		textAlign: "center",
		lineHeight: "1.2",
		maxWidth: "100px",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
};

export default ParticipantCard;
