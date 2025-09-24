import { useEffect, useState } from "react";
import carIcon from "../../assets/carIcon.png";
import { getUser } from "../../firebase";
import { useUserUid } from "../../hooks/useUserUid";

function HeaderComponent2({ title, onUserIconClick }) {
	const [userInfo, setUserInfo] = useState(null);
	const currentUserId = useUserUid();

	// ユーザー情報を取得
	useEffect(() => {
		const loadUserInfo = async () => {
			if (currentUserId) {
				try {
					const user = await getUser(currentUserId);
					setUserInfo(user);
				} catch (error) {
					console.error("ユーザー情報取得エラー:", error);
				}
			}
		};

		loadUserInfo();
	}, [currentUserId]);

	return (
		<header style={styles.header}>
			{/* 左側: 車アイコン */}
			<div style={styles.left}>
				<img src={carIcon} alt="Car Icon" style={styles.icon} />
			</div>

			{/* 中央: タイトル */}
			<div style={styles.center}>
				<h1 style={styles.title}>{title}</h1>
			</div>

			{/* 右側: ユーザーアイコン（常に button） */}
			<div style={styles.right}>
				<button
					type="button"
					style={
						userInfo?.photoURL
							? { ...styles.userIcon, ...styles.buttonReset }
							: { ...styles.userIconPlaceholder, ...styles.buttonReset }
					}
					onClick={onUserIconClick}
				>
					{userInfo?.photoURL ? (
						<img
							src={userInfo.photoURL}
							alt={userInfo.displayName || "User"}
							style={styles.userIconImg}
						/>
					) : (
						userInfo?.displayName?.charAt(0) || "?"
					)}
				</button>
			</div>
		</header>
	);
}

const styles = {
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "16px 24px",
		background: "#ffffff",
		boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
		borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
		position: "fixed",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 1000,
		overflow: "hidden",
	},
	left: {
		flex: 1,
		display: "flex",
		alignItems: "center",
		zIndex: 1,
	},
	center: {
		flex: 2,
		textAlign: "center",
		zIndex: 1,
	},
	right: {
		flex: 1,
		display: "flex",
		justifyContent: "flex-end",
		alignItems: "center",
		zIndex: 1,
	},
	icon: {
		width: "44px",
		height: "44px",
		borderRadius: "12px",
		boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
		transition: "transform 0.2s ease, box-shadow 0.2s ease",
		filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
	},
	// button のデフォルトリセット
	buttonReset: {
		background: "none",
		border: "none",
		padding: 0,
		cursor: "pointer",
	},
	userIcon: {
		width: "40px",
		height: "40px",
		borderRadius: "50%",
		overflow: "hidden",
		border: "3px solid rgba(102, 126, 234, 0.3)",
		boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
		transition: "transform 0.2s ease, box-shadow 0.2s ease",
	},
	userIconImg: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
		borderRadius: "50%",
		display: "block",
	},
	userIconPlaceholder: {
		width: "40px",
		height: "40px",
		borderRadius: "50%",
		background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
		border: "3px solid rgba(102, 126, 234, 0.3)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "18px",
		fontWeight: "700",
		color: "#ffffff",
		boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
		transition: "transform 0.2s ease, box-shadow 0.2s ease",
		textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
	},
	title: {
		margin: 0,
		fontSize: "22px",
		fontWeight: "700",
		color: "#000000",
		textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
		letterSpacing: "0.5px",
		textTransform: "uppercase",
	},
};

export default HeaderComponent2;
