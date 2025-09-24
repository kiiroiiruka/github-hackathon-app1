import { useEffect } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { useMap } from "react-leaflet";

const RoutingControl = ({ position, destination, onRouteInfo }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !position || !destination) return;

    const routingControl = L.Routing.control({
      waypoints: [L.latLng(position[0], position[1]), L.latLng(destination[0], destination[1])],
      lineOptions: { styles: [{ color: "blue", weight: 4 }] },
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
    }).addTo(map);

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
          arrivalTime: new Date(Date.now() + summary.totalTime * 1000)
        });
      }
    });

    return () => map.removeControl(routingControl);
  }, [map, position, destination, onRouteInfo]);

  return null;
};

export default RoutingControl;
