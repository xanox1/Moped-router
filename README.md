# GraphHopper Moped Routing Server

This project provides a Dockerized configuration for a GraphHopper routing engine customized for mopeds, along with web and future Android client applications. It uses a custom routing profile to adjust speeds and road priorities based on a set of rules defined in `moped-rules.json`.

## Project Structure

```
moped-router/
├── config.yml              # GraphHopper server configuration
├── docker-compose.yml      # Docker compose setup
├── moped-rules.json        # Custom routing rules for mopeds
├── web/                    # Web application for testing
│   ├── index.html
│   ├── script.js
│   └── style.css
├── android/                # Future Android application
│   └── app/src/main/java/com/moped/router/
├── tests/                  # Test suite
├── docs/                   # Documentation
└── package.json           # Node.js dependencies and scripts
```

## Features

### Web Application
- Interactive map interface using Leaflet
- Route planning with start/end points
- Preset route selection
- API status monitoring
- Real-time route visualization
- Distance and time calculations

### GraphHopper Backend
- Customized for moped routing (45 km/h max speed)
- Reduced priority for motorways and trunk roads
- Completely blocks PRIMARY roads (N roads) using dual mechanism: zero priority and extreme distance penalties
- PRIMARY roads are also excluded during OSM data import to prevent any routing through these roads
- **Enhanced Dutch access restrictions**: Blocks roads with `moped=no`, `motor_vehicle=no`, `vehicle=no` access tags
- **Speed-based filtering**: Automatically excludes roads with speed limits > 45 km/h (Dutch moped legal limit)
- **Enhanced Dutch traffic sign compliance**: Supports comprehensive Dutch traffic signs from OpenStreetMap including:
  - **NL:C5** - Gesloten voor bromfietsen (Moped prohibited signs)
  - **NL:C2/C7/C1/C12** - Motor vehicle and general prohibition signs
  - **NL:G12a/G13** - Designated moped and cycle paths
  - **Zone-based restrictions** - Speed zones and traffic sign zones
  - **Cycleway moped access** - Enhanced routing via cycle infrastructure
- **Traffic sign visualization**: Context menu displays relevant Dutch traffic signs and moped infrastructure
- Netherlands map data support
- Docker containerized deployment

## Development

### Web Application Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```
   This starts a local web server at `http://localhost:3000`

3. **Run Tests:**
   ```bash
   npm test
   ```

4. **Lint Code:**
   ```bash
   npm run lint
   ```

### Testing the Web Application

The web application includes several features for testing the moped routing:

- **Preset Routes**: Quick selection of common routes in the Netherlands
- **API Status Monitoring**: Real-time check of GraphHopper API availability  
- **Route Visualization**: Interactive map display of calculated routes
- **Error Handling**: Clear feedback for API failures or invalid inputs

### Future Android Development

See [Android Development Plan](docs/android-development-plan.md) for detailed information about the planned Android application.

## GitHub Actions & Deployment

This repository includes automated testing and deployment via GitHub Actions:

### Automated Testing

Every push and pull request automatically runs:
- **Node.js Testing**: Tests on Node.js 18.x and 20.x
- **Linting**: Code quality checks with ESLint
- **Build Verification**: Ensures the web application builds correctly

The CI workflow is triggered on pushes to `main` and `develop` branches and on all pull requests.

### Live Demo via GitHub Pages

The web application is automatically deployed to GitHub Pages on every push to the `main` branch:

- **Live Demo**: Available at `https://[username].github.io/Moped-router/`
- **Automatic Updates**: Deploys latest version from main branch
- **Build Process**: Runs tests before deployment to ensure quality

To enable GitHub Pages deployment:
1. Go to repository Settings → Pages
2. Select "GitHub Actions" as the source
3. The deployment workflow will automatically deploy on the next push to main

### Testing in GitHub

To test this application in GitHub:

1. **Fork the repository** to your GitHub account
2. **Enable GitHub Actions** in your fork (if not already enabled)
3. **Push changes** to trigger automated testing
4. **Enable GitHub Pages** to get a live demo of the web application
5. **Check the Actions tab** to see test results and deployment status

## Prerequisites

**For GraphHopper Server:**

-   [Docker](https://docs.docker.com/get-docker/)
-   [Docker Compose](https://docs.docker.com/compose/install/)
-   An OpenStreetMap data file in `.osm.pbf` format (e.g., `netherlands-latest.osm.pbf`).

## Directory Structure

The `docker-compose.yml` expects a specific directory structure on the host machine for persistent data. Create these directories before starting the service:

```bash
# Directory for map data (.osm.pbf file)
sudo mkdir -p /srv/graphhopper-moped-server/data

# Directory for the generated graph cache
sudo mkdir -p /srv/graphhopper-moped-server/graph-cache

# Set appropriate permissions if necessary
sudo chown -R $USER:$USER /srv/graphhopper-moped-server
```

The configuration files are managed within this Git repository in the `config/` directory.

## Setup and Configuration

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Place Map Data:**
    Move your `.osm.pbf` file into the host directory created above.
    ```bash
    mv /path/to/your/netherlands-latest.osm.pbf /srv/graphhopper-moped-server/data/
    ```

3.  **Verify Configuration:**
    The `config/config.yml` is pre-configured for this setup. Ensure the `datareader.file` key matches the name of your `.osm.pbf` file.

    ```yaml
    # config/config.yml
    graphhopper:
      # This must match the file in /srv/graphhopper-moped-server/data
      datareader.file: /data/netherlands-latest.osm.pbf
      # ... other settings
    ```

## Running the Server

1.  **Start the Service:**
    From the root of the project directory, run:
    ```bash
    docker-compose up -d
    ```

2.  **Initial Graph Import:**
    On the first run, GraphHopper will build its graph cache from the `.osm.pbf` file. This is a CPU and memory-intensive process that can take a significant amount of time (from minutes to hours, depending on the map size and server hardware). The server will not be available until this process is complete.

    You can monitor the progress by tailing the container logs:
    ```bash
    docker logs -f graphhopper-moped-engine
    ```
    Look for the `start creating graph` message. The server is ready when you see a message indicating it has started and is listening on a port (e.g., `Opened application@...`).

## Usage

Once the server is running, you can send routing requests to the `/route` endpoint on port `8989`. Use the `profile=moped` query parameter to invoke the custom routing profile.

### Example `curl` Request

This example requests a route between Amsterdam and Utrecht using the `moped` profile.

```bash
curl -X GET "http://localhost:8989/route?point=52.3702,4.8952&point=52.0907,5.1214&profile=moped&details=road_class"
```

The server will respond with a GeoJSON object containing the route geometry, distance, time, and other details.

## Project Files

-   `docker-compose.yml`: Defines the `graphhopper` service, volumes for data persistence, and port mappings.
-   `config/config.yml`: The primary configuration file for the GraphHopper instance. It defines data sources, profiles, and server settings.
-   `config/moped-rules.json`: A GraphHopper custom model file. It sets a top speed of 45 km/h, reduces the priority of motorways and trunk roads, and completely blocks PRIMARY roads (N roads) using both zero priority and extreme distance penalties. **Enhanced with comprehensive Dutch traffic sign support** - blocks roads with specific Dutch traffic signs (`NL:C5`, `NL:C2`, `NL:C7`, etc.), supports zone-based speed restrictions, and prefers moped-designated infrastructure (`NL:G12a`, cycleway access).
-   `config.yml`: GraphHopper server configuration that excludes PRIMARY roads (along with motorways and trunk roads) during OSM data import, ensuring these unsuitable roads are never available for moped routing. **Enhanced with additional encoded values** for Dutch traffic signs (`traffic_sign`, `zone_maxspeed`, `cycleway_moped`) alongside existing access restrictions (`moped`, `motor_vehicle`, `vehicle`, `max_speed`).
-   `.gitignore`: Prevents local data and cache directories from being committed to the repository.
