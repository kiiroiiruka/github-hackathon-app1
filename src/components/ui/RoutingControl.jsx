import { useEffect } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { useMap } from "react-leaflet";

const RoutingControl = ({ position, destination, onRouteInfo }) => {
  const map = useMap();

  useEffect(() => {
    console.log("RoutingControl - map:", map);
    console.log("RoutingControl - position:", position);
    console.log("RoutingControl - destination:", destination);
    
    if (!map || !position || !destination) {
      console.log("条件が満たされていません");
      return;
    }

    console.log("ルーティングコントロールを作成中...");
    
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
    });

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
  }, [map, position, destination, onRouteInfo]);

  return null;
};

export default RoutingControl;