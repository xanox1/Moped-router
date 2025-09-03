# Moped Router - GitHub Copilot Instructions

**ALWAYS follow these instructions first and only fallback to additional search and context gathering if the information here is incomplete or found to be in error.**

The Moped Router is a web application for planning moped routes using a GraphHopper routing engine. It consists of a web client application, Docker configuration for the GraphHopper server, and planned Android development.

## Quick Start & Validation

**Bootstrap the repository (total time: ~5 seconds):**
```bash
npm install                 # Install dependencies (~3 seconds)
npm test                   # Run test suite (~1 second, 11 tests)
npm run lint              # Run ESLint (<1 second)
npm run build             # Build web app (<1 second)
```

**Start development server:**
```bash
npm run dev               # Starts Python HTTP server on http://localhost:3000
```

**CRITICAL VALIDATION**: After making changes, ALWAYS run through this complete verification sequence:
1. Run `npm test` to ensure all 11 tests pass
2. Run `npm run lint` to check code quality 
3. Run `npm run build` to verify build works
4. Start `npm run dev` and test the web application manually
5. Test at least one complete routing scenario (see Manual Testing section below)

## Manual Testing Scenarios

**REQUIRED**: After making any changes to the web application, ALWAYS test these scenarios:

### Basic Route Planning Test
1. Open http://localhost:3000 in browser
2. Enter coordinates in From field: `52.3702,4.8952` (Amsterdam)
3. Enter coordinates in To field: `52.0907,5.1214` (Utrecht)
4. Click "Get Route" button
5. **Expected**: Route information displays (distance/time) or error message if API unavailable
6. Click "Clear Route" to reset

### API Status Test  
1. Click "Test API" button
2. **Expected**: API status indicator updates to "Online" or "Offline"
3. **Note**: May show "Offline" due to external GraphHopper server dependencies

### Address Geocoding Test
1. Enter address in From field: `Amsterdam Central Station`
2. Enter address in To field: `Utrecht Centraal`
3. Click "Get Route" button
4. **Expected**: Geocoding resolves addresses to coordinates, then attempts routing

**NOTE**: Map display requires Leaflet.js CDN which may be blocked in some environments. The application should still function for route planning even if the map doesn't render.

## Build & Development Commands

**All commands are fast (< 5 seconds) - no extended timeouts needed:**

### Core Development
- `npm install` - Install all dependencies (~3 seconds)
- `npm run dev` - Start development server on port 3000
- `npm run serve` - Alternative command for development server
- `npm test` - Run Jest test suite (~1 second, expects 11 passing tests)
- `npm run lint` - Run ESLint on web/script.js (<1 second)

### Build & Deploy
- `npm run build` - Copy web files to dist/ directory (<1 second)
- `npm run build:web` - Same as build command

### Prerequisites
- **Node.js**: v18.x or v20.x (currently using v20.19.4)
- **npm**: v10.x+ (currently using v10.8.2)  
- **Python 3**: For development server (currently v3.12.3)

## Project Structure & Key Files

### Web Application (`web/`)
- `index.html` - Main HTML page with form inputs and map container
- `script.js` - Main JavaScript application logic (~9KB)
- `style.css` - Styling and responsive design (~3KB)

### Configuration & Docker
- `docker-compose.yml` - GraphHopper server configuration
- `config.yml` - GraphHopper routing engine settings
- `moped-rules.json` - Custom routing rules (45 km/h speed limit, avoid highways)

### Testing & CI
- `tests/web-app.test.js` - Jest test suite (11 tests covering API, geocoding, UI)
- `tests/setup.js` - Jest configuration and mocks
- `.github/workflows/ci.yml` - CI pipeline (Node 18.x/20.x testing)
- `.github/workflows/deploy.yml` - GitHub Pages deployment

### Future Development
- `android/` - Android app structure (minimal, planned development)
- `docs/` - Development guides and Android roadmap

## API Configuration

**GraphHopper API**: `https://graphhopper.xanox.org/route`
- Profile: `moped` (custom profile with 45 km/h speed limit)
- Response format: GeoJSON coordinates
- Fallback geocoding: Nominatim OpenStreetMap API

**API Testing**: Use the "Test API" button in the web interface or check `/info` endpoint for server status.

## GitHub Actions & CI

**Automated Testing** (`.github/workflows/ci.yml`):
- Triggers: Push to `main`/`develop`, all pull requests
- Tests: Node.js 18.x and 20.x compatibility
- Steps: `npm ci` → `npm run lint` → `npm test` → `npm run build`

**GitHub Pages Deployment** (`.github/workflows/deploy.yml`):
- Triggers: Push to `main` branch
- Builds and deploys to `https://[username].github.io/Moped-router/`
- Runs tests before deployment to ensure quality

**To enable GitHub Pages**: Repository Settings → Pages → Select "GitHub Actions" as source

## Common Development Tasks

### Adding New Features to Web App
1. Edit files in `web/` directory
2. Add corresponding tests in `tests/web-app.test.js`
3. Run validation sequence: `npm test && npm run lint && npm run build`
4. Test manually with `npm run dev`

### Modifying API Configuration
1. Update `GRAPHHOPPER_API_URL` in `web/script.js`
2. Update tests in `tests/web-app.test.js` if needed
3. Test API connectivity with "Test API" button

### Adding Preset Routes
1. Edit `presetRoutesData` object in `web/script.js`
2. Add new option to `presetRoutes` select in `web/index.html`
3. Test the new route works correctly

## Troubleshooting

### Common Issues

**Leaflet Map Not Loading**: 
- CDN may be blocked in some environments (shows "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT")
- Application still functions for route planning without map display
- Check browser console for CDN loading errors
- Future enhancement: Consider local Leaflet.js installation to avoid CDN dependency

**API Connection Failures**:
- GraphHopper server at `graphhopper.xanox.org` may be offline
- Use "Test API" button to check server status
- Verify network connectivity and firewall settings

**Test Failures**:
- Ensure `jest-environment-jsdom` is installed: `npm install`
- Check for Node.js version compatibility (18.x or 20.x)
- Verify all 11 tests pass: `npm test`

**Linting Errors**:
- Auto-fix issues: `npx eslint web/script.js --fix`
- Check ESLint configuration in `.eslintrc.json`
- Ensure code follows project style guidelines

### Docker Setup (Optional)
The repository includes Docker configuration for running a local GraphHopper server:
- Requires OSM data file (`netherlands-latest.osm.pbf`)
- Volume mounts for data persistence
- Custom moped routing profile with speed limits

## File Locations Reference

**Frequently accessed files**:
```
/web/script.js           # Main application logic
/web/index.html          # UI structure  
/web/style.css           # Styling
/tests/web-app.test.js   # Test suite
/package.json            # Dependencies and scripts
/.github/workflows/      # CI/CD configuration
```

**Configuration files**:
```
/.eslintrc.json          # Linting rules
/docker-compose.yml      # GraphHopper server
/config.yml              # Routing engine config
/moped-rules.json        # Custom routing rules
```

## Performance Notes

- **Installation**: `npm install` takes ~3 seconds (includes 445 packages)
- **Testing**: `npm test` takes ~1 second (11 tests)
- **Linting**: `npm run lint` takes <1 second  
- **Building**: `npm run build` takes <1 second
- **Dev Server**: Starts immediately on port 3000

All operations are extremely fast - no timeout concerns.