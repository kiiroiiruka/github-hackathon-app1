import HeaderComponent from "@/components/Header/Header";
import { useNavigate } from "react-router-dom";

const sections = [
  { title: "第1条（適用）", body: "本規約は、本サービスの利用に関する一切に適用されます。" },
  { title: "第2条（利用登録）", body: "ユーザーは当社の定める方法により登録を行うものとします。" },
  { title: "第3条（禁止事項）", body: "法令または公序良俗に反する行為、他者の権利侵害などを禁止します。" },
  { title: "第4条（免責事項）", body: "当社は、サービスに関して生じた損害について、一切の責任を負いません。" },
  { title: "第5条（規約の変更）", body: "当社は、本規約を必要に応じて変更できるものとします。" },
];

function UserPolicy() {
  const navigate = useNavigate();

  return (
    <div>
      <HeaderComponent title="利用規約" onBack={() => navigate(-1)} />
      <div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold mb-2">利用規約</h1>
            <p className="text-sm text-gray-600">本サービスのご利用にあたり、以下の規約に同意いただきます。</p>
          </div>

          {sections.map((s, idx) => (
            <section key={idx}>
              <h2 className="font-bold mb-1">{s.title}</h2>
              <p className="text-sm text-gray-700 whitespace-pre-line">{s.body}</p>
            </section>
          ))}

          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2 px-4 rounded"
              aria-label="前の画面へ戻る"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserPolicy;


