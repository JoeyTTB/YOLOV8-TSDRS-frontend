document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const searchBtn = document.getElementById('searchBtn');
    const resetBtn = document.getElementById('resetBtn');
    const selectAllCheckbox = document.getElementById('selectAll');
    const headerCheckbox = document.getElementById('headerCheckbox');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const historyTableBody = document.getElementById('historyTableBody');
    const deleteBtn = document.getElementById('delete-btn');
    const downloadBtn = document.getElementById('download-btn');

    // 检查登录状态
    checkLoginStatus();
    //显示用户头像
    getUserAvatar();

    //获取用户头像
    async function getUserAvatar() {
        const avatar = localStorage.getItem('avatar');
        const avatarHTML = document.getElementById('page-avatar');
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        if(!avatar) {
            try {
                const response = await fetch('http://localhost:8082/account/avatar/' + username, {
                    method: 'GET',
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                if (data.code != 1) {
                    throw new Error();
                }
                localStorage.setItem('avatar', data.data);
                avatarHTML.src = data.data;
            } catch (error) {}
        } else {
            avatarHTML.src = avatar;
        }
    }

    // 初始化
    loadHistory();
    initializeEventListeners();

    // 更新时间显示
    updateTime();
    setInterval(updateTime, 1000);

    // 初始化事件监听器
    function initializeEventListeners() {
        // 搜索按钮点击事件
        searchBtn.addEventListener('click', handleSearch);

        // 重置按钮点击事件
        resetBtn.addEventListener('click', handleReset);

        // 全选复选框事件
        selectAllCheckbox.addEventListener('change', handleSelectAll);
        headerCheckbox.addEventListener('change', handleSelectAll);

        //单个删除按钮事件
        //deleteBtn.addEventListener('click', handleDelete())

        // 批量删除按钮事件
        batchDeleteBtn.addEventListener('click', handleBatchDelete);

        // 登出按钮事件
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }

    // 检查登录状态
    function checkLoginStatus() {
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        if (!username || !token) {
            window.location.replace('login.html');
            return;
        }
        document.getElementById('username').textContent = username;
    }

    // 更新时间显示
    function updateTime() {
        const currentTimeSpan = document.getElementById('currentTime');
        if (currentTimeSpan) {
            currentTimeSpan.textContent = new Date().toLocaleString('zh-CN');
        }
    }

    // 处理搜索
    async function handleSearch() {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        if (!startTime || !endTime) {
            alert('请选择开始时间和结束时间');
            return;
        }

        if (new Date(startTime) > new Date(endTime)) {
            alert('开始时间不能大于结束时间');
            return;
        }

        await loadHistory(startTime, endTime);
    }

    // 处理重置
    function handleReset() {
        startTimeInput.value = '';
        endTimeInput.value = '';
        loadHistory();
    }

    // 处理全选
    function handleSelectAll(event) {
        const isChecked = event.target.checked;
        const checkboxes = document.querySelectorAll('#historyTableBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateBatchDeleteButton();
    }

    // 更新批量删除按钮状态
    function updateBatchDeleteButton() {
        const checkedBoxes = document.querySelectorAll('#historyTableBody input[type="checkbox"]:checked');
        batchDeleteBtn.disabled = checkedBoxes.length === 0;
    }

    // 处理批量删除
    async function handleBatchDelete() {
        if (!confirm('确定要删除选中的记录吗？')) {
            return;
        }

        const checkedRows = document.querySelectorAll('#historyTableBody input[type="checkbox"]:checked');
        const fileNames = Array.from(checkedRows).map(checkbox => 
            checkbox.closest('tr').querySelector('td:nth-child(3)').textContent
        );

        try {
            const username = localStorage.getItem('username');
            const token = localStorage.getItem('token');
            
            const response = await fetch('http://localhost:8082/history/batch-delete', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    fileNames: fileNames
                })
            });

            const result = await response.json();
            if (result.code === 1) {
                alert('删除成功');
                loadHistory();
            } else {
                throw new Error(result.msg || '删除失败');
            }
        } catch (error) {
            alert('删除失败：' + error.message);
        }
    }

    // 处理单个记录删除
    window.handleDelete = async function(fileName) {
        if (!confirm('确定要删除这条记录吗？')) {
            return;
        }

        try {
            const username = localStorage.getItem('username');
            const token = localStorage.getItem('token');
            
            const response = await fetch('http://localhost:8082/history/delete', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    fileName: fileName
                })
            });

            const result = await response.json();
            if (result.code === 1) {
                alert('删除成功');
                loadHistory();
            } else {
                throw new Error(result.msg || '删除失败');
            }
        } catch (error) {
            alert('删除失败：' + error.message);
        }
    }

    // 处理文件下载
    window.handleDownload = function(downloadUrl) {
        if (!downloadUrl) {
            alert('下载链接不可用');
            return;
        }
        window.open(downloadUrl, '_blank');
    }

    // 加载历史记录
    async function loadHistory(startTime = '', endTime = '') {
        try {
            const username = localStorage.getItem('username');
            const token = localStorage.getItem('token');

            let url = `http://localhost:8082/history/list/${username}`;
            if (startTime && endTime) {
                url += `?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': token
                }
            });

            const result = await response.json();
            if (result.code !== 1) {
                throw new Error(result.msg || '获取历史记录失败');
            }

            if (!result.data || result.data.length === 0) {
                historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-hint">暂无历史记录</td>
                    </tr>
                `;
                return;
            }

            historyTableBody.innerHTML = result.data.map(record => `
                <tr data-download-url="${record.analysis_result || ''}">
                    <td>
                        <input type="checkbox" class="record-checkbox" onchange="updateBatchDeleteButton()">
                    </td>
                    <td>${formatDateTime(record.createdAt)}</td>
                    <td>${record.fileName}</td>
                    <td>${record.fileType}</td>
                    <td>${getStatusText(record.status)}</td>
                    <td>
                        <button class="download-btn" onclick="handleDownload('${record.analysisResult || ''}')" 
                                ${!record.analysisResult ? 'disabled' : ''}>
                            下载
                        </button>
                        <button class="delete-btn" onclick="handleDelete('${record.fileName}')">删除</button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('加载历史记录失败:', error);
            alert('加载历史记录失败：' + error.message);
        }
    }

    // 格式化日期时间
    function formatDateTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // 获取状态文本
    function getStatusText(status) {
        const statusMap = {
            0: '处理中',
            1: '已完成',
            2: '失败'
        };
        return statusMap[status] || '未知';
    }

    // 处理登出
    async function handleLogout() {
        try {
            const username = localStorage.getItem('username');
            const token = localStorage.getItem('token');
            
            const response = await fetch('http://localhost:8082/account/logout/' + username, {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.code === 4) {
                localStorage.clear();
                window.location.replace('login.html');
            } else {
                throw new Error(data.msg || '登出失败');
            }
        } catch (error) {
            alert('登出失败：' + error.message);
        }
    }
}); 