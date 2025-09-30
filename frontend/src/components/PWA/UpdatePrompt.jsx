import { useRegisterSW } from "virtual:pwa-register/react";
import { useState } from "react";
import Button from "../ui/Button";

const UpdatePrompt = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  const {
    needRefresh: [_needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log(`SW Registered: ${r}`);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
    onNeedRefresh() {
      setShowUpdatePrompt(true);
    },
    onOfflineReady() {
      console.log("App ready to work offline");
    },
  });

  const handleUpdate = () => {
    setNeedRefresh(false);
    setShowUpdatePrompt(false);
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">新しいバージョンが利用可能です</h3>
          <p className="mt-1 text-sm text-gray-600">
            アプリを最新バージョンに更新して、新しい機能をお楽しみください。
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="primary" onClick={handleUpdate} className="text-xs">
              今すぐ更新
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismiss} className="text-xs">
              後で
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;
