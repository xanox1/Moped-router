document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const GRAPHHOPPER_API_URL = 'https://graphhopper.xanox.org/route';
    const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';
    const MAP_CENTER = [52.2, 5.5]; // Center of the Netherlands
    const MAP_ZOOM = 8;
    const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    // --- DOM Elements ---
    const startInput = document.getElementById('start');
    const endInput = document.getElementById('end');
    const getRouteBtn = document.getElementById('getRouteBtn');
    const clearRouteBtn = document.getElementById('clearRouteBtn');
    const testApiBtn = document.getElementById('testApiBtn');
    const presetRoutes = document.getElementById('presetRoutes');
    const apiStatusIndicator = document.getElementById('api-status-indicator');
    const routeInfoDiv = document.getElementById('route-info');
    const errorMessageDiv = document.getElementById('error-message');

    // --- Map Initialization ---
    const map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
    L.tileLayer(TILE_URL, { attribution: MAP_ATTRIBUTION }).addTo(map);

    let routeLayer = L.layerGroup().addTo(map);

    // --- Preset Routes Data ---
    const presetRoutesData = {
        'amsterdam-utrecht': {
            start: '52.3702,4.8952',
            end: '52.0907,5.1214',
            name: 'Amsterdam to Utrecht'
        },
        'amsterdam-haarlem': {
            start: '52.3702,4.8952', 
            end: '52.3874,4.6462',
            name: 'Amsterdam to Haarlem'
        },
        'utrecht-arnhem': {
            start: '52.0907,5.1214',
            end: '51.9851,5.8987',
            name: 'Utrecht to Arnhem'
        },
        'address-example': {
            start: 'Amsterdam Central Station',
            end: 'Utrecht Centraal',
            name: 'Address Example (Amsterdam CS to Utrecht CS)'
        }
    };

    // --- Utility Functions ---
    const isCoordinate = (input) => {
        // Check if input matches lat,lon format (e.g., "52.3702,4.8952")
        const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
        return coordPattern.test(input.trim());
    };

    const geocodeAddress = async (address) => {
        const url = new URL(NOMINATIM_API_URL);
        url.searchParams.append('q', address);
        url.searchParams.append('format', 'json');
        url.searchParams.append('limit', '1');
        url.searchParams.append('countrycodes', 'nl'); // Limit to Netherlands for better results
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                return `${result.lat},${result.lon}`;
            } else {
                throw new Error(`No location found for: ${address}`);
            }
        } catch (error) {
            throw new Error(`Geocoding failed: ${error.message}`);
        }
    };

    const resolveLocation = async (input) => {
        if (isCoordinate(input)) {
            return input;
        } else {
            return await geocodeAddress(input);
        }
    };

    // --- Functions ---
    const getRoute = async () => {
        const startPoint = startInput.value;
        const endPoint = endInput.value;

        // Clear previous state
        routeLayer.clearLayers();
        routeInfoDiv.innerHTML = '';
        errorMessageDiv.style.display = 'none';

        if (!startPoint || !endPoint) {
            showError('Start and End points are required.');
            return;
        }

        try {
            // Show loading state
            getRouteBtn.disabled = true;
            getRouteBtn.textContent = 'Finding Route...';

            // Resolve locations (geocode if needed)
            const resolvedStart = await resolveLocation(startPoint);
            const resolvedEnd = await resolveLocation(endPoint);

            const url = new URL(GRAPHHOPPER_API_URL);
            url.searchParams.append('point', resolvedStart);
            url.searchParams.append('point', resolvedEnd);
            url.searchParams.append('profile', 'moped');
            url.searchParams.append('points_encoded', 'false'); // We want GeoJSON coordinates

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok || !data.paths || data.paths.length === 0) {
                const message = data.message || 'Could not find a route.';
                throw new Error(message);
            }

            const path = data.paths[0];
            drawRoute(path.points.coordinates);
            displayRouteInfo(path.distance, path.time, resolvedStart, resolvedEnd);

        } catch (error) {
            console.error('Error fetching route:', error);
            showError(error.message);
        } finally {
            getRouteBtn.disabled = false;
            getRouteBtn.textContent = 'Get Route';
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

    const displayRouteInfo = (distance, time, startCoords, endCoords) => {
        const distanceKm = (distance / 1000).toFixed(2);
        const durationMinutes = Math.round(time / 1000 / 60);
        routeInfoDiv.innerHTML = `
            <strong>Distance:</strong> ${distanceKm} km<br>
            <strong>Time:</strong> ${durationMinutes} minutes<br>
            <small><strong>Start:</strong> ${startCoords}<br>
            <strong>End:</strong> ${endCoords}</small>
        `;
    };
    
    const showError = (message) => {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    };

    const clearRoute = () => {
        routeLayer.clearLayers();
        routeInfoDiv.innerHTML = '';
        errorMessageDiv.style.display = 'none';
    };

    const setApiStatus = (status) => {
        apiStatusIndicator.className = `status-indicator ${status}`;
        switch(status) {
        case 'online':
            apiStatusIndicator.textContent = 'Online';
            break;
        case 'offline':
            apiStatusIndicator.textContent = 'Offline';
            break;
        default:
            apiStatusIndicator.textContent = 'Unknown';
        }
    };

    const testApiConnection = async () => {
        testApiBtn.disabled = true;
        testApiBtn.textContent = 'Testing...';
        
        try {
            const testUrl = new URL(GRAPHHOPPER_API_URL.replace('/route', '/info'));
            const response = await fetch(testUrl, { 
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                setApiStatus('online');
                showError('');
                errorMessageDiv.style.display = 'none';
            } else {
                setApiStatus('offline');
                showError(`API returned status: ${response.status}`);
            }
        } catch (error) {
            setApiStatus('offline');
            showError(`API connection failed: ${error.message}`);
        } finally {
            testApiBtn.disabled = false;
            testApiBtn.textContent = 'Test API';
        }
    };

    const loadPresetRoute = () => {
        const selectedRoute = presetRoutes.value;
        if (selectedRoute && presetRoutesData[selectedRoute]) {
            const route = presetRoutesData[selectedRoute];
            startInput.value = route.start;
            endInput.value = route.end;
            clearRoute();
        }
    };

    // --- Event Listeners ---
    getRouteBtn.addEventListener('click', getRoute);
    clearRouteBtn.addEventListener('click', clearRoute);
    testApiBtn.addEventListener('click', testApiConnection);
    presetRoutes.addEventListener('change', loadPresetRoute);

    // Test API connection on page load
    testApiConnection();
});