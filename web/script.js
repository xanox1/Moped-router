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
    
    // Navigation elements
    const menuBtn = document.getElementById('menu-btn');
    const navMenu = document.getElementById('nav-menu');
    
    // Settings elements (kept for existing functionality)
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalClose = document.querySelector('.settings-modal-close');

    // Check if Leaflet is available before initializing map
    let map, routeLayer;
    if (typeof L !== 'undefined') {
        // --- Map Initialization ---
        map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
        L.tileLayer(TILE_URL, { attribution: MAP_ATTRIBUTION }).addTo(map);
        routeLayer = L.layerGroup().addTo(map);
    } else {
        console.warn('Leaflet not available - map functionality disabled');
    }

    // --- Map Click State ---
    let activeInputField = null; // Track which input field is active for map clicking
    let startPointMarker = null; // Track individual start point marker
    let endPointMarker = null; // Track individual end point marker

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

    // Dutch traffic sign descriptions for moped routing
    const getTrafficSignDescription = (signType) => {
        const signDescriptions = {
            'NL:C1': 'Gesloten voor alle verkeer (Closed for all traffic)',
            'NL:C2': 'Gesloten voor motorvoertuigen (Closed for motor vehicles)',
            'NL:C5': 'Gesloten voor bromfietsen (Closed for mopeds)',
            'NL:C7': 'Gesloten voor alle voertuigen (Closed for all vehicles)',
            'NL:C12': 'Verboden voor motorvoertuigen (Prohibited for motor vehicles)',
            'NL:C16': 'Gesloten voor voertuigen met aanhangwagen (Closed for vehicles with trailer)',
            'NL:G11': 'Fietspad (Cycle path)',
            'NL:G12a': 'Fiets/bromfietspad (Cycle/moped path)',
            'NL:G13': 'Bromfietspad (Moped path)',
            'NL:A1': 'Maximum snelheid (Speed limit)',
            'NL:A4': 'Begin zone maximum snelheid (Speed zone start)',
            'NL:A5': 'Einde zone maximum snelheid (Speed zone end)'
        };
        
        // Handle speed limit signs with specific values
        if (signType.startsWith('NL:A1-') || signType.includes('[')) {
            const match = signType.match(/(\d+)/);
            if (match) {
                return `Maximum snelheid ${match[1]} km/h (Speed limit ${match[1]} km/h)`;
            }
        }
        
        if (signType.startsWith('NL:A4-')) {
            const match = signType.match(/(\d+)/);
            if (match) {
                return `Begin zone ${match[1]} km/h (Speed zone ${match[1]} km/h start)`;
            }
        }
        
        return signDescriptions[signType] || `Dutch traffic sign: ${signType}`;
    };

    const isMopedRelevantSign = (signType) => {
        const mopedRelevantSigns = [
            'NL:C5',  // Mopeds prohibited
            'NL:C2',  // Motor vehicles prohibited (includes mopeds)
            'NL:C7',  // All vehicles prohibited
            'NL:C1',  // All traffic prohibited
            'NL:C12', // Motor vehicles prohibited
            'NL:G12a', // Moped/cycle path
            'NL:G13'  // Moped path
        ];
        
        return mopedRelevantSigns.some(sign => signType.includes(sign)) || 
               signType.includes('A1') || // Speed limits
               signType.includes('A4') || // Speed zones
               signType.includes('A5');
    };

    // --- Functions ---
    const getRoute = async () => {
        const startPoint = startInput.value;
        const endPoint = endInput.value;

        // Clear previous state
        if (routeLayer) {
            routeLayer.clearLayers();
        }
        // Clear individual point markers to avoid double markers
        clearIndividualMarkers();
        
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
            
            // Always disable CH and add comprehensive moped access blocking rules
            url.searchParams.append('ch.disable', 'true');
            
            // CRITICAL: Always block PRIMARY roads for moped routing
            // These rules must be included to prevent routing through N-roads
            url.searchParams.append('custom_model.priority[0].if', 'road_class == PRIMARY');
            url.searchParams.append('custom_model.priority[0].multiply_by', '0');
            url.searchParams.append('custom_model.distance_influence[0].if', 'road_class == PRIMARY');
            url.searchParams.append('custom_model.distance_influence[0].multiply_by', '1000');
            
            // Block roads explicitly marked as no moped access
            url.searchParams.append('custom_model.priority[1].if', 'moped == no');
            url.searchParams.append('custom_model.priority[1].multiply_by', '0');
            url.searchParams.append('custom_model.distance_influence[1].if', 'moped == no');
            url.searchParams.append('custom_model.distance_influence[1].multiply_by', '1000');
            
            // Block roads with no motor vehicle access
            url.searchParams.append('custom_model.priority[2].if', 'motor_vehicle == no');
            url.searchParams.append('custom_model.priority[2].multiply_by', '0');
            url.searchParams.append('custom_model.distance_influence[2].if', 'motor_vehicle == no');
            url.searchParams.append('custom_model.distance_influence[2].multiply_by', '1000');
            
            // Block roads with no vehicle access
            url.searchParams.append('custom_model.priority[3].if', 'vehicle == no');
            url.searchParams.append('custom_model.priority[3].multiply_by', '0');
            url.searchParams.append('custom_model.distance_influence[3].if', 'vehicle == no');
            url.searchParams.append('custom_model.distance_influence[3].multiply_by', '1000');
            
            // Block roads with speed limit > 45 km/h (moped limit in Netherlands)
            url.searchParams.append('custom_model.priority[4].if', 'max_speed > 45');
            url.searchParams.append('custom_model.priority[4].multiply_by', '0');
            url.searchParams.append('custom_model.distance_influence[4].if', 'max_speed > 45');
            url.searchParams.append('custom_model.distance_influence[4].multiply_by', '1000');
            
            // Block roads with zone speed limit > 45 km/h
            url.searchParams.append('custom_model.priority[5].if', 'zone_maxspeed > 45');
            url.searchParams.append('custom_model.priority[5].multiply_by', '0');
            url.searchParams.append('custom_model.distance_influence[5].if', 'zone_maxspeed > 45');
            url.searchParams.append('custom_model.distance_influence[5].multiply_by', '1000');
            
            // Block roads with Dutch traffic signs prohibiting mopeds
            const dutchProhibitionSigns = ['NL:C5', 'NL:C2', 'NL:C7', 'NL:C1', 'NL:C12'];
            dutchProhibitionSigns.forEach((sign, index) => {
                const paramIndex = 6 + index;
                url.searchParams.append(`custom_model.priority[${paramIndex}].if`, `traffic_sign == '${sign}'`);
                url.searchParams.append(`custom_model.priority[${paramIndex}].multiply_by`, '0');
                url.searchParams.append(`custom_model.distance_influence[${paramIndex}].if`, `traffic_sign == '${sign}'`);
                url.searchParams.append(`custom_model.distance_influence[${paramIndex}].multiply_by`, '1000');
            });
            
            // Prefer moped-designated infrastructure
            url.searchParams.append('custom_model.priority[11].if', 'cycleway_moped == designated || traffic_sign == \'NL:G12a\'');
            url.searchParams.append('custom_model.priority[11].multiply_by', '1.5');
            url.searchParams.append('custom_model.distance_influence[11].if', 'cycleway_moped == designated || traffic_sign == \'NL:G12a\'');
            url.searchParams.append('custom_model.distance_influence[11].multiply_by', '0.8');
            
            // Prefer cycleway with moped access
            url.searchParams.append('custom_model.priority[12].if', 'cycleway_moped == yes');
            url.searchParams.append('custom_model.priority[12].multiply_by', '1.2');
            url.searchParams.append('custom_model.distance_influence[12].if', 'cycleway_moped == yes');
            url.searchParams.append('custom_model.distance_influence[12].multiply_by', '0.9');
            
            // Use optimized routing algorithm for moped traffic
            url.searchParams.append('algorithm', 'dijkstra');
            url.searchParams.append('custom_model.priority[13].if', 'road_class == SECONDARY || road_class == TERTIARY');
            url.searchParams.append('custom_model.priority[13].multiply_by', '1.3');
            url.searchParams.append('custom_model.distance_influence[13].if', 'true');
            url.searchParams.append('custom_model.distance_influence[13].multiply_by', '0.5');

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
        if (typeof L === 'undefined' || !routeLayer) {
            console.warn('Map not available - route drawing disabled');
            return;
        }
        
        // GeoJSON coordinates are [lon, lat], Leaflet needs [lat, lon]
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

        // Enhanced polyline with gradient-like effect using multiple layers
        const mainPolyline = L.polyline(latLngs, {
            color: '#4caf50',
            weight: 6,
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(routeLayer);

        // Add a subtle shadow/outline effect
        const shadowPolyline = L.polyline(latLngs, {
            color: '#2e7d32',
            weight: 8,
            opacity: 0.4,
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(routeLayer);
        
        // Ensure main line is on top
        shadowPolyline.bringToBack();

        // Enhanced start marker with custom styling
        const startIcon = L.divIcon({
            className: 'custom-marker start-marker',
            html: '<div class="marker-content"><span class="marker-icon">🏁</span><span class="marker-label">Start</span></div>',
            iconSize: [80, 40],
            iconAnchor: [40, 40]
        });

        // Enhanced end marker with custom styling
        const endIcon = L.divIcon({
            className: 'custom-marker end-marker',
            html: '<div class="marker-content"><span class="marker-icon">🎯</span><span class="marker-label">Destination</span></div>',
            iconSize: [80, 40],
            iconAnchor: [40, 40]
        });

        // Add interactive markers
        const startMarker = L.marker(latLngs[0], { icon: startIcon }).addTo(routeLayer);
        const endMarker = L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(routeLayer);

        // Add click events to markers for address display
        startMarker.on('click', async () => {
            try {
                const address = await reverseGeocode(latLngs[0][0], latLngs[0][1]);
                startMarker.bindPopup(`<strong>Starting Point</strong><br>${address}`).openPopup();
            } catch (error) {
                startMarker.bindPopup(`<strong>Starting Point</strong><br>${latLngs[0][0].toFixed(6)}, ${latLngs[0][1].toFixed(6)}`).openPopup();
            }
        });

        endMarker.on('click', async () => {
            try {
                const address = await reverseGeocode(latLngs[latLngs.length - 1][0], latLngs[latLngs.length - 1][1]);
                endMarker.bindPopup(`<strong>Destination</strong><br>${address}`).openPopup();
            } catch (error) {
                endMarker.bindPopup(`<strong>Destination</strong><br>${latLngs[latLngs.length - 1][0].toFixed(6)}, ${latLngs[latLngs.length - 1][1].toFixed(6)}`).openPopup();
            }
        });

        // Add hover effects to the route line
        mainPolyline.on('mouseover', function() {
            this.setStyle({
                weight: 8,
                opacity: 1,
                color: '#66bb6a'
            });
        });

        mainPolyline.on('mouseout', function() {
            this.setStyle({
                weight: 6,
                opacity: 0.8,
                color: '#4caf50'
            });
        });

        // Fit bounds with animation
        map.fitBounds(mainPolyline.getBounds().pad(0.1), {
            animate: true,
            duration: 1.0
        });
    };

    const displayRouteInfo = (distance, time) => {
        const distanceKm = (distance / 1000).toFixed(2);
        const durationMinutes = Math.round(time / 1000 / 60);
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        
        let timeString;
        if (hours > 0) {
            timeString = `${hours}h ${minutes}m`;
        } else {
            timeString = `${minutes}m`;
        }
        
        // Calculate average speed
        const avgSpeed = (distance / 1000) / (time / 1000 / 3600);
        
        routeInfoDiv.innerHTML = `
            <div class="route-info-header">
                <span class="route-info-icon">🗺️</span>
                <span class="route-info-title">Route Calculated</span>
            </div>
            <div class="route-info-grid">
                <div class="route-info-item">
                    <span class="info-icon">📏</span>
                    <div class="info-content">
                        <div class="info-value">${distanceKm} km</div>
                        <div class="info-label">Distance</div>
                    </div>
                </div>
                <div class="route-info-item">
                    <span class="info-icon">⏱️</span>
                    <div class="info-content">
                        <div class="info-value">${timeString}</div>
                        <div class="info-label">Est. Time</div>
                    </div>
                </div>
                <div class="route-info-item">
                    <span class="info-icon">🏍️</span>
                    <div class="info-content">
                        <div class="info-value">${avgSpeed.toFixed(1)} km/h</div>
                        <div class="info-label">Avg Speed</div>
                    </div>
                </div>
            </div>
            <div class="route-info-note">
                <span class="note-icon">ℹ️</span>
                Route optimized for moped travel (max 45 km/h)
            </div>
        `;
        
        // Add animation
        routeInfoDiv.style.opacity = '0';
        routeInfoDiv.style.transform = 'translateY(20px)';
        setTimeout(() => {
            routeInfoDiv.style.transition = 'all 0.5s ease-out';
            routeInfoDiv.style.opacity = '1';
            routeInfoDiv.style.transform = 'translateY(0)';
        }, 100);
    };
    
    const showError = (message) => {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    };

    const clearRoute = () => {
        if (routeLayer) {
            routeLayer.clearLayers();
        }
        // Clear individual point markers
        clearIndividualMarkers();
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
        document.getElementById('start-select-btn').classList.remove('active');
        document.getElementById('end-select-btn').classList.remove('active');
        
        // Remove any existing status messages
        clearMapClickStatus();
        
        // Set new active field
        activeInputField = field;
        if (field) {
            field.classList.add('map-click-active');
            // Also activate the corresponding button
            if (field === startInput) {
                document.getElementById('start-select-btn').classList.add('active');
            } else {
                document.getElementById('end-select-btn').classList.add('active');
            }
            showMapClickStatus(field);
        }
    };

    const showMapClickStatus = (field) => {
        // Create status indicator if it doesn't exist
        let statusDiv = document.getElementById('map-click-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'map-click-status';
            statusDiv.className = 'map-click-status';
            document.body.appendChild(statusDiv);
        }
        
        const fieldName = field === startInput ? 'starting location' : 'destination';
        statusDiv.innerHTML = `
            <div class="status-content">
                <span class="status-icon">📍</span>
                <span class="status-text">Click on the map to select ${fieldName}</span>
                <button class="status-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
        `;
        statusDiv.style.display = 'block';
        
        // Add pulsing animation to map area
        const mapContainer = document.getElementById('map');
        mapContainer.classList.add('map-click-mode');
    };

    const clearMapClickStatus = () => {
        const statusDiv = document.getElementById('map-click-status');
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }
        
        // Remove pulsing animation from map
        const mapContainer = document.getElementById('map');
        mapContainer.classList.remove('map-click-mode');
    };

    const createPointMarker = (lat, lng, isStartPoint) => {
        if (typeof L === 'undefined' || !map) {
            return null;
        }

        // Simple pin icon - smaller and cleaner
        const icon = L.divIcon({
            className: `simple-pin-marker ${isStartPoint ? 'start-pin' : 'end-pin'}`,
            html: `<div class="pin-content">${isStartPoint ? '📍' : '🎯'}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 24]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        
        // Add click event for address display
        marker.on('click', async () => {
            try {
                const address = await reverseGeocode(lat, lng);
                marker.bindPopup(`<strong>${isStartPoint ? 'Starting Point' : 'Destination'}</strong><br>${address}`).openPopup();
            } catch (error) {
                marker.bindPopup(`<strong>${isStartPoint ? 'Starting Point' : 'Destination'}</strong><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
            }
        });

        return marker;
    };

    const clearIndividualMarkers = () => {
        if (startPointMarker) {
            map.removeLayer(startPointMarker);
            startPointMarker = null;
        }
        if (endPointMarker) {
            map.removeLayer(endPointMarker);
            endPointMarker = null;
        }
    };

    const showLocationSetFeedback = (address) => {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'location-set-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <div class="notification-text">
                    <strong>Location Set!</strong>
                    <br>
                    <small>${address.length > 50 ? address.substring(0, 47) + '...' : address}</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
        
        // Clear the map click status
        clearMapClickStatus();
        
        // Auto-route if both start and end points are set
        const startValue = startInput.value.trim();
        const endValue = endInput.value.trim();
        if (startValue && endValue && startValue !== '🔍 Getting address...' && endValue !== '🔍 Getting address...') {
            // Small delay to let the user see the feedback, then auto-route
            setTimeout(() => {
                getRoute();
            }, 1000);
        }
    };

    const handleMapClick = async (e) => {
        if (activeInputField) {
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            
            // Show loading state
            activeInputField.value = '🔍 Getting address...';
            activeInputField.disabled = true;
            
            try {
                // Try to get address instead of coordinates
                const address = await reverseGeocode(lat, lng);
                activeInputField.value = address;
                
                // Place marker for the selected point
                const isStartPoint = activeInputField === startInput;
                
                // Remove existing marker for this point
                if (isStartPoint && startPointMarker) {
                    map.removeLayer(startPointMarker);
                    startPointMarker = null;
                } else if (!isStartPoint && endPointMarker) {
                    map.removeLayer(endPointMarker);
                    endPointMarker = null;
                }
                
                // Create new marker
                const marker = createPointMarker(parseFloat(lat), parseFloat(lng), isStartPoint);
                if (marker) {
                    if (isStartPoint) {
                        startPointMarker = marker;
                    } else {
                        endPointMarker = marker;
                    }
                }
                
                // Show user feedback
                showLocationSetFeedback(address);
            } catch (error) {
                console.error('Error getting address:', error);
                // Fallback to coordinates
                const coords = `${lat},${lng}`;
                activeInputField.value = coords;
                
                // Place marker for the selected point
                const isStartPoint = activeInputField === startInput;
                
                // Remove existing marker for this point
                if (isStartPoint && startPointMarker) {
                    map.removeLayer(startPointMarker);
                    startPointMarker = null;
                } else if (!isStartPoint && endPointMarker) {
                    map.removeLayer(endPointMarker);
                    endPointMarker = null;
                }
                
                // Create new marker
                const marker = createPointMarker(parseFloat(lat), parseFloat(lng), isStartPoint);
                if (marker) {
                    if (isStartPoint) {
                        startPointMarker = marker;
                    } else {
                        endPointMarker = marker;
                    }
                }
                
                showLocationSetFeedback(coords);
            } finally {
                activeInputField.disabled = false;
                // Clear active state after setting location
                setActiveField(null);
            }
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
        
        // Get map container position to properly position context menu relative to document
        const mapRect = document.getElementById('map').getBoundingClientRect();
        const x = mapRect.left + e.containerPoint.x;
        const y = mapRect.top + e.containerPoint.y;
        
        contextMenu.style.display = 'block';
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        
        // Prevent the menu from going off-screen
        const rect = contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (rect.right > viewportWidth) {
            contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > viewportHeight) {
            contextMenu.style.top = (y - rect.height) + 'px';
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
            let info = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n\n`;
            
            // Query Nominatim for detailed geographic information
            const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
            nominatimUrl.searchParams.append('lat', lat);
            nominatimUrl.searchParams.append('lon', lng);
            nominatimUrl.searchParams.append('format', 'json');
            nominatimUrl.searchParams.append('addressdetails', '1');
            nominatimUrl.searchParams.append('extratags', '1');
            nominatimUrl.searchParams.append('namedetails', '1');
            nominatimUrl.searchParams.append('countrycodes', 'nl');
            
            const nominatimResponse = await fetch(nominatimUrl);
            const nominatimData = await nominatimResponse.json();
            
            if (nominatimData && nominatimData.display_name) {
                info += '**Location Information:**\n';
                info += `${nominatimData.display_name}\n\n`;
                
                // Add category and type if available
                if (nominatimData.category && nominatimData.type) {
                    info += '**Feature Type:**\n';
                    info += `${nominatimData.category}: ${nominatimData.type}\n\n`;
                }
                
                // Add detailed address information
                if (nominatimData.address) {
                    info += '**Address Details:**\n';
                    const address = nominatimData.address;
                    
                    if (address.road) info += `Road: ${address.road}\n`;
                    if (address.house_number) info += `House number: ${address.house_number}\n`;
                    if (address.neighbourhood) info += `Neighbourhood: ${address.neighbourhood}\n`;
                    if (address.suburb) info += `Suburb: ${address.suburb}\n`;
                    if (address.city || address.town || address.village) {
                        const place = address.city || address.town || address.village;
                        info += `City/Town: ${place}\n`;
                    }
                    if (address.postcode) info += `Postcode: ${address.postcode}\n`;
                    if (address.state) info += `State/Province: ${address.state}\n`;
                    if (address.country) info += `Country: ${address.country}\n`;
                    info += '\n';
                }
                
                // Add extra tags if available (like website, opening hours, etc.)
                if (nominatimData.extratags && Object.keys(nominatimData.extratags).length > 0) {
                    info += '**Additional Information:**\n';
                    const extratags = nominatimData.extratags;
                    
                    if (extratags.website) info += `Website: ${extratags.website}\n`;
                    if (extratags.phone) info += `Phone: ${extratags.phone}\n`;
                    if (extratags.opening_hours) info += `Opening hours: ${extratags.opening_hours}\n`;
                    if (extratags.operator) info += `Operator: ${extratags.operator}\n`;
                    if (extratags.brand) info += `Brand: ${extratags.brand}\n`;
                    info += '\n';
                }
            }
            
            // Query nearby features using Overpass API for more detailed information
            let overpassData = null;
            try {
                const overpassQuery = `
                    [out:json][timeout:10];
                    (
                        way(around:50,${lat},${lng})[highway];
                        way(around:50,${lat},${lng})[traffic_sign~"NL:"];
                        way(around:50,${lat},${lng})[zone:maxspeed];
                        way(around:50,${lat},${lng})[zone:traffic_sign~"NL:"];
                        way(around:50,${lat},${lng})[cycleway:moped];
                        node(around:50,${lat},${lng})[traffic_sign~"NL:"];
                        relation(around:100,${lat},${lng})[boundary];
                        node(around:100,${lat},${lng})[amenity];
                        node(around:100,${lat},${lng})[shop];
                        node(around:100,${lat},${lng})[tourism];
                    );
                    out geom;
                `;
                
                const overpassUrl = 'https://overpass-api.de/api/interpreter';
                const overpassResponse = await fetch(overpassUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `data=${encodeURIComponent(overpassQuery)}`
                });
                
                if (overpassResponse.ok) {
                    overpassData = await overpassResponse.json();
                    
                    if (overpassData.elements && overpassData.elements.length > 0) {
                        // Group features by type
                        const roads = [];
                        const boundaries = [];
                        const amenities = [];
                        const shops = [];
                        const tourism = [];
                        const trafficSigns = [];
                        const mopedInfrastructure = [];
                        
                        overpassData.elements.forEach(element => {
                            if (element.tags) {
                                if (element.tags.highway) {
                                    roads.push(element);
                                }
                                if (element.tags.traffic_sign && element.tags.traffic_sign.includes('NL:')) {
                                    trafficSigns.push(element);
                                }
                                if (element.tags['cycleway:moped'] || element.tags['zone:maxspeed'] || element.tags['zone:traffic_sign']) {
                                    mopedInfrastructure.push(element);
                                }
                                if (element.tags.boundary) {
                                    boundaries.push(element);
                                } else if (element.tags.amenity) {
                                    amenities.push(element);
                                } else if (element.tags.shop) {
                                    shops.push(element);
                                } else if (element.tags.tourism) {
                                    tourism.push(element);
                                }
                            }
                        });
                        
                        // Add Dutch traffic signs information
                        if (trafficSigns.length > 0) {
                            info += '**Dutch Traffic Signs:**\n';
                            trafficSigns.slice(0, 5).forEach(sign => {
                                const signType = sign.tags.traffic_sign;
                                const signName = getTrafficSignDescription(signType);
                                const mopedRelevant = isMopedRelevantSign(signType);
                                const icon = mopedRelevant ? '🛵' : '🚗';
                                info += `${icon} ${signName} (${signType})\n`;
                            });
                            info += '\n';
                        }
                        
                        // Add moped infrastructure information
                        if (mopedInfrastructure.length > 0) {
                            info += '**Moped Infrastructure:**\n';
                            mopedInfrastructure.slice(0, 5).forEach(infra => {
                                if (infra.tags['cycleway:moped']) {
                                    const access = infra.tags['cycleway:moped'];
                                    const name = infra.tags.name || 'Cycleway';
                                    info += `🚴 ${name} - Moped access: ${access}\n`;
                                }
                                if (infra.tags['zone:maxspeed']) {
                                    const speed = infra.tags['zone:maxspeed'];
                                    info += `⚡ Speed zone: ${speed} km/h\n`;
                                }
                                if (infra.tags['zone:traffic_sign']) {
                                    const zoneSign = infra.tags['zone:traffic_sign'];
                                    info += `📍 Zone sign: ${zoneSign}\n`;
                                }
                            });
                            info += '\n';
                        }

                        // Add nearby roads
                        if (roads.length > 0) {
                            info += '**Nearby Roads:**\n';
                            roads.slice(0, 5).forEach(road => {
                                const name = road.tags.name || 'Unnamed road';
                                const type = road.tags.highway;
                                const maxspeed = road.tags.maxspeed ? ` (${road.tags.maxspeed})` : '';
                                const mopedAccess = road.tags.moped ? ` [Moped: ${road.tags.moped}]` : '';
                                info += `${name} (${type})${maxspeed}${mopedAccess}\n`;
                            });
                            info += '\n';
                        }
                        
                        // Add administrative boundaries
                        if (boundaries.length > 0) {
                            info += '**Administrative Boundaries:**\n';
                            boundaries.slice(0, 3).forEach(boundary => {
                                const name = boundary.tags.name || 'Unnamed boundary';
                                const type = boundary.tags.boundary;
                                const level = boundary.tags.admin_level;
                                info += `${name} (${type}${level ? `, level ${level}` : ''})\n`;
                            });
                            info += '\n';
                        }
                        
                        // Add nearby amenities
                        if (amenities.length > 0) {
                            info += '**Nearby Amenities:**\n';
                            amenities.slice(0, 5).forEach(amenity => {
                                const name = amenity.tags.name || `${amenity.tags.amenity}`;
                                info += `${name}\n`;
                            });
                            info += '\n';
                        }
                        
                        // Add nearby shops
                        if (shops.length > 0) {
                            info += '**Nearby Shops:**\n';
                            shops.slice(0, 5).forEach(shop => {
                                const name = shop.tags.name || `${shop.tags.shop}`;
                                info += `${name}\n`;
                            });
                            info += '\n';
                        }
                        
                        // Add tourism features
                        if (tourism.length > 0) {
                            info += '**Tourism Features:**\n';
                            tourism.slice(0, 3).forEach(feature => {
                                const name = feature.tags.name || `${feature.tags.tourism}`;
                                info += `${name}\n`;
                            });
                            info += '\n';
                        }
                    }
                }
            } catch (overpassError) {
                console.warn('Overpass API query failed:', overpassError);
            }
            
            // Add moped accessibility information based on road classification
            try {
                info += '**Moped Routing Information:**\n';
                
                // Check road classification from nearby roads
                let roadTypes = [];
                
                // First, check if we found any roads in the Overpass query
                if (overpassData && overpassData.elements) {
                    overpassData.elements.forEach(element => {
                        if (element.tags && element.tags.highway) {
                            roadTypes.push(element.tags.highway);
                        }
                    });
                }
                
                // If no roads found in Overpass, make a specific query for roads at this location
                if (roadTypes.length === 0) {
                    try {
                        const roadQuery = `
                            [out:json][timeout:5];
                            (
                                way(around:20,${lat},${lng})[highway];
                            );
                            out tags;
                        `;
                        
                        const roadResponse = await fetch('https://overpass-api.de/api/interpreter', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: `data=${encodeURIComponent(roadQuery)}`
                        });
                        
                        if (roadResponse.ok) {
                            const roadData = await roadResponse.json();
                            if (roadData.elements) {
                                roadData.elements.forEach(element => {
                                    if (element.tags && element.tags.highway) {
                                        roadTypes.push(element.tags.highway);
                                    }
                                });
                            }
                        }
                    } catch (roadQueryError) {
                        console.warn('Road query failed:', roadQueryError);
                    }
                }
                
                // Analyze road types for moped accessibility
                const hasMotorway = roadTypes.some(type => type === 'motorway' || type === 'motorway_link');
                const hasTrunk = roadTypes.some(type => type === 'trunk' || type === 'trunk_link');
                const hasPrimary = roadTypes.some(type => type === 'primary' || type === 'primary_link');
                const hasAccessibleRoads = roadTypes.some(type => 
                    !['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link'].includes(type) &&
                    ['secondary', 'tertiary', 'unclassified', 'residential', 'service', 'cycleway', 'path'].includes(type)
                );
                
                if (hasPrimary) {
                    info += '• ⛔ Not accessible for moped routing (Primary road/N-road)\n';
                    info += '• Primary roads (N-roads) are blocked for moped traffic\n';
                } else if (hasMotorway) {
                    info += '• ⚠️ Not accessible for moped routing (Motorway)\n';
                    info += '• Motorways are not allowed for moped traffic\n';
                } else if (hasTrunk) {
                    info += '• ⚠️ Limited access for moped routing (Trunk road)\n';
                    info += '• Trunk roads have reduced priority for mopeds\n';
                } else if (hasAccessibleRoads) {
                    info += '• ✅ Accessible for moped routing\n';
                    info += '• Maximum speed: 45 km/h\n';
                } else if (roadTypes.length > 0) {
                    info += '• ❓ Limited information about moped accessibility\n';
                    info += '• Road type: ' + roadTypes.join(', ') + '\n';
                } else {
                    info += '• ❓ No road information available at this location\n';
                    info += '• May not be suitable for vehicle routing\n';
                }
                
                info += '• Routing engine: GraphHopper with moped profile\n';
                
            } catch (routingError) {
                info += '**Moped Routing Information:**\n';
                info += '• Routing information temporarily unavailable\n';
            }
            
            return info;
            
        } catch (error) {
            console.error('Feature query failed:', error);
            return `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n\nFeature query failed: ${error.message}`;
        }
    };

    // Make queryFeatures globally accessible for testing
    window.queryFeatures = queryFeatures;

    // --- Feature Modal Functions ---
    const featureModal = document.getElementById('feature-modal');
    const featureModalBody = document.getElementById('feature-modal-body');
    const featureModalClose = document.querySelector('.feature-modal-close');
    
    const showFeatureModal = (content) => {
        featureModalBody.textContent = content;
        featureModal.style.display = 'flex';
    };
    
    const showFeatureModalLoading = () => {
        featureModalBody.textContent = 'Loading feature information...';
        featureModal.style.display = 'flex';
    };
    
    const hideFeatureModal = () => {
        featureModal.style.display = 'none';
        featureModalBody.textContent = '';
    };

    const showAddressModal = (address, lat, lng) => {
        const modalContent = `
            📍 Location Information
            
            Address: ${address}
            
            Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            
            Click "Directions from here" or "Directions to here" in the context menu to use this location for routing.
        `;
        
        featureModalBody.textContent = modalContent;
        featureModal.style.display = 'flex';
    };

    const handleContextMenuClick = async (action) => {
        if (!contextMenuCoords) return;
        
        const lat = contextMenuCoords.lat;
        const lng = contextMenuCoords.lng;
        
        hideContextMenu();
        
        switch (action) {
        case 'directions-from':
            try {
                // Show loading state
                startInput.value = '🔍 Getting address...';
                startInput.disabled = true;
                
                const address = await reverseGeocode(lat, lng);
                startInput.value = address;
                showLocationSetFeedback(address);
            } catch (error) {
                console.error('Error getting address:', error);
                const coords = `${lat.toFixed(6)},${lng.toFixed(6)}`;
                startInput.value = coords;
                showLocationSetFeedback(coords);
            } finally {
                startInput.disabled = false;
            }
            setActiveField(null);
            break;
            
        case 'directions-to':
            try {
                // Show loading state
                endInput.value = '🔍 Getting address...';
                endInput.disabled = true;
                
                const address = await reverseGeocode(lat, lng);
                endInput.value = address;
                showLocationSetFeedback(address);
            } catch (error) {
                console.error('Error getting address:', error);
                const coords = `${lat.toFixed(6)},${lng.toFixed(6)}`;
                endInput.value = coords;
                showLocationSetFeedback(coords);
            } finally {
                endInput.disabled = false;
            }
            setActiveField(null);
            break;
            
        case 'show-address':
            try {
                const address = await reverseGeocode(lat, lng);
                showAddressModal(address, lat, lng);
            } catch (error) {
                showAddressModal(`Error getting address: ${error.message}`, lat, lng);
            }
            break;
            
        case 'query-features':
            try {
                hideContextMenu(); // Hide context menu before showing modal
                showFeatureModalLoading(); // Show loading state
                const features = await queryFeatures(lat, lng);
                showFeatureModal(features);
            } catch (error) {
                showFeatureModal(`Error querying features: ${error.message}`);
            }
            break;
        }
    };

    // --- Event Listeners ---
    getRouteBtn.addEventListener('click', getRoute);
    clearRouteBtn.addEventListener('click', clearRoute);
    testApiBtn.addEventListener('click', testApiConnection);
    
    // Map click event for setting coordinates
    if (map) {
        map.on('click', handleMapClick);
        
        // Map right-click event for context menu
        map.on('contextmenu', showContextMenu);
    }
    
    // Input field click events for map clicking mode
    startInput.addEventListener('click', () => handleFieldClick(startInput));
    endInput.addEventListener('click', () => handleFieldClick(endInput));
    
    // Map select button click events
    document.getElementById('start-select-btn').addEventListener('click', () => handleFieldClick(startInput));
    document.getElementById('end-select-btn').addEventListener('click', () => handleFieldClick(endInput));
    
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
    
    // Feature modal event listeners
    featureModalClose.addEventListener('click', hideFeatureModal);
    featureModal.addEventListener('click', (e) => {
        if (e.target === featureModal) {
            hideFeatureModal();
        }
    });
    
    // Escape key to deactivate field selection and hide context menu/modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            setActiveField(null);
            hideContextMenu();
            hideFeatureModal();
            hideSettingsModal();
            hideNavMenu();
        }
    });

    // --- Navigation Menu Functionality ---
    const showNavMenu = () => {
        navMenu.style.display = navMenu.style.display === 'none' ? 'block' : 'none';
    };

    const hideNavMenu = () => {
        navMenu.style.display = 'none';
    };

    const handleNavAction = (action) => {
        hideNavMenu();
        
        switch (action) {
        case 'login':
            // TODO: Implement login functionality
            alert('Login functionality coming soon!');
            break;
        case 'signup':
            // TODO: Implement signup functionality
            alert('Signup functionality coming soon!');
            break;
        case 'profile':
            // TODO: Implement profile settings
            alert('Profile settings coming soon!');
            break;
        case 'app-settings':
            showSettingsModal();
            break;
        case 'preferences':
            // TODO: Implement preferences
            alert('Preferences coming soon!');
            break;
        case 'about':
            // TODO: Implement about page
            alert('About: Moped Router v1.0.0\n\nA modern routing application for moped navigation.');
            break;
        case 'help':
            // TODO: Implement help system
            alert('Help & Support coming soon!');
            break;
        case 'privacy':
            // TODO: Implement privacy policy
            alert('Privacy Policy coming soon!');
            break;
        default:
            console.warn('Unknown navigation action:', action);
        }
    };

    // --- Settings Functionality ---
    const settingsConfig = {
        'api-status': { element: '#api-status', default: true },
        'user-section': { element: '#user-section', default: true },
        'community-section': { element: '#community-section', default: true },
        'achievements-section': { element: '#achievements-section', default: true },
        'community-stats': { element: '#community-stats', default: true }
    };

    const loadSettings = () => {
        const savedSettings = localStorage.getItem('moped-router-settings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        
        Object.keys(settingsConfig).forEach(key => {
            const setting = settings[key] !== undefined ? settings[key] : settingsConfig[key].default;
            const checkbox = document.getElementById(`setting-${key}`);
            const element = document.querySelector(settingsConfig[key].element);
            
            if (checkbox) {
                checkbox.checked = setting;
            }
            if (element) {
                if (setting) {
                    element.classList.remove('section-hidden');
                } else {
                    element.classList.add('section-hidden');
                }
            }
        });
    };

    const saveSettings = () => {
        const settings = {};
        Object.keys(settingsConfig).forEach(key => {
            const checkbox = document.getElementById(`setting-${key}`);
            if (checkbox) {
                settings[key] = checkbox.checked;
            }
        });
        localStorage.setItem('moped-router-settings', JSON.stringify(settings));
    };

    const applySettings = () => {
        Object.keys(settingsConfig).forEach(key => {
            const checkbox = document.getElementById(`setting-${key}`);
            const element = document.querySelector(settingsConfig[key].element);
            
            if (checkbox && element) {
                if (checkbox.checked) {
                    element.classList.remove('section-hidden');
                } else {
                    element.classList.add('section-hidden');
                }
            }
        });
        saveSettings();
    };

    const showSettingsModal = () => {
        settingsModal.style.display = 'flex';
    };

    const hideSettingsModal = () => {
        settingsModal.style.display = 'none';
    };

    // Navigation event listeners
    menuBtn.addEventListener('click', showNavMenu);
    
    // Navigation menu item clicks
    navMenu.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            e.preventDefault();
            const action = navItem.dataset.action;
            handleNavAction(action);
        }
    });
    
    // Hide menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !navMenu.contains(e.target)) {
            hideNavMenu();
        }
    });

    // Settings event listeners (updated to remove settingsBtn reference)
    settingsModalClose.addEventListener('click', hideSettingsModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            hideSettingsModal();
        }
    });

    // Settings checkbox event listeners
    Object.keys(settingsConfig).forEach(key => {
        const checkbox = document.getElementById(`setting-${key}`);
        if (checkbox) {
            checkbox.addEventListener('change', applySettings);
        }
    });

    // Load settings on page load
    loadSettings();

    // --- Community Features ---
    
    // Community reporting functionality
    const reportButtons = document.querySelectorAll('.report-btn');
    const userStatsElement = document.querySelector('.stat-value');
    
    let currentPoints = 1247; // Starting points
    
    reportButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const reportType = button.dataset.type;
            const pointsReward = getPointsForReport(reportType);
            
            // Add points
            currentPoints += pointsReward;
            if (userStatsElement) {
                userStatsElement.textContent = currentPoints.toLocaleString();
            }
            
            // Show confirmation message
            showReportConfirmation(reportType, pointsReward);
            
            // Add visual feedback
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 150);
        });
    });
    
    function getPointsForReport(type) {
        const pointsMap = {
            'traffic': 5,
            'police': 10,
            'hazard': 15
        };
        return pointsMap[type] || 5;
    }
    
    function showReportConfirmation(type, points) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = 'report-notification';
        notification.innerHTML = `
            <div class="notification-content">
                🎉 Thanks for reporting ${type}! 
                <br>+${points} points earned!
            </div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(76, 175, 80, 0.95);
            backdrop-filter: blur(10px);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            border: 1px solid rgba(76, 175, 80, 0.4);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-weight: 600;
            font-size: 0.9rem;
            text-align: center;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // Add CSS for notifications
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(notificationStyles);

    // Test API connection on page load
    testApiConnection();
});