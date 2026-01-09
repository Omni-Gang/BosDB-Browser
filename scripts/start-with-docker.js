const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting BosDB in Railway Direct Mode (Docker Bypassed)...\n');

function startDevServer() {
    const projectRoot = path.join(__dirname, '..');
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    console.log('🚀 Starting development server with turbo...\n');

    const devProcess = spawn(npm, ['run', 'dev'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
    });

    devProcess.on('error', (error) => {
        console.error('❌ Failed to start dev server:', error);
        process.exit(1);
    });

    process.on('SIGINT', () => {
        devProcess.kill('SIGINT');
        process.exit(0);
    });
}

startDevServer();
