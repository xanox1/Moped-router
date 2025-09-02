document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const GRAPHHOPPER_API_URL = 'http://10.0.30.102:8989/route';
    const MAP_CENTER = [52.2, 5.5]; // Center of the Netherlands
    const MAP_ZOOM = 8;
    const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    // --- DOM Elements ---
    const startInput = document.getElementById('start');
    const endInput = document.getElementById('end');
    const getRouteBtn = document.getElementById('getRouteBtn');
    const routeInfoDiv = document.getElementById('route-info');
    const errorMessageDiv = document.getElementById('error-message');

    // --- Map Initialization ---
    const map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
    L.tileLayer(TILE_URL, { attribution: MAP_ATTRIBUTION }).addTo(map);

    let routeLayer = L.layerGroup().addTo(map);

    // --- Functions ---
    const getRoute = async () => {
        const startPoint = startInput.value;
        const endPoint = endInput.value;

        // Clear previous state
        routeLayer.clearLayers();
        routeInfoDiv.innerHTML = '';
        errorMessageDiv.style.display = 'none';

        if (!startPoint || !endPoint) {
            showError("Start and End points are required.");
            return;
        }

        const url = new URL(GRAPHHOPPER_API_URL);
        url.searchParams.append('point', startPoint);
        url.searchParams.append('point', endPoint);
        url.searchParams.append('profile', 'moped');
        url.searchParams.append('points_encoded', 'false'); // We want GeoJSON coordinates

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok || !data.paths || data.paths.length === 0) {
                const message = data.message || "Could not find a route.";
                throw new Error(message);
            }

            const path = data.paths[0];
            drawRoute(path.points.coordinates);
            displayRouteInfo(path.distance, path.time);

        } catch (error) {
            console.error('Error fetching route:', error);
            showError(error.message);
        }
    };

    const drawRoute = (coordinates) => {
        // GeoJSON coordinates are [lon, lat], Leaflet needs [lat, lon]
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

        const polyline = L.polyline(latLngs, {
            color: '#007bff',
            weight: 5
        }).addTo(routeLayer);

        // Add markers for start and end
        L.marker(latLngs[0]).addTo(routeLayer).bindPopup('Start');
        L.marker(latLngs[latLngs.length - 1]).addTo(routeLayer).bindPopup('End');

        map.fitBounds(polyline.getBounds().pad(0.1));
    };

    const displayRouteInfo = (distance, time) => {
        const distanceKm = (distance / 1000).toFixed(2);
        const durationMinutes = Math.round(time / 1000 / 60);
        routeInfoDiv.innerHTML = `
            <strong>Distance:</strong> ${distanceKm} km<br>
            <strong>Time:</strong> ${durationMinutes} minutes
        `;
    };
    
    const showError = (message) => {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }

    // --- Event Listeners ---
    getRouteBtn.addEventListener('click', getRoute);
});