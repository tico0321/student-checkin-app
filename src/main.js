// main.js
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { setupCheckInOutHandlers } = require('./checkInOut');
const NetworkManager = require('./networkManager');
const syncManager = require('./syncManager');
const Auth = require('./auth'); // 新增的 Auth 模組
const os = require('os'); // 引入 os 模組

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'renderer.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, 'index.html'));

    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: '檔案',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        {
            label: '編輯',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: '視圖',
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
            label: '幫助',
            submenu: [
                {
                    label: '關於',
                    click: async () => {
                        const { shell } = require('electron');
                        await shell.openExternal('https://your-website.com');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function setupAuthHandlers() {
    ipcMain.handle('register-user', async (event, { username, password }) => {
        try {
            await Auth.registerUser(username, password);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('login-user', async (event, { username, password }) => {
        try {
            const isLoggedIn = await Auth.loginUser(username, password);
            return { success: isLoggedIn };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

app.whenReady().then(() => {
    createWindow();
    setupCheckInOutHandlers();
    setupAuthHandlers();
    NetworkManager.initialize(); // 初始化 NetworkManager

    // 設置定時同步
    setInterval(() => {
        if (navigator.onLine) {
            syncManager.syncData();
        }
    }, 30 * 60 * 1000); // 每30分鐘同步一次

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'myDatabase.db');
    console.log(`Database path: ${dbPath}`);

    // 檢測作業系統平台
    if (os.platform() === 'win32') {
        console.log('Running on Windows');
    } else if (os.platform() === 'darwin') {
        console.log('Running on macOS');
    } else {
        console.log('Running on another platform');
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

const filePath = path.join(__dirname, 'folder', 'file.txt');
