import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { getUser } from "../../../firebase";
import { useUserUid } from "../../../hooks/useUserUid";

function UserInformation() {
  const navigate = useNavigate();
  const currentUserId = useUserUid();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!currentUserId) return;
      try {
        const u = await getUser(currentUserId);
        setUser(u);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [currentUserId]);

  const handleBack = () => {
    navigate("/dashboard");
  };

  return (
    <div>
      <HeaderComponent title="アカウント情報" onBack={handleBack} />

      <div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
        <div className="flex flex-col items-center gap-6 bg-white rounded-lg shadow p-6">
          {/* プロフィール画像 */}
          <div className="w-28 h-28 rounded-full overflow-hidden border">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user?.displayName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-3xl bg-gray-300 text-white">
                {user?.displayName?.charAt(0) || "?"}
              </div>
            )}
          </div>

          {/* ユーザー情報 */}
          <div className="w-full space-y-4">
            <InfoRow label="ユーザー名" value={user?.displayName || "○○○○○○○○"} />
            <InfoRow label="ユーザーID" value={currentUserId || "○○○○○○○○"} />
            <InfoRow
              label="アカウント作成日"
              value={formatCreatedAt(user?.createdAt) || "2025/10/04/13:11"}
            />

            {/* 一言メッセージ */}
            <div>
              <div className="font-bold text-lg mb-1">一言メッセージ</div>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {user?.message ||
                  "わわっわあああああ"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="font-bold">{label}</div>
      <div className="text-sm text-gray-700 break-all">{value}</div>
    </div>
  );
}

function formatCreatedAt(createdAt) {
  if (!createdAt || !createdAt.toDate) return "-";
  const d = createdAt.toDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}/${hh}:${mi}`;
}

export default UserInformation;
