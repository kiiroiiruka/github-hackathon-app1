import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";

const RouteSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center items-center p-5 h-screen bg-gray-100">
      <div className="flex flex-col justify-center items-center gap-4 w-[90%] max-w-[900px] h-[90%] bg-white rounded-2xl shadow-lg overflow-hidden p-5">
        <h1 className="text-2xl font-bold">ルート選択</h1>
        <p className="text-gray-600">ルートを選択してください</p>
         <Button label="お気に入り登録画面" onClick={() => navigate("/dashboard/navi/purlieu-location")} />
        <button
          type="button"
          onClick={() => navigate("/dashboard/navi/room")}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          戻る
        </button>
      </div>
    </div>
  );
};

export default RouteSelect;
