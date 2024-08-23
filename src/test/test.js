const assert = require('assert');
const { app } = require('electron');
const Database = require('../database');
const Auth = require('../auth');
const Encryption = require('../encryption');

describe('學生簽到/簽退系統測試', function() {
    before(async function() {
        await app.whenReady();
    });

    describe('用戶認證', function() {
        it('應該能夠註冊新用戶', async function() {
            const result = await Auth.registerUser('testuser', 'password123');
            assert.strictEqual(result, true);
        });

        it('應該能夠登入已註冊的用戶', async function() {
            const result = await Auth.loginUser('testuser', 'password123');
            assert.strictEqual(result, true);
        });

        it('應該拒絕錯誤的密碼', async function() {
            const result = await Auth.loginUser('testuser', 'wrongpassword');
            assert.strictEqual(result, false);
        });
    });

    describe('數據加密', function() {
        it('應該能夠加密和解密數據', function() {
            const originalText = '測試文本';
            const encrypted = Encryption.encrypt(originalText);
            const decrypted = Encryption.decrypt(encrypted);
            assert.strictEqual(decrypted, originalText);
        });
    });

    describe('數據庫操作', function() {
        it('應該能夠添加和檢索學生記錄', async function() {
            await Database.addStudent('S001', '張三', '班級A');
            const student = await Database.getStudent('S001');
            assert.strictEqual(student.name, '張三');
            assert.strictEqual(student.class, '班級A');
        });

        it('應該能夠記錄簽到', async function() {
            await Database.recordCheckIn('S001');
            const records = await Database.getStudentRecords('S001');
            assert.strictEqual(records.length, 1);
            assert.strictEqual(records.check_type, 'in');
        });
    });

    // 可以添加更多測試...
});
