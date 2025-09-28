import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { useMap } from "react-leaflet";

const RoutingControl = ({ position, destination, onRouteInfo }) => {
  const map = useMap();
  const routingControlRef = useRef(null);
  const isMountedRef = useRef(true);
  const routeLayerRef = useRef(null); // ルートの線を保持するLayer

  useEffect(() => {
    // コンポーネントがマウントされていることを記録
    isMountedRef.current = true;
    
    if (!map || !position || !destination || !isMountedRef.current) return;
    
    // 座標の有効性をチェック
    if (!Array.isArray(position) || !Array.isArray(destination) || 
        position.length !== 2 || destination.length !== 2 ||
        isNaN(position[0]) || isNaN(position[1]) || 
        isNaN(destination[0]) || isNaN(destination[1])) {
      console.error('無効な座標データ:', { position, destination });
      return;
    }

    // 既存のroutingControlがあれば削除
    if (routingControlRef.current) {
      try {
        if (map.hasControl && map.hasControl(routingControlRef.current)) {
          map.removeControl(routingControlRef.current);
        }
      } catch (error) {
        console.warn('既存のroutingControlの削除に失敗:', error);
      }
      routingControlRef.current = null;
    }

    try {
      // 少し遅延を入れてマップが完全に初期化されるのを待つ
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        const routingControl = L.Routing.control({
          waypoints: [L.latLng(position[0], position[1]), L.latLng(destination[0], destination[1])],
          lineOptions: { 
            styles: [{ 
              color: "#2563eb", 
              weight: 5, 
              opacity: 0.8
            }] 
          },
          addWaypoints: false,
          draggableWaypoints: false,
          routeWhileDragging: false,
          createMarker: () => null,
          show: false,
          fitSelectedRoutes: false,
          // エラーを防ぐため、サービスURLを明示的に指定
          serviceUrl: 'https://router.project-osrm.org/route/v1'
        });
        
        routingControlRef.current = routingControl;
        
        // マップが完全に準備されていることを確認してから追加
        if (map && map.getContainer()) {
          routingControl.addTo(map);
        }
      }, 100);

        const handleRoutesFound = (e) => {
          if (!isMountedRef.current) return;
          
          console.log("ルート発見:", e.routes);
          const route = e.routes?.[0];
          if (route?.summary && route.coordinates) {
            try {
              // ルートの線を永続的に表示するため、別途Polylineとして作成
              if (routeLayerRef.current && map.hasLayer(routeLayerRef.current)) {
                map.removeLayer(routeLayerRef.current);
              }
              
              // ルートの座標をPolylineで描画
              const routePolyline = L.polyline(route.coordinates, {
                color: "#2563eb",
                weight: 5,
                opacity: 0.8
              });
              
              routeLayerRef.current = routePolyline;
              routePolyline.addTo(map);
              
              // ルート情報を親コンポーネントに渡す
              if (onRouteInfo && typeof onRouteInfo === 'function' && isMountedRef.current) {
                const summary = route.summary;
                const distanceKm = (summary.totalDistance / 1000).toFixed(2);
                const durationMin = Math.round(summary.totalTime / 60);
                onRouteInfo({
                  distanceKm: parseFloat(distanceKm),
                  durationMin,
                  arrivalTime: new Date(Date.now() + summary.totalTime * 1000)
                });
              }
            } catch (error) {
              console.error('ルート情報処理エラー:', error);
            }
          }
        };
        
        const handleRoutingError = (e) => {
          if (!isMountedRef.current) return;
          console.error("ルート検索エラー:", e.error);
        };

        // イベントリスナーを設定
        if (routingControlRef.current) {
          routingControlRef.current.on("routesfound", handleRoutesFound);
          routingControlRef.current.on("routingerror", handleRoutingError);
        }
      
    } catch (error) {
      console.error('RoutingControlの作成に失敗:', error);
      return;
    }

    return () => {
      isMountedRef.current = false;
      
      // ルートレイヤーをクリーンアップ
      if (routeLayerRef.current && map && map.hasLayer(routeLayerRef.current)) {
        try {
          map.removeLayer(routeLayerRef.current);
        } catch (error) {
          console.warn('ルートレイヤーのクリーンアップエラー:', error);
        }
        routeLayerRef.current = null;
      }
      
      if (routingControlRef.current) {
        try {
          // イベントリスナーを削除
          routingControlRef.current.off("routesfound");
          routingControlRef.current.off("routingerror");
          
          // マップからコントロールを削除
          if (map && map.removeControl && map.hasControl(routingControlRef.current)) {
            map.removeControl(routingControlRef.current);
          }
        } catch (error) {
          console.warn('ルーティングコントロールのクリーンアップエラー:', error);
        } finally {
          routingControlRef.current = null;
        }
      }
    };
  }, [map, position, destination, onRouteInfo]);
  
  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);


  return null;
};

export default RoutingControl;