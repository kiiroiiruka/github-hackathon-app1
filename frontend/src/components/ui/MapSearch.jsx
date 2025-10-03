import { useState } from "react";

const MapSearch = ({ onSelectDestination }) => {
  const [input, setInput] = useState("");
  const [candidates, setCandidates] = useState([]);

  // 住所検索
  const searchDestination = async () => {
    if (!input) return;
    
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          input
        )}&countrycodes=jp&limit=5`,
        {
          headers: {
            'User-Agent': 'DriveLink/1.0',
          },
        }
      );
      
      if (!res.ok) {
        if (res.status === 429) {
          alert("検索リクエストが多すぎます。少し時間をおいてから再度お試しください。");
          return;
        }
        throw new Error(`検索APIエラー: ${res.status}`);
      }
      
      const data = await res.json();
      setCandidates(data);
      
      if (data.length === 0) {
        alert("場所が見つかりませんでした。別のキーワードをお試しください。");
      }
    } catch (err) {
      console.error("住所検索エラー:", err);
      alert("検索に失敗しました。ネットワーク接続を確認してください。\n\n代わりにLocationSearchコンポーネントをご利用ください。");
    }
  };

  return (
    <div className="w-full max-w-[500px]">
      <div className="relative w-full bg-white rounded-lg shadow-lg p-2 flex gap-2 items-center border-2 border-gray-200">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && searchDestination()}
          placeholder="目的地を入力（例: 東京タワー）"
          className="flex-1 px-3 py-2.5 border-none rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        />
        <button
          type="button"
          onClick={searchDestination}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-md cursor-pointer text-sm font-bold transition hover:bg-blue-700 active:scale-95 flex-shrink-0"
        >
          🔍 検索
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="mt-2 border-2 border-gray-300 rounded-lg bg-white shadow-xl max-h-[240px] overflow-y-auto">
          {candidates.map((c) => {
            const handleSelect = () => {
              const dest = [parseFloat(c.lat), parseFloat(c.lon)];
              onSelectDestination(dest, c.display_name);
              setCandidates([]);
              setInput(c.display_name);
            };

            return (
              <button
                key={`${c.lat}-${c.lon}-${c.display_name}`}
                type="button"
                className="w-full px-4 py-3 text-sm text-left border-b border-gray-200 transition hover:bg-blue-50 last:border-b-0 focus:outline-none focus:bg-blue-50 active:bg-blue-100"
                onClick={handleSelect}
              >
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 flex-shrink-0">📍</span>
                  <span className="flex-1">{c.display_name}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MapSearch;
