import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
const RoomCreat = () => {
  const navigate = useNavigate();


  return (
    
    <div className="flex flex-col justify-center items-center p-5 h-screen bg-gray-100">
        <header className="text-2xl font-bold pb-2 mb-4">
            通信
        </header>
        <div className="w-full border-b-2 border-black mb-4"></div>
        <div className="flex flex-col justify-center items-center gap-4 w-[90%] max-w-[900px] h-[90%] bg-white rounded-2xl shadow-lg overflow-hidden p-5">
            <>ルート選択</>
            <div className="border-2 border-gray-300 rounded-lg p-4 flex flex-col gap-2">
            <Button label="選択" onClick={() => navigate("/dashboard/navi/route")} />
            <Button label="ルート" onClick={() => navigate("/dashboard/navi/route-screen")} />
            </div>
            <>招待するユーザー</>
            <div className="border-2 border-gray-300 rounded-lg p-4">
            <Button label="選択" onClick={() => navigate("/dashboard/navi/inviter")} />
            </div>
        </div>
    </div>
  );
};

export default RoomCreat;