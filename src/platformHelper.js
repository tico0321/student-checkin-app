const { app } = require('electron');
const path = require('path');

class PlatformHelper {
    constructor() {
        this.platform = process.platform;
    }

    getAppDataPath() {
        switch (this.platform) {
            case 'win32':
                return path.join(app.getPath('appData'), app.getName());
            case 'darwin':
                return path.join(app.getPath('userData'), app.getName());
            case 'linux':
                return path.join(app.getPath('userData'), app.getName());
            default:
                throw new Error('不支援的平台');
        }
    }

    getDatabasePath() {
        return path.join(this.getAppDataPath(), 'database.sqlite');
    }

    getLogPath() {
        return path.join(this.getAppDataPath(), 'logs');
    }
}

module.exports = new PlatformHelper();
