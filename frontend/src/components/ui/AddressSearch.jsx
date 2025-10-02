import { useState } from "react";

const AddressSearch = ({
  onSelectAddress,
  placeholder = "住所を入力してください（例: 東京都渋谷区新宿1-1-1）",
  className = "",
  showCoordinates = false,
  enableDirectInput = true, // 直接入力機能の有効/無効
}) => {
  const [input, setInput] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 住所検索
  const searchAddress = async () => {
    if (!input.trim()) {
      alert("住所を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          input
        )}&countrycodes=jp&limit=8&addressdetails=1`
      );
      const data = await res.json();
      setCandidates(data);
      if (data.length === 0) {
        alert("該当する住所が見つかりませんでした");
      }
    } catch (err) {
      console.error("住所検索エラー:", err);
      alert("住所検索中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 直接入力で住所を確定（座標も自動取得）
  const handleDirectInput = async () => {
    if (!input.trim()) {
      alert("住所を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      // 住所から座標を取得
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          input.trim()
        )}&countrycodes=jp&limit=1&addressdetails=1`
      );
      const data = await res.json();

      let addressData;
      if (data.length > 0) {
        // 座標が取得できた場合
        const result = data[0];
        addressData = {
          name: input.trim(),
          coordinates: [parseFloat(result.lat), parseFloat(result.lon)],
          details: {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            isDirectInput: true,
            foundCoordinates: true,
            originalQuery: result.display_name,
            address: result.address || {},
          },
        };
        console.log("住所から座標を取得:", addressData.coordinates);
      } else {
        // 座標が取得できなかった場合
        addressData = {
          name: input.trim(),
          coordinates: [0, 0], // 座標は不明
          details: {
            lat: 0,
            lon: 0,
            isDirectInput: true,
            foundCoordinates: false,
          },
        };
        console.warn("座標を取得できませんでした:", input.trim());
      }

      onSelectAddress(addressData);
      setCandidates([]);
    } catch (error) {
      console.error("座標取得エラー:", error);
      // エラーの場合は座標なしで処理
      const addressData = {
        name: input.trim(),
        coordinates: [0, 0],
        details: {
          lat: 0,
          lon: 0,
          isDirectInput: true,
          foundCoordinates: false,
          error: error.message,
        },
      };
      onSelectAddress(addressData);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enterキーでの処理
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (enableDirectInput) {
        handleDirectInput();
      } else {
        searchAddress();
      }
    }
  };

  // 住所選択時の処理
  const handleSelectAddress = (candidate) => {
    const addressData = {
      name: candidate.display_name,
      coordinates: [parseFloat(candidate.lat), parseFloat(candidate.lon)],
      details: {
        lat: parseFloat(candidate.lat),
        lon: parseFloat(candidate.lon),
        boundingbox: candidate.boundingbox,
        class: candidate.class,
        type: candidate.type,
        importance: candidate.importance,
        address: candidate.address || {},
      },
    };

    // 親コンポーネントに選択された住所情報を渡す
    onSelectAddress(addressData);

    // UIの更新
    setInput(candidate.display_name);
    setCandidates([]);
  };

  // 入力欄をクリア
  const clearInput = () => {
    setInput("");
    setCandidates([]);
  };

  return (
    <div className={`w-full max-w-[600px] mx-auto ${className}`}>
      {/* 検索入力欄 */}
      <div className="relative w-full bg-white rounded-lg shadow-md p-3 flex gap-2 items-center border border-gray-200">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            disabled={isLoading}
          />
          {input && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
              title="クリア"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          {enableDirectInput && (
            <button
              type="button"
              onClick={handleDirectInput}
              disabled={!input.trim() || isLoading}
              className={`px-2.5 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                !input.trim() || isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 hover:shadow-md"
              }`}
              title="入力された住所から座標を自動取得して確定"
            >
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span className="hidden sm:inline">取得中</span>
                </span>
              ) : (
                <>
                  <span className="hidden sm:inline">✓ 確定</span>
                  <span className="sm:hidden">✓</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={searchAddress}
            disabled={isLoading || !input.trim()}
            className={`px-2.5 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              isLoading || !input.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span className="hidden sm:inline">検索中</span>
              </span>
            ) : (
              <>
                <span className="hidden sm:inline">🔍 検索</span>
                <span className="sm:hidden">🔍</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 検索結果一覧 */}
      {candidates.length > 0 && (
        <div className="mt-3 border border-gray-200 rounded-lg bg-white shadow-lg max-h-[300px] overflow-y-auto">
          <div className="p-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600 font-medium">
            📍 検索結果 ({candidates.length}件)
          </div>
          {candidates.map((candidate, index) => {
            return (
              <button
                key={`${candidate.lat}-${candidate.lon}-${index}`}
                type="button"
                className="w-full px-4 py-3 text-sm text-left border-b border-gray-100 transition-colors hover:bg-blue-50 focus:outline-none focus:bg-blue-50 last:border-b-0"
                onClick={() => handleSelectAddress(candidate)}
              >
                <div className="space-y-1">
                  <div className="font-medium text-gray-800">{candidate.display_name}</div>

                  {showCoordinates && (
                    <div className="text-xs text-gray-500">
                      座標: {parseFloat(candidate.lat).toFixed(4)},{" "}
                      {parseFloat(candidate.lon).toFixed(4)}
                    </div>
                  )}

                  {candidate.address && (
                    <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                      {candidate.address.country && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {candidate.address.country}
                        </span>
                      )}
                      {candidate.address.state && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {candidate.address.state}
                        </span>
                      )}
                      {candidate.address.city && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {candidate.address.city}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 使用方法のヒント */}
      {candidates.length === 0 && !isLoading && (
        <div className="mt-2 text-xs text-gray-500 text-center space-y-1">
          {enableDirectInput ? (
            <>
              <div>💡 住所を入力して「確定」で座標を自動取得、または「検索」で候補を表示</div>
              <div>📍 例: 東京都新宿区西新宿2-8-1、大阪城、東京スカイツリー</div>
              <div>🌐 確定ボタンでも座標が自動的に取得されます</div>
            </>
          ) : (
            <div>💡 都道府県、市区町村、建物名などで検索できます</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressSearch;
