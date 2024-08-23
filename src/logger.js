const fs = require('fs');
const path = require('path');
const platformHelper = require('./platformHelper');

class Logger {
    constructor() {
        this.logDir = platformHelper.getLogPath();
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type}] ${message}\n`;

        const logFile = path.join(this.logDir, `${timestamp.split('T')[0]}.log`);

        fs.appendFile(logFile, logMessage, (err) => {
            if (err) {
                console.error('寫入日誌失敗:', err);
            }
        });

        console.log(logMessage);
    }

    error(message) {
        this.log(message, 'ERROR');
    }

    info(message) {
        this.log(message, 'INFO');
    }
}

module.exports = new Logger();
