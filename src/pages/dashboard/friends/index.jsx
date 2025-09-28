import { useCallback, useEffect, useState } from "react";
import { getUser, sendFriendRequest } from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";
import HeaderComponent2 from "../../../components/Header/Header2";

const FriendsAddScreen = () => {
	const [friendIdInput, setFriendIdInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [currentUser, setCurrentUser] = useState(null);
	const currentUserId = useUserUid();
	const [targetUser, setTargetUser] = useState(null); // 追加
	// 入力した友達IDからユーザー情報を取得
	// 入力が変わったら自動で検索（デバウンスあり）
	useEffect(() => {
		if (!friendIdInput.trim()) {
			setTargetUser(null);
			return;
		}

		const timer = setTimeout(async () => {
			try {
				const user = await getUser(friendIdInput.trim());
				if (user) {
					setTargetUser(user);
				} else {
					setTargetUser(null);
				}
			} catch (error) {
				console.error("友達検索エラー:", error);
				setTargetUser(null);
			}
		}, 500); // 入力が止まって0.5秒後に検索

		return () => clearTimeout(timer); // 入力中に前の検索はキャンセル
	}, [friendIdInput]);

	const handleSearchFriend = async () => {
		if (!friendIdInput.trim()) return;
		try {
			const user = await getUser(friendIdInput.trim());
			if (user) {
				setTargetUser(user);
			} else {
				setTargetUser(null);
				alert("指定されたユーザーIDが見つかりません");
			}
		} catch (error) {
			console.error("友達検索エラー:", error);
			alert("ユーザー検索に失敗しました");
		}
	};

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
		<div>
			<HeaderComponent2 title="友達追加" />
			<div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
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
								<div className="flex-1 min-w-0">
									<p className="font-medium text-gray-900 truncate">
										{currentUser.displayName || "ユーザー"}
									</p>
									<div className="flex flex-col sm:flex-row sm:items-center gap-2">
										<p className="text-sm text-gray-600 flex-shrink-0">あなたのユーザーID:</p>
										<div className="flex items-center gap-2 min-w-0">
											<span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600 text-sm truncate max-w-[200px] sm:max-w-none">
												{currentUserId}
											</span>
											<button
												type="button"
												onClick={() => {
													navigator.clipboard.writeText(currentUserId);
													alert("ユーザーIDをコピーしました！");
												}}
												className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors flex-shrink-0"
												title="ユーザーIDをコピー"
											>
												コピー
											</button>
										</div>
									</div>
								</div>
							</div>
							{currentUser.userShortMessage && (
								<p className="text-sm text-blue-700 italic truncate">
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
						友達のユーザーIDを入力すると、相手が表示されます。
					</p>
					<div className="flex gap-2">
						<input
							type="text"
							value={friendIdInput}
							onChange={(e) => setFriendIdInput(e.target.value)} // 入力時に検索トリガー
							placeholder="ユーザーIDを入力"
							className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
						/>
					</div>

					{/* 🔹 相手が見つかったら表示 */}
					{targetUser && (
						<div className="mt-3 p-3 bg-blue-50 rounded-md flex items-center gap-3">
							{/* アイコン */}
							<div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
								{targetUser.photoURL ? (
									<img
										src={targetUser.photoURL}
										alt={targetUser.displayName}
										className="w-12 h-12 rounded-full object-cover"
									/>
								) : (
									<span className="text-gray-600 text-lg">
										{targetUser.displayName?.charAt(0) || "?"}
									</span>
								)}
							</div>

							{/* ユーザー情報 */}
							<div className="flex-1 min-w-0">
								<p className="font-medium truncate">
									{targetUser.displayName || "ユーザー"}
								</p>

								{/* ✅ ユーザーID */}
								<p className="text-xs text-gray-500">
									ユーザーID:{" "}
									<span className="font-mono bg-gray-100 px-1 rounded truncate inline-block max-w-[150px]">
										{friendIdInput.trim()}
									</span>
								</p>

								{/* ✅ 一言メッセージ */}
								{targetUser.userShortMessage && (
									<p className="text-sm text-gray-600 truncate">
										"{targetUser.userShortMessage}"
									</p>
								)}

								{/* ✅ アカウント作成日 */}
								{targetUser.createdAt && (
									<p className="text-xs text-gray-500 truncate">
										アカウント作成日:{" "}
										{new Date(targetUser.createdAt.toDate()).toLocaleDateString(
											"ja-JP",
										)}
									</p>
								)}
							</div>
						</div>
					)}

					{/* 🔹 リクエスト送信ボタンは分ける */}
					{targetUser && (
						<button
							type="button"
							onClick={handleSendFriendRequest}
							disabled={loading}
							className="mt-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
						>
							{loading ? "送信中..." : "リクエスト送信"}
						</button>
					)}

					{currentUser?.userShortMessage && (
						<div className="mt-3 p-3 bg-blue-50 rounded-md">
							<p className="text-sm text-blue-800 truncate">
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
		</div>
	);
};

export default FriendsAddScreen;
