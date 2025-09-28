import { useState } from "react";

const FriendList = ({
  friends,
  maxVisible = 4,
  title,
  emptyMessage,
  onFriendClick,
  renderItem, // カスタム描画用
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleFriends = showAll ? friends : friends.slice(0, maxVisible);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 relative">
      {/* タイトル */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {friends.length > maxVisible && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-500 hover:underline"
          >
            {showAll ? "閉じる" : "すべて表示"}
          </button>
        )}
      </div>

      {/* 空リスト */}
      {friends.length === 0 ? (
        <p className="text-gray-500">{emptyMessage}</p>
      ) : (
        <>
          {/* 表示リスト（showAllがtrueの時は非表示） */}
          {!showAll && (
            <div className="flex flex-wrap gap-2 justify-center">
              {visibleFriends.map((friend, idx) =>
                renderItem ? (
                  renderItem(friend, idx)
                ) : (
                  <button
                    key={friend.uid || idx}
                    type="button"
                    onClick={() => onFriendClick?.(friend)}
                    disabled={!onFriendClick}
                    className="w-28 border border-black rounded-lg p-2 hover:border-blue-500 hover:shadow-md transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative mb-1">
                        <img
                          src={friend.photoURL || friend.icon || "/vite.svg"}
                          alt={friend.name || friend.displayName}
                          className="w-8 h-8 rounded-full border object-cover group-hover:border-blue-400 transition-colors"
                          onError={(e) => {
                            e.target.src = "/vite.svg";
                          }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                      </div>
                      <p className="text-center truncate text-xs font-medium text-gray-800 w-full px-1">
                        {friend.name || friend.displayName || "名前なし"}
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          )}

          {/* モーダル（すべて表示） */}
          {showAll && (
            <div className="mt-4 bg-white shadow-xl p-4 rounded-xl border border-gray-300 z-10 max-w-full">
              <h3 className="text-md font-semibold mb-3">{title}一覧</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {friends.map((friend, idx) =>
                  renderItem ? (
                    renderItem(friend, idx)
                  ) : (
                    <button
                      key={friend.uid || idx}
                      type="button"
                      onClick={() => onFriendClick?.(friend)}
                      disabled={!onFriendClick}
                      className="w-24 border border-black rounded-lg p-3 hover:border-blue-500 hover:shadow-md transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative mb-2">
                          <img
                            src={friend.photoURL || friend.icon || "/vite.svg"}
                            alt={friend.name || friend.displayName}
                            className="w-10 h-10 rounded-full border object-cover group-hover:border-blue-400 transition-colors"
                            onError={(e) => {
                              e.target.src = "/vite.svg";
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                        </div>
                        <p className="text-center truncate text-sm font-medium text-gray-800 w-full px-1">
                          {friend.name || friend.displayName || "名前なし"}
                        </p>
                      </div>
                    </button>
                  )
                )}
              </div>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FriendList;
