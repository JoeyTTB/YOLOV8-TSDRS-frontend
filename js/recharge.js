document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();

    // 获取DOM元素
    const rechargeItems = document.querySelectorAll('.recharge-item');
    const payButton = document.getElementById('payButton');
    const logoutBtn = document.getElementById('logoutBtn');
    const currentTimeSpan = document.getElementById('currentTime');

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

    // 当前选中的充值选项
    let selectedAmount = null;

    // 更新时间显示
    function updateTime() {
        const now = new Date();
        currentTimeSpan.textContent = now.toLocaleString('zh-CN');
    }
    updateTime();
    setInterval(updateTime, 1000);

    // 检查登录状态
    function checkLoginStatus() {
        const username = localStorage.getItem('username');
        if (!username) {
            window.location.replace('login.html');
            return;
        }
        // 更新用户名显示
        const usernameElement = document.getElementById('username');
        if (usernameElement) {
            usernameElement.textContent = username;
        }
    }

    // 登出处理
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            const username = localStorage.getItem('username');
            const token = localStorage.getItem('token');
            try {
                const response = await fetch('http://localhost:8082/account/logout/' + username, {
                    method: 'GET',
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                if (data.code != 4) {
                    throw new Error(data.msg);
                }
                alert("登出成功!");
                localStorage.clear();
                window.location.replace('login.html');
            } catch (error) {
                alert('登出失败：' + error.message);
            }
        });
    }

    // 点击充值选项
    rechargeItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除其他选项的选中状态
            rechargeItems.forEach(i => i.classList.remove('selected'));
            // 添加当前选项的选中状态
            this.classList.add('selected');
            // 更新选中的金额
            selectedAmount = this.getAttribute('data-amount');
        });
    });

    // 点击支付按钮
    payButton.addEventListener('click', async function() {
        if (!selectedAmount) {
            alert('请选择充值金额');
            return;
        }

        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        console.log('Token:', token);
        
        if (!username || !token) {
            alert('请先登录');
            window.location.href = 'login.html';
            return;
        }

        try {
            // 创建充值请求
            const response = await fetch('http://localhost:8082/membership/recharge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    username: username,
                    amount: parseInt(selectedAmount),
                    memberType: getMemberType(selectedAmount)
                })
            });

            const result = await response.json();
            console.log('Response:', result);
            
            if (result.code === 1) {
                alert('创建订单成功！请及时支付');
                loadOrders();
                updateMemberInfo();
            } else {
                alert('创建订单失败：' + result.msg);
            }
        } catch (error) {
            console.error('创建订单错误:', error);
            alert('创建订单失败，请稍后重试');
        }
    });

    // 更新会员信息
    async function updateMemberInfo() {
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        if (!username || !token) return;

        try {
            const response = await fetch(`http://localhost:8082/membership/info/${username}`, {
                method: 'GET',
                headers: {
                    'Authorization': token
                }
            });
            const result = await response.json();
            if (result.code === 1 && result.data) {
                const latestRecord = result.data.latestRecord;
                // 更新会员状态显示（如果在个人信息页面）
                const memberStatus = document.getElementById('memberStatus');
                if (memberStatus && latestRecord) {
                    memberStatus.textContent = latestRecord.remark; // 会员类型保存在remark字段中
                }
            }
        } catch (error) {
            console.error('获取会员信息失败:', error);
        }
    }

    // 修改会员类型相关的DOM元素
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close');
    const membershipTypeSelect = document.getElementById('membershipType');
    const amountInput = document.getElementById('amount');
    const saveChangesBtn = document.getElementById('saveChanges');
    let currentRecordId = null;

    // 关闭弹窗
    closeBtn.addEventListener('click', function() {
        modal.style.display = "none";
    });

    // 点击弹窗外部关闭
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });

    // 会员类型选择变化时更新金额
    membershipTypeSelect.addEventListener('change', function() {
        amountInput.value = this.value;
    });

    // 保存修改
    saveChangesBtn.addEventListener('click', async function() {
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        
        if (!username || !token || !currentRecordId) {
            alert('操作无效，请重试');
            return;
        }

        try {
            const response = await fetch('http://localhost:8082/membership/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    id: currentRecordId,
                    username: username,
                    amount: parseInt(amountInput.value),
                    memberType: getMemberType(amountInput.value)
                })
            });

            const result = await response.json();
            if (result.code === 1) {
                alert('修改成功！');
                modal.style.display = "none";
                loadOrders(); // 刷新订单列表
            } else {
                alert('修改失败：' + result.msg);
            }
        } catch (error) {
            console.error('修改失败:', error);
            alert('修改失败，请稍后重试');
        }
    });

    // 查询相关的DOM元素
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const searchBtn = document.getElementById('searchBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 查询按钮点击事件
    searchBtn.addEventListener('click', function() {
        loadOrders(startTimeInput.value, endTimeInput.value);
    });

    // 重置按钮点击事件
    resetBtn.addEventListener('click', function() {
        startTimeInput.value = '';
        endTimeInput.value = '';
        loadOrders();
    });

    // 添加支付处理函数
    async function handlePayment(recordId) {
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        
        if (!username || !token) {
            alert('请先登录');
            return;
        }

        try {
            const response = await fetch('http://localhost:8082/membership/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    id: recordId,
                    username: username
                })
            });

            const result = await response.json();
            if (result.code === 1) {
                alert('支付成功！');
                loadOrders();
                updateMemberInfo();
            } else {
                alert('支付失败：' + result.msg);
            }
        } catch (error) {
            console.error('支付失败:', error);
            alert('支付失败，请稍后重试');
        }
    }

    // 修改订单记录显示部分
    function getActionButtons(record) {
        if (record.status === 'PENDING') {
            return `
                <button class="pay-now-btn" data-id="${record.id}">立即支付</button>
                <button class="edit-btn" data-id="${record.id}" 
                        data-amount="${record.amount}" 
                        data-type="${record.remark}">修改</button>
                <button class="delete-btn" data-id="${record.id}">删除</button>
            `;
        } else {
            // 已支付状态只显示删除按钮
            return `
                <button class="delete-btn" data-id="${record.id}">删除</button>
            `;
        }
    }

    // 添加删除处理函数
    async function handleDelete(recordId) {
        if (!confirm('确定要删除这条充值记录吗？')) {
            return;
        }

        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        
        if (!username || !token) {
            alert('请先登录');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8082/membership/delete/${recordId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token
                }
            });

            const result = await response.json();
            if (result.code === 1) {
                alert('删除成功！');
                loadOrders();
            } else {
                alert('删除失败：' + result.msg);
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请稍后重试');
        }
    }

    // 修改加载订单记录的函数
    async function loadOrders(startTime = '', endTime = '') {
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        if (!username || !token) return;

        try {
            let url = `http://localhost:8082/membership/info/${username}`;
            if (startTime || endTime) {
                url += '?startTime=' + encodeURIComponent(startTime) + '&endTime=' + encodeURIComponent(endTime);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': token
                }
            });
            const result = await response.json();
            
            const orderTableBody = document.getElementById('orderTableBody');
            if (!orderTableBody) return;

            if (!result.code === 1 || !result.data || !result.data.allRecords || result.data.allRecords.length === 0) {
                orderTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-hint">暂无充值记录</td>
                    </tr>
                `;
                return;
            }

            const records = result.data.allRecords;
            orderTableBody.innerHTML = records.map(record => `
                <tr>
                    <td>${formatDateTime(record.create_time)}</td>
                    <td>${record.remark}</td>
                    <td>￥${record.amount}</td>
                    <td class="status-${record.status.toLowerCase()}">${getStatusText(record.status)}</td>
                    <td class="order-actions">
                        ${getActionButtons(record)}
                    </td>
                </tr>
            `).join('');

            // 为所有按钮添加事件监听
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const recordId = this.getAttribute('data-id');
                    const amount = this.getAttribute('data-amount');
                    const memberType = this.getAttribute('data-type');
                    
                    currentRecordId = recordId;
                    membershipTypeSelect.value = amount;
                    amountInput.value = amount;
                    
                    modal.style.display = "block";
                });
            });

            document.querySelectorAll('.pay-now-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const recordId = this.getAttribute('data-id');
                    handlePayment(recordId);
                });
            });

            // 添加删除按钮��事件监听
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const recordId = this.getAttribute('data-id');
                    handleDelete(recordId);
                });
            });
        } catch (error) {
            console.error('获取订单记录失败:', error);
            const orderTableBody = document.getElementById('orderTableBody');
            if (orderTableBody) {
                orderTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-hint">加载失败</td>
                    </tr>
                `;
            }
        }
    }

    function formatDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('zh-CN');
    }

    function getStatusText(status) {
        const statusMap = {
            'SUCCESS': '支付成功',
            'PENDING': '待支付',
            'FAILED': '支付失败'
        };
        return statusMap[status] || status;
    }

    function getMemberType(amount) {
        const memberTypeMap = {
            '100': '初级会员',
            '200': '中级会员',
            '300': '高级会员',
            '400': '至尊会员'
        };
        return memberTypeMap[amount] || '未知会员';
    }

    // 页面加载时加载订单记录和会员信息
    loadOrders();
    updateMemberInfo();
}); 