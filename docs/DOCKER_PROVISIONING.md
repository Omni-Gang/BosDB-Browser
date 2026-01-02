# Docker Provisioning

BosDB allows you to spin up database instances instantly using Docker containers.

## Prerequisites
- **Docker Engine** must be installed and running on the host machine.
- BosDB must have access to the Docker socket (default setup works for local dev).

## Provisioning a Database
1. Go to **Dashboard** -> **New Connection**.
2. Select the **"Docker Provision"** tab.
3. Choose a database engine:
   - PostgreSQL (Latest, 15, 14, 13)
   - MySQL (Latest, 8.0, 5.7)
   - MongoDB
   - Redis
4. Click **Start Instance**.

BosDB will:
1. Pull the Docker image (if missing).
2. Create a volume for persistent data.
3. Start the container with auto-generated secure credentials.
4. Automatically create a Connection entry for you.

## Managing Instances
- View CPU/Memory usage of running containers.
- **Stop**: Pause the container.
- **Restart**: Reboot the database.
- **Delete**: Remove the container and connection (Volume can be preserved).
