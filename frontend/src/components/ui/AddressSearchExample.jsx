import { useState } from "react";
import AddressSearch from "./AddressSearch";

const AddressSearchExample = () => {
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  // 住所が選択された時の処理
  const handleAddressSelect = (addressData) => {
    console.log("選択された住所:", addressData);
    setSelectedAddress(addressData);

    // 検索履歴に追加（重複を避ける）
    setSearchHistory((prev) => {
      const exists = prev.some(
        (item) =>
          item.coordinates[0] === addressData.coordinates[0] &&
          item.coordinates[1] === addressData.coordinates[1]
      );
      if (!exists) {
        return [addressData, ...prev.slice(0, 4)]; // 最新5件まで保持
      }
      return prev;
    });
  };

  // 履歴から住所を選択
  const selectFromHistory = (address) => {
    setSelectedAddress(address);
  };

  // 選択をクリア
  const clearSelection = () => {
    setSelectedAddress(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          📍 住所検索コンポーネント
        </h1>

        {/* 住所検索コンポーネント */}
        <div className="mb-8">
          <AddressSearch
            onSelectAddress={handleAddressSelect}
            placeholder="住所を入力してください（例: 東京都新宿区、大阪城）"
            showCoordinates={true}
            className="mb-4"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 選択された住所情報 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🎯 選択された住所
            </h2>

            {selectedAddress ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">住所</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedAddress.name}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-2">座標</h3>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <p>緯度: {selectedAddress.coordinates[0].toFixed(6)}</p>
                    <p>経度: {selectedAddress.coordinates[1].toFixed(6)}</p>
                  </div>
                </div>

                {selectedAddress.details.address &&
                  Object.keys(selectedAddress.details.address).length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">詳細情報</h3>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded space-y-1">
                        {Object.entries(selectedAddress.details.address).map(([key, value]) => (
                          <p key={key}>
                            <span className="font-medium">{key}:</span> {value}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                <button
                  type="button"
                  onClick={clearSelection}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  選択をクリア
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">住所を検索して選択してください</p>
            )}
          </div>

          {/* 検索履歴 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              📚 検索履歴
            </h2>

            {searchHistory.length > 0 ? (
              <div className="space-y-2">
                {searchHistory.map((address) => (
                  <button
                    key={`${address.coordinates[0]}-${address.coordinates[1]}`}
                    type="button"
                    onClick={() => selectFromHistory(address)}
                    className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-800 truncate">{address.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {address.coordinates[0].toFixed(4)}, {address.coordinates[1].toFixed(4)}
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSearchHistory([])}
                  className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-md hover:bg-red-50 transition-colors mt-4"
                >
                  履歴をクリア
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">検索履歴はありません</p>
            )}
          </div>
        </div>

        {/* 使用方法の説明 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">使用方法</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 住所や建物名を入力して検索ボタンをクリック</p>
            <p>• Enterキーでも検索可能</p>
            <p>• 検索結果から住所を選択</p>
            <p>• 選択した住所の詳細情報と座標が表示されます</p>
            <p>• 検索履歴から過去の検索結果を再選択可能</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressSearchExample;
