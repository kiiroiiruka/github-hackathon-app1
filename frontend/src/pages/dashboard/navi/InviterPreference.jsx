import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/ui/Button";
import { LoadingScreen, ErrorScreen } from "../../../components/LoadingError/LoadingError";
import SelectedFriendsSection from "../../../components/SelectedFriendsSection/SelectedFriendsSection";
import FriendsListSection from "../../../components/FriendsListSection/FriendsListSection";
import { useFriends, useSelectedFriends } from "../../../hooks/useFriends";

const InviterPreference = () => {
  const navigate = useNavigate();
  const { friends, loading, error, fetchFriends, retryFetch } = useFriends();
  const { selectedFriends, toggleSelectFriend, clearAllSelection } = useSelectedFriends();

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleConfirm = useCallback(() => {
    if (selectedFriends.length === 0) {
      alert("招待するフレンドを選択してください。");
      return;
    }
    console.log("InviterPreference - 確定時のselectedFriends:", selectedFriends);
    console.log("InviterPreference - selectedFriendsの各要素:", selectedFriends.map(f => ({ uid: f.uid, displayName: f.displayName, email: f.email })));
    navigate("/dashboard/navi/room", { state: { selectedFriends } });
  }, [selectedFriends, navigate]);

  const handleBack = () => navigate("/dashboard/navi/room");

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={retryFetch} onBack={handleBack} />;

  return (
    <PageLayout title="通信">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">📨</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">招待するユーザー</h1>
        <p className="text-gray-600">一緒に行動するフレンドを選択しましょう</p>
      </div>
          
          <SelectedFriendsSection 
            selectedFriends={selectedFriends} 
            clearAllSelection={clearAllSelection} 
          />

          <FriendsListSection 
            friends={friends} 
            selectedFriends={selectedFriends} 
            onToggleFriend={toggleSelectFriend} 
          />

      <div className="mt-8">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleConfirm}
          disabled={selectedFriends.length === 0}
          icon="🚀"
        >
          確定 ({selectedFriends.length}名)
        </Button>
      </div>
    </PageLayout>
  );
};

export default InviterPreference;