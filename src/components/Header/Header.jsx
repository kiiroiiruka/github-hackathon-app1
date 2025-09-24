import React from "react";
import { useNavigate } from "react-router-dom";

function HeaderComponent({ title, onBack }) {
	const navigate = useNavigate();

	// 戻るボタンを押したときの処理
	const handleBack = () => {
		if (onBack) {
			// 親から渡された関数があればそれを優先
			onBack();
		} else {
			// 渡されなければデフォルトの戻る処理
			navigate(-1);
		}
	};

	return (
		<header style={styles.header}>
			<button type="button" onClick={handleBack} style={styles.button}>
				← 戻る
			</button>
			<h1 style={styles.title}>{title}</h1>
		</header>
	);
}

// スタイル
const styles = {
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "16px 24px",
		background: "#ffffff",
		boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
		borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
		position: "fixed",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 1000,
	},
	left: {
		flex: 1,
		display: "flex",
		alignItems: "center",
	},
	center: {
		flex: 2,
		textAlign: "center",
	},
	right: {
		flex: 1,
		display: "flex",
		justifyContent: "flex-end",
		alignItems: "center",
	},
	button: {
		color: "#000000",

		fontSize: "16px",
		fontWeight: "600",
		textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
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

export default HeaderComponent;
