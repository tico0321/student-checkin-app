// networkManager.js
const { ipcMain } = require('electron');
const syncManager = require('./syncManager'); // 假設 syncManager 已實現數據同步邏輯
const logger = require('./logger'); // 假設 logger 已實現日誌記錄功能

class NetworkManager {
    constructor() {
        // 確保 navigator 存在於當前環境中以避免錯誤
        this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
        this.setupListeners();
    }

    setupListeners() {
        // 使用 Electron 的 ipcMain 來監聽網絡狀態改變的事件
        ipcMain.on('network-status-changed', (event, isOnline) => {
            this.handleNetworkChange(isOnline);
        });

        // 如果在瀏覽器環境中運行，則監聽在線和離線事件
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.handleNetworkChange(true));
            window.addEventListener('offline', () => this.handleNetworkChange(false));
        }
    }

    handleNetworkChange(isOnline) {
        this.isOnline = isOnline;
        if (isOnline) {
            logger.info('網絡連接恢復，開始同步數據');
            syncManager.syncData();
        } else {
            logger.info('網絡連接斷開，切換到離線模式');
        }
    }
}

module.exports = new NetworkManager();
