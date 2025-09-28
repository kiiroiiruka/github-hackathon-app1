import React, { useState, useEffect, useRef } from "react";
import { useCurrentUser } from "../../hooks/useUser";

const ParticipantCard = ({ participant, isLocal = false }) => {
	const { user_name, audio, photoURL, uid, session_id } = participant;
	const [imageError, setImageError] = useState(false);
	const imageErrorRef = useRef(new Set()); // 画像エラー状態を永続化
	const currentUser = useCurrentUser(); // 現在のユーザー情報を取得
	
	// ユーザーIDを基にアイコンURLを生成する関数
	const generateIconURL = (userName, userId) => {
		// FirebaseドキュメントIDのような長い文字列の場合は、より短い表示名を使用
		let displayName = userName;
		if (userName && (userName.length > 20 || /^[a-zA-Z0-9_-]{20,}$/.test(userName))) {
			// 長いIDのような文字列の場合は、最初の文字を使用
			displayName = userName.charAt(0).toUpperCase();
		} else if (userName) {
			// 通常のユーザー名の場合は、最初の文字を使用
			displayName = userName.charAt(0).toUpperCase();
		} else {
			// ユーザー名がない場合は、UIDの最初の文字を使用
			displayName = (userId || session_id || "?").charAt(0).toUpperCase();
		}
		
		// ユーザーIDを基に一貫した色を生成
		const userIdentifier = userId || session_id || userName || "default";
		const colors = [
			"6366f1", // indigo
			"8b5cf6", // purple
			"ec4899", // pink
			"ef4444", // red
			"f97316", // orange
			"eab308", // yellow
			"22c55e", // green
			"06b6d4", // cyan
			"3b82f6", // blue
			"84cc16", // lime
			"f59e0b", // amber
			"10b981", // emerald
		];
		
		// ユーザーIDのハッシュ値を計算して色を決定
		let hash = 0;
		for (let i = 0; i < userIdentifier.length; i++) {
			hash = ((hash << 5) - hash + userIdentifier.charCodeAt(i)) & 0xffffffff;
		}
		const colorIndex = Math.abs(hash) % colors.length;
		const backgroundColor = colors[colorIndex];
		
		return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${backgroundColor}&color=fff&size=96`;
	};
	
	// アイコンURLを生成（Googleアイコンを優先）
	const getIconURL = () => {
		// ローカル参加者でGoogleアイコンが利用可能な場合はそれを使用
		if (isLocal && currentUser?.photoURL) {
			return currentUser.photoURL;
		}
		
		// FirebaseのmembersデータからphotoURLが取得できる場合はそれを使用
		if (photoURL) {
			return photoURL;
		}
		
		// それ以外の場合は生成されたアイコンを使用
		return generateIconURL(user_name, uid || session_id);
	};
	
	const iconURL = getIconURL();
	
	// 画像エラー状態を初期化
	useEffect(() => {
		if (iconURL && imageErrorRef.current.has(iconURL)) {
			setImageError(true);
		} else {
			setImageError(false);
		}
	}, [iconURL]);
	
	// デバッグログを追加（重要な情報のみ）
	console.log("ParticipantCard Debug:", {
		user_name,
		isLocal,
		participantLocal: participant.local,
		audio,
		session_id: participant.session_id,
		uid: uid,
		iconURL,
		imageError,
		willShowImage: !imageError,
		hasGooglePhoto: !!(isLocal && currentUser?.photoURL),
		hasFirebasePhoto: !!photoURL,
		usingGeneratedIcon: !(isLocal && currentUser?.photoURL) && !photoURL
	});
	
	// ユーザー名が長すぎる場合は省略
	const displayName = user_name && user_name.length > 8 
		? `${user_name.substring(0, 8)}...` 
		: user_name || "ユーザー名";

	// カードの色を音声状態に応じて変更
	const cardStyle = {
		...styles.card,
		backgroundColor: audio ? "#e8f5e8" : "#ffeaea", // 音声ON: 薄緑、OFF: 薄赤
		borderColor: audio ? "#28a745" : "#dc3545", // ボーダー色も変更
	};
	
	// デバッグログを追加（音声状態の確認）
	console.log("ParticipantCard state:", {
		user_name,
		audio,
		cardColor: audio ? "green" : "red",
		isLocal,
		participantLocal: participant.local,
		session_id: participant.session_id,
		hasPhotoURL: !!photoURL,
		imageError
	});

	return (
		<div style={cardStyle}>
			{/* マイク状態アイコン */}
			<div style={styles.micIcon}>
				{audio ? (
					<div style={styles.micOnIcon}>🎤</div>
				) : (
					<div style={styles.micOffIcon}>🔇</div>
				)}
			</div>
			
			{/* プロフィール画像 */}
			<div style={styles.profileImage}>
				{!imageError ? (
					<img
						src={iconURL}
						alt={user_name || "User"}
						style={styles.profileImg}
						onLoad={() => {
							console.log("🖼️ アイコン読み込み成功:", {
								user_name,
								iconURL,
								session_id: participant.session_id
							});
						}}
						onError={() => {
							console.log("🖼️ アイコン読み込みエラー:", {
								user_name,
								iconURL,
								session_id: participant.session_id
							});
							// エラー状態を永続化
							if (iconURL) {
								imageErrorRef.current.add(iconURL);
								console.log("🖼️ エラー状態を永続化:", iconURL);
							}
							setImageError(true);
						}}
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
		boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
	},
	defaultAvatar: {
		width: "100%",
		height: "100%",
		borderRadius: "50%",
		backgroundColor: "#6c757d",
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
