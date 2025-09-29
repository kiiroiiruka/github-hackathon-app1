import React, { useState } from "react";
import ParticipantCard from "../ParticipantCard/ParticipantCard";

const AudioCallFooter = ({
	participants = [],
	participantPhotoURLs = new Map(),
}) => {
	const [isCollapsed, setIsCollapsed] = useState(false);

	const toggleCollapse = () => {
		setIsCollapsed(!isCollapsed);
	};

	return (
		<div
			style={{
				...styles.footer,
				height: isCollapsed ? "20px" : "90px",
			}}
		>
			{/* 折りたたみボタン（常に表示） */}
			<div style={styles.collapseButton} onClick={toggleCollapse}>
				<div style={styles.handleText}>参加メンバー</div>
				<div
					style={{
						...styles.collapseIcon,
						transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
					}}
				>
					▼
				</div>
			</div>

			{/* 展開時の参加者カードエリア */}
			{!isCollapsed && (
				<div style={styles.participantsSection}>
					<div style={styles.participantsLabel}>
						参加者: {participants.length}人
					</div>
					<div style={styles.cardsContainer}>
						<div style={styles.cardsScroll}>
							{participants.map((participant, index) => {
								// 安定したkeyを生成（session_id、user_name、indexを組み合わせ）
								const stableKey =
									participant.session_id ||
									`${participant.user_name}-${index}` ||
									`participant-${index}`;

								return (
									<ParticipantCard
										key={stableKey}
										participant={participant}
										isLocal={participant.local}
										participantPhotoURLs={participantPhotoURLs}
									/>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const styles = {
	footer: {
		position: "fixed",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "#ffffff",
		borderTop: "1px solid #e9ecef",
		boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.15)",
		zIndex: 1000,
		transition: "height 0.3s ease",
		padding: "8px 12px",
		paddingBottom: "14px",
	},
	collapseButton: {
		position: "absolute",
		top: "-30px",
		left: "50%",
		transform: "translateX(-50%)",
		width: "120px",
		height: "30px",
		backgroundColor: "#ffffff",
		border: "1px solid #e9ecef",
		borderBottom: "none",
		borderRadius: "15px 15px 0 0",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
		boxShadow: "0 -3px 6px rgba(0, 0, 0, 0.15)",
		transition: "all 0.2s ease",
		gap: "6px",
	},
	handleText: {
		fontSize: "12px",
		color: "#495057",
		fontWeight: "600",
		letterSpacing: "0.5px",
	},
	collapseIcon: {
		fontSize: "12px",
		color: "#495057",
		fontWeight: "bold",
		transition: "transform 0.3s ease",
	},
	participantsSection: {
		marginBottom: "2px",
	},
	participantsLabel: {
		fontSize: "11px",
		fontWeight: "600",
		color: "#495057",
		marginBottom: "2px",
		lineHeight: "1.2",
	},
	cardsContainer: {
		overflowX: "auto",
		overflowY: "hidden",
		scrollbarWidth: "thin",
		marginLeft: "-12px",
		marginRight: "-12px",
		paddingLeft: "12px",
		paddingRight: "12px",
	},
	cardsScroll: {
		display: "flex",
		flexDirection: "row",
		gap: "6px",
		paddingBottom: "2px",
		minWidth: "fit-content",
		marginBottom: "2px",
	},
};

export default AudioCallFooter;
