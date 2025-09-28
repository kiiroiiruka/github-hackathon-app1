import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
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
  const [manualAddress, setManualAddress] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  
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

  // 手動で住所からお気に入りに追加
  const handleManualAddFavorite = useCallback(async () => {
    if (!manualAddress.trim()) {
      alert('住所を入力してください');
      return;
    }

    setIsAddingFavorite(true);
    
    try {
      // Google Maps APIが利用できない場合はNominatim APIを使用
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        // Google Maps Geocoding APIを使用
        const geocoder = new window.google.maps.Geocoder();
        
        geocoder.geocode({ address: manualAddress }, async (results, status) => {
          try {
            if (status === 'OK' && results[0]) {
              const location = results[0].geometry.location;
              const coordinates = [location.lat(), location.lng()];
              const formattedAddress = results[0].formatted_address;
              
              console.log('住所から変換された座標 (Google):', { address: formattedAddress, coordinates });
              
              const success = await addToFavorites(formattedAddress, coordinates);
              if (success) {
                setManualAddress('');
                setIsManualMode(false);
                alert(`お気に入りに追加しました:\n住所: ${formattedAddress}\n座標: ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`);
              } else {
                alert('お気に入りの追加に失敗しました（重複の可能性があります）');
              }
            } else {
              alert('住所が見つかりませんでした。正しい住所を入力してください。');
            }
          } catch (error) {
            console.error('お気に入り追加エラー:', error);
            alert('お気に入りの追加に失敗しました');
          } finally {
            setIsAddingFavorite(false);
          }
        });
      } else {
        // Nominatim APIを使用
        const encodedAddress = encodeURIComponent(manualAddress);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'HakaApp/1.0 (contact@example.com)'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          const coordinates = [parseFloat(result.lat), parseFloat(result.lon)];
          const formattedAddress = result.display_name;
          
          console.log('住所から変換された座標 (Nominatim):', { address: formattedAddress, coordinates });
          
          const success = await addToFavorites(formattedAddress, coordinates);
          if (success) {
            setManualAddress('');
            setIsManualMode(false);
            alert(`お気に入りに追加しました:\n住所: ${formattedAddress}\n座標: ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`);
          } else {
            alert('お気に入りの追加に失敗しました（重複の可能性があります）');
          }
        } else {
          alert('住所が見つかりませんでした。正しい住所を入力してください。');
        }
        setIsAddingFavorite(false);
      }
    } catch (error) {
      console.error('ジオコーディングエラー:', error);
      alert('住所の変換に失敗しました');
      setIsAddingFavorite(false);
    }
  }, [manualAddress, addToFavorites]);

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

          {/* 手動住所入力セクション */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✏️</span>
                <h2 className="text-lg font-semibold text-gray-800">住所を直接追加</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManualMode(!isManualMode);
                  if (!isManualMode) {
                    setManualAddress('');
                  }
                }}
                disabled={isAddingFavorite}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                  isManualMode 
                    ? "bg-red-100 text-red-700 hover:bg-red-200" 
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {isManualMode ? "キャンセル" : "住所を入力"}
              </button>
            </div>

            {isManualMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    住所を入力してください
                  </label>
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="例: 東京都渋谷区渋谷1-1-1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isAddingFavorite) {
                        handleManualAddFavorite();
                      }
                    }}
                    disabled={isAddingFavorite}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleManualAddFavorite}
                    disabled={!manualAddress.trim() || loading || isAddingFavorite}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingFavorite ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        追加中...
                      </>
                    ) : (
                      <>
                        <span>⭐</span>
                        お気に入りに追加
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualAddress('');
                      setIsManualMode(false);
                    }}
                    disabled={isAddingFavorite}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-2">
                    💡 <strong>使い方：</strong>
                  </p>
                  <ul className="text-sm text-blue-600 space-y-1 ml-4">
                    <li>• 住所を入力すると自動的に座標に変換されます</li>
                    <li>• Google Maps APIまたはNominatim APIを使用します</li>
                    <li>• 変換された住所と座標がお気に入りに保存されます</li>
                    <li>• Enterキーでも追加できます</li>
                    <li>• 重複する場所は追加されません</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

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
=======
import HeaderComponent2 from "../../../components/Header/Header2";
import MapSearch from "../../../components/ui/MapSearch";
import { useState, useEffect } from "react";

const PurlieuLocation = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [selectedFavorite, setSelectedFavorite] = useState(null);

  // localStorageからお気に入りを読み込む
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteLocations');
    if (savedFavorites) {
      try {
        const parsedFavorites = JSON.parse(savedFavorites);
        setFavorites(parsedFavorites);
      } catch (error) {
        console.error('お気に入りの読み込みでエラー:', error);
      }
    }
  }, []);

  // お気に入りが変更された時にlocalStorageに保存
  useEffect(() => {
    if (favorites.length > 0) {
      localStorage.setItem('favoriteLocations', JSON.stringify(favorites));
    }
  }, [favorites]);

  return (
    <div className="flex flex-col justify-center items-center p-5 h-screen bg-gray-100">
        <HeaderComponent2 title="通信" />
        <h1 className="text-2xl font-bold">お気に入り登録画面</h1>
        <p className="text-gray-600">お気に入りの場所を登録できます</p>
        <div className="mt-8">
            <MapSearch
              onSelectDestination={(dest, name) => {
                const newFavorite = {
                  id: Date.now(),
                  name: name,
                  coordinates: dest
                };
                setFavorites(prev => [...prev, newFavorite]);
                console.log("お気に入りに追加:", name, dest);
              }}
            />
          </div>
          <div className="mt-4 text-gray-700 border border-gray-300 rounded-lg p-4 bg-white shadow-sm w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">お気に入りの場所</h2>
              {favorites.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFavorites([]);
                    setSelectedFavorite(null);
                    localStorage.removeItem('favoriteLocations');
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
>>>>>>> origin/feat/#2
                >
                  全削除
                </button>
              )}
            </div>
<<<<<<< HEAD

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
=======
            
            {favorites.length === 0 ? (
              <p className="text-gray-500 text-sm">まだお気に入りが登録されていません。上の検索で場所を検索してください。</p>
            ) : (
              <div className="space-y-2">
>>>>>>> origin/feat/#2
                {favorites.map((favorite) => (
                  <button 
                    type="button"
                    key={favorite.id}
<<<<<<< HEAD
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
=======
                    className={`w-full text-left p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedFavorite?.id === favorite.id 
                        ? "bg-blue-50 border-blue-300 shadow-sm" 
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedFavorite(favorite)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{favorite.name}</h3>
                        <p className="text-sm text-gray-600">
                          緯度: {favorite.coordinates[0].toFixed(4)}, 
                          経度: {favorite.coordinates[1].toFixed(4)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {selectedFavorite?.id === favorite.id && (
                          <span className="text-blue-500 text-sm font-medium">選択中</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedFavorites = favorites.filter(f => f.id !== favorite.id);
                            setFavorites(updatedFavorites);
                            
                            // localStorageを更新（空の場合は削除）
                            if (updatedFavorites.length === 0) {
                              localStorage.removeItem('favoriteLocations');
                            } else {
                              localStorage.setItem('favoriteLocations', JSON.stringify(updatedFavorites));
                            }
                            
                            if (selectedFavorite?.id === favorite.id) {
                              setSelectedFavorite(null);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </div>
>>>>>>> origin/feat/#2
                    </div>
                  </button>
                ))}
              </div>
            )}
<<<<<<< HEAD

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
=======
            
            {selectedFavorite && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">選択された場所</h4>
                <p className="text-blue-800 text-sm">{selectedFavorite.name}</p>
>>>>>>> origin/feat/#2
              </div>
            )}
          </div>

<<<<<<< HEAD
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
=======
        <button
          type="button"
          onClick={() => navigate("/dashboard/navi/route")}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          戻る
        </button>
>>>>>>> origin/feat/#2
    </div>
  );
};

export default PurlieuLocation;
