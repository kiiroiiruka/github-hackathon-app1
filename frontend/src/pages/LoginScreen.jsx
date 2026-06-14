import clsx from "clsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "@/firebase";
import carIcon from "../assets/carIcon.png";

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
    <div
      className={clsx(
        "min-h-dvh w-dvw flex items-center justify-center", // layout
        "bg-white" // clean white background
      )}
    >
      <div
        className={clsx(
          "flex flex-col items-center", // layout
          "gap-10 px-6" // spacing
        )}
      >
        {/* App Title - elegant style */}
        <div className="text-center mb-2">
          <h1 className="text-gray-900 text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            DriveLink
          </h1>
          <p className="text-gray-600 text-sm font-medium tracking-wide">
            みんなでつながる、ドライブアプリ
          </p>
        </div>

        {/* App icon - elegant card style */}
        <div
          className={clsx(
            "w-[160px] h-[160px]", // larger size
            "rounded-3xl", // large rounded corners
            "bg-gradient-to-br from-blue-50 to-indigo-50", // subtle gradient background
            "shadow-xl shadow-blue-500/10", // colored shadow
            "overflow-hidden", // clip corners
            "transform transition-all duration-300", // smooth animation
            "hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20", // hover effects
            "ring-1 ring-gray-200", // subtle border
            "border-4 border-white" // white border for depth
          )}
        >
          <img src={carIcon} alt="DriveLink" className="w-full h-full object-cover" />
        </div>

        {/* Google login button */}
        <button
          onClick={handleLogin}
          type="button"
          disabled={isLoading}
          className={clsx(
            "relative w-full max-w-[280px]",
            "flex items-center justify-center",
            "gap-2.5 px-6 py-4",
            "text-[18px] leading-snug font-semibold",
            "bg-white text-gray-700",
            "rounded-2xl",
            "shadow-md ring-1 ring-gray-300",
            "transform transition-all duration-200",
            "hover:shadow-lg hover:scale-[1.02]",
            "active:scale-[0.98]",
            isLoading && "opacity-70 cursor-not-allowed"
          )}
          aria-busy={isLoading}
        >
          <span className="inline-flex items-center justify-center w-6 h-6 flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-6 h-6"
              aria-hidden="true"
              focusable="false"
            >
              <title>Google</title>
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
          </span>
          <span className="flex-shrink-0">
            {isLoading ? "処理中..." : "Googleアカウントでログイン"}
          </span>
        </button>

        <p className="text-xs text-gray-500 text-center max-w-[280px] leading-relaxed">
          ログインは Google の認証画面で行われます。DriveLink がパスワードを直接お伺いすることはありません。
        </p>

        {/* Policy button - subtle style for white background */}
        <button
          onClick={() => navigate("/policy")}
          type="button"
          className={clsx(
            "text-sm text-gray-500 underline underline-offset-4",
            "hover:text-gray-800 transition-colors duration-200",
            "font-medium"
          )}
          aria-label="利用規約を開く"
        >
          利用規約
        </button>
      </div>
    </div>
  );
}

export default LoginScreen;
