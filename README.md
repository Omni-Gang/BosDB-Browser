# BosDB - Browser Based Database Management Tool

<div align="center">

![BosDB](https://img.shields.io/badge/BosDB-v0.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

**A modern, web-based database management tool with Git-like version control**

Supporting PostgreSQL, MySQL, MariaDB, MongoDB, and Redis

[Features](#features) • [Quick Start](#quick-start) • [Pro Subscription](#-pro-subscription) • [Enterprise](#-enterprise-deployment) • [Documentation](#documentation)

</div>

---

![Page 1](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/1.png)

![Page 2](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/2.png)

![Page 3](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/3.png)

![Page 4](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/4.png)

![Page 5](https://github.com/Omni-Gang/BosDB-Browser/raw/main/images/5.png)

---

## 🌟 What Makes BosDB Unique?

### **First Database Tool with Built-in Version Control!**

Unlike DBeaver, TablePlus, or any other database tool - BosDB has **Git-like + SVN-like version control** built-in:

- ✅ **Commit** database changes like code
- ✅ **Rollback** to any previous state (r-1, r-2, etc.)
- ✅ **Compare** revisions and see differences
- ✅ **Branches** for different development streams
- ✅ **History** of all changes with full audit trail
- ✅ **Multi-user** tracking - see who changed what

**Perfect for teams, audits, and compliance!**

---

## ✨ Features

### 🗄️ Multi-Database Support
- **PostgreSQL** - Full SQL support with advanced features
- **MySQL** - Popular relational database
- **MariaDB** - MySQL-compatible fork
- **MongoDB** - Document-oriented NoSQL
- **Redis** - In-memory key-value store

### 🔥 Core Features
- ✅ **Query Editor** - Monaco editor with syntax highlighting
- ✅ **Execute Selected** - Run only highlighted SQL
- ✅ **Data Grid Editing** - Inline editing like a spreadsheet
- ✅ **Table Designer** - Visual table creation with columns, types, constraints
- ✅ **Query History** - Automatic tracking of all queries
- ✅ **Schema Explorer** - Browse databases, schemas, and tables
- ✅ **Syntax Validation** - Real-time query validation with helpful warnings
- ✅ **CSV Export** - Export query results to CSV
- ✅ **Dark/Light Mode** - Fully themeable interface
- ✅ **Connection Management** - Secure credential storage

### 🎯 Version Control (Git + SVN-like)
- ✅ **Automatic Change Tracking** - Every query is tracked
- ✅ **Commit System** - Commit changes with messages
- ✅ **SVN-style Revisions** - r0 (current), r-1 (previous), r-2, etc.
- ✅ **Rollback** - Revert to any previous state
- ✅ **Compare Revisions** - See what changed between versions
- ✅ **Branch Management** - Create branches for features
- ✅ **History Timeline** - Visual history of all commits
- ✅ **Pending Changes** - See uncommitted changes
- ✅ **Individual Commits** - Commit specific changes

### 👥 Multi-User System
- ✅ **User Login** - Secure authentication with passwords
- ✅ **Password Security** - bcrypt hashing, strength validation
- ✅ **User Registration** - New users request access
- ✅ **Admin Approval** - Admins approve/reject user requests
- ✅ **Per-User Commits** - Track who made each change
- ✅ **Role-Based Access** - Admin and user roles
- ✅ **Granular Permissions** - Read, Edit, Commit, Manage Schema per connection
- ✅ **Audit Trail** - Complete history of who did what

### 🛡️ Security
- ✅ **Encrypted Credentials** - AES-256 encryption at rest
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **SQL Injection Protection** - Built-in query validation
- ✅ **Query Timeouts** - Prevent long-running queries
- ✅ **Row Limits** - Automatic result set limiting
- ✅ **Permission Enforcement** - Granular access control

---

## 💎 Pro Subscription

BosDB offers a **Free** tier and **Pro** tier with advanced features:

### Free vs Pro Comparison

| Feature | Free | Pro |
|---------|------|-----|
| Database Connections | 2 | **Unlimited** |
| Query History | 50 | **Unlimited** |
| Version Control | ❌ | ✅ |
| Table Designer | ❌ | ✅ |
| Data Grid Editing | Read-only | **Full Edit** |
| Export Formats | CSV | CSV, JSON, SQL |
| Granular Permissions | ❌ | ✅ |
| Priority Support | ❌ | ✅ |

### Pricing

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 forever | Basic features |
| **Pro Trial** | **FREE for 1 month** | All Pro features, no card required |
| **Pro Monthly** | $29/month | All Pro features |
| **Pro Yearly** | $249/year | Save 29% (2 months free!) |

### How to Upgrade

1. Go to `/pricing` in your BosDB instance
2. Click **"Start 1 Month Free Trial"** (no credit card!)
3. Or select Monthly/Yearly and enter payment details
4. **All users** in your instance get Pro features! 🎉

---

## 🏢 Enterprise Deployment

BosDB uses a **self-hosted model** perfect for enterprise:

### Each Company Gets Their Own Instance

```
Company A's Server                 Company B's Server
┌─────────────────────┐           ┌─────────────────────┐
│  BosDB Instance A   │           │  BosDB Instance B   │
├─────────────────────┤           ├─────────────────────┤
│ Subscription: Pro   │           │ Subscription: Free  │
├─────────────────────┤           ├─────────────────────┤
│ Users: Alice, Bob   │           │ Users: Carol, Dan   │
├─────────────────────┤           ├─────────────────────┤
│ Their Databases     │           │ Their Databases     │
└─────────────────────┘           └─────────────────────┘
```

### Benefits

- ✅ **Complete Isolation** - Each company's data stays on their server
- ✅ **System-Wide Subscription** - When a company buys Pro, all employees get Pro
- ✅ **No Shared Infrastructure** - Your database credentials never leave your premises
- ✅ **Compliance Ready** - Perfect for HIPAA, SOC2, GDPR requirements

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker (for test databases)

### Installation

```bash
# Clone repository
git clone https://github.com/Omni-Gang/BosDB-Browser.git
cd BosDB-Browser

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
Open [http://localhost:3001](http://localhost:3001) in your browser.

**First Time Setup:**
1. Visit `/login`
2. Default admin: `admin` / password: `Admin@123`
3. Go to Admin Panel to approve users
4. Go to `/pricing` to activate Pro trial
5. Start using!

---

## 🎯 Version Control System

### How It Works

**1. Automatic Tracking**
```sql
-- Execute any query
INSERT INTO users VALUES (1, 'John');

-- Automatically tracked in "Pending Changes"
```

**2. Commit Changes**
```
1. Go to Version Control page
2. See pending changes
3. Click "Commit All" or commit individually
4. Enter commit message
5. Done! Your change is saved
```

**3. View History**
```
Version Control → History Tab
- See all commits
- SVN-style revisions (r0, r-1, r-2...)
- Who made each change
- When it happened
```

**4. Rollback**
```
1. Click "Rollback to r-2"
2. Confirm
3. New commit created reverting to that state
4. All changes are reversible!
```

---

## 👥 Multi-User System

### Employee Login

**Default Admin:**
- User ID: `admin`
- Password: `Admin@123`

**Creating New Users:**
1. New employee visits `/login`
2. Clicks "Register New User"
3. Fills in details (password must be 8+ chars with uppercase, lowercase, number)
4. Admin approves in Admin Panel (`/admin`)
5. Employee can now login!

### Granular Permissions

Admins can set per-connection permissions for each user:
- **Read Data** - Can view table data
- **Edit Data** - Can INSERT/UPDATE/DELETE
- **Commit Changes** - Can commit to version control
- **Manage Schema** - Can CREATE/ALTER/DROP tables

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

### MySQL / MariaDB
```yaml
Host: localhost
Port: 3306
Database: mydb
Username: root
Password: your_password
```

### MongoDB
```yaml
Host: localhost
Port: 27017
Database: mydb
Username: (optional)
Password: (optional)
```

### Redis
```yaml
Host: localhost
Port: 6379
Password: (optional)
```

---

## 📚 Documentation

- [INSTALLATION.md](INSTALLATION.md) - Detailed installation guide
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Quick deployment steps
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - Production deployment
- [Version Control Guide](packages/version-control/README.md) - VCS documentation

---

## 🏗️ Architecture

```
BosDB/
├── apps/
│   └── web/                    # Next.js frontend
│       ├── src/app/            # Pages & API routes
│       ├── src/components/     # React components
│       ├── src/lib/            # Utilities & auth
│       ├── .bosdb-vcs/         # Version control data
│       ├── .bosdb-users.json   # User data
│       └── .bosdb-subscription.json  # Subscription data
├── packages/
│   ├── core/                   # Core types
│   ├── db-adapters/            # Database adapters
│   ├── version-control/        # VCS engine
│   ├── security/               # Encryption & validation
│   └── utils/                  # Shared utilities
```

---

## 🎯 Roadmap

### ✅ Completed (v0.3.0)
- Multi-database support (5 databases)
- Query editor with syntax highlighting
- Version control system (Git + SVN-like)
- Multi-user authentication with passwords
- User approval workflow
- Granular permissions (per-connection)
- Table Designer
- Data Grid with inline editing
- Pro subscription system
- Enterprise deployment model

### 🚧 In Progress
- Export to JSON/Excel
- Query history panel
- Multiple query tabs

### 📋 Planned
- Auto-complete (tables, columns, keywords)
- ER diagram generator
- Query builder (visual)
- Data import (CSV, JSON)
- Performance monitoring
- SSH tunnel support

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database adapters for PostgreSQL, MySQL, MongoDB, Redis
- Version control inspired by Git and SVN
- Monaco Editor for SQL editing

---

## 📧 Contact

- **GitHub**: [Omni-Gang/BosDB-Browser](https://github.com/Omni-Gang/BosDB-Browser)
- **Issues**: [Report Bug](https://github.com/Omni-Gang/BosDB-Browser/issues)
- **Features**: [Request Feature](https://github.com/Omni-Gang/BosDB-Browser/issues)

---

<div align="center">

**Made with ❤️ by the BosDB Team**

**⭐ Star us on GitHub if you find this useful!**

</div>
