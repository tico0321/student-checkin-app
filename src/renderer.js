// renderer.js
const { ipcRenderer } = require('electron');
const os = require('os');

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        studentIdInput: document.getElementById('student-id'),
        checkInBtn: document.getElementById('check-in-btn'),
        checkOutBtn: document.getElementById('check-out-btn'),
        statusMessage: document.getElementById('status-message'),
        recordList: document.getElementById('record-list'),
        networkStatus: document.createElement('div'),
        loginBtn: document.getElementById('login-btn'),
        registerBtn: document.getElementById('register-btn'),
        showRegister: document.getElementById('show-register'),
        showLogin: document.getElementById('show-login'),
        username: document.getElementById('username'),
        password: document.getElementById('password'),
        regUsername: document.getElementById('reg-username'),
        regPassword: document.getElementById('reg-password'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        app: document.getElementById('app'),
        errorMessage: document.getElementById('error-message')
    };

    elements.networkStatus.id = 'network-status';
    document.body.appendChild(elements.networkStatus);

    let currentPage = 1;
    const pageSize = 20;
    let currentStudentId = '';

    function updateStatusMessage(message, isError = false) {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = isError ? 'error' : 'success';
    }

    function updateNetworkStatus() {
        const onlineStatus = navigator.onLine;
        elements.networkStatus.textContent = onlineStatus ? '在線' : '離線';
        elements.networkStatus.className = onlineStatus ? 'online' : 'offline';
        ipcRenderer.send('network-status-changed', onlineStatus);
    }

    async function performCheckInOut(checkType) {
        const studentId = elements.studentIdInput.value.trim();
        if (!studentId) {
            updateStatusMessage('請輸入學號', true);
            return;
        }
        currentStudentId = studentId;

        try {
            const result = await ipcRenderer.invoke('check-in-out', { studentId, checkType });
            if (result.success) {
                updateStatusMessage(`學生 ${studentId} 成功${checkType === 'in' ? '簽到' : '簽退'}`);
                elements.studentIdInput.value = '';
                await updateRecentRecords();

                if (!navigator.onLine) {
                    updateStatusMessage('操作已保存，將在恢復網絡連接時同步', false);
                }
            } else {
                updateStatusMessage(result.error, true);
            }
        } catch (error) {
            updateStatusMessage('操作失敗，請稍後再試', true);
        }
    }

    async function updateRecentRecords() {
        try {
            const endDate = new Date().toISOString();
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const result = await ipcRenderer.invoke('get-check-records', { startDate, endDate });

            if (result.success) {
                elements.recordList.innerHTML = '';
                result.records.forEach(record => {
                    const li = createRecordElement(record);
                    elements.recordList.appendChild(li);
                });
            } else {
                console.error('獲取記錄失敗:', result.error);
            }
        } catch (error) {
            console.error('更新記錄時發生錯誤:', error);
        }
    }

    async function loadMoreRecords() {
        try {
            const records = await ipcRenderer.invoke('get-student-records-paginated', {
                studentId: currentStudentId,
                page: currentPage,
                pageSize: pageSize
            });

            records.forEach(record => {
                const recordElement = createRecordElement(record);
                document.getElementById('records-container').appendChild(recordElement);
            });

            currentPage++;
        } catch (error) {
            console.error('加載更多記錄時發生錯誤:', error);
        }
    }

    function setupNetworkListeners() {
        window.addEventListener('online', () => {
            ipcRenderer.send('network-status-changed', true);
            updateNetworkStatus();
        });

        window.addEventListener('offline', () => {
            ipcRenderer.send('network-status-changed', false);
            updateNetworkStatus();
        });

        ipcRenderer.send('network-status-changed', navigator.onLine);
    }

    if (os.platform() === 'win32') {
        console.log('Running on Windows');
    } else if (os.platform() === 'darwin') {
        console.log('Running on macOS');
    } else {
        console.log('Running on another platform');
    }

    elements.loginBtn.addEventListener('click', async () => {
        const username = elements.username.value;
        const password = elements.password.value;
        const result = await ipcRenderer.invoke('login-user', { username, password });
        if (result.success) {
            elements.loginForm.style.display = 'none';
            elements.app.style.display = 'block';
        } else {
            showError('登入失敗：' + (result.error || '用戶名或密碼錯誤'));
        }
    });

    elements.registerBtn.addEventListener('click', async () => {
        const username = elements.regUsername.value;
        const password = elements.regPassword.value;
        const result = await ipcRenderer.invoke('register-user', { username, password });
        if (result.success) {
            alert('註冊成功，請登入');
            elements.registerForm.style.display = 'none';
            elements.loginForm.style.display = 'block';
        } else {
            showError('註冊失敗：' + (result.error || '未知錯誤'));
        }
    });

    elements.showRegister.addEventListener('click', () => {
        elements.loginForm.style.display = 'none';
        elements.registerForm.style.display = 'block';
    });

    elements.showLogin.addEventListener('click', () => {
        elements.registerForm.style.display = 'none';
        elements.loginForm.style.display = 'block';
    });

    elements.checkInBtn.addEventListener('click', () => performCheckInOut('in'));
    elements.checkOutBtn.addEventListener('click', () => performCheckInOut('out'));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && document.activeElement === elements.studentIdInput) {
            performCheckInOut('in');
        }
    });

    updateNetworkStatus();
    setupNetworkListeners();
    updateRecentRecords();

    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
            loadMoreRecords();
        }
    });
});

function createRecordElement(record) {
    const li = document.createElement('li');
    li.textContent = `${record.student_id} - ${record.check_type === 'in' ? '簽到' : '簽退'} - ${new Date(record.check_time).toLocaleString()}`;
    return li;
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}
