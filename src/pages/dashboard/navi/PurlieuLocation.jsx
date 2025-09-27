import { useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import LocationSearch from "../../../components/ui/LocationSearch";
import { useState, useCallback } from "react";
import { useFavorites } from "../../../hooks/useFavorites";
import { useAuthState } from "../../../hooks/useAuthState";

const PurlieuLocation = () => {
  const navigate = useNavigate();
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const [locationType, setLocationType] = useState("destination"); // "departure" or "destination"
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  
  // Firebase認証状態を監視
  useAuthState();
  
  // Firebaseベースのお気に入り管理
  const { 
    favorites, 
    loading, 
    error, 
    addFavorite, 
    removeFavorite, 
    removeAllFavorites 
  } = useFavorites();

  // お気に入り追加処理（Firebase対応）
  const addToFavorites = useCallback(async (name, coordinates) => {
    const success = await addFavorite(name, coordinates);
    if (success) {
      console.log("お気に入りに追加:", name, coordinates);
    }
  }, [addFavorite]);

  // 場所タイプに応じた選択処理
  const handleLocationSelect = useCallback(async (location) => {
    if (locationType === "departure") {
      setSelectedDeparture(location);
      localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(location));
    } else {
      setSelectedDestination(location);
      localStorage.setItem("roomCreat_selectedLocation", JSON.stringify(location));
    }
    // 自動的にお気に入りに追加
    await addToFavorites(location.name, location.coordinates);
  }, [locationType, addToFavorites]);

  // 選択をクリア
  const clearLocationSelection = useCallback((type) => {
    if (type === "departure") {
      setSelectedDeparture(null);
      localStorage.removeItem("roomCreat_selectedDeparture");
    } else {
      setSelectedDestination(null);
      localStorage.removeItem("roomCreat_selectedLocation");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      <HeaderComponent title="通信" />
      
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full mb-4 shadow-lg">
              <span className="text-2xl text-white">📍</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              お気に入りの場所
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              よく行く場所を登録して、素早くアクセスできるようにしましょう
            </p>
          </div>

          {/* 検索セクション */}
          <LocationSearch
            locationType={locationType}
            selectedDeparture={selectedDeparture}
            selectedDestination={selectedDestination}
            onLocationTypeChange={setLocationType}
            onLocationSelect={handleLocationSelect}
            onClearLocation={clearLocationSelection}
            showLocationTypeSelector={true}
            showCurrentSettings={true}
            className="mb-6"
          />

          {/* お気に入り一覧セクション */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⭐</span>
                <h2 className="text-lg font-semibold text-gray-800">
                  お気に入り一覧
                </h2>
                {favorites.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    {favorites.length}件
                  </span>
                )}
                {loading && (
                  <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
                    読み込み中...
                  </span>
                )}
              </div>
              {favorites.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const success = await removeAllFavorites();
                    if (success) {
                      setSelectedFavorite(null);
                    }
                  }}
                  disabled={loading}
                  className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  全削除
                </button>
              )}
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-50">⏳</div>
                <p className="text-gray-500 mb-2">お気に入りを読み込み中...</p>
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-50">📍</div>
                <p className="text-gray-500 mb-2">まだお気に入りが登録されていません</p>
                <p className="text-sm text-gray-400">上の検索で場所を検索して追加してください</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {favorites.map((favorite) => (
                  <button 
                    type="button"
                    key={favorite.id}
                    className={`w-full text-left group relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedFavorite?.id === favorite.id 
                        ? "bg-blue-50 border-blue-300 shadow-md" 
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setSelectedFavorite(
                        selectedFavorite?.id === favorite.id ? null : favorite
                      );
                      // 選択されたお気に入りを現在のタイプに設定
                      if (selectedFavorite?.id !== favorite.id) {
                        handleLocationSelect(favorite);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📍</span>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {favorite.name}
                          </h3>
                          {selectedFavorite?.id === favorite.id && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              選択中
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>📐 緯度: {favorite.coordinates[0].toFixed(6)}</p>
                          <p>📐 経度: {favorite.coordinates[1].toFixed(6)}</p>
                          <p className="text-xs text-gray-500">
                            登録日: {new Date(favorite.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const success = await removeFavorite(favorite.id);
                          if (success && selectedFavorite?.id === favorite.id) {
                            setSelectedFavorite(null);
                          }
                        }}
                        disabled={loading}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all duration-200 p-2 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedFavorite && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <h4 className="font-semibold text-blue-900">選択された場所</h4>
                </div>
                <p className="text-blue-800 font-medium">{selectedFavorite.name}</p>
                <p className="text-sm text-blue-700 mt-1">
                  この場所をルート設定で使用できます
                </p>
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex justify-center gap-4 mt-8">
            {(selectedDeparture || selectedDestination) && (
              <button
                type="button"
                onClick={() => {
                  // 両方の場所をローカルストレージに保存
                  if (selectedDeparture) {
                    localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(selectedDeparture));
                  }
                  if (selectedDestination) {
                    localStorage.setItem("roomCreat_selectedLocation", JSON.stringify(selectedDestination));
                  }
                  
                  navigate("/dashboard/navi/room", {
                    state: { 
                      selectedLocation: selectedDestination,
                      selectedDeparture: selectedDeparture
                    }
                  });
                }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <span>�</span>
                設定した場所でルーム作成
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/dashboard/navi/route")}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <span>←</span>
              戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurlieuLocation;
