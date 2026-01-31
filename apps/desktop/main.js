const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { fork } = require('child_process');
const net = require('net');

let serverProcess = null;
let mainWindow = null;

// Handle window controls
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) mainWindow.maximize();
});

ipcMain.on('window-unmaximize', () => {
    if (mainWindow) mainWindow.unmaximize();
});

ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
});

function findFreePort(startPort = 3000) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            resolve(findFreePort(startPort + 1));
        });
    });
}

function startNextServer(port) {
    if (isDev) return Promise.resolve('http://localhost:3000');

    return new Promise((resolve, reject) => {
        const baseDir = isDev ? __dirname : process.resourcesPath;
        const serverPath = path.join(baseDir, 'web-standalone/apps/web/server.js');
        const cwd = path.join(baseDir, 'web-standalone/apps/web');

        serverProcess = fork(serverPath, [], {
            env: {
                ...process.env,
                PORT: port,
                NODE_ENV: 'production',
                HOSTNAME: 'localhost'
            },
            cwd: cwd,
            stdio: ['inherit', 'pipe', 'pipe', 'ipc']
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(`[Next.js Server]: ${data}`);
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[Next.js Server Error]: ${data}`);
        });

        serverProcess.on('error', (err) => {
            console.error('Failed to start Next.js server:', err);
            reject(err);
        });

        serverProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Next.js server exited with code ${code}`);
                reject(new Error(`Server exited with code ${code}`));
            }
        });

        // Give it a moment to start and verify it's listening
        const checkServer = () => {
            const client = net.createConnection({ port }, 'localhost', () => {
                client.end();
                resolve(`http://localhost:${port}`);
            });
            client.on('error', () => {
                setTimeout(checkServer, 500);
            });
        };

        setTimeout(checkServer, 1000);

        // Timeout after 10 seconds if it doesn't start
        setTimeout(() => {
            reject(new Error('Next.js server failed to start within 10 seconds'));
        }, 10000);
    });
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        await shell.openExternal('https://github.com/ayushgupta9906/BosDB-Browser');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

async function createWindow() {
    let url = 'http://localhost:3000';
    if (!isDev) {
        const port = await findFreePort(3001);
        url = await startNextServer(port);
    }

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: "BosDB Browser",
        icon: path.join(__dirname, 'assets/icon.png'),
        frame: false,
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        backgroundColor: '#00000000',
        transparent: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadURL(url);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http') && !url.includes('localhost')) {
            shell.openExternal(url).catch(console.error);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    createMenu();
    try {
        await createWindow();
    } catch (error) {
        console.error('Failed to create window:', error);
        // Show a basic error window or just quit
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow().catch(console.error);
        }
    });
});

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
