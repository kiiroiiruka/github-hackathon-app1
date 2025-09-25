import { useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";

const CreateMemo = () => {
  const navigate = useNavigate();
  const [memoTitle, setMemoTitle] = useState("");
  const [memoContent, setMemoContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    navigate("/dashboard/memo");
  };

  const handleSave = async () => {
    if (!memoTitle.trim() || !memoContent.trim()) {
      alert("タイトルと内容を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: メモをFirebaseに保存する処理を実装
      console.log("メモ保存:", { title: memoTitle, content: memoContent });
      
      // 保存成功後、メモ一覧に戻る
      alert("メモを保存しました！");
      navigate("/dashboard/memo");
    } catch (error) {
      console.error("メモ保存エラー:", error);
      alert("メモの保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <HeaderComponent title="メモ作成" onBack={handleBack} />
      
      <div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* タイトル入力 */}
          <div className="mb-6">
            <label htmlFor="memoTitle" className="block text-sm font-medium text-gray-700 mb-2">
              タイトル
            </label>
            <input
              id="memoTitle"
              type="text"
              value={memoTitle}
              onChange={(e) => setMemoTitle(e.target.value)}
              placeholder="メモのタイトルを入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {memoTitle.length}/100文字
            </p>
          </div>

          {/* 内容入力 */}
          <div className="mb-6">
            <label htmlFor="memoContent" className="block text-sm font-medium text-gray-700 mb-2">
              内容
            </label>
            <textarea
              id="memoContent"
              value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
              placeholder="メモの内容を入力"
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {memoContent.length}/1000文字
            </p>
          </div>

          {/* 保存日時表示 */}
          <div className="mb-6 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <span className="font-medium">作成日時:</span>{" "}
              {new Date().toLocaleString("ja-JP")}
            </p>
          </div>

          {/* ボタン群 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || !memoTitle.trim() || !memoContent.trim()}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "保存中..." : "保存"}
            </button>
          </div>
        </div>

        {/* 使い方説明 */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-md font-semibold mb-2 text-blue-800">使い方</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• タイトルと内容を入力してメモを作成できます</li>
            <li>• タイトルは100文字、内容は1000文字まで入力可能です</li>
            <li>• 作成日時は自動的に記録されます</li>
            <li>• 「保存」ボタンでメモを保存し、一覧に戻ります</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateMemo;
