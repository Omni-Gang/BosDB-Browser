# 🚀 Auto-Start Docker with BosDB

This setup automatically starts Docker Desktop when you run `npm run dev`.

## How It Works

When you run `npm run dev`, the startup script will:

1. ✅ **Check if Docker is running**
2. 🐳 **Auto-start Docker Desktop** if it's not running
3. ⏳ **Wait for Docker to be ready** (up to 60 seconds)
4. 🚀 **Start the development server**

## Usage

Simply run:

```bash
npm run dev
```

The script will handle Docker automatically!

## Alternative Commands

If you want to skip the Docker check and start immediately:

```bash
npm run dev:only
```

## What You'll See

```bash
🚀 Starting BosDB with Docker...

✅ Docker is already running!

🚀 Starting development server...

   ▲ Next.js 15.5.9
   - Local:        http://localhost:3000
```

Or if Docker isn't running:

```bash
🚀 Starting BosDB with Docker...

⚠️  Docker is not running. Attempting to start...

🐳 Starting Docker Desktop...
⏳ Waiting for Docker to be ready.......✅

🚀 Starting development server...
```

## Manual Docker Start

If the auto-start doesn't work, you can:

1. Manually open **Docker Desktop**
2. Wait for it to start (whale icon in system tray)
3. Run `npm run dev` again

## Platform Support

- ✅ **Windows**: Auto-starts Docker Desktop from Program Files
- ✅ **macOS**: Uses `open -a Docker`
- ⚠️ **Linux**: Shows instructions to start Docker service

Enjoy! 🎉
