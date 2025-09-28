import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent from "@/components/Header/Header";
import FriendList from "@/components/FriendList/FriendList";
import { getFriendRequests, getSentFriendRequests } from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";
import { useFriends } from "@/hooks/useFriends";
import ProfileImage from "@/components/ui/ProfileImage";

const FriendPage = () => {
	const navigate = useNavigate();
	const [friendRequests, setFriendRequests] = useState([]);
	const [sentFriendRequests, setSentFriendRequests] = useState([]);
	const currentUserId = useUserUid();
	const { friends, loading: friendsLoading, fetchFriends } = useFriends();

	const loadFriendRequests = useCallback(async () => {
		if (!currentUserId) return;
		try {
			const requests = await getFriendRequests(currentUserId);
			setFriendRequests(requests);
		} catch (error) {
			console.error("友達リクエスト取得エラー:", error);
		}
	}, [currentUserId]);

	const loadSentFriendRequests = useCallback(async () => {
		if (!currentUserId) return;
		try {
			const sentRequests = await getSentFriendRequests(currentUserId);
			setSentFriendRequests(sentRequests);
		} catch (error) {
			console.error("送信した友達リクエスト取得エラー:", error);
		}
	}, [currentUserId]);

	useEffect(() => {
		if (currentUserId) {
			loadFriendRequests();
			loadSentFriendRequests();
			fetchFriends();
		}
	}, [currentUserId, loadFriendRequests, loadSentFriendRequests, fetchFriends]);

	const handleBack = () => {
		navigate("/dashboard");
	};

	const handleFriendClick = (friend) => {
		navigate(`/dashboard/UserInformation?userId=${friend.uid}`);
	};

	return (
		<div>
			{/* ヘッダー名を「フレンド」に変更 */}
			<HeaderComponent title="フレンド" onBack={handleBack} />
			<div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
				{/* --- HomeScreen の中身をここに配置 --- */}

				{/* フレンド一覧 */}
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

				{/* 受信リクエスト */}
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
							<div key={friend.uid || idx} className="flex flex-col items-center w-28 border border-black rounded-lg p-2">
								<button
									type="button"
									onClick={() =>
										navigate(
											`/dashboard/UserInformation?userId=${friend.uid}&requestId=${friend.id}&fromUserId=${friend.fromUserId}`
										)
									}
									className="flex flex-col items-center cursor-pointer bg-transparent border-none p-0 w-full"
								>
									<ProfileImage
										src={friend.photoURL}
										alt={friend.name}
										className="w-10 h-10 rounded-full mb-1 border"
										fallbackText={friend.name?.charAt(0) || "?"}
									/>
									<p className="font-medium truncate text-xs w-full text-center px-1">{friend.name}</p>
								</button>
								{friend.message && !friend.uid?.startsWith("dummy_") && (
									<p className="text-xs text-blue-600 mt-1 italic truncate w-full text-center px-1">"{friend.message}"</p>
								)}
							</div>
						)}
					/>
				</div>

				{/* 送信リクエスト */}
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
							<div key={friend.uid || idx} className="flex flex-col items-center w-28 border border-black rounded-lg p-2">
								<ProfileImage
									src={friend.photoURL}
									alt={friend.name}
									className="w-10 h-10 rounded-full mb-1 border"
									fallbackText={friend.name?.charAt(0) || "?"}
								/>
								<p className="font-medium truncate text-xs w-full text-center px-1">{friend.name}</p>
								{friend.message && !friend.uid?.startsWith("dummy_") && (
									<p className="text-xs text-blue-600 mt-1 italic truncate w-full text-center px-1">あなたのメッセージ: "{friend.message}"</p>
								)}
								<span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded mt-1">承認待ち</span>
							</div>
						)}
					/>
				</div>

				{/* 開発ページボタンのみ残す */}
				<div className="bg-white rounded-lg shadow-md p-4 mb-6">
					<div className="flex flex-col sm:flex-row gap-2 justify-center">
						<button
							type="button"
							onClick={() => navigate("/dashboard/development")}
							className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
						>
							開発ページ
						</button>
					</div>
				</div>

				{/* --- HomeScreen の中身ここまで --- */}
			</div>
		</div>
	);
};

export default FriendPage;
