const axios = require('axios');
const database = require('./database');
const logger = require('./logger');

class SyncManager {
    constructor() {
        this.apiUrl = 'https://your-api-server.com'; // 替換為實際的 API 服務器地址
    }

    async syncData() {
        try {
            if (!navigator.onLine) {
                logger.info('無網絡連接，同步已取消');
                return;
            }

            const unsyncedRecords = await database.getUnsyncedRecords();

            if (unsyncedRecords.length === 0) {
                logger.info('沒有需要同步的數據');
                return;
            }

            const response = await axios.post(`${this.apiUrl}/sync`, unsyncedRecords);

            if (response.data.success) {
                for (const record of unsyncedRecords) {
                    await database.updateSyncStatus(record.id, 'synced');
                }

                const latestData = await axios.get(`${this.apiUrl}/latest-data`);
                await this.updateLocalDatabase(latestData.data);

                logger.info('數據同步成功完成');
            } else {
                throw new Error('服務器同步失敗');
            }
        } catch (error) {
            logger.error(`數據同步失敗: ${error.message}`);
        }
    }

    async updateLocalDatabase(latestData) {
        for (const remoteRecord of latestData) {
            const localRecord = await database.getRecordById(remoteRecord.id);

            if (!localRecord) {
                await database.insertRecord(remoteRecord);
            } else if (remoteRecord.updatedAt > localRecord.updatedAt) {
                await database.updateRecord(remoteRecord);
            } else if (remoteRecord.updatedAt < localRecord.updatedAt) {
                await database.updateSyncStatus(localRecord.id, 'pending');
            }
            // 如果時間戳相同，不做任何操作
        }
    }
}

module.exports = new SyncManager();
