import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "@/components/Header/Header2";
import FriendList from "@/components/FriendList/FriendList";
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
import { useFriends } from "@/hooks/useFriends";

const HomeScreen = () => {
	const navigate = useNavigate();
	const [friendRequests, setFriendRequests] = useState([]);
	const [sentFriendRequests, setSentFriendRequests] = useState([]);
	const [userMessage, setUserMessage] = useState("");
	const [currentUser, setCurrentUser] = useState(null);
	const currentUserId = useUserUid();
	const { friends, loading: friendsLoading, fetchFriends } = useFriends();

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
			fetchFriends();
		}
	}, [
		currentUserId,
		loadCurrentUser,
		loadFriendRequests,
		loadSentFriendRequests,
		fetchFriends,
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

	// フレンドをクリックしたときの処理
	const handleFriendClick = (friend) => {
		navigate(`/dashboard/UserInformation?userId=${friend.uid}`);
	};

	return (
		<div>
			<HeaderComponent2 title="ホーム" onUserIconClick={handleUserIconClick} />
			<div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
				{/* 一言メッセージ編集セクション */}
				<div className="bg-white rounded-lg shadow-md p-4 mb-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
						<h2 className="text-lg font-semibold">一言メッセージ</h2>
						{/* PC版 招待連絡ボタン */}
						<button
							type="button"
							onClick={() => navigate("/dashboard/home/inviting")}
							className="hidden sm:block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
						>
							招待連絡
						</button>
					</div>
					<div className="flex flex-col sm:flex-row gap-2">
						<input
							type="text"
							value={userMessage}
							onChange={(e) => setUserMessage(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && userMessage.trim()) {
									e.preventDefault();
									handleUpdateMessage();
								}
							}}
							placeholder="一言メッセージを入力（例：よろしくお願いします！）"
							className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							maxLength={50}
						/>
						<div className="flex gap-2 w-full sm:w-auto">
							{/* スマホ版 招待連絡ボタン（更新ボタンの左隣） */}
							<button
								type="button"
								onClick={() => navigate("/dashboard/home/inviting")}
								className="block sm:hidden bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors flex-1"
							>
								招待連絡
							</button>
							<button
								type="button"
								onClick={handleUpdateMessage}
								disabled={!userMessage.trim()}
								aria-label="一言メッセージを更新"
								className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors flex-1 sm:flex-none"
							>
								更新
							</button>
						</div>
					</div>
					<div className="mt-1 text-right text-xs text-gray-500" aria-live="polite">
						{50 - (userMessage?.length || 0)} / 50 文字
					</div>
					{currentUser?.userShortMessage && (
						<p className="text-sm text-gray-600 mt-2">
							現在のメッセージ: "{currentUser.userShortMessage}"
						</p>
					)}
					{currentUser?.createdAt && (
						<p className="text-xs text-gray-500 mt-1">
							アカウント作成日:{" "}
							{new Date(currentUser.createdAt.toDate()).toLocaleDateString("ja-JP")}
						</p>
					)}
				</div>

				   {/* 送信した友達リクエスト FriendListで表示 */}
				   <div className="mb-6">
					   <FriendList
						   friends={sentFriendRequests.map(r => ({
							   uid: r.recipientUid,
							   name: r.recipientName,
							   photoURL: r.recipientPhotoURL,
							   message: r.senderMessage,
						   }))}
						   maxVisible={4}
						   title="送信した友達リクエスト"
						   emptyMessage="送信中の友達リクエストはありません"
						   renderItem={(friend, idx) => (
							   <div key={friend.uid || idx} className="flex flex-col items-center w-24">
								   <img
									   src={friend.photoURL || "/vite.svg"}
									   alt={friend.name}
									   className="w-10 h-10 rounded-full object-cover mb-1 border"
									   onError={e => { e.target.src = "/vite.svg"; }}
								   />
								   <p className="font-medium truncate text-xs">{friend.name}</p>
								   {friend.message && (
									   <p className="text-xs text-blue-600 mt-1 italic truncate">あなたのメッセージ: "{friend.message}"</p>
								   )}
								   <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded mt-1">承認待ち</span>
							   </div>
						   )}
					   />
				   </div>

				   {/* 受信した友達リクエスト FriendListで表示 */}
				   <div className="mb-6">
					   <FriendList
						   friends={friendRequests.map(r => ({
							   uid: r.senderUid,
							   name: r.senderName,
							   photoURL: r.senderPhotoURL,
							   message: r.senderMessage,
							   createdAt: r.senderCreatedAt,
							   id: r.id,
							   fromUserId: r.fromUserId,
						   }))}
						   maxVisible={4}
						   title="受信した友達リクエスト"
						   emptyMessage="友達リクエストはありません"
						   renderItem={(friend, idx) => (
							   <div key={friend.uid || idx} className="flex flex-col items-center w-24">
								   <img
									   src={friend.photoURL || "/vite.svg"}
									   alt={friend.name}
									   className="w-10 h-10 rounded-full object-cover mb-1 border"
									   onError={e => { e.target.src = "/vite.svg"; }}
								   />
								   <p className="font-medium truncate text-xs">{friend.name}</p>
								   {friend.message && (
									   <p className="text-xs text-blue-600 mt-1 italic truncate">"{friend.message}"</p>
								   )}
								   {friend.createdAt && (
									   <p className="text-xs text-gray-400 mt-1">アカウント作成日: {new Date(friend.createdAt.toDate()).toLocaleDateString("ja-JP")}</p>
								   )}
								   <div className="flex gap-1 mt-1">
									   <button
										   type="button"
										   onClick={() => handleAcceptRequest(friend.id, friend.fromUserId)}
										   aria-label={`友達リクエストを承認: ${friend.name}`}
										   className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded"
									   >承認</button>
									   <button
										   type="button"
										   onClick={() => handleRejectRequest(friend.id)}
										   aria-label={`友達リクエストを拒否: ${friend.name}`}
										   className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
									   >拒否</button>
								   </div>
							   </div>
						   )}
					   />
				   </div>

				{/* フレンド一覧セクション */}
				{friendsLoading ? (
					<div className="bg-white rounded-lg shadow-md p-6 mb-6">
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
							<span className="ml-3 text-gray-600">読み込み中...</span>
						</div>
					</div>
				) : (
					<div className="mb-6">
						<FriendList
							friends={friends}
							maxVisible={4}
							title="フレンド"
							emptyMessage="フレンドがいません"
							onFriendClick={handleFriendClick}
						/>
					</div>
				)}

				{/* ログアウトボタン */}
				<div className="flex flex-col sm:flex-row gap-2">
					<button
						type="button"
						onClick={handleLogout}
						className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors w-full sm:w-auto"
					>
						ログアウト
					</button>
					<button
						type="button"
						onClick={() => navigate("/dashboard/policy")}
						className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded transition-colors border border-gray-300 w-full sm:w-auto"
						aria-label="利用規約を開く"
					>
						利用規約
					</button>
				</div>
			</div>
		</div>
	);
};

export default HomeScreen;
