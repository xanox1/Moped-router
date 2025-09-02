# GraphHopper Moped Routing Server

This project provides a Dockerized configuration for a GraphHopper routing engine customized for mopeds. It uses a custom routing profile to adjust speeds and road priorities based on a set of rules defined in `moped-rules.json`.

## Prerequisites

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
-   `config/moped-rules.json`: A GraphHopper custom model file. It sets a top speed of 45 km/h and reduces the priority of motorways and trunk roads, discouraging their use in routing.
-   `.gitignore`: Prevents local data and cache directories from being committed to the repository.
