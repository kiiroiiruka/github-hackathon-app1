import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "@/components/Header/Header2";
import {
	acceptFriendRequest,
	getFriendRequests,
	getSentFriendRequests,
	getUser,
	logout,
	rejectFriendRequest,
	updateUserMessage,
} from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";

const HomeScreen = () => {
	const navigate = useNavigate();
	const [friendRequests, setFriendRequests] = useState([]);
	const [sentFriendRequests, setSentFriendRequests] = useState([]);
	const [userMessage, setUserMessage] = useState("");
	const [currentUser, setCurrentUser] = useState(null);
	const currentUserId = useUserUid();

	// ユーザー情報を取得
	const loadCurrentUser = useCallback(async () => {
		if (!currentUserId) return;

		try {
			const user = await getUser(currentUserId);
			setCurrentUser(user);
			setUserMessage(user?.userShortMessage || "");
		} catch (error) {
			console.error("ユーザー情報取得エラー:", error);
		}
	}, [currentUserId]);

	// 受信した友達リクエストを取得
	const loadFriendRequests = useCallback(async () => {
		if (!currentUserId) return;

		try {
			const requests = await getFriendRequests(currentUserId);
			setFriendRequests(requests);
		} catch (error) {
			console.error("友達リクエスト取得エラー:", error);
		}
	}, [currentUserId]);

	// 送信した友達リクエストを取得
	const loadSentFriendRequests = useCallback(async () => {
		if (!currentUserId) return;

		try {
			const sentRequests = await getSentFriendRequests(currentUserId);
			setSentFriendRequests(sentRequests);
		} catch (error) {
			console.error("送信した友達リクエスト取得エラー:", error);
		}
	}, [currentUserId]);

	// マウント時にデータを取得
	useEffect(() => {
		if (currentUserId) {
			loadCurrentUser();
			loadFriendRequests();
			loadSentFriendRequests();
		}
	}, [
		currentUserId,
		loadCurrentUser,
		loadFriendRequests,
		loadSentFriendRequests,
	]);

	// 友達リクエスト承認
	const handleAcceptRequest = async (requestId, fromUserId) => {
		try {
			await acceptFriendRequest(requestId, fromUserId, currentUserId);
			await loadFriendRequests();
			await loadSentFriendRequests();
			alert("友達リクエストを承認しました！");
		} catch (error) {
			console.error("友達リクエスト承認エラー:", error);
			alert("友達リクエストの承認に失敗しました");
		}
	};

	// 友達リクエスト拒否
	const handleRejectRequest = async (requestId) => {
		try {
			await rejectFriendRequest(requestId);
			await loadFriendRequests();
			await loadSentFriendRequests();
			alert("友達リクエストを拒否しました");
		} catch (error) {
			console.error("友達リクエスト拒否エラー:", error);
			alert("友達リクエストの拒否に失敗しました");
		}
	};

	// 一言メッセージ更新
	const handleUpdateMessage = async () => {
		if (!currentUserId) return;

		try {
			await updateUserMessage(currentUserId, userMessage);
			await loadCurrentUser();
			alert("一言メッセージを更新しました！");
		} catch (error) {
			console.error("一言メッセージ更新エラー:", error);
			alert("一言メッセージの更新に失敗しました");
		}
	};

	// ログアウト処理
	const handleLogout = async () => {
		try {
			await logout();
			console.log("ログアウトしました");
		} catch (error) {
			console.error("ログアウトエラー:", error);
		}
	};

	// ヘッダーのユーザーアイコンを押したときの処理
	const handleUserIconClick = () => {
		navigate("/dashboard/UserInformation");
	};

	return (
		<div>
			<HeaderComponent2 title="ホーム" onUserIconClick={handleUserIconClick} />
			<div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
				{/* 一言メッセージ編集セクション */}
				<div className="bg-white rounded-lg shadow-md p-4 mb-6">
					<h2 className="text-lg font-semibold mb-3">一言メッセージ</h2>
					<div className="flex gap-2">
						<input
							type="text"
							value={userMessage}
							onChange={(e) => setUserMessage(e.target.value)}
							placeholder="一言メッセージを入力（例：よろしくお願いします！）"
							className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							maxLength={50}
						/>
						<button
							type="button"
							onClick={handleUpdateMessage}
							disabled={!userMessage.trim()}
							className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
						>
							更新
						</button>
					</div>
					{currentUser?.userShortMessage && (
						<p className="text-sm text-gray-600 mt-2">
							現在のメッセージ: "{currentUser.userShortMessage}"
						</p>
					)}
					{currentUser?.createdAt && (
						<p className="text-xs text-gray-500 mt-1">
							アカウント作成日:{" "}
							{new Date(currentUser.createdAt.toDate()).toLocaleDateString(
								"ja-JP",
							)}
						</p>
					)}
				</div>

				{/* 送信した友達リクエスト */}
				<div className="bg-white rounded-lg shadow-md p-4 mb-6">
					<h2 className="text-lg font-semibold mb-3">送信した友達リクエスト</h2>
					<div className="mb-3">
						<button
							type="button"
							onClick={() => navigate("/dashboard/home/inviting")}
							className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
						>
							招待中のルームを見る
						</button>
					</div>
					{sentFriendRequests.length === 0 ? (
						<p className="text-gray-500">送信中の友達リクエストはありません</p>
					) : (
						<div className="space-y-3">
							{sentFriendRequests.map((request) => (
								<div
									key={request.id}
									className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-yellow-50"
								>
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
											{request.recipientPhotoURL ? (
												<img
													src={request.recipientPhotoURL}
													alt={request.recipientName}
													className="w-10 h-10 rounded-full object-cover"
												/>
											) : (
												<span className="text-gray-600 text-sm">?</span>
											)}
										</div>
										<div>
											<p className="font-medium">{request.recipientName}</p>
											<p className="text-sm text-gray-500">
												ID: {request.recipientUid}
											</p>
											{request.senderMessage && (
												<p className="text-sm text-blue-600 mt-1 italic">
													あなたのメッセージ: "{request.senderMessage}"
												</p>
											)}
										</div>
									</div>
									<div className="flex items-center">
										<span className="text-sm text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
											承認待ち
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* 受信した友達リクエスト */}
				<div className="bg-white rounded-lg shadow-md p-4 mb-6">
					<h2 className="text-lg font-semibold mb-3">受信した友達リクエスト</h2>
					{friendRequests.length === 0 ? (
						<p className="text-gray-500">友達リクエストはありません</p>
					) : (
						<div className="space-y-3">
							{friendRequests.map((request) => (
								<div
									key={request.id}
									className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
								>
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
											{request.senderPhotoURL ? (
												<img
													src={request.senderPhotoURL}
													alt={request.senderName}
													className="w-10 h-10 rounded-full object-cover"
												/>
											) : (
												<span className="text-gray-600 text-sm">?</span>
											)}
										</div>
										<div>
											<p className="font-medium">{request.senderName}</p>
											<p className="text-sm text-gray-500">
												ID: {request.senderUid}
											</p>
											{request.senderMessage && (
												<p className="text-sm text-blue-600 mt-1 italic">
													"{request.senderMessage}"
												</p>
											)}
											{request.senderCreatedAt && (
												<p className="text-xs text-gray-400 mt-1">
													アカウント作成日:{" "}
													{new Date(
														request.senderCreatedAt.toDate(),
													).toLocaleDateString("ja-JP")}
												</p>
											)}
										</div>
									</div>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={() =>
												handleAcceptRequest(request.id, request.fromUserId)
											}
											className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded transition-colors"
										>
											承認
										</button>
										<button
											type="button"
											onClick={() => handleRejectRequest(request.id)}
											className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded transition-colors"
										>
											拒否
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* ログアウトボタン */}
				<button
					type="button"
					onClick={handleLogout}
					className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
				>
					ログアウト
				</button>
			</div>
		</div>
	);
};

export default HomeScreen;
