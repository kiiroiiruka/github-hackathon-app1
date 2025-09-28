import { useState, useCallback } from "react";
import MapSearch from "./MapSearch";
import AddressSearch from "./AddressSearch";

const LocationSearch = ({ 
  locationType = "destination", // "departure" or "destination"
  selectedDeparture = null,
  selectedDestination = null,
  onLocationTypeChange,
  onLocationSelect,
  onClearLocation,
  showLocationTypeSelector = true,
  showCurrentSettings = true,
  className = ""
}) => {
  const [searchMethod, setSearchMethod] = useState("mapSearch"); // "mapSearch" or "addressSearch"

  // MapSearch用のハンドラー
  const handleMapSearchSelect = useCallback((dest, name) => {
    const location = {
      name: name,
      coordinates: dest
    };
    onLocationSelect(location);
  }, [onLocationSelect]);

  // AddressSearch用のハンドラー
  const handleAddressSearchSelect = useCallback((addressData) => {
    const location = {
      name: addressData.name,
      coordinates: addressData.coordinates
    };
    onLocationSelect(location);
  }, [onLocationSelect]);

  return (
    <div className={`bg-white rounded-xl p-6 shadow-lg border border-gray-100 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🔍</span>
        <h2 className="text-lg font-semibold text-gray-800">場所を検索・設定</h2>
      </div>
      
      {/* 場所タイプの選択 */}
      {showLocationTypeSelector && (
        <div className="flex mb-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onLocationTypeChange && onLocationTypeChange("departure")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              locationType === "departure"
                ? "bg-white text-green-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            🚀 出発地点
          </button>
          <button
            type="button"
            onClick={() => onLocationTypeChange && onLocationTypeChange("destination")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              locationType === "destination"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            🎯 目的地
          </button>
        </div>
      )}

      {/* 現在の設定表示 */}
      {showCurrentSettings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className={`p-3 rounded-lg border-2 ${
            selectedDeparture ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span>🚀</span>
              <span className="text-sm font-medium text-gray-700">出発地点</span>
            </div>
            <p className="text-sm truncate">
              {selectedDeparture ? selectedDeparture.name : "未設定"}
            </p>
            {selectedDeparture && (
              <button
                type="button"
                onClick={() => onClearLocation && onClearLocation("departure")}
                className="text-xs text-red-500 hover:text-red-700 mt-1"
              >
                クリア
              </button>
            )}
          </div>
          <div className={`p-3 rounded-lg border-2 ${
            selectedDestination ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span>🎯</span>
              <span className="text-sm font-medium text-gray-700">目的地</span>
            </div>
            <p className="text-sm truncate">
              {selectedDestination ? selectedDestination.name : "未設定"}
            </p>
            {selectedDestination && (
              <button
                type="button"
                onClick={() => onClearLocation && onClearLocation("destination")}
                className="text-xs text-red-500 hover:text-red-700 mt-1"
              >
                クリア
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* 検索方法の切り替えタブ */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setSearchMethod("mapSearch")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            searchMethod === "mapSearch"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🗺️ 地図検索
        </button>
        <button
          type="button"
          onClick={() => setSearchMethod("addressSearch")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            searchMethod === "addressSearch"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📍 住所検索
        </button>
      </div>

      {/* 検索コンポーネント */}
      {searchMethod === "mapSearch" ? (
        <MapSearch onSelectDestination={handleMapSearchSelect} />
      ) : (
        <AddressSearch
          onSelectAddress={handleAddressSearchSelect}
          placeholder="住所を入力してください（例: 東京都新宿区西新宿2-8-1）"
          showCoordinates={true}
          enableDirectInput={true}
        />
      )}
    </div>
  );
};

export default LocationSearch;