import { useState, useCallback, useEffect } from 'react';
import { ref, onValue, set, get, serverTimestamp } from 'firebase/database';
import { rtdb } from '@/firebase/firebaseConfig';
import { useUserUid } from './useUserUid';

/**
 * 参加者の状態管理とFirebase同期のカスタムフック
 */
export const useParticipantManager = (roomId) => {
  const [participants, setParticipants] = useState({});
  const [participantSessions, setParticipantSessions] = useState({});
  const currentUserUid = useUserUid();

  // Firebase上の参加者データを監視
  useEffect(() => {
    if (!roomId) return;

    const participantRef = ref(rtdb, `rooms/${roomId}/members`);
    const unsubscribe = onValue(participantRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setParticipants(data);
      }
    });

    return unsubscribe;
  }, [roomId]);

  // 参加者のセッション開始
  const startParticipantSession = useCallback(async (userId, participantInfo = {}) => {
    if (!roomId || !userId) return;

    const sessionData = {
      joinedAt: serverTimestamp(),
      isActive: true,
      participantInfo: {
        name: participantInfo.user_name || participantInfo.name || 'Anonymous',
        photoURL: participantInfo.photoURL || '',
        sessionId: participantInfo.session_id || '',
      },
      callDuration: 0,
    };

    try {
      // セッションデータを保存
      const sessionRef = ref(rtdb, `rooms/${roomId}/sessions/${userId}`);
      await set(sessionRef, sessionData);

      // 参加者の通話状態を更新
      const memberRef = ref(rtdb, `rooms/${roomId}/members/${userId}/inCall`);
      await set(memberRef, true);

      setParticipantSessions(prev => ({
        ...prev,
        [userId]: {
          ...sessionData,
          startTime: Date.now(),
        }
      }));

      console.log('Participant session started:', { roomId, userId, sessionData });
    } catch (error) {
      console.error('Failed to start participant session:', error);
    }
  }, [roomId]);

  // 参加者のセッション終了
  const endParticipantSession = useCallback(async (userId, callDuration = 0) => {
    if (!roomId || !userId) return;

    try {
      // セッションデータを更新
      const sessionRef = ref(rtdb, `rooms/${roomId}/sessions/${userId}`);
      const sessionSnapshot = await get(sessionRef);
      const sessionData = sessionSnapshot.val();

      if (sessionData) {
        const updatedSessionData = {
          ...sessionData,
          leftAt: serverTimestamp(),
          isActive: false,
          callDuration: callDuration,
        };

        await set(sessionRef, updatedSessionData);
      }

      // 参加者の通話状態を更新
      const memberRef = ref(rtdb, `rooms/${roomId}/members/${userId}/inCall`);
      await set(memberRef, false);

      // 通話履歴を保存
      const historyRef = ref(rtdb, `rooms/${roomId}/callHistory/${userId}/${Date.now()}`);
      await set(historyRef, {
        duration: callDuration,
        endedAt: serverTimestamp(),
      });

      setParticipantSessions(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });

      console.log('Participant session ended:', { roomId, userId, callDuration });
    } catch (error) {
      console.error('Failed to end participant session:', error);
    }
  }, [roomId]);

  // 参加者の通話時間を更新
  const updateParticipantDuration = useCallback(async (userId, duration) => {
    if (!roomId || !userId) return;

    try {
      const sessionRef = ref(rtdb, `rooms/${roomId}/sessions/${userId}/callDuration`);
      await set(sessionRef, duration);

      setParticipantSessions(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          callDuration: duration,
        }
      }));
    } catch (error) {
      console.error('Failed to update participant duration:', error);
    }
  }, [roomId]);

  // Daily.coイベントハンドラー
  const handleParticipantUpdate = useCallback(async (event) => {
    switch (event.type) {
      case 'participant-joined':
        await startParticipantSession(
          event.participant.user_id || event.participant.session_id,
          event.participant
        );
        break;
      
      case 'participant-left':
        await endParticipantSession(
          event.participant.user_id || event.participant.session_id,
          event.duration || 0
        );
        break;
      
      case 'user-left':
        await endParticipantSession(event.userId, event.duration || 0);
        break;
      
      default:
        break;
    }
  }, [startParticipantSession, endParticipantSession]);

  // 現在の参加者リストを取得
  const getActiveParticipants = useCallback(() => {
    return Object.entries(participants).filter(([_, participant]) => 
      participant.inCall === true
    );
  }, [participants]);

  // 通話履歴を取得
  const getCallHistory = useCallback(async (userId) => {
    if (!roomId || !userId) return [];

    try {
      const historyRef = ref(rtdb, `rooms/${roomId}/callHistory/${userId}`);
      const snapshot = await get(historyRef);
      const history = snapshot.val();
      
      return history ? Object.entries(history).map(([timestamp, data]) => ({
        timestamp: parseInt(timestamp),
        ...data
      })) : [];
    } catch (error) {
      console.error('Failed to get call history:', error);
      return [];
    }
  }, [roomId]);

  return {
    participants,
    participantSessions,
    handleParticipantUpdate,
    startParticipantSession,
    endParticipantSession,
    updateParticipantDuration,
    getActiveParticipants,
    getCallHistory,
  };
};