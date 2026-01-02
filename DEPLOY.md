# Deploying BosDB Browser

BosDB Browser is designed to be deployed as a Docker container. It requires access to the Docker socket to spawn and manage database containers dynamically.

## Quick Start (Production)

1.  **Build and Run**
    Use the deployment compose file to build and start the application.

    ```bash
    docker-compose -f docker-compose.deploy.yml up -d --build
    ```

2.  **Access the Application**
    Open your browser to: `http://localhost:3000`

## How it Works

-   **Docker-outside-of-Docker (DooD):** The application mounts `/var/run/docker.sock`. When you "Provision" a database in the UI, the app tells the host Docker daemon to spin up a new container (e.g., Postgres, Mongo) side-by-side with the app.
-   **Networking:** The app connects to these databases using `host.docker.internal`.
-   **Persistence:**
    -   Application data (users, connections) is stored in the `bosdb-data` volume.
    -   Database data is stored in Docker volumes managed by the host.

## Environment Variables

| Variable | Description | Default |
|Link |---|---|
| `NODE_ENV` | Environment mode | `production` |
| `DB_CONNECTION_HOST` | Hostname to reach provisioned DBs | `host.docker.internal` |
| `ENCRYPTION_MASTER_KEY` | Key for encrypting connection secrets | *(required)* |

## Troubleshooting

-   **"Docker is not running":** Ensure the user running the container has permissions to access `/var/run/docker.sock`.
-   **"Connection refused":** Ensure `host.docker.internal` is resolving correctly. The `docker-compose.deploy.yml` includes `extra_hosts` to handle this on Linux.
