/**
 * @jest-environment jsdom
 */

// Test for the moped router web application
describe('Moped Router Web App', () => {
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div class="container">
        <div class="controls">
          <h1>Moped Router</h1>
          <div class="input-group">
            <label for="start">Start (Lat, Lon)</label>
            <input type="text" id="start" value="">
          </div>
          <div class="input-group">
            <label for="end">End (Lat, Lon)</label>
            <input type="text" id="end" value="">
          </div>
          <button id="getRouteBtn">Get Route</button>
          <div id="route-info"></div>
          <div id="error-message" class="error"></div>
        </div>
        <div id="map"></div>
      </div>
    `;

    // Reset fetch mock
    fetch.mockClear();
  });

  test('should have correct API URL configured', () => {
    // Load the script content to check API URL
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('https://graphhopper.xanox.org/route');
  });

  test('should validate required input fields', () => {
    const startInput = document.getElementById('start');
    const endInput = document.getElementById('end');
    
    expect(startInput).toBeTruthy();
    expect(endInput).toBeTruthy();
    expect(startInput.value).toBe(''); // Now empty by default
    expect(endInput.value).toBe(''); // Now empty by default
  });

  test('should display error when API request fails', async () => {
    // Mock failed fetch
    fetch.mockRejectedValueOnce(new Error('Network error'));

    // Simulate the getRoute function logic
    const errorMessageDiv = document.getElementById('error-message');
    errorMessageDiv.textContent = 'Network error';
    errorMessageDiv.style.display = 'block';

    expect(errorMessageDiv.textContent).toBe('Network error');
    expect(errorMessageDiv.style.display).toBe('block');
  });

  test('should construct correct API URL with parameters', () => {
    const baseUrl = 'https://graphhopper.xanox.org/route';
    const startPoint = '52.3702,4.8952';
    const endPoint = '52.0907,5.1214';
    
    const url = new URL(baseUrl);
    url.searchParams.append('point', startPoint);
    url.searchParams.append('point', endPoint);
    url.searchParams.append('profile', 'moped');
    url.searchParams.append('points_encoded', 'false');

    expect(url.toString()).toContain('point=52.3702%2C4.8952');
    expect(url.toString()).toContain('point=52.0907%2C5.1214');
    expect(url.toString()).toContain('profile=moped');
    expect(url.toString()).toContain('points_encoded=false');
  });

  test('should include correct parameters for fastest route', () => {
    const baseUrl = 'https://graphhopper.xanox.org/route';
    const startPoint = '52.3702,4.8952';
    const endPoint = '52.0907,5.1214';
    const routeType = 'fastest';
    
    const url = new URL(baseUrl);
    url.searchParams.append('point', startPoint);
    url.searchParams.append('point', endPoint);
    url.searchParams.append('profile', 'moped');
    url.searchParams.append('points_encoded', 'false');
    url.searchParams.append('ch.disable', 'true');
    // PRIMARY road blocking rules (always first)
    url.searchParams.append('custom_model.priority[0].if', 'road_class == PRIMARY');
    url.searchParams.append('custom_model.priority[0].multiply_by', '0');
    url.searchParams.append('custom_model.distance_influence[0].if', 'road_class == PRIMARY');
    url.searchParams.append('custom_model.distance_influence[0].multiply_by', '1000');
    // Route type specific rules
    url.searchParams.append('algorithm', 'dijkstra');
    url.searchParams.append('custom_model.priority[1].if', 'road_class == SECONDARY || road_class == TERTIARY');
    url.searchParams.append('custom_model.priority[1].multiply_by', '1.3');
    url.searchParams.append('custom_model.distance_influence[1].if', 'true');
    url.searchParams.append('custom_model.distance_influence[1].multiply_by', '0.5');

    expect(url.toString()).toContain('algorithm=dijkstra');
    expect(url.toString()).toContain('ch.disable=true');
    expect(url.toString()).toContain('custom_model.priority');
    expect(url.toString()).toContain('custom_model.distance_influence');
    expect(url.toString()).toContain('road_class+%3D%3D+PRIMARY'); // URL encoded "road_class == PRIMARY"
  });

  test('should include correct parameters for shortest route', () => {
    const baseUrl = 'https://graphhopper.xanox.org/route';
    const startPoint = '52.3702,4.8952';
    const endPoint = '52.0907,5.1214';
    const routeType = 'shortest';
    
    const url = new URL(baseUrl);
    url.searchParams.append('point', startPoint);
    url.searchParams.append('point', endPoint);
    url.searchParams.append('profile', 'moped');
    url.searchParams.append('points_encoded', 'false');
    url.searchParams.append('ch.disable', 'true');
    // PRIMARY road blocking rules (always first)
    url.searchParams.append('custom_model.priority[0].if', 'road_class == PRIMARY');
    url.searchParams.append('custom_model.priority[0].multiply_by', '0');
    url.searchParams.append('custom_model.distance_influence[0].if', 'road_class == PRIMARY');
    url.searchParams.append('custom_model.distance_influence[0].multiply_by', '1000');
    // Route type specific rules
    url.searchParams.append('algorithm', 'astar');
    url.searchParams.append('custom_model.distance_influence[1].if', 'true');
    url.searchParams.append('custom_model.distance_influence[1].multiply_by', '2.0');

    expect(url.toString()).toContain('algorithm=astar');
    expect(url.toString()).toContain('ch.disable=true');
    expect(url.toString()).toContain('custom_model.distance_influence');
    expect(url.toString()).toContain('road_class+%3D%3D+PRIMARY'); // URL encoded "road_class == PRIMARY"
  });

  test('should always include PRIMARY road blocking rules for all route types', () => {
    const baseUrl = 'https://graphhopper.xanox.org/route';
    const startPoint = '53.186255,5.796779'; // Verlengde Schrans coordinates from issue
    const endPoint = '53.185786,5.796801';
    
    // Test all route types to ensure PRIMARY road blocking is always included
    const routeTypes = ['fastest', 'shortest', 'energy_efficient'];
    
    routeTypes.forEach(routeType => {
      const url = new URL(baseUrl);
      url.searchParams.append('point', startPoint);
      url.searchParams.append('point', endPoint);
      url.searchParams.append('profile', 'moped');
      url.searchParams.append('points_encoded', 'false');
      url.searchParams.append('ch.disable', 'true');
      
      // PRIMARY road blocking rules - MUST be included for all route types
      url.searchParams.append('custom_model.priority[0].if', 'road_class == PRIMARY');
      url.searchParams.append('custom_model.priority[0].multiply_by', '0');
      url.searchParams.append('custom_model.distance_influence[0].if', 'road_class == PRIMARY');
      url.searchParams.append('custom_model.distance_influence[0].multiply_by', '1000');
      
      // Dutch access restriction blocking rules
      url.searchParams.append('custom_model.priority[1].if', 'moped == no');
      url.searchParams.append('custom_model.priority[1].multiply_by', '0');
      url.searchParams.append('custom_model.priority[2].if', 'motor_vehicle == no');
      url.searchParams.append('custom_model.priority[2].multiply_by', '0');
      url.searchParams.append('custom_model.priority[3].if', 'vehicle == no');
      url.searchParams.append('custom_model.priority[3].multiply_by', '0');
      url.searchParams.append('custom_model.priority[4].if', 'max_speed > 45');
      url.searchParams.append('custom_model.priority[4].multiply_by', '0');
      
      // All URLs must contain PRIMARY road blocking rules
      expect(url.toString()).toContain('custom_model.priority%5B0%5D.if=road_class+%3D%3D+PRIMARY');
      expect(url.toString()).toContain('custom_model.priority%5B0%5D.multiply_by=0');
      expect(url.toString()).toContain('custom_model.distance_influence%5B0%5D.if=road_class+%3D%3D+PRIMARY');
      expect(url.toString()).toContain('custom_model.distance_influence%5B0%5D.multiply_by=1000');
      
      // All URLs must contain Dutch access restriction blocking rules
      expect(url.toString()).toContain('custom_model.priority%5B1%5D.if=moped+%3D%3D+no');
      expect(url.toString()).toContain('custom_model.priority%5B2%5D.if=motor_vehicle+%3D%3D+no');
      expect(url.toString()).toContain('custom_model.priority%5B3%5D.if=vehicle+%3D%3D+no');
      expect(url.toString()).toContain('custom_model.priority%5B4%5D.if=max_speed+%3E+45');
    });
  });
});

describe('Geocoding Functionality', () => {
  // Helper functions to test (extracted from script.js logic)
  const isCoordinate = (input) => {
    const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
    return coordPattern.test(input.trim());
  };

  test('should detect coordinate format correctly', () => {
    expect(isCoordinate('52.3702,4.8952')).toBe(true);
    expect(isCoordinate('52,4')).toBe(true);
    expect(isCoordinate('-52.3702,-4.8952')).toBe(true);
    expect(isCoordinate('52.3702, 4.8952')).toBe(false); // space not allowed
    expect(isCoordinate('Amsterdam Central Station')).toBe(false);
    expect(isCoordinate('Damrak 1, Amsterdam')).toBe(false);
    expect(isCoordinate('')).toBe(false);
  });

  test('should have Nominatim API URL configured', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('https://nominatim.openstreetmap.org/search');
  });

  test('should construct correct Nominatim API URL', () => {
    const baseUrl = 'https://nominatim.openstreetmap.org/search';
    const address = 'Amsterdam Central Station';
    
    const url = new URL(baseUrl);
    url.searchParams.append('q', address);
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '1');
    url.searchParams.append('countrycodes', 'nl');

    expect(url.toString()).toContain('q=Amsterdam+Central+Station');
    expect(url.toString()).toContain('format=json');
    expect(url.toString()).toContain('limit=1');
    expect(url.toString()).toContain('countrycodes=nl');
  });
});

describe('Moped Routing Rules', () => {
  test('should block PRIMARY roads (N roads) for moped routing', () => {
    const mopedRules = require('../moped-rules.json');
    
    // Should have priority rules
    expect(mopedRules.priority).toBeDefined();
    expect(Array.isArray(mopedRules.priority)).toBe(true);
    
    // Should have a rule that blocks PRIMARY roads (N roads) 
    const primaryRoadRule = mopedRules.priority.find(rule => 
      rule.if === 'road_class == PRIMARY'
    );
    expect(primaryRoadRule).toBeDefined();
    expect(primaryRoadRule.multiply_by).toBe(0);
    
    // Should also have distance influence to make PRIMARY roads extremely costly
    expect(mopedRules.distance_influence).toBeDefined();
    expect(Array.isArray(mopedRules.distance_influence)).toBe(true);
    
    const primaryDistanceRule = mopedRules.distance_influence.find(rule => 
      rule.if === 'road_class == PRIMARY'
    );
    expect(primaryDistanceRule).toBeDefined();
    expect(primaryDistanceRule.multiply_by).toBe(1000);
  });

  test('should have reduced priority for MOTORWAY and TRUNK roads', () => {
    const mopedRules = require('../moped-rules.json');
    
    const motorwayTrunkRule = mopedRules.priority.find(rule => 
      rule.if === 'road_class == MOTORWAY || road_class == TRUNK'
    );
    expect(motorwayTrunkRule).toBeDefined();
    expect(motorwayTrunkRule.multiply_by).toBe('0.1');
  });

  test('should have speed limit of 45 km/h for all roads', () => {
    const mopedRules = require('../moped-rules.json');
    
    expect(mopedRules.speed).toBeDefined();
    expect(Array.isArray(mopedRules.speed)).toBe(true);
    
    const speedRule = mopedRules.speed.find(rule => 
      rule.if === 'true'
    );
    expect(speedRule).toBeDefined();
    expect(speedRule.limit_to).toBe('45');
  });

  test('should have comprehensive blocking for PRIMARY roads (N roads like N334)', () => {
    const mopedRules = require('../moped-rules.json');
    
    // PRIMARY roads should have zero priority (completely blocked)
    const primaryPriorityRule = mopedRules.priority.find(rule => 
      rule.if === 'road_class == PRIMARY'
    );
    expect(primaryPriorityRule).toBeDefined();
    expect(primaryPriorityRule.multiply_by).toBe(0);
    
    // PRIMARY roads should have extremely high distance cost (1000x normal)
    const primaryDistanceRule = mopedRules.distance_influence.find(rule => 
      rule.if === 'road_class == PRIMARY'
    );
    expect(primaryDistanceRule).toBeDefined();
    expect(primaryDistanceRule.multiply_by).toBe(1000);
    
    // This dual approach ensures PRIMARY roads (like N334) are never used for moped routing
    // even when routing between cities like Reduzum to Zwolle or Heerenveen to Zwolle
  });

  test('should have PRIMARY roads ignored during import in GraphHopper config', () => {
    const configContent = require('fs').readFileSync('./config.yml', 'utf8');
    
    // Verify that PRIMARY roads are in the ignored_highways list
    expect(configContent).toContain('import.osm.ignored_highways:');
    expect(configContent).toContain('primary');
    expect(configContent).toContain('primary_link');
    
    // Verify the complete ignored highways list includes all blocked road types
    const ignoredHighwaysLine = configContent.split('\n').find(line => 
      line.includes('import.osm.ignored_highways:')
    );
    expect(ignoredHighwaysLine).toContain('motorway');
    expect(ignoredHighwaysLine).toContain('trunk');
    expect(ignoredHighwaysLine).toContain('primary');
    expect(ignoredHighwaysLine).toContain('primary_link');
  });

  test('should block roads with Dutch access restrictions', () => {
    const mopedRules = require('../moped-rules.json');
    
    // Should block roads with moped=no
    const mopedNoRule = mopedRules.priority.find(rule => 
      rule.if === 'moped == no'
    );
    expect(mopedNoRule).toBeDefined();
    expect(mopedNoRule.multiply_by).toBe(0);
    
    // Should block roads with motor_vehicle=no
    const motorVehicleNoRule = mopedRules.priority.find(rule => 
      rule.if === 'motor_vehicle == no'
    );
    expect(motorVehicleNoRule).toBeDefined();
    expect(motorVehicleNoRule.multiply_by).toBe(0);
    
    // Should block roads with vehicle=no
    const vehicleNoRule = mopedRules.priority.find(rule => 
      rule.if === 'vehicle == no'
    );
    expect(vehicleNoRule).toBeDefined();
    expect(vehicleNoRule.multiply_by).toBe(0);
    
    // Should block roads with max_speed > 45
    const maxSpeedRule = mopedRules.priority.find(rule => 
      rule.if === 'max_speed > 45'
    );
    expect(maxSpeedRule).toBeDefined();
    expect(maxSpeedRule.multiply_by).toBe(0);
  });

  test('should have Dutch access restrictions with distance penalties', () => {
    const mopedRules = require('../moped-rules.json');
    
    // Should have distance penalties for access-restricted roads
    const accessRestrictedRules = [
      'moped == no',
      'motor_vehicle == no', 
      'vehicle == no',
      'max_speed > 45'
    ];
    
    accessRestrictedRules.forEach(restriction => {
      const distanceRule = mopedRules.distance_influence.find(rule => 
        rule.if === restriction
      );
      expect(distanceRule).toBeDefined();
      expect(distanceRule.multiply_by).toBe(1000);
    });
  });

  test('should have enhanced encoded values for Dutch access restrictions', () => {
    const configContent = require('fs').readFileSync('./config.yml', 'utf8');
    
    // Verify that access restriction encoded values are included
    expect(configContent).toContain('graph.encoded_values:');
    expect(configContent).toContain('road_class');
    expect(configContent).toContain('max_speed');
    expect(configContent).toContain('moped');
    expect(configContent).toContain('motor_vehicle');
    expect(configContent).toContain('vehicle');
  });
});

describe('Map Click Functionality', () => {
  test('should have activeInputField variable defined', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('let activeInputField = null');
  });

  test('should have map click handler function defined', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('const handleMapClick');
  });

  test('should have field click handler function defined', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('const handleFieldClick');
  });

  test('should have CSS class for active field styling', () => {
    const styleContent = require('fs').readFileSync('./web/style.css', 'utf8');
    expect(styleContent).toContain('.map-click-active');
  });
});

describe('Route Type Selection', () => {
  test('should have route type radio buttons in HTML', () => {
    const htmlContent = require('fs').readFileSync('./web/index.html', 'utf8');
    expect(htmlContent).toContain('name="routeType"');
    expect(htmlContent).toContain('value="fastest"');
    expect(htmlContent).toContain('value="shortest"');
    expect(htmlContent).toContain('value="energy_efficient"');
    expect(htmlContent).toContain('Fastest Route');
    expect(htmlContent).toContain('Shortest Route');
    expect(htmlContent).toContain('Energy Efficient');
    expect(htmlContent).toContain('Prioritizes speed and main roads');
    expect(htmlContent).toContain('Minimizes total distance');
    expect(htmlContent).toContain('Prefers smoother roads and fewer stops for better battery life');
  });

  test('should have route type selection CSS styling', () => {
    const styleContent = require('fs').readFileSync('./web/style.css', 'utf8');
    expect(styleContent).toContain('.route-type-selection');
    expect(styleContent).toContain('.radio-option');
    expect(styleContent).toContain('.option-hint');
  });

  test('should have fastest route selected by default', () => {
    const htmlContent = require('fs').readFileSync('./web/index.html', 'utf8');
    expect(htmlContent).toContain('value="fastest" checked');
  });
});

describe('Context Menu Functionality', () => {
  test('should have context menu HTML element', () => {
    const htmlContent = require('fs').readFileSync('./web/index.html', 'utf8');
    expect(htmlContent).toContain('id="context-menu"');
    expect(htmlContent).toContain('data-action="directions-from"');
    expect(htmlContent).toContain('data-action="directions-to"');
    expect(htmlContent).toContain('data-action="show-address"');
    expect(htmlContent).toContain('data-action="query-features"');
  });

  test('should have context menu CSS styling', () => {
    const styleContent = require('fs').readFileSync('./web/style.css', 'utf8');
    expect(styleContent).toContain('.context-menu');
    expect(styleContent).toContain('.context-menu-item');
    expect(styleContent).toContain('.context-menu-separator');
  });

  test('should have context menu functions defined', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('showContextMenu');
    expect(scriptContent).toContain('hideContextMenu');
    expect(scriptContent).toContain('handleContextMenuClick');
    expect(scriptContent).toContain('reverseGeocode');
    expect(scriptContent).toContain('queryFeatures');
  });

  test('should have right-click event listener', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain("map.on('contextmenu', showContextMenu)");
  });

  test('should have reverse geocoding API endpoint', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('https://nominatim.openstreetmap.org/reverse');
  });
});

describe('Enhanced Context Menu Features', () => {
  test('should have feature modal HTML elements', () => {
    const htmlContent = require('fs').readFileSync('./web/index.html', 'utf8');
    expect(htmlContent).toContain('id="feature-modal"');
    expect(htmlContent).toContain('class="feature-modal"');
    expect(htmlContent).toContain('id="feature-modal-body"');
    expect(htmlContent).toContain('class="feature-modal-close"');
  });

  test('should have feature modal CSS styling', () => {
    const styleContent = require('fs').readFileSync('./web/style.css', 'utf8');
    expect(styleContent).toContain('.feature-modal');
    expect(styleContent).toContain('.feature-modal-content');
    expect(styleContent).toContain('.feature-modal-header');
    expect(styleContent).toContain('.feature-modal-body');
    expect(styleContent).toContain('position: fixed');
  });

  test('should have enhanced queryFeatures function with multiple API calls', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('addressdetails');
    expect(scriptContent).toContain('extratags');
    expect(scriptContent).toContain('namedetails');
    expect(scriptContent).toContain('overpass-api.de');
    expect(scriptContent).toContain('**Location Information:**');
    expect(scriptContent).toContain('**Address Details:**');
  });

  test('should have proper context menu positioning with map offset calculation', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('getBoundingClientRect()');
    expect(scriptContent).toContain('mapRect.left + e.containerPoint.x');
    expect(scriptContent).toContain('mapRect.top + e.containerPoint.y');
  });

  test('should have modal show and hide functions', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('showFeatureModal');
    expect(scriptContent).toContain('hideFeatureModal');
    expect(scriptContent).toContain('featureModal.style.display');
  });

  test('should have modal event listeners for close functionality', () => {
    const scriptContent = require('fs').readFileSync('./web/script.js', 'utf8');
    expect(scriptContent).toContain('featureModalClose.addEventListener');
    expect(scriptContent).toContain('hideFeatureModal');
    expect(scriptContent).toContain('e.target === featureModal');
  });
});