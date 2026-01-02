# Pro Query Editor

BosDB features a VSCode-style SQL editor (Monaco) optimized for productivity.

## Key Features

### 1. Intelligent Autocomplete
- Context-aware suggestions for tables, columns, and views.
- Supports aliases (e.g., `SELECT u.name FROM users u` -> suggests columns for `u`).

### 2. Multi-Tab Results
- Execute multiple queries separated by semicolons (`;`).
- Results appear in separate tabs at the bottom.
- Perfect for comparing datasets or debugging data flows.

### 3. Query History
- Sidebar tracks every execution with timestamp and duration.
- **Green/Red** indicators for success/fail.
- Click any history item to re-load the query into the editor.

### 4. Saved Queries
- Save frequently used complex queries.
- Share queries with your team (Enterprise).
- Organize by name and description.

## Keyboard Shortcuts
| Windows/Linux | macOS | Action |
|---------------|-------|--------|
| `Ctrl + Enter` | `Cmd + Enter` | Execute Statement under cursor |
| `Ctrl + Shift + Enter` | `Cmd + Shift + Enter` | Execute All Queries |
| `Ctrl + Shift + F` | `Cmd + Shift + F` | Format SQL |
| `Ctrl + S` | `Cmd + S` | Save Query |
| `Ctrl + /` | `Cmd + /` | Toggle Comment |
| `F1` | `F1` | Command Palette |

## Data Grid
The result result is fully interactive:
- **Sort**: Click column headers.
- **Filter**: Use the filter row.
- **Edit**: Double-click any cell to edit data (updates generated automatically).
- **Export**: Download as CSV, JSON, or SQL INSERTs.
