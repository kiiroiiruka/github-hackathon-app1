import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent from "@/components/Header/Header";
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
    navigate("/dashboard/navi/room", { state: { selectedFriends } });
  }, [selectedFriends, navigate]);

  const handleBack = () => navigate("/dashboard/navi/room");

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={retryFetch} onBack={handleBack} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <HeaderComponent title="通信" />
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">📨 招待するユーザー</h1>
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

          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedFriends.length === 0}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 transform ${
                selectedFriends.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">🚀</span>
                確定 ({selectedFriends.length}名)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviterPreference;