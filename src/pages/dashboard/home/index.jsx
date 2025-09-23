import { useCallback, useEffect, useState } from "react";
import { logout } from "@/firebase/auth/login";
import {
	acceptFriendRequest,
	getFriendRequests,
	rejectFriendRequest,
	sendFriendRequest,
} from "@/firebase/friendRequests";
import { updateUserMessage } from "@/firebase/users";
import { getUser } from "@/firebase/users/getUser";
import { useUserUid } from "@/hooks/useUserUid";

const HomeScreen = () => {
	const [friendIdInput, setFriendIdInput] = useState("");
	const [friendRequests, setFriendRequests] = useState([]);
	const [loading, setLoading] = useState(false);
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

	// 友達リクエストを取得
	const loadFriendRequests = useCallback(async () => {
		if (!currentUserId) return;

		try {
			const requests = await getFriendRequests(currentUserId);
			setFriendRequests(requests);
		} catch (error) {
			console.error("友達リクエスト取得エラー:", error);
		}
	}, [currentUserId]);

	// コンポーネントマウント時にデータを取得
	useEffect(() => {
		if (currentUserId) {
			loadCurrentUser();
			loadFriendRequests();
		}
	}, [currentUserId, loadCurrentUser, loadFriendRequests]);

	// 友達リクエスト送信
	const handleSendFriendRequest = async () => {
		if (!friendIdInput.trim() || !currentUserId) return;

		setLoading(true);
		try {
			// 相手のユーザー情報を取得
			const targetUser = await getUser(friendIdInput.trim());

			if (!targetUser) {
				alert("指定されたユーザーIDが見つかりません");
				return;
			}

			if (!currentUser) {
				alert("ユーザー情報の取得に失敗しました");
				return;
			}

			const senderData = {
				displayName: currentUser.displayName || "ユーザー",
				photoURL: currentUser.photoURL || "",
				userShortMessage: currentUser.userShortMessage || "",
				createdAt: currentUser.createdAt || null, // アカウント作成日も含める
			};

			await sendFriendRequest(currentUserId, friendIdInput.trim(), senderData);
			setFriendIdInput("");
			alert(`${targetUser.displayName}さんに友達リクエストを送信しました！`);
		} catch (error) {
			console.error("友達リクエスト送信エラー:", error);
			if (
				error.message.includes("not found") ||
				error.message.includes("見つかりません")
			) {
				alert("指定されたユーザーIDが見つかりません");
			} else {
				alert("友達リクエストの送信に失敗しました");
			}
		} finally {
			setLoading(false);
		}
	};

	// 友達リクエスト承認
	const handleAcceptRequest = async (requestId, fromUserId) => {
		try {
			await acceptFriendRequest(requestId, fromUserId, currentUserId);
			await loadFriendRequests(); // リストを更新
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
			await loadFriendRequests(); // リストを更新
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
			await loadCurrentUser(); // ユーザー情報を再読み込み
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

	return (
		<div className="p-4 max-w-2xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">ホーム</h1>

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

			{/* 友達リクエスト送信セクション */}
			<div className="bg-white rounded-lg shadow-md p-4 mb-6">
				<h2 className="text-lg font-semibold mb-3">友達を追加</h2>
				<div className="flex gap-2">
					<input
						type="text"
						value={friendIdInput}
						onChange={(e) => setFriendIdInput(e.target.value)}
						placeholder="ユーザーIDを入力"
						className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="button"
						onClick={handleSendFriendRequest}
						disabled={loading || !friendIdInput.trim()}
						className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
					>
						{loading ? "送信中..." : "送信"}
					</button>
				</div>
			</div>

			{/* 友達リクエスト受信セクション */}
			<div className="bg-white rounded-lg shadow-md p-4 mb-6">
				<h2 className="text-lg font-semibold mb-3">友達リクエスト</h2>
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
	);
};

export default HomeScreen;
