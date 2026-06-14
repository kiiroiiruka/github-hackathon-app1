import clsx from "clsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "@/firebase";
import carIcon from "../assets/carIcon.png";

const GoogleLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className="w-5 h-5"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303C33.826 32.438 29.274 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.79 6.053 29.122 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.79 6.053 29.122 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.167 0 9.86-1.977 13.409-5.192l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.252 0-9.815-3.589-11.289-8.438l-6.553 5.047C9.474 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-1.054 3.438-3.617 6.166-6.885 7.571l.001.001 6.191 5.238C33.978 41.045 40 36 40 24c0-1.341-.138-2.651-.389-3.917z"
    />
  </svg>
);

function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle();
    } catch {
      // already logged by loginWithGoogle
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-dvw flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* アプリ情報カード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
            <img
              src={carIcon}
              alt="DriveLink アプリアイコン"
              className="w-20 h-20 rounded-2xl mx-auto mb-4 ring-1 ring-gray-200"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-1">DriveLink</h1>
            <p className="text-sm text-gray-600">みんなでつながる、ドライブ共有アプリ</p>
            <p className="mt-3 text-xs text-gray-400 font-mono break-all">
              {typeof window !== "undefined" ? window.location.host : "github-hackathon-app1.pages.dev"}
            </p>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-sm font-medium text-blue-900 mb-1">ログインについて</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                ボタンを押すと <strong>Google の公式認証画面</strong>が開きます。
                パスワードの入力は Google の画面でのみ行われ、このページではお伺いしません。
              </p>
            </div>

            {/* Google 公式ガイドライン準拠のボタンスタイル */}
            <button
              onClick={handleLogin}
              type="button"
              disabled={isLoading}
              className={clsx(
                "w-full flex items-center justify-center gap-3",
                "px-4 py-3 rounded-lg",
                "bg-white text-gray-700 text-sm font-medium",
                "border border-[#747775]",
                "hover:bg-gray-50 hover:shadow-sm",
                "transition-colors duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
              aria-busy={isLoading}
              aria-label="Google でログイン"
            >
              <GoogleLogo />
              <span>{isLoading ? "認証画面を開いています..." : "Google でログイン"}</span>
            </button>

            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                ログインにより、表示名・プロフィール画像をアプリ内で利用します。
                クレジットカード番号や電話番号の入力は求めません。
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-4">
            <button
              onClick={() => navigate("/policy")}
              type="button"
              className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800"
            >
              利用規約
            </button>
            <span className="text-gray-300" aria-hidden="true">
              |
            </span>
            <span className="text-xs text-gray-400">Firebase Authentication 使用</span>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          このサイトは Google 公式ログインページではありません
        </p>
      </div>
    </div>
  );
}

export default LoginScreen;
