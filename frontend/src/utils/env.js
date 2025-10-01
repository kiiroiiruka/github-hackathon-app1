/**
 * 環境変数ユーティリティ
 * Viteの環境変数を使用して開発用機能の表示/非表示を制御
 */

/**
 * デバッグモード（GPS操作など）を表示するか
 * @returns {boolean}
 */
export const isDebugModeEnabled = () => {
  // 環境変数が明示的に設定されている場合はその値を優先
  if (import.meta.env.VITE_ENABLE_DEBUG_MODE !== undefined) {
    return import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true';
  }
  // 環境変数が未設定の場合は開発モードかどうかで判定
  return import.meta.env.DEV;
};

/**
 * 開発ページボタンを表示するか
 * @returns {boolean}
 */
export const showDevButtons = () => {
  // 環境変数が明示的に設定されている場合はその値を優先
  if (import.meta.env.VITE_SHOW_DEV_BUTTONS !== undefined) {
    return import.meta.env.VITE_SHOW_DEV_BUTTONS === 'true';
  }
  // 環境変数が未設定の場合は開発モードかどうかで判定
  return import.meta.env.DEV;
};

/**
 * 開発環境かどうか
 * @returns {boolean}
 */
export const isDevelopment = () => {
  return import.meta.env.DEV;
};

/**
 * 本番環境かどうか
 * @returns {boolean}
 */
export const isProduction = () => {
  return import.meta.env.PROD;
};

