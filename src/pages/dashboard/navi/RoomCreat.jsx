import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
import HeaderComponent2 from "../../../components/Header/Header2";
const RoomCreat = () => {
  const navigate = useNavigate();


  return (
    
    <div className="flex flex-col justify-center items-center p-5 h-screen bg-gray-100 ">
        <HeaderComponent2 title="通信" />
            <h1>ルーム名</h1>
            <div className="border-2 border-gray-300 rounded-lg p-4 flex flex-col gap-2 w-full">
            </div>
            <h1>ルート選択</h1>
            <div className="border-2 border-gray-300 rounded-lg p-4 flex flex-col gap-2 w-full">
            <Button label="選択" onClick={() => navigate("/dashboard/navi/route")} />
            <Button label="ルート" onClick={() => navigate("/dashboard/navi/route-screen")} />
            </div>
            <h1>招待するユーザー</h1>
            <div className="border-2 border-gray-300 rounded-lg p-4 flex flex-col gap-2 w-full">
            <Button label="選択" onClick={() => navigate("/dashboard/navi/inviter")} />
            </div>
    </div>
  );
};

export default RoomCreat;