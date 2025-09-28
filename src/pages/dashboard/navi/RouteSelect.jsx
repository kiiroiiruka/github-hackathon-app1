import { useNavigate, useLocation } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import LocationSearch from "../../../components/ui/LocationSearch";
import MapSearch from "../../../components/ui/MapSearch";
import { useState, useEffect, useCallback } from "react";
import { useFavorites } from "../../../hooks/useFavorites";
import { useAuthState } from "../../../hooks/useAuthState";

const RouteSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [locationType, setLocationType] = useState("destination"); // "departure" or "destination"
  
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
    return success;
  }, [addFavorite]);

  // 既に選択された場所がある場合（RoomCreatから）
  useEffect(() => {
    if (location.state?.selectedLocation) {
      setSelectedDestination(location.state.selectedLocation);
      console.log('RouteSelect - 初期選択された目的地:', location.state.selectedLocation);
    }
  }, [location.state]);



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

          {/* 場所検索・設定セクション */}
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

          {/* お気に入り一覧セクション */}
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6 border border-gray-100">
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
                      console.log('お気に入りを全削除しました');
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
              <div className="grid gap-3 max-h-64 overflow-y-auto">
                {favorites.map((favorite) => (
                  <div 
                    key={favorite.id}
                    className="group relative p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-gray-50 transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => handleLocationSelect(favorite)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📍</span>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {favorite.name}
                            </h3>
                            {selectedDestination?.id === favorite.id && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                選択中
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>📏 緯度: {favorite.coordinates[0].toFixed(6)}</p>
                            <p>📏 経度: {favorite.coordinates[1].toFixed(6)}</p>
                            <p className="text-xs text-gray-500">
                              登録日: {new Date(favorite.addedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-blue-500 text-lg">→</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const success = await removeFavorite(favorite.id);
                        if (success) {
                          console.log('お気に入りを削除:', favorite.id);
                        }
                      }}
                      disabled={loading}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all duration-200 p-2 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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

              {selectedDeparture && selectedDestination && (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/navi/route-screen", {
                    state: { 
                      destination: selectedDestination.coordinates,
                      destinationName: selectedDestination.name,
                      departure: selectedDeparture.coordinates,
                      departureName: selectedDeparture.name
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

            {/* 設定した場所でルーム作成ボタン */}
            {(selectedDeparture || selectedDestination) && (
              <div className="pt-2">
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
                  className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <span className="text-2xl">🏠</span>
                  <div className="text-center">
                    <div className="font-semibold">設定した場所でルーム作成</div>
                    <div className="text-sm opacity-90">
                      {selectedDeparture && selectedDestination 
                        ? "出発地と目的地を設定してルーム作成"
                        : selectedDeparture 
                        ? "出発地を設定してルーム作成"
                        : "目的地を設定してルーム作成"
                      }
                    </div>
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
                  if (returnTo && (selectedDestination || selectedDeparture)) {
                    navigate(returnTo, {
                      state: { 
                        selectedLocation: selectedDestination,
                        selectedDeparture: selectedDeparture
                      }
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
