import React, { useState } from "react";

function FriendList({ 
  friends = [], 
  maxVisible = 4, 
  showAllLabel = "全て表示",
  title = "フレンド",
  emptyMessage = "フレンドがいません",
  onFriendClick = null
}) {
  const [showAll, setShowAll] = useState(false);

  const truncateName = (name, maxLength = 6) => {
    return name.length > maxLength ? name.slice(0, maxLength) + "..." : name;
  };

  const visibleFriends = friends.slice(0, maxVisible);
  const hasMore = friends.length > maxVisible;

  if (friends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-2">👫</span>
          {title}
        </h3>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">😔</div>
          <p className="text-gray-600 text-lg">{emptyMessage}</p>
          <p className="text-gray-500 text-sm mt-2">
            友達リクエストを承認すると、ここに表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="text-2xl mr-2">👫</span>
        {title} ({friends.length}人)
      </h3>
      
      <div className="grid grid-cols-3 gap-3 mb-4">
        {visibleFriends.map((friend, idx) => (
          <button
            key={friend.uid || idx}
            type="button"
            onClick={() => onFriendClick && onFriendClick(friend)}
            disabled={!onFriendClick}
            className={`aspect-square border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition-all duration-200 group ${
              onFriendClick ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative mb-2">
                <img
                  src={friend.photoURL || friend.icon || "/vite.svg"}
                  alt={friend.name || friend.displayName}
                  className="w-12 h-12 rounded-full border-2 border-gray-200 object-cover group-hover:border-blue-400 transition-colors"
                  onError={(e) => {
                    e.target.src = "/vite.svg";
                  }}
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <p className="text-center truncate text-xs font-medium text-gray-800 mb-1 w-full">
                {truncateName(friend.name || friend.displayName || "名前なし")}
              </p>
              <p className="text-center truncate text-xs text-gray-500 w-full">
                ID: {friend.uid?.slice(0, 4)}...
              </p>
            </div>
          </button>
        ))}

        {hasMore && (
          <div className="aspect-square border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition-all duration-200">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex flex-col items-center justify-center h-full w-full group"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors mb-2">
                <span className="text-lg text-gray-400 group-hover:text-blue-500">
                  +{friends.length - maxVisible}
                </span>
              </div>
              <p className="text-xs text-gray-600 font-medium">{showAllLabel}</p>
            </button>
          </div>
        )}
      </div>

      {/* 全員一覧（モーダル風） */}
      {showAll && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-xl p-4 rounded-xl border border-gray-200 z-10">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-800">フレンド一覧</h4>
            <button
              onClick={() => setShowAll(false)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              {friends.map((friend, idx) => (
                <button
                  key={friend.uid || idx}
                  type="button"
                  onClick={() => {
                    if (onFriendClick) {
                      onFriendClick(friend);
                      setShowAll(false);
                    }
                  }}
                  disabled={!onFriendClick}
                  className={`flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors w-full text-left ${
                    onFriendClick ? 'cursor-pointer' : 'cursor-default'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <img
                    src={friend.photoURL || friend.icon || "/vite.svg"}
                    alt={friend.name || friend.displayName}
                    className="w-10 h-10 rounded-full border object-cover"
                    onError={(e) => {
                      e.target.src = "/vite.svg";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {friend.name || friend.displayName || "名前なし"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      ID: {friend.uid}
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FriendList;
