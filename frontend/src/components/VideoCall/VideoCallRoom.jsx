import { get, ref } from "firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth, rtdb } from "@/firebase";
import { endCallSession, getDailyToken, updateCallDuration } from "@/firebase/room";
import { useDailyConnection } from "@/hooks/useDailyConnection";
import { useParticipantManager } from "@/hooks/useParticipantManager";
import { useUserUid } from "@/hooks/useUserUid";

const AudioCallRoom = ({ roomId, roomName, ownerUid, members, onCallEnd, onCallStateUpdate }) => {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyRoomUrl, setDailyRoomUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const currentUserUid = useUserUid();

  // 参加者管理フック
  const { handleParticipantUpdate, getActiveParticipants, startParticipantSession } =
    useParticipantManager(roomId);

  // Daily.co接続フック
  const {
    daily,
    isJoined,
    isConnecting,
    error: dailyError,
    participants,
    callDuration,
    formattedDuration,
    isMicrophoneEnabled: dailyMicrophoneEnabled,
    joinRoom,
    leaveRoom,
    destroyDaily,
    toggleMicrophone,
  } = useDailyConnection(roomId, dailyRoomUrl, handleParticipantUpdate, members);

  // 通話時間の定期更新
  useEffect(() => {
    if (isJoined && callDuration > 0 && currentUserUid) {
      // 10秒ごとに通話時間を更新
      if (callDuration % 10 === 0) {
        updateCallDuration(roomId, currentUserUid, callDuration);
      }
    }
  }, [isJoined, callDuration, currentUserUid, roomId]);

  // participantsをメモ化して無限ループを防ぐ
  const memoizedParticipants = useMemo(() => {
    const mappedParticipants = participants.map((p) => ({
      session_id: p.session_id,
      user_name: p.user_name,
      audio: p.audio,
      photoURL: p.photoURL,
      // Daily.coから提供されるlocalプロパティをそのまま使用
      local: p.local || false,
    }));

    // デバッグログを追加
    console.log("🎤 memoizedParticipants更新:", {
      totalParticipants: mappedParticipants.length,
      participants: mappedParticipants.map((p) => ({
        user_name: p.user_name,
        audio: p.audio,
        local: p.local,
        session_id: p.session_id,
      })),
    });

    return mappedParticipants;
  }, [participants]);

  // デバウンス用のタイマー
  const updateTimeoutRef = useRef(null);

  // 通話状態の更新を親コンポーネントに通知（デバウンス付き）
  const notifyCallStateUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      if (onCallStateUpdate) {
        console.log("📡 VideoCallRoom: 通話状態を親に通知:", {
          isActive: isJoined,
          participantCount: memoizedParticipants.length,
          isMicrophoneEnabled: dailyMicrophoneEnabled,
          participants: memoizedParticipants.map((p) => ({
            user_name: p.user_name,
            audio: p.audio,
            local: p.local,
          })),
        });

        onCallStateUpdate({
          isActive: isJoined,
          participants: memoizedParticipants,
          isMicrophoneEnabled: dailyMicrophoneEnabled,
        });
      }
    }, 100); // 100msのデバウンス
  }, [onCallStateUpdate, isJoined, memoizedParticipants, dailyMicrophoneEnabled]);

  useEffect(() => {
    notifyCallStateUpdate();
  }, [notifyCallStateUpdate]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Daily iframeの設定
  useEffect(() => {
    if (daily && iframeRef.current) {
      console.log("Setting up Daily iframe:", {
        daily: !!daily,
        iframe: !!iframeRef.current,
        iframeElement: iframeRef.current,
      });
      daily.setCustomIntegrations({ iframe: iframeRef.current });
    }
  }, [daily]);

  useEffect(() => {
    // 初期化済みの場合は実行しない
    if (isInitialized) return;

    // リトライ制限（最大3回まで）
    if (retryCount >= 3) {
      console.error("❌ 最大リトライ回数に達しました。初期化を停止します。");
      setError("通話の初期化に失敗しました。ページを再読み込みしてください。");
      setIsLoading(false);
      return;
    }

    let isMounted = true; // コンポーネントがマウントされているかチェック

    const initializeCall = async () => {
      try {
        if (!isMounted) return;

        setIsLoading(true);
        setError(null);

        // Get current user info
        if (!currentUserUid) {
          throw new Error("User not authenticated");
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("User not authenticated");
        }

        // FirebaseからDaily.coルーム情報を取得
        const roomRef = ref(rtdb, `rooms/${roomId}`);
        const roomSnapshot = await get(roomRef);
        const firebaseRoomData = roomSnapshot.val();

        if (!firebaseRoomData || !firebaseRoomData.dailyRoom) {
          throw new Error("Daily room not found in Firebase");
        }

        const dailyRoomInfo = firebaseRoomData.dailyRoom;
        const roomUrl = dailyRoomInfo.url;
        setDailyRoomUrl(roomUrl);

        // Get user token
        const token = await getDailyToken(
          roomId,
          currentUser.uid,
          currentUser.displayName || "Anonymous",
          currentUser.photoURL || ""
        );

        if (!isMounted) return;

        // フォールバックトークンの場合は警告を表示
        if (token.startsWith("fallback-token-")) {
          console.warn("⚠️ フォールバックトークンが使用されています。実際の通話はできません。");
          const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === "development";
          const errorMessage = isDevelopment
            ? "APIサーバーに接続できません。開発環境ではCloudflare Workersを起動してください。"
            : "APIサーバーに接続できません。本番環境ではCloudflare Pages Functionsの設定を確認してください。";
          setError(errorMessage);
          setIsLoading(false);
          return;
        }

        // 通話セッション開始（既に開始済みでない場合のみ）
        if (!sessionStarted) {
          await startParticipantSession(currentUser.uid, {
            name: currentUser.displayName || "Anonymous",
            photoURL: currentUser.photoURL || "",
          });
          setSessionStarted(true);
        }

        if (!isMounted) return;

        // Join the room (既に接続中でない場合のみ)
        if (!isJoined && !isConnecting) {
          console.log("🚀 ルームに参加を開始します:", {
            roomUrl,
            token: `${token.substring(0, 20)}...`,
          });
          await joinRoom(token, roomUrl);

          // iframe の状態を確認
          setTimeout(() => {
            if (isMounted) {
              console.log("After joinRoom - iframe state:", {
                daily: !!daily,
                iframe: !!iframeRef.current,
                isJoined,
                isConnecting,
              });
            }
          }, 1000);
        }

        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true); // 初期化完了フラグを設定
        }
      } catch (err) {
        console.error("Video call initialization error:", err);
        if (isMounted) {
          setRetryCount((prev) => prev + 1);
          setError(err.message);
          setIsLoading(false);
          setIsInitialized(false); // エラー時は初期化フラグをリセット
        }
      }
    };

    initializeCall();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (currentUserUid && callDuration > 0) {
        endCallSession(roomId, currentUserUid, callDuration);
      }
      destroyDaily();
    };
  }, [
    roomId,
    currentUserUid,
    retryCount,
    callDuration,
    daily,
    destroyDaily,
    isConnecting,
    isInitialized,
    isJoined,
    joinRoom,
    sessionStarted,
    startParticipantSession,
  ]); // isInitializedを依存配列から削除

  const handleLeaveCall = async () => {
    if (currentUserUid && callDuration > 0) {
      await endCallSession(roomId, currentUserUid, callDuration);
    }
    await leaveRoom();
    onCallEnd?.();
  };

  // マイク切り替えハンドラー
  const handleToggleMicrophone = async () => {
    if (!daily || !isJoined) return;

    try {
      await toggleMicrophone();
    } catch (error) {
      console.error("❌ マイク切り替えエラー:", error);
      setError("マイクの切り替えに失敗しました。");
    }
  };

  // マイク許可を再試行する関数
  const retryMicrophonePermission = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // 現在のユーザー情報を取得
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("ユーザーが認証されていません");
      }

      // Dailyトークンを再取得
      const token = await getDailyToken(
        roomId,
        currentUser.uid,
        currentUser.displayName || "Anonymous",
        currentUser.photoURL || ""
      );

      // 再度ルームに参加を試行
      await joinRoom(token);
    } catch (err) {
      console.error("マイク許可の再試行に失敗:", err);
      setError(err.message);
    }
  };

  // エラー表示の統合
  const displayError = error || dailyError;

  if (displayError) {
    const isMicrophoneError =
      displayError.includes("マイク") ||
      displayError.includes("microphone") ||
      displayError.includes("audio");

    const isApiError =
      displayError.includes("APIサーバー") || displayError.includes("Cloudflare Workers");

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gray-100 rounded" style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', maxWidth: '100%', maxHeight: '100%' }}>
        <div className="text-red-600 text-center w-full h-full flex flex-col justify-center" style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', maxWidth: '100%', maxHeight: '100%' }}>
          <p className="text-sm font-semibold mb-1">
            {isMicrophoneError
              ? "🎤 マイクエラー"
              : isApiError
                ? "🔧 APIサーバーエラー"
                : "通話エラー"}
          </p>
          <p className="text-xs mb-1">{displayError}</p>

          {isMicrophoneError && (
            <div className="mb-1 p-1 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="text-xs text-yellow-800 mb-1">
                <strong>解決方法:</strong>
              </p>
              <ol className="text-xs text-yellow-700 text-left list-decimal list-inside">
                <li>ブラウザのアドレスバーの左側にある🔒マークをクリック</li>
                <li>「マイク」の設定を「許可」に変更</li>
                <li>ページを再読み込みしてから再度試行</li>
              </ol>
            </div>
          )}

          {isApiError && (
            <div className="mb-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="text-xs text-blue-800 mb-1">
                <strong>開発環境での解決方法:</strong>
              </p>
              <ol className="text-xs text-blue-700 text-left list-decimal list-inside">
                <li>
                  ターミナルで <code className="bg-blue-100 px-1 rounded">cd functions</code> を実行
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">npx wrangler dev --port 8787</code>{" "}
                  を実行
                </li>
                <li>サーバーが起動したら、このページを再読み込み</li>
              </ol>
            </div>
          )}

          <div className="flex gap-1 justify-center">
            {isMicrophoneError && (
              <button
                type="button"
                onClick={retryMicrophonePermission}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs"
              >
                再試行
              </button>
            )}
            <button
              type="button"
              onClick={handleLeaveCall}
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || isConnecting) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gray-50 rounded" style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', maxWidth: '100%', maxHeight: '100%' }}>
        <div className="text-center w-full h-full flex flex-col justify-center" style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', maxWidth: '100%', maxHeight: '100%' }}>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
          <p className="text-gray-600 text-xs font-medium mb-1">
            {isLoading ? "通話開始中..." : "接続中..."}
          </p>

          {isConnecting && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
              <p className="font-semibold">🎤 マイク許可が必要</p>
              <p className="text-gray-600 text-xs">ブラウザで「許可」をクリック</p>
            </div>
          )}

          {isLoading && (
            <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
              <p>📞 音声通話ルームに参加中...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', maxWidth: '100%', maxHeight: '100%' }}>
      {/* 音声制御ボタンのみ表示（通話時間表示付き） - コンパクト版・常に表示 */}
      <div className="flex flex-col items-center gap-1 w-full h-full" style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', maxWidth: '100%', maxHeight: '100%' }}>
        {/* 通話時間表示 */}
        <div className="p-1 bg-blue-50 rounded w-full">
          <p className="text-xs text-blue-600 text-center">
            通話時間: <span className="font-mono font-semibold text-sm">{formattedDuration}</span>
          </p>
          <div className="flex items-center justify-center gap-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-red-600">{isJoined ? "通話中" : "待機中"}</span>
          </div>
        </div>

        {/* 音声制御ボタン */}
        <div className="flex gap-1 w-full">
          {/* マイク切り替えボタンのみ表示 */}
          <button
            type="button"
            onClick={handleToggleMicrophone}
            disabled={!isJoined}
            className={`w-full px-2 py-1 rounded shadow-md transition-colors text-xs font-medium ${!isJoined
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : dailyMicrophoneEnabled
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            title={dailyMicrophoneEnabled ? "マイクをミュート" : "マイクを有効化"}
          >
            {dailyMicrophoneEnabled ? "🎤 ON" : "🔇 OFF"}
          </button>
        </div>
      </div>

      {/* 隠しiframe（Daily.co用） */}
      <div ref={iframeRef} className="hidden" />
    </div>
  );
};

export default AudioCallRoom;
