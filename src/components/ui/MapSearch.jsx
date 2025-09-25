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
        )}&countrycodes=jp&limit=5`
      );
      const data = await res.json();
      setCandidates(data);
      if (data.length === 0) alert("場所が見つかりませんでした");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-[500px]">
      <div className="relative w-full bg-white rounded-lg shadow-md p-2 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="目的地を入力（例: 東京タワー）"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:shadow"
        />
        <button
          type="button"
          onClick={searchDestination}
          className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer text-sm font-bold transition hover:bg-blue-800"
        >
          検索
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="mt-6 border border-gray-200 rounded-md bg-white shadow-md max-h-[200px] overflow-y-auto">
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
                className="w-full px-4 py-2 text-sm text-left border-b border-gray-100 transition hover:bg-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-100"
                onClick={handleSelect}
              >
                {c.display_name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MapSearch;