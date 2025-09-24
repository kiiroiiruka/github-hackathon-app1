import { useCallback, useEffect, useState } from "react";
import { getUser, sendFriendRequest } from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";

const FriendsAddScreen = () => {
	const [friendIdInput, setFriendIdInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [currentUser, setCurrentUser] = useState(null);
	const currentUserId = useUserUid();

	// ユーザー情報を取得
	const loadCurrentUser = useCallback(async () => {
		if (!currentUserId) return;

		try {
			const user = await getUser(currentUserId);
			setCurrentUser(user);
		} catch (error) {
			console.error("ユーザー情報取得エラー:", error);
		}
	}, [currentUserId]);

	// コンポーネントマウント時にユーザー情報を取得
	useEffect(() => {
		if (currentUserId) {
			loadCurrentUser();
		}
	}, [currentUserId, loadCurrentUser]);

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

	return (
		<div className="p-4 max-w-2xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">友達追加</h1>

			{/* 自分のユーザー情報表示セクション */}
			{currentUser && (
				<div className="bg-blue-50 rounded-lg shadow-md p-4 mb-6">
					<h2 className="text-lg font-semibold mb-3 text-blue-800">
						あなたのユーザー情報
					</h2>
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
								{currentUser.photoURL ? (
									<img
										src={currentUser.photoURL}
										alt={currentUser.displayName}
										className="w-12 h-12 rounded-full object-cover"
									/>
								) : (
									<span className="text-gray-600 text-lg">
										{currentUser.displayName?.charAt(0) || "?"}
									</span>
								)}
							</div>
							<div>
								<p className="font-medium text-gray-900">
									{currentUser.displayName || "ユーザー"}
								</p>
								<div className="flex items-center gap-2">
									<p className="text-sm text-gray-600">あなたのユーザーID:</p>
									<div className="flex items-center gap-2">
										<span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600 text-sm">
											{currentUserId}
										</span>
										<button
											type="button"
											onClick={() => {
												navigator.clipboard.writeText(currentUserId);
												alert("ユーザーIDをコピーしました！");
											}}
											className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
											title="ユーザーIDをコピー"
										>
											コピー
										</button>
									</div>
								</div>
							</div>
						</div>
						{currentUser.userShortMessage && (
							<p className="text-sm text-blue-700 italic">
								一言メッセージ: "{currentUser.userShortMessage}"
							</p>
						)}
						{currentUser.createdAt && (
							<p className="text-xs text-gray-500">
								アカウント作成日:{" "}
								{new Date(currentUser.createdAt.toDate()).toLocaleDateString(
									"ja-JP",
								)}
							</p>
						)}
					</div>
				</div>
			)}

			{/* 友達リクエスト送信セクション */}
			<div className="bg-white rounded-lg shadow-md p-4 mb-6">
				<h2 className="text-lg font-semibold mb-3">友達を追加</h2>
				<p className="text-sm text-gray-600 mb-4">
					友達のユーザーIDを入力して、友達リクエストを送信してください。
				</p>
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
				{currentUser?.userShortMessage && (
					<div className="mt-3 p-3 bg-blue-50 rounded-md">
						<p className="text-sm text-blue-800">
							あなたの一言メッセージ: "{currentUser.userShortMessage}"
						</p>
						<p className="text-xs text-blue-600 mt-1">
							このメッセージが友達リクエストと一緒に送信されます
						</p>
					</div>
				)}
			</div>

			{/* 使い方説明 */}
			<div className="bg-gray-50 rounded-lg p-4">
				<h3 className="text-md font-semibold mb-2">使い方</h3>
				<ul className="text-sm text-gray-600 space-y-1">
					<li>• 上記の「あなたのユーザーID」を友達に教えてください</li>
					<li>• 友達のユーザーIDを入力して友達リクエストを送信</li>
					<li>• 相手が承認すると友達になります</li>
					<li>• ホーム画面で友達リクエストの承認・拒否ができます</li>
					<li>• 「コピー」ボタンでユーザーIDを簡単にコピーできます</li>
				</ul>
			</div>
		</div>
	);
};

export default FriendsAddScreen;
