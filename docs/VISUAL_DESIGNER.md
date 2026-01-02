# Visual Table Designer

The Visual Table Designer allows you to create and modify database schemas without writing raw SQL.

## Accessing the Designer
1. Open a Connection.
2. In the sidebar, hover over a Schema.
3. Click the **+** (Plus) icon to create a table, or right-click an existing table and select **Design**.

## Designing a Table
The interface provides a spreadsheet-like view for defining columns:

- **Name**: Column name (e.g., `id`, `email`).
- **Type**: Data type (e.g., `UUID`, `VARCHAR`, `INTEGER`).
- **Length/Precision**: Optional constraints.
- **Nullable**: Check if the column can be empty.
- **Primary Key**: Mark unique identifiers.
- **Unique**: Enforce unique values.
- **Foreign Key**: Link to other tables.

## AI Assistant
Click the **"Magic Wand"** icon to use the AI Assistant:
> "Create a users table with email, password hash, and active status."

The AI will generate the appropriate column definitions automatically.

## Importing Data
1. Click **Import** in the designer toolbar.
2. Upload a **CSV** or **JSON** file.
3. Map file columns to database columns.
4. Preview data and click **Import**.

## Applying Changes
BosDB uses a "Pending Changes" system:
1. Make your edits in the designer.
2. Click **Review Changes**.
3. See the generated SQL (DDL).
4. Click **Apply** to execute schema changes.
