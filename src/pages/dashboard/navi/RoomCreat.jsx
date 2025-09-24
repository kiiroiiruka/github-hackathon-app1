import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import HeaderComponent2 from "../../../components/Header/Header2";
import RoomNameInput from "../../../components/RoomCreation/RoomNameInput";
import NavigationButton from "../../../components/RoomCreation/NavigationButton";
import SectionCard from "../../../components/RoomCreation/SectionCard";
import SelectedFriendsDisplay from "../../../components/RoomCreation/SelectedFriendsDisplay";
import ActionButton from "../../../components/RoomCreation/ActionButton";

const RoomCreat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomName, setRoomName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);

  // InviterPreferenceから戻ってきた時のフレンド情報を受け取る
  useEffect(() => {
    if (location.state?.selectedFriends) {
      setSelectedFriends(location.state.selectedFriends);
    }
  }, [location.state]);

  // フレンド選択ページに移動
  const handleInviterNavigation = () => {
    navigate("/dashboard/navi/inviter", { 
      state: { 
        selectedFriends, 
        returnTo: "/dashboard/navi/room" 
      } 
    });
  };

  // 選択されたフレンドを削除
  const removeFriend = (friendToRemove) => {
    setSelectedFriends(prev => prev.filter(friend => friend.uid !== friendToRemove.uid));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <HeaderComponent2 title="通信" />
      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* タイトルセクション */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🏠 ルーム作成</h1>
            <p className="text-gray-600">新しいルームを作成して友達と一緒に行動しよう</p>
          </div>

          <div className="space-y-6">
            {/* ルーム名セクション */}
            <RoomNameInput 
              roomName={roomName}
              onChange={setRoomName}
            />

            {/* ルート選択セクション */}
            <SectionCard icon="🗺️" title="ルート選択">
              <div className="grid gap-3">
                <NavigationButton
                  icon="📍"
                  title="ルートを選択"
                  description="目的地と経路を設定"
                  onClick={() => navigate("/dashboard/navi/route")}
                  hoverColor="blue"
                />
                
                <NavigationButton
                  icon="🧭"
                  title="ルート確認"
                  description="地図でルートを確認"
                  onClick={() => navigate("/dashboard/navi/route-screen")}
                  hoverColor="green"
                />
              </div>
            </SectionCard>

            {/* 招待するユーザーセクション */}
            <SectionCard 
              icon="👥" 
              title="招待するユーザー"
              badge={selectedFriends.length > 0 ? `${selectedFriends.length}名選択中` : undefined}
            >
              <SelectedFriendsDisplay 
                selectedFriends={selectedFriends}
                onRemoveFriend={removeFriend}
              />

              <NavigationButton
                icon="✨"
                title={selectedFriends.length > 0 ? "フレンドを追加/変更" : "フレンドを選択"}
                description={selectedFriends.length > 0 
                  ? "選択済みのフレンドを変更できます" 
                  : "一緒に行動する友達を招待"
                }
                onClick={handleInviterNavigation}
                hoverColor="purple"
                dashed={true}
              />
            </SectionCard>

            {/* 作成ボタン */}
            <div className="pt-4">
              <ActionButton
                disabled={!roomName.trim()}
                onClick={() => {
                  // ルーム作成ロジックをここに追加
                  console.log("ルーム作成:", { roomName, selectedFriends });
                }}
              >
                <span className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🚀</span>
                  {roomName.trim() ? `「${roomName}」を作成` : "ルーム名を入力してください"}
                </span>
              </ActionButton>
            </div>

            {/* 戻るボタン */}
            <div className="text-center pt-2">
              <ActionButton
                variant="secondary"
                size="small"
                onClick={() => navigate("/dashboard/navi")}
              >
                戻る
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCreat;