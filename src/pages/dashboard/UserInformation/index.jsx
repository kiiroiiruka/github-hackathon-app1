import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { getUser, logout, removeFriend, updateUserMessage, acceptFriendRequest, rejectFriendRequest } from "../../../firebase";
import { useUserUid } from "../../../hooks/useUserUid";

function UserInformation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUserId = useUserUid();
  const [user, setUser] = useState(null);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  
  // URLパラメータから対象ユーザーIDを取得（なければ現在のユーザー）
  const targetUserId = searchParams.get('userId') || currentUserId;
  // 友達リクエスト情報をURLパラメータから取得
  const requestId = searchParams.get('requestId');
  const fromUserId = searchParams.get('fromUserId');

  useEffect(() => {
    const load = async () => {
      if (!targetUserId) return;
      try {
        const u = await getUser(targetUserId);
        setUser(u);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [targetUserId]);

  const handleBack = () => {
    navigate("/dashboard");
  };

  // ログアウト処理
  const handleLogout = async () => {
    if (window.confirm("ログアウトしますか？")) {
      try {
        await logout();
        console.log("ログアウトしました");
        // ログアウト後はログイン画面に遷移（必要に応じて調整）
        navigate("/");
      } catch (error) {
        console.error("ログアウトエラー:", error);
        alert("ログアウトに失敗しました");
      }
    }
  };

  // 自分のアカウントかどうかを判定
  const isOwnAccount = targetUserId === currentUserId;

  // 一言メッセージ編集開始
  const handleStartEditMessage = () => {
    setMessageInput(user?.userShortMessage || "");
    setIsEditingMessage(true);
  };

  // 一言メッセージ更新
  const handleUpdateMessage = async () => {
    if (!currentUserId) return;
    try {
      await updateUserMessage(currentUserId, messageInput);
      // ユーザー情報を再取得
      const updatedUser = await getUser(currentUserId);
      setUser(updatedUser);
      setIsEditingMessage(false);
      alert("一言メッセージを更新しました！");
    } catch (error) {
      console.error("一言メッセージ更新エラー:", error);
      alert("一言メッセージの更新に失敗しました");
    }
  };

  // 一言メッセージ編集キャンセル
  const handleCancelEditMessage = () => {
    setIsEditingMessage(false);
    setMessageInput("");
  };

  // 友達リクエスト承認
  const handleAcceptFriendRequest = async () => {
    if (!requestId || !fromUserId || !currentUserId) return;
    try {
      await acceptFriendRequest(requestId, fromUserId, currentUserId);
      alert("友達リクエストを承認しました！");
      navigate("/dashboard");
    } catch (error) {
      console.error("友達リクエスト承認エラー:", error);
      alert("友達リクエストの承認に失敗しました");
    }
  };

  // 友達リクエスト拒否
  const handleRejectFriendRequest = async () => {
    if (!requestId) return;
    try {
      await rejectFriendRequest(requestId);
      alert("友達リクエストを拒否しました");
      navigate("/dashboard");
    } catch (error) {
      console.error("友達リクエスト拒否エラー:", error);
      alert("友達リクエストの拒否に失敗しました");
    }
  };

  return (
    <div>
      <HeaderComponent title="アカウント情報" onBack={handleBack} />

      <div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
        <div className="flex flex-col items-center gap-6 bg-white rounded-lg shadow p-6">
          {/* プロフィール画像 */}
          <div className="w-28 h-28 rounded-full overflow-hidden border">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user?.displayName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-3xl bg-gray-300 text-white">
                {user?.displayName?.charAt(0) || "?"}
              </div>
            )}
          </div>

          {/* ユーザー情報 */}
          <div className="w-full space-y-4">
            <InfoRow label="ユーザー名" value={user?.displayName || "○○○○○○○○"} />
            <InfoRow label="ユーザーID" value={targetUserId || "○○○○○○○○"} />
            <InfoRow
              label="アカウント作成日"
              value={formatCreatedAt(user?.createdAt) || "2025/10/04/13:11"}
            />

            {/* 一言メッセージ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg">一言メッセージ</div>
                {isOwnAccount && !isEditingMessage && (
                  <button
                    type="button"
                    onClick={handleStartEditMessage}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded transition-colors"
                  >
                    編集
                  </button>
                )}
              </div>
              {isEditingMessage ? (
                <div className="space-y-2">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="一言メッセージを入力（例：よろしくお願いします！）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    maxLength={100}
                    rows={3}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {100 - (messageInput?.length || 0)} / 100 文字
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUpdateMessage}
                      disabled={!messageInput.trim()}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm py-2 px-4 rounded transition-colors"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditMessage}
                      className="bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {user?.userShortMessage ||
                    "よろしくお願いします!"}
                </p>
              )}
            </div>

          {/* 操作ボタン */}
          {isOwnAccount ? (
              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  ログアウト
                </button>
              </div>
          ) : requestId ? (
            /* 友達リクエスト承認・拒否ボタン */
            <div className="pt-4 border-t border-gray-200 w-full space-y-2">
              <button
                type="button"
                onClick={handleAcceptFriendRequest}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                友達リクエストを承認
              </button>
              <button
                type="button"
                onClick={handleRejectFriendRequest}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                友達リクエストを拒否
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-200 w-full">
              <button
                type="button"
                onClick={async () => {
                  if (!currentUserId || !targetUserId) return;
                  const ok = window.confirm("フレンドを解除しますか？この操作は元に戻せません。");
                  if (!ok) return;
                  try {
                    await removeFriend(currentUserId, targetUserId);
                    alert("フレンドを解除しました");
                    navigate("/dashboard");
                  } catch (e) {
                    console.error(e);
                    alert("フレンド解除に失敗しました");
                  }
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-red-600 font-bold py-3 px-4 rounded-lg transition-colors border border-gray-300"
                aria-label="フレンドを解除"
              >
                フレンドを解除
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="font-bold">{label}</div>
      <div className="text-sm text-gray-700 break-all">{value}</div>
    </div>
  );
}

function formatCreatedAt(createdAt) {
  if (!createdAt || !createdAt.toDate) return "-";
  const d = createdAt.toDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}/${hh}:${mi}`;
}

export default UserInformation;
