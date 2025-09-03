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
    const apiStatusIndicator = document.getElementById('api-status-indicator');
    const routeInfoDiv = document.getElementById('route-info');
    const errorMessageDiv = document.getElementById('error-message');

    // --- Map Initialization ---
    const map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
    L.tileLayer(TILE_URL, { attribution: MAP_ATTRIBUTION }).addTo(map);

    let routeLayer = L.layerGroup().addTo(map);

    // --- Map Click State ---
    let activeInputField = null; // Track which input field is active for map clicking

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
            displayRouteInfo(path.distance, path.time);

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

    // --- Map Click Functions ---
    const setActiveField = (field) => {
        // Clear previous active state
        startInput.classList.remove('map-click-active');
        endInput.classList.remove('map-click-active');
        
        // Set new active field
        activeInputField = field;
        if (field) {
            field.classList.add('map-click-active');
        }
    };

    const handleMapClick = (e) => {
        if (activeInputField) {
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            activeInputField.value = `${lat},${lng}`;
            
            // Clear active state after setting coordinates
            setActiveField(null);
        }
    };

    const handleFieldClick = (field) => {
        if (activeInputField === field) {
            // If clicking the same field, deactivate it
            setActiveField(null);
        } else {
            // Activate the clicked field
            setActiveField(field);
        }
    };

    // --- Context Menu Functions ---
    const contextMenu = document.getElementById('context-menu');
    let contextMenuCoords = null;

    const showContextMenu = (e) => {
        contextMenuCoords = e.latlng;
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.containerPoint.x + 'px';
        contextMenu.style.top = e.containerPoint.y + 'px';
        
        // Prevent the menu from going off-screen
        const rect = contextMenu.getBoundingClientRect();
        const mapRect = document.getElementById('map').getBoundingClientRect();
        
        if (rect.right > mapRect.right) {
            contextMenu.style.left = (e.containerPoint.x - rect.width) + 'px';
        }
        if (rect.bottom > mapRect.bottom) {
            contextMenu.style.top = (e.containerPoint.y - rect.height) + 'px';
        }
    };

    const hideContextMenu = () => {
        contextMenu.style.display = 'none';
        contextMenuCoords = null;
    };

    const reverseGeocode = async (lat, lng) => {
        const url = new URL('https://nominatim.openstreetmap.org/reverse');
        url.searchParams.append('lat', lat);
        url.searchParams.append('lon', lng);
        url.searchParams.append('format', 'json');
        url.searchParams.append('countrycodes', 'nl');
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.display_name) {
                return data.display_name;
            } else {
                return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    };

    const queryFeatures = async (lat, lng) => {
        try {
            // Query GraphHopper for routing information at this point
            const url = new URL('https://graphhopper.xanox.org/route');
            url.searchParams.append('point', `${lat},${lng}`);
            url.searchParams.append('point', `${lat + 0.001},${lng + 0.001}`); // Nearby point
            url.searchParams.append('profile', 'moped');
            url.searchParams.append('debug', 'true');
            url.searchParams.append('points_encoded', 'false');
            
            const response = await fetch(url);
            const data = await response.json();
            
            let info = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n`;
            
            if (data.paths && data.paths.length > 0) {
                info += '\nRouting information:\n';
                info += '- Road accessible for moped routing\n';
                info += '- Estimated speed: 45 km/h max\n';
                
                if (data.info) {
                    info += `- Routing engine: ${data.info.build_date || 'GraphHopper'}\n`;
                }
            } else {
                info += '\nNo routing information available at this location';
            }
            
            return info;
        } catch (error) {
            console.error('Feature query failed:', error);
            return `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}\nFeature query failed: ${error.message}`;
        }
    };

    const handleContextMenuClick = async (action) => {
        if (!contextMenuCoords) return;
        
        const lat = contextMenuCoords.lat;
        const lng = contextMenuCoords.lng;
        const coords = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        
        hideContextMenu();
        
        switch (action) {
        case 'directions-from':
            startInput.value = coords;
            setActiveField(null);
            break;
            
        case 'directions-to':
            endInput.value = coords;
            setActiveField(null);
            break;
            
        case 'show-address':
            try {
                const address = await reverseGeocode(lat, lng);
                alert(`Address:\n${address}`);
            } catch (error) {
                alert(`Error getting address: ${error.message}`);
            }
            break;
            
        case 'query-features':
            try {
                const features = await queryFeatures(lat, lng);
                alert(`Feature Information:\n${features}`);
            } catch (error) {
                alert(`Error querying features: ${error.message}`);
            }
            break;
        }
    };

    // --- Event Listeners ---
    getRouteBtn.addEventListener('click', getRoute);
    clearRouteBtn.addEventListener('click', clearRoute);
    testApiBtn.addEventListener('click', testApiConnection);
    
    // Map click event for setting coordinates
    map.on('click', handleMapClick);
    
    // Map right-click event for context menu
    map.on('contextmenu', showContextMenu);
    
    // Input field click events for map clicking mode
    startInput.addEventListener('click', () => handleFieldClick(startInput));
    endInput.addEventListener('click', () => handleFieldClick(endInput));
    
    // Context menu item click events
    contextMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('.context-menu-item')?.dataset.action;
        if (action) {
            handleContextMenuClick(action);
        }
    });
    
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', hideContextMenu);
    
    // Escape key to deactivate field selection and hide context menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            setActiveField(null);
            hideContextMenu();
        }
    });

    // Test API connection on page load
    testApiConnection();
});