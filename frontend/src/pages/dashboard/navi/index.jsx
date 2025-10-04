import { push, ref, serverTimestamp, set } from "firebase/database";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SelectedFriendsDisplay from "../../../components/RoomCreation/SelectedFriendsDisplay";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Section from "../../../components/ui/Section";
import { auth, rtdb } from "../../../firebase/firebaseConfig";
import { calculateDistance } from "../../../firebase/map";
import { isDebugModeEnabled } from "@/utils/env";

const NaviCreateScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomName, setRoomName] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_roomName");
    return saved || "";
  });
  const [selectedFriends, setSelectedFriends] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_selectedFriends");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedLocation, setSelectedLocation] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_selectedLocation");
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedDeparture, setSelectedDeparture] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_selectedDeparture");
    const parsed = saved ? JSON.parse(saved) : null;
    console.log("🚀 初期化: selectedDeparture from localStorage:", parsed);
    return parsed;
  });


  // InviterPreferenceから戻ってきた時のフレンド情報を受け取る
  useEffect(() => {
    console.log("NaviCreateScreen - location.state:", location.state);
    console.log("NaviCreateScreen - location.stateの詳細:", {
      hasState: !!location.state,
      selectedFriends: location.state?.selectedFriends,
      selectedLocation: location.state?.selectedLocation,
      selectedDeparture: location.state?.selectedDeparture,
      allKeys: location.state ? Object.keys(location.state) : []
    });

    // 🆕 RouteScreen から戻ってきた時（location.state が null）に Local Storage から再読み込み
    if (!location.state) {
      console.log("🔄 RouteScreen から戻ってきた - Local Storage から再読み込み");
      
      // selectedDeparture を再読み込み
      const savedDeparture = localStorage.getItem("roomCreat_selectedDeparture");
      if (savedDeparture) {
        const parsedDeparture = JSON.parse(savedDeparture);
        console.log("🔄 selectedDeparture を再読み込み:", parsedDeparture);
        setSelectedDeparture(parsedDeparture);
      }
      
      // selectedLocation を再読み込み
      const savedLocation = localStorage.getItem("roomCreat_selectedLocation");
      if (savedLocation) {
        const parsedLocation = JSON.parse(savedLocation);
        console.log("🔄 selectedLocation を再読み込み:", parsedLocation);
        setSelectedLocation(parsedLocation);
      }
      
      // selectedFriends を再読み込み
      const savedFriends = localStorage.getItem("roomCreat_selectedFriends");
      if (savedFriends) {
        const parsedFriends = JSON.parse(savedFriends);
        console.log("🔄 selectedFriends を再読み込み:", parsedFriends);
        setSelectedFriends(parsedFriends);
      }
      
      return; // 早期リターンで以降の処理をスキップ
    }
    
    if (location.state?.selectedFriends) {
      console.log("NaviCreateScreen - selectedFriends受信:", location.state.selectedFriends);
      console.log("NaviCreateScreen - selectedFriendsの型:", typeof location.state.selectedFriends);
      console.log("NaviCreateScreen - selectedFriendsの配列か:", Array.isArray(location.state.selectedFriends));
      
      const newSelectedFriends = Array.isArray(location.state.selectedFriends) 
        ? location.state.selectedFriends 
        : [location.state.selectedFriends];
        
      setSelectedFriends(newSelectedFriends);
      // ローカルストレージに保存
      localStorage.setItem(
        "roomCreat_selectedFriends",
        JSON.stringify(newSelectedFriends)
      );
    }
    // PurlieuLocationやRouteSelectから選択された場所を受け取る
    if (location.state?.selectedLocation) {
      console.log("NaviCreateScreen - selectedLocation受信:", location.state.selectedLocation);
      setSelectedLocation(location.state.selectedLocation);
      // ローカルストレージに保存
      localStorage.setItem(
        "roomCreat_selectedLocation",
        JSON.stringify(location.state.selectedLocation)
      );
    }
    // 出発地点を受け取る
    if (location.state?.selectedDeparture) {
      console.log("NaviCreateScreen - selectedDeparture受信:", location.state.selectedDeparture);
      setSelectedDeparture(location.state.selectedDeparture);
      // ローカルストレージに保存
      localStorage.setItem(
        "roomCreat_selectedDeparture",
        JSON.stringify(location.state.selectedDeparture)
      );
    }
  }, [location.state]);

  // デバッグ用: テスト用ボタンの表示状態をログ出力
  useEffect(() => {
    console.log("🧪 テスト用ボタンの表示状態:", {
      roomName: roomName.trim(),
      selectedLocation: !!selectedLocation,
      selectedDeparture: !!selectedDeparture,
      selectedFriends: selectedFriends.length,
      timestamp: new Date().toLocaleTimeString(),
    });
  }, [roomName, selectedLocation, selectedDeparture, selectedFriends]);

  // selectedFriendsが変更されたときにローカルストレージに保存
  useEffect(() => {
    localStorage.setItem("roomCreat_selectedFriends", JSON.stringify(selectedFriends));
  }, [selectedFriends]);

  // selectedLocationが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (selectedLocation) {
      localStorage.setItem("roomCreat_selectedLocation", JSON.stringify(selectedLocation));
    } else {
      localStorage.removeItem("roomCreat_selectedLocation");
    }
  }, [selectedLocation]);

  // selectedDepartureが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (selectedDeparture) {
      localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(selectedDeparture));
    } else {
      localStorage.removeItem("roomCreat_selectedDeparture");
    }
  }, [selectedDeparture]);

  // roomNameが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (roomName.trim()) {
      localStorage.setItem("roomCreat_roomName", roomName);
    } else {
      localStorage.removeItem("roomCreat_roomName");
    }
  }, [roomName]);

  // フレンド選択ページに移動
  const handleInviterNavigation = () => {
    console.log("NaviCreateScreen - フレンド選択画面への遷移:", {
      currentSelectedFriends: selectedFriends,
      currentSelectedFriendsLength: selectedFriends.length
    });
    
    navigate("/dashboard/navi/inviter", {
      state: {
        selectedFriends: [...selectedFriends], // 配列のコピーを作成
        returnTo: "/dashboard/navi",
      },
    });
  };

  // 選択されたフレンドを削除
  const removeFriend = (friendToRemove) => {
    setSelectedFriends((prev) => {
      const updated = prev.filter((friend) => friend.uid !== friendToRemove.uid);
      // ローカルストレージも更新
      localStorage.setItem("roomCreat_selectedFriends", JSON.stringify(updated));
      return updated;
    });
  };

  // Firebase側のみでルーム作成を行うテスト用関数（ルート情報含む）
  const handleCreateRoomFirebaseOnly = async () => {
    console.log("🔥 テストボタンがクリックされました！");
    
    const currentUser = auth.currentUser;
    console.log("🔥 現在のユーザー:", currentUser);
    
    if (!currentUser || !currentUser.uid) {
      console.log("❌ ユーザーがログインしていません");
      alert("ログインが必要です。");
      return;
    }

    if (!roomName.trim()) {
      console.log("❌ ルーム名が入力されていません");
      alert("ルーム名を入力してください。");
      return;
    }
    
    // 出発地が未設定の場合、現在地のGPSを取得
    let finalDeparture = selectedDeparture;
    if (!selectedDeparture) {
      console.log("📍 出発地が未設定のため、現在地GPSを取得中...");
      
      try {
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("GPS機能が利用できません"));
            return;
          }
          
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            (err) => reject(err),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        });
        
        const { latitude, longitude } = position.coords;
        finalDeparture = {
          name: "現在地（GPS）",
          coordinates: [latitude, longitude],
        };
        
        // 状態とローカルストレージに保存
        setSelectedDeparture(finalDeparture);
        localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(finalDeparture));
        
        console.log("✅ 現在地GPSを出発地に設定:", finalDeparture);
      } catch (gpsError) {
        console.error("❌ GPS取得エラー:", gpsError);
        alert("現在地の取得に失敗しました。\n\n出発地を手動で設定してください。");
        return;
      }
    }
    
    console.log("🔥 バリデーション完了、ルーム作成処理を開始");
    
    // Firebase接続確認
    console.log("🔥 Firebase接続確認:", {
      rtdb: !!rtdb,
      auth: !!auth,
      currentUser: !!currentUser,
      currentUserUid: currentUser?.uid
    });

    try {
      console.log("🔥 Firebase側のみでルーム作成開始（ルート情報含む）:", {
        roomName: roomName.trim(),
        selectedFriends,
        selectedFriendsLength: selectedFriends.length,
        selectedLocation,
        selectedDeparture: finalDeparture,
        ownerUid: currentUser.uid,
        hasRoomName: !!roomName.trim(),
        hasSelectedFriends: selectedFriends.length > 0,
        hasSelectedLocation: !!selectedLocation,
        hasSelectedDeparture: !!finalDeparture,
      });

      // ルームID作成
      const roomRef = push(ref(rtdb, "rooms"));
      const roomId = roomRef.key;
      console.log("🔥 ルームID作成完了:", roomId);

      // メンバー一覧: 作成者も含める（デフォルトaccepted: true）
      const members = {
        [currentUser.uid]: {
          uid: currentUser.uid,
          name: currentUser.displayName || "",
          photoURL: currentUser.photoURL || "",
          invited: true,
          accepted: true,
        },
      };

      // 選択されたフレンドを追加
      console.log("🔥 フレンド追加開始:", selectedFriends);
      for (const friend of selectedFriends) {
        console.log("🔥 フレンド追加中:", friend);
        members[friend.uid] = {
          uid: friend.uid,
          name: friend.name || friend.displayName || "",
          photoURL: friend.photoURL || "",
          invited: true,
          accepted: false, // 初期状態: 未参加
        };
      }
      console.log("🔥 メンバー一覧完成:", members);

      // ルート情報を構築
      let routeData = null;
      console.log("🔥 ルート情報構築開始:", { selectedLocation, selectedDeparture: finalDeparture });
      
      // ルート計算をスキップする場合は、この行をコメントアウト
      const skipRouteCalculation = false; // falseにするとルート計算を実行（NetworkOnly戦略で解決済み）
      
      if (selectedLocation && finalDeparture && !skipRouteCalculation) {
        console.log("🔥 ルート計算開始");
        // ルート計算（OSRM API使用）
        try {
          const routeUrl = `https://router.project-osrm.org/route/v1/driving/${finalDeparture.coordinates[1]},${finalDeparture.coordinates[0]};${selectedLocation.coordinates[1]},${selectedLocation.coordinates[0]}?overview=simplified&geometries=geojson&steps=false`;
          console.log("🔥 ルートAPI URL:", routeUrl);
          
          let routeResponse = null;
          let lastError = null;
          
          // 3回リトライ（Service Workerをバイパスするため、XMLHttpRequestを直接使用）
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`🔥 ルートAPI試行 ${attempt}/3`);
              
              // Service Workerをバイパスするため、直接XMLHttpRequestを使用
              const response = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', routeUrl, true);
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.timeout = 30000; // タイムアウトを30秒に延長
                
                xhr.onload = () => {
                  console.log(`🔥 XHR onload: status=${xhr.status}`);
                  if (xhr.status >= 200 && xhr.status < 300) {
                    // XMLHttpRequestのレスポンスをfetch形式に変換
                    try {
                      const jsonData = JSON.parse(xhr.responseText);
                      resolve({
                        ok: true,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        json: () => Promise.resolve(jsonData)
                      });
                    } catch (parseError) {
                      console.error(`🔥 JSON解析エラー (試行${attempt}/3):`, parseError);
                      reject(new Error(`JSON parse error: ${parseError.message}`));
                    }
                  } else {
                    console.warn(`🔥 XHR HTTPエラー (試行${attempt}/3): ${xhr.status} ${xhr.statusText}`);
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                  }
                };
                
                xhr.onerror = () => {
                  console.error(`🔥 XHR network error (試行${attempt}/3)`);
                  reject(new Error('XMLHttpRequest network error'));
                };
                
                xhr.ontimeout = () => {
                  console.error(`🔥 XHR timeout (試行${attempt}/3)`);
                  reject(new Error('XMLHttpRequest timeout (30s)'));
                };
                
                console.log(`🔥 XHR送信開始 (試行${attempt}/3)`);
                xhr.send();
              });
              
              if (response.ok) {
                console.log(`🔥 ルートAPI成功 (試行${attempt}/3)`);
                routeResponse = response;
                break; // 成功したらループを抜ける
              } else {
                console.warn(`🔥 ルートAPI失敗 (試行${attempt}/3): ${response.status} ${response.statusText}`);
                lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                
                if (attempt === 3) {
                  throw lastError;
                }
              }
              
            } catch (error) {
              console.warn(`🔥 ルートAPI試行${attempt}/3失敗:`, error.message);
              lastError = error;
              
              if (attempt === 3) {
                throw error;
              }
              
              // リトライ前に待機（指数バックオフ）
              const waitTime = 2000 * attempt; // 2秒, 4秒, 6秒
              console.log(`🔥 ${waitTime}ms待機してからリトライ`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
          
          if (!routeResponse) {
            throw lastError || new Error('ルートAPI応答が取得できませんでした');
          }
          
          console.log("🔥 ルートAPI応答:", { status: routeResponse.status, ok: routeResponse.ok });

          if (routeResponse.ok) {
            const routeResult = await routeResponse.json();
            if (routeResult.routes && routeResult.routes.length > 0) {
              const route = routeResult.routes[0];
              routeData = {
                departure: {
                  name: finalDeparture.name || "出発地",
                  coordinates: finalDeparture.coordinates,
                },
                destination: {
                  name: selectedLocation.name || "目的地",
                  coordinates: selectedLocation.coordinates,
                },
                routeInfo: {
                  distanceKm: Math.round((route.distance / 1000) * 10) / 10,
                  durationMin: Math.round(route.duration / 60),
                  arrivalTime: new Date(Date.now() + route.duration * 1000).toISOString(),
                },
                // ポリライン情報を含む詳細なルートデータ（実用上限版・高品質保持）
                polyline: {
                  // 道の形状を保持しながら座標点を間引く（実用上限版）
                  geometry: route.geometry
                    ? {
                        type: route.geometry.type,
                        coordinates: (() => {
                          const coords = route.geometry.coordinates;
                          if (coords.length <= 1000) return coords; // 1000点以下はそのまま

                          const simplified = [];
                          const maxPoints = 10000; // 実用上限：最大1万点に制限（パフォーマンス向上）
                          const step = Math.max(1, Math.floor(coords.length / maxPoints));

                          // 最初の点を必ず含める
                          simplified.push(coords[0]);

                          // 曲がり角を検出して重要な点を保持（高品質保持）
                          for (let i = step; i < coords.length - step; i += step) {
                            const prev = coords[i - step];
                            const curr = coords[i];
                            const next = coords[i + step];

                            // 角度変化を計算
                            const angle1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
                            const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
                            const angleDiff = Math.abs(angle1 - angle2);

                            // 角度変化が大きい場合（曲がり角）は保持（より細かく保持）
                            if (angleDiff > 0.02 || i % (step * 1.2) === 0) {
                              simplified.push(curr);
                            }
                          }

                          // 最後の点を必ず含める
                          simplified.push(coords[coords.length - 1]);

                          return simplified;
                        })(),
                      }
                    : null,
                  // ステップ情報を簡略化（重要な情報のみ）
                  steps:
                    route.legs[0]?.steps?.map((step) => ({
                      distance: step.distance,
                      duration: step.duration,
                      maneuver: step.maneuver?.type,
                      name: step.name,
                    })) || [],
                  // ウェイポイント情報を簡略化
                  waypoints:
                    route.waypoints?.map((wp) => ({
                      location: wp.location,
                      name: wp.name,
                    })) || [],
                  summary: {
                    distance: route.distance, // メートル
                    duration: route.duration, // 秒
                    profile: "driving",
                  },
                },
                createdAt: new Date().toISOString(),
              };
              // データサイズの計算とログ出力（実用上限版）
              const dataSize = JSON.stringify(routeData).length;
              const dataSizeKB = Math.round((dataSize / 1024) * 100) / 100;
              const dataSizeMB = Math.round((dataSize / (1024 * 1024)) * 100) / 100;
              console.log("🗺️ ルート情報を取得（実用上限版）:", {
                dataSize: `${dataSizeKB}KB (${dataSizeMB}MB)`,
                coordinatesCount: route.geometry?.coordinates?.length || 0,
                simplifiedCount: routeData.polyline.geometry.coordinates.length,
                compressionRatio: `${Math.round((routeData.polyline.geometry.coordinates.length / (route.geometry?.coordinates?.length || 1)) * 100)}%`,
                stepsCount: route.legs[0]?.steps?.length || 0,
                waypointsCount: route.waypoints?.length || 0,
                maxPoints: 10000,
                qualityLevel: "実用上限（高品質保持・パフォーマンス最適化）",
              });
            }
          }
        } catch (routeError) {
          console.warn("⚠️ ルート計算に失敗しました:", routeError);
          console.warn("⚠️ ルート計算エラーの詳細:", {
            message: routeError.message,
            name: routeError.name,
            stack: routeError.stack
          });
          // ルート計算に失敗してもルーム作成は続行
        }
      } else {
        console.log("🔥 ルート情報なし（出発地・目的地が未設定）");
      }

      const roomData = {
        name: roomName.trim(),
        createdAt: serverTimestamp(),
        ownerUid: currentUser.uid,
        ownerName: currentUser.displayName || "",
        ownerPhotoURL: currentUser.photoURL || "",
        // Daily側の情報は含めない（テスト用）
        members,
        testMode: true, // テストモードであることを明示
        // ルート情報を含める
        routeData: routeData,
        hasRoute: !!routeData, // ルート情報があるかどうかのフラグ
      };

      console.log("🔥 ルームデータ準備完了:", roomData);
      console.log("🔥 Firebase書き込み開始");
      await set(roomRef, roomData);
      console.log("🔥 Firebase書き込み完了");

      console.log("✅ Firebase側のみでルーム作成完了（ルート情報含む）:", {
        roomId,
        roomName: roomName.trim(),
        membersCount: Object.keys(members).length,
        hasRoute: !!routeData,
        routeInfo: routeData
          ? {
              distance: routeData.routeInfo.distanceKm,
              duration: routeData.routeInfo.durationMin,
              polylinePoints: routeData.polyline.geometry.coordinates.length,
            }
          : null,
        testMode: true,
      });

      const routeMessage = routeData
        ? `\n\n🗺️ ルート情報も保存されました（実用上限版・高品質保持）:\n距離: ${routeData.routeInfo.distanceKm}km\n所要時間: ${routeData.routeInfo.durationMin}分\nポリラインポイント数: ${routeData.polyline.geometry.coordinates.length}個\nデータサイズ: ${Math.round((JSON.stringify(routeData).length / 1024) * 100) / 100}KB (${Math.round((JSON.stringify(routeData).length / (1024 * 1024)) * 100) / 100}MB)\n品質レベル: 実用上限（最大1万点・パフォーマンス最適化）`
        : "\n\n⚠️ ルート情報は保存されませんでした（ネットワークエラーのためスキップ）";

      alert(
        `✅ Firebase側のみでルーム「${roomName.trim()}」を作成しました！\n\n📋 ルーム情報:\nルームID: ${roomId}\nメンバー数: ${Object.keys(members).length}名\nルート情報: ${routeData ? 'あり' : 'なし'}${routeMessage}\n\n※Daily側ではルーム作成されていません（テスト用）`
      );

      // テスト用ボタンの場合は状態をリセットしない（継続してルーム作成できるように）
      // ローカルストレージをクリア
      // localStorage.removeItem("roomCreat_roomName");
      // localStorage.removeItem("roomCreat_selectedFriends");
      // localStorage.removeItem("roomCreat_selectedLocation");
      // localStorage.removeItem("roomCreat_selectedDeparture");

      // 状態をリセット
      // setRoomName("");
      // setSelectedFriends([]);
      // setSelectedLocation(null);
      // setSelectedDeparture(null);
    } catch (error) {
      console.error("❌ Firebase側のみルーム作成エラー:", error);
      console.error("❌ エラーの詳細:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name
      });
      alert(`Firebase側のみルーム作成に失敗しました: ${error.message}\n\n詳細: ${JSON.stringify({
        code: error.code,
        message: error.message
      }, null, 2)}`);
    }
  };

  // ルーム作成処理（確認画面に遷移）
  const handleCreateRoom = async () => {
    try {
      let finalDeparture = selectedDeparture;
      
      // 出発地が未設定の場合、現在地のGPSを取得
      if (!selectedDeparture) {
        console.log("📍 出発地が未設定のため、現在地GPSを取得中...");
        
        try {
          const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error("GPS機能が利用できません"));
              return;
            }
            
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              (err) => reject(err),
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              }
            );
          });
          
          const { latitude, longitude } = position.coords;
          finalDeparture = {
            name: "現在地（GPS）",
            coordinates: [latitude, longitude],
          };
          
          // 状態とローカルストレージに保存
          setSelectedDeparture(finalDeparture);
          localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(finalDeparture));
          
          console.log("✅ 現在地GPSを出発地に設定:", finalDeparture);
        } catch (gpsError) {
          console.error("❌ GPS取得エラー:", gpsError);
          alert("現在地の取得に失敗しました。\n\n出発地を手動で設定してください。");
          return;
        }
      }
      
      console.log("ルーム作成確認画面に遷移:", {
        roomName: roomName.trim(),
        selectedFriends,
        selectedLocation,
        selectedDeparture: finalDeparture,
      });

      navigate("/dashboard/navi/confirmation", {
        state: {
          roomName: roomName.trim(),
          selectedFriends,
          selectedLocation,
          selectedDeparture: finalDeparture,
        },
      });
    } catch (e) {
      console.error("確認画面遷移失敗:", e);
      alert("確認画面への遷移に失敗しました。");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="px-4 py-6 pb-40 min-h-screen">
        <div className="max-w-2xl mx-auto">
          {/* タイトルセクション */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏠</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🏠 ルーム作成</h1>
            <p className="text-gray-600">新しいルームを作成して友達と一緒に行動しよう</p>
          </div>

          <div className="space-y-6">
            {/* ルーム名セクション */}
            <Section title="ルーム名" icon="📝">
              <Input
                label="ルーム名"
                placeholder="ルーム名を入力してください"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                icon="🏠"
                required
              />
            </Section>

            {/* カーナビ作成セクション */}
            <Section
              title="カーナビ作成"
              icon="🗺️"
              subtitle={
                <div className="flex gap-2 justify-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedDeparture 
                      ? "bg-green-100 text-green-800" 
                      : "bg-orange-100 text-orange-800"
                  }`}>
                    {selectedDeparture ? "出発地設定済み" : "出発地未設定"}
                  </span>
                  {selectedLocation && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      目的地設定済み
                    </span>
                  )}
                </div>
              }
            >
              {/* 選択された場所の表示 */}
              <div className="space-y-3 mb-4">
                {/* 出発地の表示 */}
                <Card variant={selectedDeparture ? "success" : "warning"} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🚀</span>
                    <h3 className="font-semibold text-green-800">
                      {selectedDeparture ? "設定済み出発地" : "出発地"}
                    </h3>
                  </div>
                  {selectedDeparture ? (
                    <>
                      <p className="text-green-700 font-medium">{selectedDeparture.name}</p>
                      <p className="text-sm text-green-600 mt-1">
                        緯度: {selectedDeparture.coordinates[0].toFixed(4)}, 経度:{" "}
                        {selectedDeparture.coordinates[1].toFixed(4)}
                      </p>
                      <Button
                        variant="error"
                        size="sm"
                        onClick={() => {
                          setSelectedDeparture(null);
                          localStorage.removeItem("roomCreat_selectedDeparture");
                        }}
                        className="mt-2"
                      >
                        出発地をクリア
                      </Button>
                    </>
                  ) : (
                    <p className="text-orange-700 font-medium">未設定(現在地から)</p>
                  )}
                </Card>

                {selectedLocation && (
                  <Card variant="primary" className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎯</span>
                      <h3 className="font-semibold text-blue-800">設定済み目的地</h3>
                    </div>
                    <p className="text-blue-700 font-medium">{selectedLocation.name}</p>
                    <p className="text-sm text-blue-600 mt-1">
                      緯度: {selectedLocation.coordinates[0].toFixed(4)}, 経度:{" "}
                      {selectedLocation.coordinates[1].toFixed(4)}
                    </p>
                    <Button
                      variant="error"
                      size="sm"
                      onClick={() => {
                        setSelectedLocation(null);
                        localStorage.removeItem("roomCreat_selectedLocation");
                      }}
                      className="mt-2"
                    >
                      目的地をクリア
                    </Button>
                  </Card>
                )}
              </div>

              <div className="grid gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start"
                  icon="📍"
                  onClick={() =>
                    navigate("/dashboard/navi/route", {
                      state: {
                        selectedLocation,
                        selectedDeparture,
                        returnTo: "/dashboard/navi",
                      },
                    })
                  }
                >
                  <div className="text-left">
                    <div className="font-semibold">
                      {selectedLocation ? "ナビの設定変更" : "ナビの設定"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedLocation ? "別の目的地を設定" : "目的地を設定"}
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start"
                  icon="🧭"
                  disabled={!selectedLocation}
                  onClick={async () => {
                    let finalDeparture = selectedDeparture;
                    
                    // 出発地が未設定の場合、現在地のGPSを取得
                    if (!selectedDeparture) {
                      console.log("📍 ルート確認: 出発地が未設定のため、現在地GPSを取得中...");
                      
                      try {
                        const position = await new Promise((resolve, reject) => {
                          if (!navigator.geolocation) {
                            reject(new Error("GPS機能が利用できません"));
                            return;
                          }
                          
                          navigator.geolocation.getCurrentPosition(
                            (pos) => resolve(pos),
                            (err) => reject(err),
                            {
                              enableHighAccuracy: true,
                              timeout: 10000,
                              maximumAge: 0,
                            }
                          );
                        });
                        
                        const { latitude, longitude } = position.coords;
                        finalDeparture = {
                          name: "現在地（GPS）",
                          coordinates: [latitude, longitude],
                        };
                        
                        // 状態とローカルストレージに保存
                        setSelectedDeparture(finalDeparture);
                        localStorage.setItem("roomCreat_selectedDeparture", JSON.stringify(finalDeparture));
                        
                        console.log("✅ 現在地GPSを出発地に設定:", finalDeparture);
                      } catch (gpsError) {
                        console.error("❌ GPS取得エラー:", gpsError);
                        alert("現在地の取得に失敗しました。\n\n出発地を手動で設定してください。");
                        return;
                      }
                    }
                    
                    console.log("🧭 ルート確認画面に遷移:", {
                      selectedDeparture: finalDeparture,
                      selectedLocation: selectedLocation,
                      departure: finalDeparture?.coordinates,
                      destination: selectedLocation?.coordinates,
                    });
                    
                    navigate("/dashboard/navi/route-screen", {
                      state: {
                        destination: selectedLocation?.coordinates,
                        destinationName: selectedLocation?.name,
                        departure: finalDeparture?.coordinates,
                        departureName: finalDeparture?.name,
                        selectedDeparture: finalDeparture,
                        selectedLocation: selectedLocation,
                        selectedFriends,
                        roomName: roomName.trim(),
                      },
                    });
                  }}
                >
                  <div className="text-left">
                    <div className="font-semibold">ルート確認</div>
                    <div className="text-sm text-gray-600">
                      {!selectedDeparture ? "現在地から地図で確認" : "地図でルートを確認"}
                    </div>
                  </div>
                </Button>
              </div>
            </Section>

            {/* 招待するユーザーセクション */}
            <Section
              title="招待するユーザー"
              icon="👥"
              subtitle={
                selectedFriends.length > 0 ? `${selectedFriends.length}名選択中` : undefined
              }
            >
              <SelectedFriendsDisplay
                selectedFriends={selectedFriends}
                onRemoveFriend={removeFriend}
              />

              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start mt-4"
                icon="✨"
                onClick={handleInviterNavigation}
              >
                <div className="text-left">
                  <div className="font-semibold">
                    {selectedFriends.length > 0 ? "フレンドを追加/変更" : "フレンドを選択"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedFriends.length > 0
                      ? "選択済みのフレンドを変更できます"
                      : "一緒に行動する友達を招待"}
                  </div>
                </div>
              </Button>
            </Section>

            {/* 作成ボタン */}
            <div className="pt-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!roomName.trim() || !selectedLocation}
                onClick={handleCreateRoom}
                icon="🚀"
              >
                {!roomName.trim() 
                  ? "ルーム名を入力してください" 
                  : !selectedLocation 
                  ? "目的地を設定してください" 
                  : !selectedDeparture
                  ? `「${roomName}」を作成（現在地から出発）`
                  : `「${roomName}」を作成`}
              </Button>
              
              {!selectedDeparture && selectedLocation && roomName.trim() && (
                <p className="text-xs text-blue-600 text-center mt-2 bg-blue-50 px-3 py-2 rounded-lg">
                  💡 出発地が未設定のため、ルーム作成時に現在地のGPSを自動取得します
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* テスト用ボタン - 固定位置で常に表示 */}
      {false && (
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t-2 border-orange-300 shadow-lg z-[60]">
        <div className="px-4 py-4 bg-orange-50">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-3">
              <span className="text-sm text-orange-700 bg-orange-200 px-4 py-2 rounded-full font-medium">
                🧪 テスト用機能
              </span>
            </div>
            <Button
              variant="warning"
              size="lg"
              className="w-full shadow-lg"
              disabled={!roomName.trim() || !selectedLocation}
              onClick={() => {
                console.log("🔥 ボタンクリックイベント発生");
                console.log("🔥 roomName:", roomName);
                console.log("🔥 roomName.trim():", roomName.trim());
                console.log("🔥 disabled状態:", !roomName.trim() || !selectedLocation);
                handleCreateRoomFirebaseOnly();
              }}
              icon="🔥"
            >
              {!roomName.trim() 
                ? "ルーム名を入力してください" 
                : !selectedLocation 
                ? "目的地を設定してください" 
                : !selectedDeparture
                ? "Firebase側のみでルーム作成（現在地から・テスト用）"
                : "Firebase側のみでルーム作成（テスト用）"}
            </Button>
            <p className="text-xs text-gray-600 text-center mt-2">
              ※Daily側ではルーム作成されません。Firebase Realtime
              Databaseにルーム情報とルートのポリライン情報を保存します。
            </p>
            {selectedLocation && selectedDeparture && (
              <p className="text-xs text-green-700 text-center mt-2 font-medium bg-green-100 px-3 py-2 rounded">
                ✅ ルート情報が利用可能です（距離:{" "}
                {Math.round(
                  calculateDistance(selectedDeparture.coordinates, selectedLocation.coordinates) *
                    10
                ) / 10}
                km）
              </p>
            )}
            {(!selectedLocation || !selectedDeparture) && (
              <p className="text-xs text-orange-700 text-center mt-2 bg-orange-100 px-3 py-2 rounded">
                ⚠️ ルート情報を保存するには出発地・目的地の設定が必要です
              </p>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default NaviCreateScreen;
