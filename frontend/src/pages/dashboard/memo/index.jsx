import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMemo, getMemosByUser } from "@/firebase";
import { useUserUid } from "@/hooks/useUserUid";
import HeaderComponent2 from "../../../components/Header/Header2";

const MemoScreen = () => {
	const navigate = useNavigate();
	const [memos, setMemos] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const userUid = useUserUid();
	const [deletingId, setDeletingId] = useState(null);

	// ヘッダーのユーザーアイコンを押したときの処理
	const handleUserIconClick = () => {
		navigate("/dashboard/UserInformation");
	};

	// メモデータを取得
	useEffect(() => {
		const loadMemos = async () => {
			if (!userUid) return;
			setLoading(true);
			try {
				const list = await getMemosByUser(userUid);
				setMemos(list);
			} catch (error) {
				console.error("メモ取得エラー:", error);
			} finally {
				setLoading(false);
			}
		};

		loadMemos();
	}, [userUid]);

	const handleCreateMemo = () => {
		navigate("/dashboard/memo/creatememo");
	};

	const handleMemoClick = (memoId) => {
		// TODO: メモ詳細ページに遷移
		console.log("メモを開く:", memoId);
	};

	const handleDelete = async (e, memoId) => {
		e.stopPropagation();
		if (!userUid) return;
		const ok = window.confirm("このメモを削除しますか？");
		if (!ok) return;
		try {
			setDeletingId(memoId);
			await deleteMemo(userUid, memoId);
			setMemos((prev) => prev.filter((m) => m.id !== memoId));
		} catch (error) {
			console.error("メモ削除エラー:", error);
			alert("メモの削除に失敗しました");
		} finally {
			setDeletingId(null);
		}
	};

	// 検索フィルタリング
	const filteredMemos = memos.filter(
		(memo) =>
			memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			memo.content.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// 日付フォーマット
	const formatDate = (date) => {
		return new Date(date).toLocaleDateString("ja-JP", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div>
			<HeaderComponent2 title="メモ" onUserIconClick={handleUserIconClick} />

			<div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
				{/* 検索バー */}
				<div className="mb-6">
					<input
						type="text"
						placeholder="メモを検索..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				{/* メモ作成ボタン */}
				<div className="mb-6">
					<button
						onClick={handleCreateMemo}
						className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
					>
						<span className="text-xl">+</span>
						新しいメモを作成
					</button>
				</div>

				{/* メモ一覧 */}
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
						<span className="ml-3 text-gray-600">読み込み中...</span>
					</div>
				) : filteredMemos.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-6xl mb-4">📝</div>
						<p className="text-gray-600 text-lg">
							{searchQuery ? "検索結果が見つかりません" : "メモがありません"}
						</p>
						<p className="text-gray-500 text-sm mt-2">
							{searchQuery
								? "別のキーワードで検索してみてください"
								: "新しいメモを作成してみましょう"}
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{filteredMemos.map((memo) => (
							<div
								key={memo.id}
								onClick={() => handleMemoClick(memo.id)}
								className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300"
							>
								<div className="flex justify-between items-start mb-2">
									<h3 className="font-semibold text-lg text-gray-800 truncate flex-1">
										{memo.title}
									</h3>
									<div className="flex items-center gap-2 ml-2">
										<span className="text-xs text-gray-500">
											{formatDate(memo.updatedAt)}
										</span>
										<button
											type="button"
											onClick={(e) => handleDelete(e, memo.id)}
											disabled={deletingId === memo.id}
											className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50"
										>
											{deletingId === memo.id ? "削除中..." : "削除"}
										</button>
									</div>
								</div>

								<p className="text-gray-600 text-sm mb-3 line-clamp-3">
									{memo.content}
								</p>

								<div className="flex justify-between items-center text-xs text-gray-500">
									<span>作成: {formatDate(memo.createdAt)}</span>
									<span className="bg-gray-100 px-2 py-1 rounded">
										{memo.content.length}文字
									</span>
								</div>
							</div>
						))}
					</div>
				)}

				{/* 統計情報 */}
				{!loading && memos.length > 0 && (
					<div className="mt-6 bg-gray-50 rounded-lg p-4">
						<p className="text-sm text-gray-600 text-center">
							全{filteredMemos.length}件のメモ
							{searchQuery && `（検索結果: ${filteredMemos.length}件）`}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default MemoScreen;
