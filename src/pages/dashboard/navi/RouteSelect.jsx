import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
import HeaderComponent2 from "../../../components/Header/Header2";
import MapSearch from "../../../components/ui/MapSearch";

const RouteSelect = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100">
      <HeaderComponent2 title="通信" />
      
      <div className="flex flex-col items-center px-5 py-8 pt-20">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🗺️ ルート選択</h1>
            <p className="text-gray-600">目的地を検索して選択してください</p>
          </div>
          
          <div className="mt-8">
            <MapSearch
              onSelectDestination={(dest, name) => {
                setDestination(dest);
                console.log("選択された目的地:", name, dest);
              }}
            />
          </div>

          <div className="space-y-4 mt-8">
            <Button 
              label="お気に入り登録画面" 
              onClick={() => navigate("/dashboard/navi/purlieu-location")} 
            />
            
            <button
              type="button"
              onClick={() => navigate("/dashboard/navi/room")}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSelect;
