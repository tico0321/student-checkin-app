const database = require('./database');
const { ipcMain } = require('electron');
const logger = require('./logger');

function setupCheckInOutHandlers() {
    ipcMain.handle('check-in-out', async (event, { studentId, checkType }) => {
        try {
            const student = await database.getStudent(studentId);
            if (!student) {
                throw new Error('學生不存在');
            }

            const recordId = await database.addCheckRecord(studentId, checkType);
            logger.info(`學生 ${studentId} 成功${checkType === 'in' ? '簽到' : '簽退'}`);
            return { success: true, recordId };
        } catch (error) {
            logger.error(`簽到/簽退錯誤: ${error.message}`);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-check-records', async (event, { studentId, startDate, endDate }) => {
        try {
            const records = await database.getCheckRecords(studentId, startDate, endDate);
            logger.info(`成功獲取學生 ${studentId} 的簽到/簽退記錄`);
            return { success: true, records };
        } catch (error) {
            logger.error(`獲取簽到/簽退記錄錯誤: ${error.message}`);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { setupCheckInOutHandlers };

// 在 Database 類中添加以下方法

class Database {
    // 假設您已經有一個構造函數和其他方法

    getUnsyncedRecords() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM check_records WHERE sync_status = 'pending'`;
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    updateSyncStatus(recordId, status) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE check_records SET sync_status = ? WHERE id = ?`;
            this.db.run(sql, [status, recordId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
}

module.exports = Database;
