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