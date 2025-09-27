import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { useUserUid } from './useUserUid';

/**
 * Daily.co接続とセッション管理のカスタムフック
 */
export const useDailyConnection = (roomId, dailyRoomUrl, onParticipantUpdate) => {
  const [daily, setDaily] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState(new Map());
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const currentUserUid = useUserUid();

  // 通話時間の更新
  const startDurationTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(duration);
      }
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    callStartTimeRef.current = null;
  }, []);

  // Daily.coインスタンスの初期化
  const initializeDaily = useCallback(async () => {
    if (daily) return daily;

    const dailyInstance = DailyIframe.createCallObject({
      showLeaveButton: true,
      showFullscreenButton: true,
      showLocalVideo: true,
      showParticipantsBar: true,
      theme: {
        accent: '#005fff',
        accentText: '#ffffff',
        background: '#1a1a1a',
        backgroundAccent: '#2d2d2d',
        baseText: '#ffffff',
        border: '#3d3d3d',
        mainAreaBg: '#1a1a1a',
        supportiveText: '#b3b3b3',
      },
    });

    // イベントリスナーの設定
    dailyInstance
      .on('joined-meeting', (event) => {
        console.log('Joined meeting:', event);
        setIsJoined(true);
        setIsConnecting(false);
        setError(null);
        startDurationTimer();
        
        // 現在の参加者リストを更新
        const currentParticipants = dailyInstance.participants();
        const participantMap = new Map();
        Object.entries(currentParticipants).forEach(([id, participant]) => {
          participantMap.set(id, participant);
        });
        setParticipants(participantMap);
      })
      .on('left-meeting', (event) => {
        console.log('Left meeting:', event);
        setIsJoined(false);
        setIsConnecting(false);
        stopDurationTimer();
        setParticipants(new Map());
        
        if (onParticipantUpdate) {
          onParticipantUpdate({
            type: 'user-left',
            userId: currentUserUid,
            duration: callDuration
          });
        }
      })
      .on('participant-joined', (event) => {
        console.log('Participant joined:', event);
        setParticipants(prev => {
          const newMap = new Map(prev);
          newMap.set(event.participant.session_id, event.participant);
          return newMap;
        });
        
        if (onParticipantUpdate) {
          onParticipantUpdate({
            type: 'participant-joined',
            participant: event.participant
          });
        }
      })
      .on('participant-left', (event) => {
        console.log('Participant left:', event);
        setParticipants(prev => {
          const newMap = new Map(prev);
          newMap.delete(event.participant.session_id);
          return newMap;
        });
        
        if (onParticipantUpdate) {
          onParticipantUpdate({
            type: 'participant-left',
            participant: event.participant
          });
        }
      })
      .on('error', (event) => {
        console.error('Daily error:', event);
        setError(event.error);
        setIsConnecting(false);
        stopDurationTimer();
      })
      .on('call-instance-destroyed', () => {
        console.log('Call instance destroyed');
        setDaily(null);
        setIsJoined(false);
        setIsConnecting(false);
        stopDurationTimer();
        setParticipants(new Map());
      });

    setDaily(dailyInstance);
    return dailyInstance;
  }, [daily, startDurationTimer, stopDurationTimer, onParticipantUpdate, currentUserUid, callDuration]);

  // ルームに参加
  const joinRoom = useCallback(async (token) => {
    if (!dailyRoomUrl || isConnecting || isJoined) return;

    try {
      setIsConnecting(true);
      setError(null);

      const dailyInstance = await initializeDaily();
      
      await dailyInstance.join({
        url: dailyRoomUrl,
        token: token,
      });
    } catch (err) {
      console.error('Failed to join room:', err);
      setError(err.message);
      setIsConnecting(false);
    }
  }, [dailyRoomUrl, isConnecting, isJoined, initializeDaily]);

  // ルームから退出
  const leaveRoom = useCallback(async () => {
    if (!daily || !isJoined) return;

    try {
      await daily.leave();
    } catch (err) {
      console.error('Failed to leave room:', err);
    }
  }, [daily, isJoined]);

  // クリーンアップ
  const destroyDaily = useCallback(() => {
    if (daily) {
      daily.destroy();
    }
    stopDurationTimer();
  }, [daily, stopDurationTimer]);

  // コンポーネントのアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      destroyDaily();
    };
  }, [destroyDaily]);

  // 通話時間をフォーマット
  const formatDuration = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    daily,
    isJoined,
    isConnecting,
    error,
    participants: Array.from(participants.values()),
    callDuration,
    formattedDuration: formatDuration(callDuration),
    joinRoom,
    leaveRoom,
    destroyDaily,
  }
};