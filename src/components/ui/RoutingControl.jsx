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
    
    console.log("RoutingControl - map:", map);
    console.log("RoutingControl - position:", position);
    console.log("RoutingControl - destination:", destination);
    
    if (!map || !position || !destination) {
      console.log("条件が満たされていません");
      return;
    }

    console.log("ルーティングコントロールを作成中...");
    
    // 既存のroutingControlがあれば削除
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (error) {
        console.warn('既存のroutingControlの削除に失敗:', error);
      }
    }
    
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(position[0], position[1]), 
        L.latLng(destination[0], destination[1])
      ],
      lineOptions: { 
        styles: [{ color: "blue", weight: 4, opacity: 0.8 }] 
      },
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      createContainer: false,
      show: false,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      })
    });

    try {
      routingControl.addTo(map);
      console.log("ルーティングコントロールを地図に追加しました");
    } catch (error) {
      console.error("ルーティングコントロールの追加でエラー:", error);
    }

    routingControl.on("routesfound", (e) => {
      console.log("ルート発見:", e.routes);
      const route = e.routes[0];
      if (route && onRouteInfo) {
        const summary = route.summary;
        const distanceKm = (summary.totalDistance / 1000).toFixed(2);
        const durationMin = Math.round(summary.totalTime / 60);
        
        onRouteInfo({
          distanceKm,
          durationMin,
          arrivalTime: new Date(Date.now() + summary.totalTime * 1000),
          instructions: route.instructions
        });
      }
      routingControlRef.current = null;
    });
    
    if (!map || !position || !destination || !isMountedRef.current) return;
    
    // 座標の有効性をチェック
    if (!Array.isArray(position) || !Array.isArray(destination) || 
        position.length !== 2 || destination.length !== 2 ||
        isNaN(position[0]) || isNaN(position[1]) || 
        isNaN(destination[0]) || isNaN(destination[1])) {
      console.error('無効な座標データ:', { position, destination });
      return;
    }

    try {
      const routingControl = L.Routing.control({
        waypoints: [L.latLng(position[0], position[1]), L.latLng(destination[0], destination[1])],
        lineOptions: { 
          styles: [{ 
            color: "#2563eb", 
            weight: 5, 
            opacity: 0.8,
            dashArray: null
          }] 
        },
        addWaypoints: false,
        draggableWaypoints: false,
        routeWhileDragging: false,
        createMarker: () => null,
        show: false,
        fitSelectedRoutes: false
      });
      
      routingControlRef.current = routingControl;
      routingControl.addTo(map);

      const handleRoutesFound = (e) => {
        if (!isMountedRef.current) return;
        
        console.log("ルート発見:", e.routes);
        const route = e.routes?.[0];
        if (route?.summary && route.coordinates) {
          try {
            // ルートの線を永続的に表示するため、別途Polylineとして作成
            if (routeLayerRef.current) {
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
            
            // ルートに合わせて地図の表示範囲を調整
            if (map && isMountedRef.current) {
              const bounds = L.latLngBounds([
                L.latLng(position[0], position[1]),
                L.latLng(destination[0], destination[1])
              ]);
              map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
            }
            
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
        if (onRouteInfo && typeof onRouteInfo === 'function') {
          onRouteInfo(null);
        }
      };

      routingControl.on("routesfound", handleRoutesFound);
      routingControl.on("routingerror", handleRoutingError);
      
    } catch (error) {
      console.error('RoutingControlの作成に失敗:', error);
      return;
    }

    return () => {
      isMountedRef.current = false;
      
      if (routingControlRef.current) {
        try {
          // イベントリスナーを削除
          routingControlRef.current.off("routesfound");
          routingControlRef.current.off("routingerror");
          
          // マップからコントロールを削除
          if (map && map.removeControl) {
            map.removeControl(routingControlRef.current);
          }
        } catch (error) {
          console.warn('ルーティングコントロールのクリーンアップエラー:', error);
        } finally {
          routingControlRef.current = null;
        }
      }
      
      // 注意: routeLayerRef.currentは意図的に削除しない
      // ルートの線を永続的に表示するため
      
      routingControl.on("routingerror", (e) => {
        console.error("ルーティングエラー:", e);
      });

      return () => {
        try {
          if (map.hasLayer?.(routingControl)) {
            map.removeControl(routingControl);
          } else {
            map.removeControl(routingControl);
          }
          console.log("ルーティングコントロールを削除しました");
        } catch (error) {
          console.error("ルーティングコントロールの削除でエラー:", error);
        }
      };
    };
  }, [map, position, destination, onRouteInfo]);
  
  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ルートラインをクリーンアップする関数をグローバルに公開
  useEffect(() => {
    if (map && routeLayerRef.current) {
      // マップインスタンスにクリーンアップ関数を追加
      if (!map._routeCleanupFunctions) {
        map._routeCleanupFunctions = [];
      }
      const cleanup = () => {
        if (routeLayerRef.current && map.hasLayer(routeLayerRef.current)) {
          map.removeLayer(routeLayerRef.current);
        }
      };
      map._routeCleanupFunctions.push(cleanup);
    }
  }, [map]);

  return null;
};

export default RoutingControl;