#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const path = require('path');
const os = require('os');

// MongoDB connection string (same as in db.ts)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bosdb:vY0xUQxLuOzNzHv3@bosdb.mvxsw5l.mongodb.net/bosdb?appName=BosDB';

console.log('🚀 Starting BosDB with Docker...\n');

/**
 * Check if Docker is running
 */
async function isDockerRunning() {
    return new Promise((resolve) => {
        exec('docker ps', (error) => {
            resolve(!error);
        });
    });
}

/**
 * Start Docker Desktop on Windows
 */
async function startDockerDesktop() {
    return new Promise((resolve, reject) => {
        const platform = os.platform();

        if (platform === 'win32') {
            // Common Docker Desktop paths on Windows
            const possiblePaths = [
                'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
                path.join(process.env.ProgramFiles, 'Docker\\Docker\\Docker Desktop.exe'),
                path.join(process.env['ProgramFiles(x86)'], 'Docker\\Docker\\Docker Desktop.exe'),
            ];

            let dockerPath = null;
            for (const p of possiblePaths) {
                try {
                    const fs = require('fs');
                    if (fs.existsSync(p)) {
                        dockerPath = p;
                        break;
                    }
                } catch (e) {
                    // Continue checking
                }
            }

            if (!dockerPath) {
                console.log('⚠️  Could not find Docker Desktop. Please start it manually.');
                console.log('   Common location: C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\n');
                reject(new Error('Docker Desktop not found'));
                return;
            }

            console.log('🐳 Starting Docker Desktop...');
            exec(`"${dockerPath}"`, (error) => {
                if (error && !error.message.includes('already running')) {
                    console.log('   Note: Docker Desktop may already be starting up');
                }
                resolve();
            });
        } else if (platform === 'darwin') {
            // macOS
            exec('open -a Docker', (error) => {
                if (error) {
                    console.log('⚠️  Could not start Docker Desktop. Please start it manually.\n');
                    reject(error);
                } else {
                    console.log('🐳 Starting Docker Desktop...');
                    resolve();
                }
            });
        } else {
            // Linux - usually runs as a service
            console.log('⚠️  On Linux, Docker usually runs as a service.');
            console.log('   Try: sudo systemctl start docker\n');
            reject(new Error('Platform not supported for auto-start'));
        }
    });
}

/**
 * Wait for Docker to be ready
 */
async function waitForDocker(maxWaitSeconds = 60) {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    process.stdout.write('⏳ Waiting for Docker to be ready');

    while (Date.now() - startTime < maxWaitMs) {
        if (await isDockerRunning()) {
            console.log(' ✅\n');
            return true;
        }
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(' ❌\n');
    return false;
}

/**
 * Start the development server
 */
function startDevServer() {
    console.log('🚀 Starting development server...\n');

    const projectRoot = path.join(__dirname, '..');
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    // Call the workspace dev command directly to avoid infinite loop
    const devProcess = spawn(npm, ['run', 'dev', '--workspace=apps/web'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            NEXT_SKIP_LOCKFILE_PATCHING: '1'
        }
    });

    devProcess.on('error', (error) => {
        console.error('❌ Failed to start dev server:', error);
        process.exit(1);
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down...');
        devProcess.kill('SIGINT');
        process.exit(0);
    });
}

/**
 * Check MongoDB connection
 */
async function checkMongoDB() {
    return new Promise((resolve) => {
        const mongoose = require('mongoose');

        console.log('🔌 Connecting to MongoDB Atlas...');

        mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4,
        })
            .then(() => {
                console.log('✅ MongoDB Atlas connected!\n');
                mongoose.disconnect(); // Disconnect after test (Next.js will reconnect)
                resolve(true);
            })
            .catch((err) => {
                console.log('⚠️  MongoDB connection failed:', err.message);
                console.log('   App will still start, but database features may not work.\n');
                resolve(false);
            });
    });
}

/**
 * Main execution
 */
async function main() {
    try {
        // Check if Docker is already running
        const dockerRunning = await isDockerRunning();

        if (dockerRunning) {
            console.log('✅ Docker is already running!\n');
        } else {
            console.log('ℹ️  Docker is not running - This is OK if using Railway PostgreSQL!\n');
            console.log('   (Skipping Docker checks...)\n');
            // Don't try to start Docker - just continue
        }

        // Check MongoDB connection
        await checkMongoDB();

        // Start the dev server
        startDevServer();

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();
