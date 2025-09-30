import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageLayout from "../../../components/layout/PageLayout";
import SelectedFriendsDisplay from "../../../components/RoomCreation/SelectedFriendsDisplay";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Section from "../../../components/ui/Section";

const RoomCreat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomName, setRoomName] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_roomName");
    return saved || "";
  });
  const [selectedFriends, setSelectedFriends] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_selectedFriends");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedLocation, setSelectedLocation] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_selectedLocation");
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedDeparture, setSelectedDeparture] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_selectedDeparture");
    return saved ? JSON.parse(saved) : null;
  });

  // InviterPreferenceから戻ってきた時のフレンド情報を受け取る
  useEffect(() => {
    console.log("RoomCreat - location.state:", location.state);
    if (location.state?.selectedFriends) {
      console.log("RoomCreat - selectedFriends受信:", location.state.selectedFriends);
      setSelectedFriends(location.state.selectedFriends);
      // ローカルストレージに保存
      localStorage.setItem(
        "roomCreat_selectedFriends",
        JSON.stringify(location.state.selectedFriends)
      );
    }
    // PurlieuLocationやRouteSelectから選択された場所を受け取る
    if (location.state?.selectedLocation) {
      console.log("RoomCreat - selectedLocation受信:", location.state.selectedLocation);
      setSelectedLocation(location.state.selectedLocation);
      // ローカルストレージに保存
      localStorage.setItem(
        "roomCreat_selectedLocation",
        JSON.stringify(location.state.selectedLocation)
      );
    }
    // 出発地点を受け取る
    if (location.state?.selectedDeparture) {
      console.log("RoomCreat - selectedDeparture受信:", location.state.selectedDeparture);
      setSelectedDeparture(location.state.selectedDeparture);
      // ローカルストレージに保存
      localStorage.setItem(
        "roomCreat_selectedDeparture",
        JSON.stringify(location.state.selectedDeparture)
      );
    }
  }, [location.state]);

  // selectedFriendsが変更されたときにローカルストレージに保存
  useEffect(() => {
    localStorage.setItem("roomCreat_selectedFriends", JSON.stringify(selectedFriends));
  }, [selectedFriends]);

  // selectedLocationが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (selectedLocation) {
      localStorage.setItem("roomCreat_selectedLocation", JSON.stringify(selectedLocation));
    } else {
      localStorage.removeItem("roomCreat_selectedLocation");
    }
  }, [selectedLocation]);

  // selectedDepartureが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (selectedDeparture) {
      localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(selectedDeparture));
    } else {
      localStorage.removeItem("roomCreat_selectedDeparture");
    }
  }, [selectedDeparture]);

  // roomNameが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (roomName.trim()) {
      localStorage.setItem("roomCreat_roomName", roomName);
    } else {
      localStorage.removeItem("roomCreat_roomName");
    }
  }, [roomName]);

  // フレンド選択ページに移動
  const handleInviterNavigation = () => {
    navigate("/dashboard/navi/inviter", {
      state: {
        selectedFriends,
        returnTo: "/dashboard/navi/room",
      },
    });
  };

  // 選択されたフレンドを削除
  const removeFriend = (friendToRemove) => {
    setSelectedFriends((prev) => {
      const updated = prev.filter((friend) => friend.uid !== friendToRemove.uid);
      // ローカルストレージも更新
      localStorage.setItem("roomCreat_selectedFriends", JSON.stringify(updated));
      return updated;
    });
  };

  // ルーム作成処理（確認画面に遷移）
  const handleCreateRoom = async () => {
    try {
      console.log("ルーム作成確認画面に遷移:", {
        roomName: roomName.trim(),
        selectedFriends,
        selectedLocation,
        selectedDeparture,
      });

      navigate("/dashboard/navi/confirmation", {
        state: {
          roomName: roomName.trim(),
          selectedFriends,
          selectedLocation,
          selectedDeparture,
        },
      });
    } catch (e) {
      console.error("確認画面遷移失敗:", e);
      alert("確認画面への遷移に失敗しました。");
    }
  };

  return (
    <PageLayout title="通信">
      {/* タイトルセクション */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🏠</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🏠 ルーム作成</h1>
        <p className="text-gray-600">新しいルームを作成して友達と一緒に行動しよう</p>
      </div>

      <div className="space-y-6">
        {/* ルーム名セクション */}
        <Section title="ルーム名" icon="📝">
          <Input
            label="ルーム名"
            placeholder="ルーム名を入力してください"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            icon="🏠"
            required
          />
        </Section>

        {/* ルート選択セクション */}
        <Section
          title="ルート選択"
          icon="🗺️"
          subtitle={
            <div className="flex gap-2 justify-center">
              {selectedDeparture && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  出発地設定済み
                </span>
              )}
              {selectedLocation && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  目的地設定済み
                </span>
              )}
            </div>
          }
        >
          {/* 選択された場所の表示 */}
          <div className="space-y-3 mb-4">
            {selectedDeparture && (
              <Card variant="success" className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🚀</span>
                  <h3 className="font-semibold text-green-800">設定済み出発地</h3>
                </div>
                <p className="text-green-700 font-medium">{selectedDeparture.name}</p>
                <p className="text-sm text-green-600 mt-1">
                  緯度: {selectedDeparture.coordinates[0].toFixed(4)}, 経度:{" "}
                  {selectedDeparture.coordinates[1].toFixed(4)}
                </p>
                <Button
                  variant="error"
                  size="sm"
                  onClick={() => {
                    setSelectedDeparture(null);
                    localStorage.removeItem("roomCreat_selectedDeparture");
                  }}
                  className="mt-2"
                >
                  出発地をクリア
                </Button>
              </Card>
            )}

            {selectedLocation && (
              <Card variant="primary" className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <h3 className="font-semibold text-blue-800">設定済み目的地</h3>
                </div>
                <p className="text-blue-700 font-medium">{selectedLocation.name}</p>
                <p className="text-sm text-blue-600 mt-1">
                  緯度: {selectedLocation.coordinates[0].toFixed(4)}, 経度:{" "}
                  {selectedLocation.coordinates[1].toFixed(4)}
                </p>
                <Button
                  variant="error"
                  size="sm"
                  onClick={() => {
                    setSelectedLocation(null);
                    localStorage.removeItem("roomCreat_selectedLocation");
                  }}
                  className="mt-2"
                >
                  目的地をクリア
                </Button>
              </Card>
            )}
          </div>

          <div className="grid gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
              icon="📍"
              onClick={() =>
                navigate("/dashboard/navi/route", {
                  state: {
                    selectedLocation,
                    returnTo: "/dashboard/navi/room",
                  },
                })
              }
            >
              <div className="text-left">
                <div className="font-semibold">
                  {selectedLocation ? "目的地を変更" : "ルートを選択"}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedLocation ? "別の目的地を設定" : "目的地と経路を設定"}
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
              icon="⭐"
              onClick={() => navigate("/dashboard/navi/purlieu-location")}
            >
              <div className="text-left">
                <div className="font-semibold">お気に入りから選択</div>
                <div className="text-sm text-gray-600">保存済みの場所から選択</div>
              </div>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
              icon="🧭"
              disabled={!selectedLocation}
              onClick={() =>
                navigate("/dashboard/navi/route-screen", {
                  state: {
                    destination: selectedLocation?.coordinates,
                    destinationName: selectedLocation?.name,
                    departure: selectedDeparture?.coordinates,
                    departureName: selectedDeparture?.name,
                    selectedDeparture: selectedDeparture,
                    selectedLocation: selectedLocation,
                    selectedFriends,
                    roomName: roomName.trim(),
                  },
                })
              }
            >
              <div className="text-left">
                <div className="font-semibold">ルート確認</div>
                <div className="text-sm text-gray-600">地図でルートを確認</div>
              </div>
            </Button>
          </div>
        </Section>

        {/* 招待するユーザーセクション */}
        <Section
          title="招待するユーザー"
          icon="👥"
          subtitle={selectedFriends.length > 0 ? `${selectedFriends.length}名選択中` : undefined}
        >
          <SelectedFriendsDisplay selectedFriends={selectedFriends} onRemoveFriend={removeFriend} />

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start mt-4"
            icon="✨"
            onClick={handleInviterNavigation}
          >
            <div className="text-left">
              <div className="font-semibold">
                {selectedFriends.length > 0 ? "フレンドを追加/変更" : "フレンドを選択"}
              </div>
              <div className="text-sm text-gray-600">
                {selectedFriends.length > 0
                  ? "選択済みのフレンドを変更できます"
                  : "一緒に行動する友達を招待"}
              </div>
            </div>
          </Button>
        </Section>

        {/* 作成ボタン */}
        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!roomName.trim()}
            onClick={handleCreateRoom}
            icon="🚀"
          >
            {roomName.trim() ? `「${roomName}」を作成` : "ルーム名を入力してください"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default RoomCreat;
