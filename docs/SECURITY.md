# Security & Enterprise

## Data Security

### Encryption
- **At Rest**: All database credentials stored in BosDB are AES-256-GCM encrypted using the `ENCRYPTION_MASTER_KEY` defined on the server.
- **In Transit**: All traffic between browser and server, and server to database, supports TLS/SSL.

### User Data
- BosDB is a **Privacy-First** tool. We do not track your queries or data content.
- Telemetry is limited to error reporting and crash dumps (opt-out available).

## Enterprise Features

### Role-Based Access Control (RBAC)
When you enable "Enterprise Mode" (Organization setup):
- **Admins**: Full control. Can manage billing, users, and global connections.
- **Members**: Can access shared connections and save private queries.
- **Viewers**: Can only run read-only (`SELECT`) queries.

### Team Visibility
- **Team Sidebar**: See who is online/active in the project.
- **Shared Cabinet**: Admin-curated list of "Golden Queries" available to everyone.

### Single Sign-On (SSO)
(Coming Soon)
- Support for SAML and OIDC providers (Okta, Google Workspace, Azure AD).
