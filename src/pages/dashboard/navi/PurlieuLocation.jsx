import { useNavigate } from "react-router-dom";
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
                >
                  全削除
                </button>
              )}
            </div>
            
            {favorites.length === 0 ? (
              <p className="text-gray-500 text-sm">まだお気に入りが登録されていません。上の検索で場所を検索してください。</p>
            ) : (
              <div className="space-y-2">
                {favorites.map((favorite) => (
                  <button 
                    type="button"
                    key={favorite.id}
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
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {selectedFavorite && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">選択された場所</h4>
                <p className="text-blue-800 text-sm">{selectedFavorite.name}</p>
              </div>
            )}
          </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard/navi/route")}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          戻る
        </button>
    </div>
  );
};

export default PurlieuLocation;
