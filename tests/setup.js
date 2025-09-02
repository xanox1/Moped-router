require('@testing-library/jest-dom');

// Mock Leaflet since it's not available in test environment
global.L = {
  map: jest.fn(() => ({
    setView: jest.fn(),
    fitBounds: jest.fn()
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn()
  })),
  layerGroup: jest.fn(() => ({
    addTo: jest.fn(),
    clearLayers: jest.fn()
  })),
  polyline: jest.fn(() => ({
    addTo: jest.fn(),
    getBounds: jest.fn(() => ({
      pad: jest.fn(() => ({}))
    }))
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn()
  }))
};

// Mock fetch for API calls
global.fetch = jest.fn();