document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();

    // 获取DOM元素
    const logoutBtn = document.getElementById('logoutBtn');
    const currentTimeSpan = document.getElementById('currentTime');
    const detectCountSpan = document.getElementById('detectCount');
    const remainingQuotaSpan = document.getElementById('remainingQuota');
    const exchangeBtns = document.querySelectorAll('.exchange-btn');

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

    // 加载积分信息
    async function loadPointsInfo() {
        try {
            const username = localStorage.getItem('username');
            const token = localStorage.getItem('token');
            
            const response = await fetch(`http://localhost:8082/points/info/${username}`, {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (result.code === 1) {
                const detectCountSpan = document.getElementById('detectCount');
                const remainingQuotaSpan = document.getElementById('remainingQuota');
                
                if (detectCountSpan) {
                    detectCountSpan.textContent = result.data.points || 0;
                }
                if (remainingQuotaSpan) {
                    remainingQuotaSpan.textContent = result.data.amount || 0;
                }
            } else {
                throw new Error(result.msg);
            }
        } catch (error) {
            console.error('获取积分信息失败:', error);
        }
    }

    // 设置定时刷新积分信息
    setInterval(loadPointsInfo, 5000); // 每5秒刷新一次积分信息

    // 更新兑换按钮状态
    function updateExchangeButtonsState(points) {
        exchangeBtns.forEach(btn => {
            const requiredPoints = parseInt(btn.closest('.exchange-item').dataset.points);
            btn.disabled = points < requiredPoints;
        });
    }

    // 处理积分兑换
    async function handleExchange(points, quota) {
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        if (!username || !token) {
            alert('请先登录');
            return;
        }

        try {
            const response = await fetch('http://localhost:8082/points/exchange', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    username: username,
                    points: points,
                    quota: quota
                })
            });

            const result = await response.json();
            if (result.code === 1) {
                alert('兑换成功！');
                loadPointsInfo();
            } else {
                alert('兑换失败：' + result.msg);
            }
        } catch (error) {
            console.error('兑换失败:', error);
            alert('兑换失败，请稍后重试');
        }
    }

    // 添加兑换按钮事件监听
    exchangeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.exchange-item');
            const points = parseInt(item.dataset.points);
            const quota = parseInt(item.dataset.quota);
            
            if (confirm(`确定要使用${points}次识别次数兑换${quota}次识别额度吗？`)) {
                handleExchange(points, quota);
            }
        });
    });

    // 初始加载
    loadPointsInfo();
}); 