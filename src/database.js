// database.js
const sqlite3 = require('sqlite3').verbose();
const platformHelper = require('./platformHelper');
const encryption = require('./encryption'); // 引入加密模組

class Database {
    constructor() {
        const dbPath = platformHelper.getDatabasePath();
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('無法連接到數據庫', err);
            } else {
                console.log('成功連接到數據庫');
                this.initTables();
            }
        });
    }

    initTables() {
        const studentTable = `
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                class TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const checkRecordsTable = `
            CREATE TABLE IF NOT EXISTS check_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                check_type TEXT NOT NULL,
                check_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                FOREIGN KEY (student_id) REFERENCES students(student_id)
            )
        `;

        const usersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT
            )
        `;

        this.db.run(studentTable, (err) => {
            if (err) {
                console.error('創建學生表失敗', err);
            } else {
                console.log('學生表創建成功或已存在');
            }
        });

        this.db.run(checkRecordsTable, (err) => {
            if (err) {
                console.error('創建簽到記錄表失敗', err);
            } else {
                console.log('簽到記錄表創建成功或已存在');
            }
        });

        this.db.run(usersTable, (err) => {
            if (err) {
                console.error('創建用戶表失敗', err);
            } else {
                console.log('用戶表創建成功或已存在');
            }
        });

        // 添加索引
        this.db.run("CREATE INDEX IF NOT EXISTS idx_student_id ON check_records (student_id)");
        this.db.run("CREATE INDEX IF NOT EXISTS idx_check_time ON check_records (check_time)");
    }

    // 添加學生，並加密姓名
    addStudent(studentId, name, className) {
        return new Promise((resolve, reject) => {
            const encryptedName = encryption.encrypt(name);
            const sql = `INSERT INTO students (student_id, name, class) VALUES (?, ?, ?)`;
            this.db.run(sql, [studentId, JSON.stringify(encryptedName), className], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 獲取學生信息，並解密姓名
    getStudent(studentId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM students WHERE student_id = ?`;
            this.db.get(sql, [studentId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    row.name = encryption.decrypt(JSON.parse(row.name));
                    resolve(row);
                } else {
                    resolve(null);
                }
            });
        });
    }

    // 記錄簽到/簽退
    addCheckRecord(studentId, checkType) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO check_records (student_id, check_type) VALUES (?, ?)`;
            this.db.run(sql, [studentId, checkType], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 獲取學生的簽到/簽退記錄
    getCheckRecords(studentId, startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM check_records 
                WHERE student_id = ? AND check_time BETWEEN ? AND ?
                ORDER BY check_time DESC
            `;
            this.db.all(sql, [studentId, startDate, endDate], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 根據ID獲取記錄
    getRecordById(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM check_records WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // 插入記錄
    insertRecord(record) {
        return new Promise((resolve, reject) => {
            const { student_id, check_type, check_time, sync_status } = record;
            this.db.run('INSERT INTO check_records (student_id, check_type, check_time, sync_status) VALUES (?, ?, ?, ?)',
                [student_id, check_type, check_time, sync_status],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    // 更新記錄
    updateRecord(record) {
        return new Promise((resolve, reject) => {
            const { id, student_id, check_type, check_time, sync_status } = record;
            this.db.run('UPDATE check_records SET student_id = ?, check_type = ?, check_time = ?, sync_status = ? WHERE id = ?',
                [student_id, check_type, check_time, sync_status, id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // 添加用戶
    addUser(username, hashedPassword) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
            this.db.run(sql, [username, hashedPassword], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 獲取用戶信息
    getUser(username) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE username = ?`;
            this.db.get(sql, [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 獲取學生的簽到/簽退記錄（分頁）
    getStudentRecordsPaginated(studentId, page, pageSize) {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * pageSize;
            const sql = `SELECT * FROM check_records WHERE student_id = ? ORDER BY check_time DESC LIMIT ? OFFSET ?`;
            this.db.all(sql, [studentId, pageSize, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

module.exports = new Database();
