import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "../../../components/Header/Header2";

const PurlieuLocation = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-center items-center p-5 h-screen bg-gray-100">
        <HeaderComponent2 title="通信" />
        <h1 className="text-2xl font-bold">お気に入り登録画面</h1>
        <p className="text-gray-600">お気に入りの場所を登録できます</p>
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
