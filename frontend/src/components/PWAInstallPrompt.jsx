import { useEffect, useState } from "react";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // デフォルトのインストールプロンプトを防ぐ
      e.preventDefault();
      // イベントを保存して後で使用
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // インストールプロンプトを表示
    deferredPrompt.prompt();

    // ユーザーの選択を待つ
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWAインストールが承認されました");
    } else {
      console.log("PWAインストールが拒否されました");
    }

    // プロンプトをクリア
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📱</div>
          <div>
            <h3 className="font-semibold text-gray-800">アプリをインストール</h3>
            <p className="text-sm text-gray-600">ホーム画面に追加してアプリとして使用できます</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleDismiss}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            後で
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            インストール
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
