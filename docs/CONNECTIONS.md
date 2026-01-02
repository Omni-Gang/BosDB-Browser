# Managing Connections

BosDB supports connecting to over 30 different database types through its universal adapter system.

## Creating a New Connection
1. Navigate to the **Dashboard**.
2. Click the **"New Connection"** card.
3. Select your **Database Type** (e.g., PostgreSQL, MySQL, MongoDB).
4. Enter the connection details:
   - **Name**: A friendly alias for this connection.
   - **Host**: Server address (e.g., `localhost` or `db.example.com`).
   - **Port**: Database port (defaults will be suggested).
   - **Database**: Name of the database to connect to.
   - **Username & Password**: Your credentials.
5. (Optional) Configure **SSL/TLS** settings for secure cloud connections.
6. Click **Test Connection** to verify.
7. Click **Save** to persist the encrypted connection.

## Editing Connections
- Click the **Settings (⚙️)** icon on any connection card.
- Update credentials or host details.
- **Note**: For security, existing passwords are never shown. Enter a new password only if you wish to change it.

## Enterprise Isolation
If you are part of an Organization:
- Connections you create are **Private** to you by default.
- Admins can create **Shared Connections** visible to the entire team.
- All stored credentials are encrypted using the organization's master key.

## Troubleshooting
- **Connection Refused**: Check if your database allows remote connections and that your IP is whitelisted.
- **Docker/Localhost**: On Mac/Windows, use `host.docker.internal` instead of `localhost` if BosDB is running in Docker.
