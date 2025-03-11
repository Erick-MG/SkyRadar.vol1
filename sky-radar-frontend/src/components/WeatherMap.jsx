import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const WeatherMap = () => {
  const [map, setMap] = useState(null);
  const [aircraftData, setAircraftData] = useState([]);
  const [showClouds, setShowClouds] = useState(false);
  const [windDirection, setWindDirection] = useState("N");
  const [globalSpeedFactor, setGlobalSpeedFactor] = useState(1.0); // Global speed multiplier
  const markersRef = useRef({});
  const routeLinesRef = useRef({});

  // Cloud layer URL
  const CLOUD_LAYER_URL =
    "https://tile.openweathermap.org/map/clouds/{z}/{x}/{y}.png?appid=17cd08a5698afc0470da68a51dd1dcb3";

  // Define airports with coordinates
  const airports = {
    london: { name: "London Heathrow", lat: 51.4700, lon: -0.4543 },
    berlin: { name: "Berlin Brandenburg", lat: 52.3667, lon: 13.5033 },
    paris: { name: "Paris Charles de Gaulle", lat: 49.0097, lon: 2.5479 },
    madrid: { name: "Madrid Barajas", lat: 40.4983, lon: -3.5676 },
    amsterdam: { name: "Amsterdam Schiphol", lat: 52.3105, lon: 4.7683 },
    milan: { name: "Milan Malpensa", lat: 45.6306, lon: 8.7281 }
  };

  // Define flight routes with individual speed factors
  const routes = [
    { id: 1, from: "london", to: "berlin", callsign: "BA986", velocity: 850, speedFactor: 0.015 },
    { id: 2, from: "paris", to: "madrid", callsign: "AF1200", velocity: 820, speedFactor: 0.010 },
    { id: 3, from: "amsterdam", to: "milan", callsign: "KL1629", velocity: 810, speedFactor: 0.012 }
  ];

  // Initialize map
  useEffect(() => {
    if (map) return;

    const newMap = L.map("map").setView([48.8566, 7.3522], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newMap);

    // Add airport markers
    Object.entries(airports).forEach(([key, airport]) => {
      const airportMarker = L.circle([airport.lat, airport.lon], {
        color: 'green',
        fillColor: '#3f3',
        fillOpacity: 0.5,
        radius: 10000
      }).addTo(newMap);

      airportMarker.bindPopup(`<b>${airport.name}</b>`);
    });

    setMap(newMap);

    return () => {
      newMap.remove();
    };
  }, []);

  // Initialize aircraft
  useEffect(() => {
    if (!map) return;

    // Create initial aircraft data
    const initialAircraft = routes.map(route => {
      const fromAirport = airports[route.from];
      const toAirport = airports[route.to];

      return {
        id: route.id,
        callsign: route.callsign,
        from: route.from,
        to: route.to,
        lat: fromAirport.lat,
        lon: fromAirport.lon,
        targetLat: toAirport.lat,
        targetLon: toAirport.lon,
        progress: 0,
        velocity: route.velocity,
        speedFactor: route.speedFactor,
        isReturning: false
      };
    });

    setAircraftData(initialAircraft);

    // Draw initial route lines
    initialAircraft.forEach(aircraft => {
      const fromAirport = airports[aircraft.from];
      const toAirport = airports[aircraft.to];

      const routeLine = L.polyline(
        [
          [fromAirport.lat, fromAirport.lon],
          [toAirport.lat, toAirport.lon]
        ],
        {
          color: 'red',
          weight: 2,
          opacity: 0.6,
          dashArray: '5, 10'
        }
      ).addTo(map);

      routeLinesRef.current[aircraft.id] = routeLine;
    });
  }, [map]);

  // Update aircraft positions with speed control
  useEffect(() => {
    if (!map || aircraftData.length === 0) return;

    const updateInterval = setInterval(() => {
      setAircraftData(prevAircraft =>
        prevAircraft.map(aircraft => {
          // Calculate new progress with speed factor and global multiplier
          const progressIncrement = aircraft.speedFactor * globalSpeedFactor;
          const newProgress = aircraft.progress + progressIncrement;

          // If reached destination
          if (newProgress >= 1) {
            // If at destination airport and not returning, start return journey
            if (!aircraft.isReturning) {
              const fromAirport = airports[aircraft.to];
              const toAirport = airports[aircraft.from];

              // Update route line for return journey
              if (routeLinesRef.current[aircraft.id]) {
                map.removeLayer(routeLinesRef.current[aircraft.id]);
              }

              const newRouteLine = L.polyline(
                [
                  [fromAirport.lat, fromAirport.lon],
                  [toAirport.lat, toAirport.lon]
                ],
                {
                  color: 'blue',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '5, 10'
                }
              ).addTo(map);

              routeLinesRef.current[aircraft.id] = newRouteLine;

              return {
                ...aircraft,
                lat: fromAirport.lat,
                lon: fromAirport.lon,
                targetLat: toAirport.lat,
                targetLon: toAirport.lon,
                progress: 0,
                isReturning: true
              };
            }
            // If returning to origin, reset to original journey
            else {
              const fromAirport = airports[aircraft.from];
              const toAirport = airports[aircraft.to];

              // Update route line for original journey
              if (routeLinesRef.current[aircraft.id]) {
                map.removeLayer(routeLinesRef.current[aircraft.id]);
              }

              const newRouteLine = L.polyline(
                [
                  [fromAirport.lat, fromAirport.lon],
                  [toAirport.lat, toAirport.lon]
                ],
                {
                  color: 'red',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '5, 10'
                }
              ).addTo(map);

              routeLinesRef.current[aircraft.id] = newRouteLine;

              return {
                ...aircraft,
                lat: fromAirport.lat,
                lon: fromAirport.lon,
                targetLat: toAirport.lat,
                targetLon: toAirport.lon,
                progress: 0,
                isReturning: false
              };
            }
          }

          // Calculate position along the line (linear interpolation)
          const newLat = aircraft.lat + (aircraft.targetLat - aircraft.lat) * progressIncrement;
          const newLon = aircraft.lon + (aircraft.targetLon - aircraft.lon) * progressIncrement;

          return {
            ...aircraft,
            lat: newLat,
            lon: newLon,
            progress: newProgress
          };
        })
      );
    }, 100); // Faster update interval for smoother movement

    return () => clearInterval(updateInterval);
  }, [map, aircraftData, globalSpeedFactor]);

  // Update aircraft markers
  useEffect(() => {
    if (!map || aircraftData.length === 0) return;

    aircraftData.forEach(aircraft => {
      // Remove existing marker
      if (markersRef.current[aircraft.id]) {
        map.removeLayer(markersRef.current[aircraft.id]);
      }

      // Create airplane icon
      const planeIcon = L.divIcon({
        html: '✈️',
        className: 'airplane-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      // Calculate angle for plane direction
      const deltaX = aircraft.targetLon - aircraft.lon;
      const deltaY = aircraft.targetLat - aircraft.lat;
      const angle = Math.atan2(deltaX, deltaY) * (180 / Math.PI);

      // Create new marker
      const marker = L.marker([aircraft.lat, aircraft.lon], {
        icon: planeIcon,
        rotationAngle: angle
      }).addTo(map);

      // Create popup content
      const fromName = aircraft.isReturning
        ? airports[aircraft.to].name
        : airports[aircraft.from].name;

      const toName = aircraft.isReturning
        ? airports[aircraft.from].name
        : airports[aircraft.to].name;

      // Calculate actual speed based on factors
      const actualSpeed = Math.round(aircraft.velocity * aircraft.speedFactor * globalSpeedFactor * 100) / 100;

      marker.bindPopup(`
        <b>${aircraft.callsign}</b><br>
        From: ${fromName}<br>
        To: ${toName}<br>
        Speed: ${aircraft.velocity} km/h<br>
        Speed Factor: ${aircraft.speedFactor * globalSpeedFactor}<br>
        Progress: ${Math.round(aircraft.progress * 100)}%
      `);

      // Save marker reference
      markersRef.current[aircraft.id] = marker;
    });
  }, [aircraftData, map, globalSpeedFactor]);

  // Simulate wind direction changes
  useEffect(() => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

    const windInterval = setInterval(() => {
      const newDirection = directions[Math.floor(Math.random() * directions.length)];
      setWindDirection(newDirection);
    }, 10000);

    return () => clearInterval(windInterval);
  }, []);

  // Toggle cloud layer
  useEffect(() => {
    if (!map) return;

    let cloudLayer = null;

    if (showClouds) {
      cloudLayer = L.tileLayer(CLOUD_LAYER_URL, {
        attribution: "&copy; OpenWeather",
        opacity: 0.7
      }).addTo(map);
    } else {
      map.eachLayer(layer => {
        if (layer.options && layer.options.attribution?.includes("OpenWeather")) {
          map.removeLayer(layer);
        }
      });
    }

    return () => {
      if (cloudLayer && map.hasLayer(cloudLayer)) {
        map.removeLayer(cloudLayer);
      }
    };
  }, [showClouds, map]);

  // Speed control functions
  const increaseSpeed = () => {
    setGlobalSpeedFactor(prev => Math.min(prev + 0.25, 3.0));
  };

  const decreaseSpeed = () => {
    setGlobalSpeedFactor(prev => Math.max(prev - 0.25, 0.25));
  };

  const resetSpeed = () => {
    setGlobalSpeedFactor(1.0);
  };

  return (
    <div className="sky-radar-container">
      <h1>SkyRadar</h1>
      <div className="controls-row">
        <div className="weather-controls">
          <h2>Wind Direction: {windDirection}</h2>
          <button
            onClick={() => setShowClouds(!showClouds)}
            className="control-button"
          >
            {showClouds ? "Hide Clouds" : "Show Clouds"}
          </button>
        </div>

        <div className="speed-controls">
          <h2>Aircraft Speed Controls</h2>
          <div className="speed-buttons">
            <button onClick={decreaseSpeed} className="control-button">Slower</button>
            <span className="speed-display">Speed: {globalSpeedFactor.toFixed(2)}x</span>
            <button onClick={increaseSpeed} className="control-button">Faster</button>
            <button onClick={resetSpeed} className="control-button">Reset Speed</button>
          </div>
        </div>
      </div>

      <div id="map" style={{ height: "600px", width: "100%", borderRadius: "8px" }}></div>

      <div className="flight-info">
        <div className="legend">
          <div className="legend-item">
            <span className="airport-marker" style={{ backgroundColor: "green", display: "inline-block", width: "12px", height: "12px", borderRadius: "50%" }}></span>
            <span>Airport</span>
          </div>
          <div className="legend-item">
            <span className="outbound-route" style={{ backgroundColor: "red", display: "inline-block", width: "20px", height: "3px" }}></span>
            <span>Outbound Flight</span>
          </div>
          <div className="legend-item">
            <span className="return-route" style={{ backgroundColor: "blue", display: "inline-block", width: "20px", height: "3px" }}></span>
            <span>Return Flight</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherMap;