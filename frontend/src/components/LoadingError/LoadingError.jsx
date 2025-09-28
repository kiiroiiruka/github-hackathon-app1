import PropTypes from "prop-types";

/**
 * ローディングスクリーンコンポーネント
 */
export const LoadingScreen = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
      <p className="text-gray-600">フレンド一覧を読み込み中...</p>
    </div>
  </div>
);

/**
 * エラースクリーンコンポーネント
 */
export const ErrorScreen = ({ error, onRetry, onBack }) => (
  <div className="flex flex-col justify-center items-center h-screen p-5">
    <div className="text-center max-w-md">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">エラーが発生しました</h2>
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-2"
      >
        再試行
      </button>
      <button
        type="button"
        onClick={onBack}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      >
        戻る
      </button>
    </div>
  </div>
);

ErrorScreen.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired
};