import { get, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { auth, rtdb } from "@/firebase";
import {
	endCallSession,
	getDailyToken,
	startCallSession,
	updateCallDuration,
} from "@/firebase/room";
import { useDailyConnection } from "@/hooks/useDailyConnection";
import { useParticipantManager } from "@/hooks/useParticipantManager";
import { useUserUid } from "@/hooks/useUserUid";

const AudioCallRoom = ({ roomId, roomName, ownerUid, onCallEnd }) => {
	const iframeRef = useRef(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [dailyRoomUrl, setDailyRoomUrl] = useState(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [sessionStarted, setSessionStarted] = useState(false);
	const [retryCount, setRetryCount] = useState(0);
	const currentUserUid = useUserUid();

	// 参加者管理フック
	const {
		handleParticipantUpdate,
		getActiveParticipants,
		startParticipantSession,
	} = useParticipantManager(roomId);

	// Daily.co接続フック
	const {
		daily,
		isJoined,
		isConnecting,
		error: dailyError,
		participants,
		callDuration,
		formattedDuration,
		joinRoom,
		leaveRoom,
		destroyDaily,
	} = useDailyConnection(roomId, dailyRoomUrl, handleParticipantUpdate);

	// 通話時間の定期更新
	useEffect(() => {
		if (isJoined && callDuration > 0 && currentUserUid) {
			// 10秒ごとに通話時間を更新
			if (callDuration % 10 === 0) {
				updateCallDuration(roomId, currentUserUid, callDuration);
			}
		}
	}, [isJoined, callDuration, currentUserUid, roomId]);

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
				setIsInitialized(true); // 初期化開始フラグを設定

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
				setDailyRoomUrl(dailyRoomInfo.url);

				// Get user token
				const token = await getDailyToken(
					roomId,
					currentUser.uid,
					currentUser.displayName || "Anonymous",
					currentUser.photoURL || "",
				);

				if (!isMounted) return;

				// フォールバックトークンの場合は警告を表示
				if (token.startsWith('fallback-token-')) {
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
					await joinRoom(token);

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
				}
			} catch (err) {
				console.error("Video call initialization error:", err);
				if (isMounted) {
					setRetryCount(prev => prev + 1);
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
	}, [roomId, currentUserUid, isInitialized, retryCount]); // joinRoom, destroyDailyを依存配列から削除

	const handleLeaveCall = async () => {
		if (currentUserUid && callDuration > 0) {
			await endCallSession(roomId, currentUserUid, callDuration);
		}
		await leaveRoom();
		onCallEnd?.();
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
				currentUser.photoURL || "",
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
		const isMicrophoneError = displayError.includes("マイク") || 
								  displayError.includes("microphone") || 
								  displayError.includes("audio");
		
		const isApiError = displayError.includes("APIサーバー") || 
						  displayError.includes("Cloudflare Workers");

		return (
			<div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
				<div className="text-red-600 text-center max-w-md">
					<p className="text-lg font-semibold mb-4">
						{isMicrophoneError ? "🎤 マイクエラー" : 
						 isApiError ? "🔧 APIサーバーエラー" : "通話エラー"}
					</p>
					<p className="text-sm mb-4">{displayError}</p>
					
					{isMicrophoneError && (
						<div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
							<p className="text-sm text-yellow-800 mb-2">
								<strong>解決方法:</strong>
							</p>
							<ol className="text-xs text-yellow-700 text-left list-decimal list-inside space-y-1">
								<li>ブラウザのアドレスバーの左側にある🔒マークをクリック</li>
								<li>「マイク」の設定を「許可」に変更</li>
								<li>ページを再読み込みしてから再度試行</li>
							</ol>
						</div>
					)}
					
					{isApiError && (
						<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
							<p className="text-sm text-blue-800 mb-2">
								<strong>開発環境での解決方法:</strong>
							</p>
							<ol className="text-xs text-blue-700 text-left list-decimal list-inside space-y-1">
								<li>ターミナルで <code className="bg-blue-100 px-1 rounded">cd functions</code> を実行</li>
								<li><code className="bg-blue-100 px-1 rounded">npx wrangler dev --port 8787</code> を実行</li>
								<li>サーバーが起動したら、このページを再読み込み</li>
							</ol>
						</div>
					)}
					
					<div className="flex gap-2 justify-center">
						{isMicrophoneError && (
							<button
								type="button"
								onClick={retryMicrophonePermission}
								className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
							>
								再試行
							</button>
						)}
						<button
							type="button"
							onClick={handleLeaveCall}
							className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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
			<div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
				<div className="text-center max-w-md">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<p className="text-gray-600 mb-4 text-lg font-semibold">
						{isLoading ? "通話を開始しています..." : "接続中..."}
					</p>
					
					{isConnecting && (
						<div className="text-sm text-blue-600 bg-blue-50 px-6 py-4 rounded-lg border border-blue-200">
							<div className="flex items-center justify-center mb-3">
								<svg className="w-8 h-8 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
								</svg>
								<span className="font-bold text-lg">🎤 マイクの使用を許可しますか？</span>
							</div>
							<div className="bg-white p-4 rounded-lg border-2 border-blue-300 mb-3">
								<p className="text-sm font-semibold text-gray-800 mb-2">
									📢 ブラウザの許可ダイアログが表示されました
								</p>
								<p className="text-sm text-gray-700 mb-2">
									「許可」をクリックして音声通話を開始してください
								</p>
								<div className="flex items-center justify-center">
									<div className="animate-bounce text-blue-600">👇</div>
								</div>
							</div>
							<div className="text-xs text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
								<p className="font-semibold mb-2 text-yellow-800">⚠️ もしダイアログが表示されない場合:</p>
								<ol className="text-left space-y-1 text-yellow-700">
									<li>1. ブラウザのアドレスバー左の🔒マークをクリック</li>
									<li>2. 「マイク」を「許可」に設定</li>
									<li>3. ページを再読み込みしてから再度試行</li>
								</ol>
							</div>
						</div>
					)}
					
					{isLoading && (
						<div className="text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg">
							<p className="mb-2">📞 音声通話ルームに参加しています...</p>
							<p className="text-xs text-gray-500">
								同じルームのメンバーと音声で会話できます
							</p>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full flex flex-col items-center justify-center p-6">
			{/* 音声通話のメイン表示 */}
			<div className="text-center mb-8">
				<div className="w-32 h-32 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
					<svg
						className="w-16 h-16 text-blue-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
						/>
					</svg>
				</div>

				<h2 className="text-2xl font-bold text-gray-800 mb-2">🎤 音声通話中</h2>
				<p className="text-gray-600 mb-4">{roomName}</p>
				<p className="text-sm text-gray-500 mb-4">
					同じルームのメンバーと音声で会話できます
				</p>

				{/* 通話時間表示 */}
				{isJoined && (
					<div className="mb-4 p-3 bg-blue-50 rounded-lg">
						<p className="text-sm text-blue-600">
							通話時間:{" "}
							<span className="font-mono font-semibold text-lg">
								{formattedDuration}
							</span>
						</p>
						<div className="flex items-center justify-center gap-2 mt-2">
							<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
							<span className="text-sm text-red-600">通話中</span>
						</div>
					</div>
				)}
			</div>

			{/* 音声制御ボタン */}
			{isJoined && (
				<div className="flex gap-4 mb-6">
					<button
						type="button"
						onClick={() => {
							if (daily) {
								daily.setLocalAudio(!daily.localAudio());
							}
						}}
						className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg"
					>
						マイク切り替え
					</button>
					<button
						type="button"
						onClick={handleLeaveCall}
						className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
					>
						通話を終了
					</button>
				</div>
			)}

			{/* 参加者情報 */}
			{participants.length > 0 && (
				<div className="w-full max-w-md p-4 bg-gray-50 rounded-lg">
					<p className="text-sm text-gray-600 mb-3 text-center">
						参加者: {participants.length}人
					</p>
					<div className="flex flex-wrap gap-2 justify-center">
						{participants.map((participant) => (
							<div
								key={participant.session_id}
								className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
							>
								{participant.user_name || "Anonymous"}
								{participant.local && (
									<span className="text-blue-600">(あなた)</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* 隠しiframe（Daily.co用） */}
			<div ref={iframeRef} className="hidden" />
		</div>
	);
};

export default AudioCallRoom;
