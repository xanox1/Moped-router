# Moped Router Development Guide

## Quick Start

### Web Application
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open browser to `http://localhost:3000`

### Testing
- Run tests: `npm test`
- Run linter: `npm run lint`
- Auto-fix linting issues: `npx eslint web/script.js --fix`

## Architecture

### Web Application Stack
- **Frontend**: Vanilla JavaScript + Leaflet.js for maps
- **Styling**: CSS3 with Flexbox layout
- **API**: RESTful GraphHopper API integration
- **Testing**: Jest with jsdom environment
- **Linting**: ESLint with standard configuration

### File Structure
```
web/
├── index.html          # Main HTML interface
├── script.js           # Application logic and API integration
└── style.css           # Responsive styling

tests/
├── setup.js            # Jest test environment setup
└── web-app.test.js     # Unit tests for web application

docs/
└── android-development-plan.md  # Future Android app planning
```

## Key Features

### Current Implementation
- ✅ Interactive map interface (Leaflet.js)
- ✅ Route planning with start/end points
- ✅ Preset route selection (Amsterdam-Utrecht, Amsterdam-Haarlem, Utrecht-Arnhem)
- ✅ API status monitoring
- ✅ Route visualization with markers
- ✅ Distance and time calculations
- ✅ Error handling and user feedback
- ✅ Responsive design

### API Integration
- **Endpoint**: `https://graphhopper.xanox.org:8989/route`
- **Profile**: moped (45 km/h max speed)
- **Parameters**: start point, end point, profile, points_encoded=false
- **Response**: GeoJSON route with distance and time

### Testing Strategy
- Unit tests for core functionality
- API URL configuration validation
- Error handling verification
- Route parameter construction

## Development Workflow

1. **Make Changes**: Edit files in `web/` directory
2. **Test**: Run `npm test` to verify functionality
3. **Lint**: Run `npm run lint` to check code quality
4. **Manual Test**: Use `npm run dev` to test in browser
5. **Document**: Update this file if adding new features

## Common Tasks

### Adding New Preset Routes
1. Edit `presetRoutesData` object in `script.js`
2. Add new option to `presetRoutes` select in `index.html`
3. Test the new route works correctly

### Modifying API Configuration
1. Update `GRAPHHOPPER_API_URL` constant in `script.js`
2. Update tests in `web-app.test.js` if needed
3. Test API connectivity

### Styling Changes
1. Edit `style.css` for visual modifications
2. Test responsive behavior on different screen sizes
3. Ensure accessibility standards are maintained

## Future Enhancements

### Planned Features
- [ ] Local Leaflet.js installation (no CDN dependency)
- [ ] Route export functionality (GPX/KML)
- [ ] Route comparison tools
- [ ] Turn-by-turn instructions
- [ ] Elevation profile display
- [ ] Route sharing capabilities

### Android Integration
See `docs/android-development-plan.md` for detailed Android development roadmap.

## Troubleshooting

### Common Issues
1. **Leaflet not loading**: CDN may be blocked in some environments
2. **API connection failures**: Check GraphHopper server status
3. **Test failures**: Ensure jest-environment-jsdom is installed
4. **Linting errors**: Run `npx eslint web/script.js --fix`

### Debug Mode
Add `console.log` statements in `script.js` and use browser developer tools to debug API calls and route calculations.