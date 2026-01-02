# Vercel Deployment Guide

To deploy BosDB to Vercel, follow these steps:

## 1. Environment Variables
Vercel requires the following Environment Variables to be set in the Project Settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Public Key | `pk_test_...` |
| `STRIPE_SECRET_KEY` | Stripe Secret Key | `sk_test_...` |
| `ENCRYPTION_MASTER_KEY` | 32-byte hex key for credential encryption | `001122...` |
| `MONGODB_URI` | (Optional) If using MongoDB for user management | `mongodb+srv://...` |

## 2. Generate Encryption Key
Run this locally to generate a secure key:
```bash
openssl rand -hex 32
```
Copy the output and paste it as the value for `ENCRYPTION_MASTER_KEY`.

## 3. Project Settings
- **Framework Preset**: Next.js
- **Root Directory**: `apps/web` (Recommended) OR leave as Root if using Monorepo support.
  - *Note:* If you deploy from Root, Vercel typically detects Turbo/Monorepos automatically.
- **Build Command**: `cd ../.. && npx turbo run build --filter=web` (If Root Directory is `apps/web`) OR `npx turbo run build --filter=web` (If Root Directory is Root).

## 4. Updates
We have optimized the configuration (`turbo.json`, `next.config.js`) to ensure smooth deployments.
Simply push your changes to your git branch connected to Vercel.

## 5. Deploying a NEW Instance (Fresh Deploy)
To deploy this as a completely separate app (not overwriting the old one):

1.  Go to **Vercel Dashboard**.
2.  Click **"Add New..."** -> **"Project"**.
3.  Select the `BosDB-Browser` repository.
4.  **Important**: In the "Import Git Repository" screen, you can change the **Project Name** (e.g., `bosdb-v2` or `bosdb-arush`) to distinguish it from the old one.
5.  Select the **`arush`** branch to deploy (if asked, or configure it in settings later).
6.  Enter the **Environment Variables** from Step 1.
7.  Click **Deploy**.

This will create a fresh URL (e.g., `bosdb-v2.vercel.app`) separate from your previous deployment.
