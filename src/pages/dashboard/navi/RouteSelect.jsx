import { useNavigate, useLocation } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import MapSearch from "@/components/ui/MapSearch";
import { useState, useEffect } from "react";

const RouteSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [savedFavorites, setSavedFavorites] = useState([]);

  // お気に入りを読み込む
  useEffect(() => {
    const favorites = localStorage.getItem('favoriteLocations');
    if (favorites) {
      try {
        setSavedFavorites(JSON.parse(favorites));
      } catch (error) {
        console.error('お気に入りの読み込みエラー:', error);
      }
    }
  }, []);

  // 既に選択された場所がある場合（RoomCreatから）
  useEffect(() => {
    if (location.state?.selectedLocation) {
      setSelectedDestination(location.state.selectedLocation);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <HeaderComponent title="通信" />
      
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mb-4 shadow-lg">
              <span className="text-2xl text-white">🗺️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ルート選択
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              目的地を設定して最適なルートを見つけましょう
            </p>
          </div>

          {/* 目的地検索セクション */}
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🔍</span>
              <h2 className="text-lg font-semibold text-gray-800">目的地を検索</h2>
            </div>
            <MapSearch 
              onSelectDestination={(dest, name) => {
                const destination = {
                  name: name,
                  coordinates: dest
                };
                setSelectedDestination(destination);
              }}
            />
          </div>

          {/* 選択された目的地の表示 */}
          {selectedDestination && (
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📍</span>
                <h2 className="text-lg font-semibold text-gray-800">選択された目的地</h2>
              </div>
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">{selectedDestination.name}</h3>
                <p className="text-sm text-green-700">
                  緯度: {selectedDestination.coordinates[0].toFixed(6)}, 
                  経度: {selectedDestination.coordinates[1].toFixed(6)}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDestination(null)}
                  className="mt-2 text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  目的地をクリア
                </button>
              </div>
            </div>
          )}

          {/* お気に入りクイック選択 */}
          {savedFavorites.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⭐</span>
                <h2 className="text-lg font-semibold text-gray-800">お気に入りから選択</h2>
              </div>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {savedFavorites.slice(0, 5).map((favorite) => (
                  <button
                    key={favorite.id}
                    type="button"
                    onClick={() => setSelectedDestination(favorite)}
                    className="flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{favorite.name}</p>
                      <p className="text-sm text-gray-500">
                        {favorite.coordinates[0].toFixed(4)}, {favorite.coordinates[1].toFixed(4)}
                      </p>
                    </div>
                    <span className="text-blue-500">→</span>
                  </button>
                ))}
              </div>
              {savedFavorites.length > 5 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  他 {savedFavorites.length - 5} 件のお気に入りがあります
                </p>
              )}
            </div>
          )}

          {/* アクションボタンセクション */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard/navi/purlieu-location")}
                className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <span className="text-2xl">⭐</span>
                <div className="text-left">
                  <div className="font-semibold">お気に入り管理</div>
                  <div className="text-sm opacity-90">場所を登録・管理</div>
                </div>
              </button>

              {selectedDestination && (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/navi/route-screen", {
                    state: { 
                      destination: selectedDestination.coordinates,
                      destinationName: selectedDestination.name 
                    }
                  })}
                  className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <span className="text-2xl">🧭</span>
                  <div className="text-left">
                    <div className="font-semibold">ルートを確認</div>
                    <div className="text-sm opacity-90">地図でルートを表示</div>
                  </div>
                </button>
              )}
            </div>

            {/* この場所でルーム作成ボタン */}
            {selectedDestination && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/navi/room", {
                    state: { selectedLocation: selectedDestination }
                  })}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <span className="text-2xl">🏠</span>
                  <div className="text-center">
                    <div className="font-semibold">この場所でルーム作成</div>
                    <div className="text-sm opacity-90">選択した目的地を設定してルーム作成</div>
                  </div>
                </button>
              </div>
            )}

            {/* 戻るボタン */}
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => {
                  const returnTo = location.state?.returnTo;
                  if (returnTo && selectedDestination) {
                    navigate(returnTo, {
                      state: { selectedLocation: selectedDestination }
                    });
                  } else {
                    navigate("/dashboard/navi/room");
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <span>←</span>
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSelect;
