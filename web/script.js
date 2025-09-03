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
            try {
                const overpassQuery = `
                    [out:json][timeout:10];
                    (
                        way(around:50,${lat},${lng})[highway];
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
                    const overpassData = await overpassResponse.json();
                    
                    if (overpassData.elements && overpassData.elements.length > 0) {
                        // Group features by type
                        const roads = [];
                        const boundaries = [];
                        const amenities = [];
                        const shops = [];
                        const tourism = [];
                        
                        overpassData.elements.forEach(element => {
                            if (element.tags) {
                                if (element.tags.highway) {
                                    roads.push(element);
                                } else if (element.tags.boundary) {
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
                        
                        // Add nearby roads
                        if (roads.length > 0) {
                            info += '**Nearby Roads:**\n';
                            roads.slice(0, 5).forEach(road => {
                                const name = road.tags.name || 'Unnamed road';
                                const type = road.tags.highway;
                                info += `${name} (${type})\n`;
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
            
            // Add routing information
            try {
                const routingUrl = new URL('https://graphhopper.xanox.org/route');
                routingUrl.searchParams.append('point', `${lat},${lng}`);
                routingUrl.searchParams.append('point', `${lat + 0.001},${lng + 0.001}`);
                routingUrl.searchParams.append('profile', 'moped');
                routingUrl.searchParams.append('debug', 'true');
                routingUrl.searchParams.append('points_encoded', 'false');
                
                const routingResponse = await fetch(routingUrl);
                const routingData = await routingResponse.json();
                
                info += '**Moped Routing Information:**\n';
                if (routingData.paths && routingData.paths.length > 0) {
                    info += '• Road accessible for moped routing\n';
                    info += '• Maximum speed: 45 km/h\n';
                    
                    if (routingData.info) {
                        info += `• Routing engine: ${routingData.info.build_date || 'GraphHopper'}\n`;
                    }
                } else {
                    info += '• No moped routing available at this location\n';
                }
            } catch (routingError) {
                info += '**Moped Routing Information:**\n';
                info += '• Routing service temporarily unavailable\n';
            }
            
            return info;
            
        } catch (error) {
            console.error('Feature query failed:', error);
            return `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n\nFeature query failed: ${error.message}`;
        }
    };

    // --- Feature Modal Functions ---
    const featureModal = document.getElementById('feature-modal');
    const featureModalBody = document.getElementById('feature-modal-body');
    const featureModalClose = document.querySelector('.feature-modal-close');
    
    const showFeatureModal = (content) => {
        featureModalBody.textContent = content;
        featureModal.style.display = 'flex';
    };
    
    const hideFeatureModal = () => {
        featureModal.style.display = 'none';
        featureModalBody.textContent = '';
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
                hideContextMenu(); // Hide context menu before showing modal
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
        }
    });

    // Test API connection on page load
    testApiConnection();
});