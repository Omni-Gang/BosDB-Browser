# BosDB - Browser based Database Management Tool

<div align="center">

![BosDB](https://img.shields.io/badge/BosDB-v0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

**A modern, web-based database management tool supporting PostgreSQL, MySQL, MariaDB, MongoDB, and Redis**

[Features](#features) • [Quick Start](#quick-start) • [Supported Databases](#supported-databases) • [Documentation](#documentation)

</div>

---
![Page 1](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/1.png)


![Page 2](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/2.png)


![Page 3](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/3.png)


![Page 4](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/4.png)


![Page 5](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/5.png)


## ✨ Features

### 🗄️ Multi-Database Support
- **PostgreSQL** - Full SQL support with advanced features
- **MySQL** - Popular relational database
- **MariaDB** - MySQL-compatible fork
- **MongoDB** - Document-oriented NoSQL
- **Redis** - In-memory key-value store

### 🔥 Core Features
- ✅ **Query Editor** - Monaco editor with syntax highlighting
- ✅ **Query History** - Automatic tracking of all queries
- ✅ **Saved Queries** - Save and organize frequently used queries
- ✅ **Schema Explorer** - Browse databases, schemas, and tables
- ✅ **Syntax Validation** - Real-time query validation with helpful warnings
- ✅ **CSV Export** - Export query results to CSV
- ✅ **Dark/Light Mode** - Fully themeable interface
- ✅ **Connection Management** - Secure credential storage

### 🛡️ Security
- ✅ **Encrypted Credentials** - AES-256 encryption at rest
- ✅ **SQL Injection Protection** - Built-in query validation
- ✅ **Query Timeouts** - Prevent long-running queries
- ✅ **Row Limits** - Automatic result set limiting

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker (for test databases)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd BosDB

# Install dependencies
npm install

# Set up environment
cd apps/web
cp .env.example .env
# Add ENCRYPTION_MASTER_KEY=your-secret-key-here

# Start dev server
cd ../..
npm run dev
```

### Access Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supported Databases

### PostgreSQL
```yaml
Host: localhost
Port: 5432
Database: postgres
Username: postgres
Password: your_password
```

**Query Example:**
```sql
SELECT * FROM users WHERE active = true LIMIT 10;
```

### MySQL / MariaDB
```yaml
Host: localhost
Port: 3306
Database: testdb
Username: root
Password: your_password
```

**Query Example:**
```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2)
);
```

### MongoDB
```yaml
Host: localhost
Port: 27017
Database: testdb
Username: root
Password: your_password
```

**Query Example (JSON format):**
```json
{
  "find": "users",
  "filter": {"age": {"$gt": 18}},
  "limit": 10
}
```

### Redis
```yaml
Host: localhost
Port: 6379
Database: 0
Password: (optional)
```

**Query Example (JSON format):**
```json
{
  "command": "KEYS",
  "args": ["*"]
}
```

---

## 🐳 Docker Setup

Start test databases:

```bash
# Start all databases
docker-compose up -d

# Start specific database
docker-compose up -d postgres
docker-compose up -d mysql
docker-compose up -d mongodb
```

---

## 📁 Project Structure

```
BosDB/
├── apps/
│   └── web/              # Next.js frontend
│       ├── src/
│       │   ├── app/      # Pages and API routes
│       │   └── lib/      # Utilities and stores
│       └── .env          # Environment variables
├── packages/
│   ├── core/             # Core types and interfaces
│   ├── db-adapters/      # Database adapters
│   │   └── src/
│   │       └── adapters/ # PostgreSQL, MySQL, MongoDB, Redis
│   ├── security/         # Encryption and SQL guard
│   └── utils/            # Logging and utilities
└── docker-compose.yml    # Test database setup
```

---

## 🎯 Usage

### 1. Create Connection
- Click **"New Connection"** on dashboard
- Select database type
- Enter credentials
- Click **"Create Connection"**

### 2. Run Queries
- Select a connection
- Open query editor
- Write your query
- Click **"Run Query"** (or Ctrl+Enter)

### 3. Explore Schema
- Use left sidebar to browse
- Expand schemas to see tables
- Click table to view structure

### 4. Save Queries
- Click **"Saved Queries"** from dashboard
- Click **"+ New Query"**
- Enter name, description, and query
- Click **"Save Query"**

### 5. View History
- Click **"Query History"** from dashboard
- See all executed queries
- Click **"Rerun"** to execute again

---

## ⚙️ Configuration

### Environment Variables

Create `apps/web/.env`:

```env
# Required - Encryption key for credentials
ENCRYPTION_MASTER_KEY=your-32-character-secret-key

# Optional
NODE_ENV=development
```

### Database Connection Files

BosDB stores connections and queries in:
- `.bosdb-connections.json` - Encrypted connection details
- `.bosdb-query-history.json` - Query execution history
- `.bosdb-saved-queries.json` - User-saved queries

**⚠️ These files are gitignored and should not be committed!**

---

## 🛠️ Development

### Build Project

```bash
# Build all packages
npm run build

# Build specific package
cd packages/db-adapters
npm run build
```

### Run Tests

```bash
npm test
```

### Type Checking

```bash
npm run type-check
```

---

## 📚 Documentation

- **Quick Start Guide** - Available at `/docs` in the application
- **Query Reference** - SQL and JSON query examples
- **Settings** - Theme, connections, and preferences at `/settings`

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [PostgreSQL](https://www.postgresql.org/) - pg driver
- [MySQL](https://www.mysql.com/) - mysql2 driver
- [MongoDB](https://www.mongodb.com/) - mongodb driver
- [Redis](https://redis.io/) - ioredis driver

---

<div align="center">

**Made with ❤️ OmniGanG*

[Report Bug](https://github.com/your-repo/issues) • [Request Feature](https://github.com/your-repo/issues)

</div>
