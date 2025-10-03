import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import LocationSearch from "../../../components/ui/LocationSearch";
import { auth } from "../../../firebase/firebaseConfig";
import { addSearchHistory, clearSearchHistory, deleteSearchHistory, getSearchHistory } from "../../../firebase/users";
import { useAuthState } from "../../../hooks/useAuthState";
import { useFavorites } from "../../../hooks/useFavorites";

const RouteSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [locationType, setLocationType] = useState("destination"); // "departure" or "destination"

  // 🆕 検索履歴の管理
  const [searchHistory, setSearchHistory] = useState([]);

  // Firebase認証状態を監視
  useAuthState();

  // Firebaseベースのお気に入り管理
  const { favorites, loading, error } = useFavorites();

  // 🆕 検索履歴を取得
  useEffect(() => {
    const fetchSearchHistory = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const history = await getSearchHistory(currentUser.uid, 20); // 最新20件
        setSearchHistory(history);
      }
    };
    fetchSearchHistory();
  }, []);

  // 🆕 Local Storage の値のみを初期値として使用（location.state を無視）
  useEffect(() => {
    console.log("🔍 RouteSelect - location.state の内容確認:", location.state);
    console.log("🔍 RouteSelect - location.state の詳細:", {
      hasState: !!location.state,
      selectedLocation: location.state?.selectedLocation,
      selectedDeparture: location.state?.selectedDeparture,
      allKeys: location.state ? Object.keys(location.state) : [],
      // バグ調査用: 全ての値をログ出力
      fullState: location.state
    });

    console.log("🔄 RouteSelect - Local Storage のみから初期値を設定");
    
    // selectedDeparture を Local Storage から読み込み
    const savedDeparture = localStorage.getItem("roomCreat_selectedDeparture");
    if (savedDeparture) {
      const parsedDeparture = JSON.parse(savedDeparture);
      console.log("🔄 RouteSelect - selectedDeparture を Local Storage から読み込み:", parsedDeparture);
      setSelectedDeparture(parsedDeparture);
    } else {
      console.log("🔄 RouteSelect - selectedDeparture は Local Storage に保存されていません");
      setSelectedDeparture(null);
    }
    
    // selectedLocation を Local Storage から読み込み
    const savedLocation = localStorage.getItem("roomCreat_selectedLocation");
    if (savedLocation) {
      const parsedLocation = JSON.parse(savedLocation);
      console.log("🔄 RouteSelect - selectedLocation を Local Storage から読み込み:", parsedLocation);
      setSelectedDestination(parsedLocation);
    } else {
      console.log("🔄 RouteSelect - selectedLocation は Local Storage に保存されていません");
      setSelectedDestination(null);
    }
  }, [location.state]);

  // 場所タイプに応じた選択処理
  const handleLocationSelect = useCallback(
    async (location) => {
      if (locationType === "departure") {
        setSelectedDeparture(location);
        localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(location));
      } else {
        setSelectedDestination(location);
        localStorage.setItem("roomCreat_selectedLocation", JSON.stringify(location));
      }
      
      // 🆕 検索履歴として自動保存（お気に入りではない）
      const currentUser = auth.currentUser;
      if (currentUser) {
        await addSearchHistory(currentUser.uid, location.name, location.coordinates);
        
        // 検索履歴を再取得
        const updatedHistory = await getSearchHistory(currentUser.uid, 20);
        setSearchHistory(updatedHistory);
      }
    },
    [locationType]
  );

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
      <HeaderComponent title="カーナビ作成" />

      <div className="px-4 py-6 pt-20">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mb-4 shadow-lg">
              <span className="text-2xl text-white">🗺️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">カーナビ作成</h1>
            <p className="text-gray-600 max-w-md mx-auto">
              目的地までのナビを作成しましょう
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
                  緯度: {selectedDestination.coordinates[0].toFixed(6)}, 経度:{" "}
                  {selectedDestination.coordinates[1].toFixed(6)}
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
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">⭐</span>
              <h2 className="text-lg font-semibold text-gray-800">お気に入り一覧</h2>
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
                    className="group relative p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50 hover:border-yellow-400 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">⭐</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 break-words mb-2">
                          {favorite.name}
                        </div>
                        <div className="text-xs text-gray-600 mb-3">
                          📏 {favorite.coordinates[0].toFixed(6)}, {favorite.coordinates[1].toFixed(6)}
                          <div className="mt-1 text-gray-500">
                            🕐 {new Date(favorite.addedAt).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const location = {
                                name: favorite.name,
                                coordinates: favorite.coordinates,
                              };
                              setSelectedDeparture(location);
                              localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(location));
                            }}
                            className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors font-medium"
                          >
                            🚗 出発地に設定
                          </button>
                          <button
                            onClick={() => {
                              const location = {
                                name: favorite.name,
                                coordinates: favorite.coordinates,
                              };
                              setSelectedDestination(location);
                              localStorage.setItem("roomCreat_selectedLocation", JSON.stringify(location));
                            }}
                            className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium"
                          >
                            🎯 目的地に設定
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🆕 検索履歴セクション */}
          {searchHistory.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📜</span>
                  <h2 className="text-lg font-semibold text-gray-800">検索履歴</h2>
                  <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    {searchHistory.length}件
                  </span>
                </div>
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const currentUser = auth.currentUser;
                      if (currentUser) {
                        const success = await clearSearchHistory(currentUser.uid);
                        if (success) {
                          setSearchHistory([]);
                          console.log("検索履歴を全削除しました");
                        }
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    全削除
                  </button>
                )}
              </div>

              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {searchHistory.map((history) => (
                  <div
                    key={history.id}
                    className="relative p-4 pr-14 rounded-lg border border-gray-200 hover:border-blue-400 transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-lg flex-shrink-0">📍</span>
                      <div className="font-medium text-gray-900 break-words">
                        {history.name}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-3 pl-7">
                      📏 {history.coordinates[0].toFixed(6)}, {history.coordinates[1].toFixed(6)}
                      <div className="mt-1">
                        🕐 {new Date(history.searchedAt?.seconds * 1000).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <div className="flex gap-2 pl-7">
                      <button
                        onClick={() => {
                          const location = {
                            name: history.name,
                            coordinates: history.coordinates,
                          };
                          setSelectedDeparture(location);
                          localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(location));
                        }}
                        className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors font-medium"
                      >
                        🚗 出発地に設定
                      </button>
                      <button
                        onClick={() => {
                          const location = {
                            name: history.name,
                            coordinates: history.coordinates,
                          };
                          setSelectedDestination(location);
                          localStorage.setItem("roomCreat_selectedLocation", JSON.stringify(location));
                        }}
                        className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium"
                      >
                        🎯 目的地に設定
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const currentUser = auth.currentUser;
                        if (currentUser) {
                          const success = await deleteSearchHistory(currentUser.uid, history.id);
                          if (success) {
                            // 履歴リストを更新
                            setSearchHistory(searchHistory.filter(h => h.id !== history.id));
                            console.log("検索履歴を削除:", history.id);
                          }
                        }
                      }}
                      className="absolute top-3 right-3 text-red-500 hover:text-white bg-red-50 hover:bg-red-500 transition-all duration-200 p-2 rounded-lg text-base shadow-sm hover:shadow-md"
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
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

              {selectedDeparture && selectedDestination && (
                <button
                  type="button"
                  onClick={() => {
                    console.log("🧭 RouteSelect - ルート確認画面に遷移:", {
                      selectedDeparture,
                      selectedDestination,
                    });
                    navigate("/dashboard/navi/route-screen", {
                      state: {
                        destination: selectedDestination.coordinates,
                        destinationName: selectedDestination.name,
                        departure: selectedDeparture.coordinates,
                        departureName: selectedDeparture.name,
                        // 🆕 オブジェクトそのものも渡す（RouteScreen.jsx で優先使用）
                        selectedDeparture: selectedDeparture,
                        selectedDestination: selectedDestination,
                      },
                    });
                  }}
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

        
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSelect;
