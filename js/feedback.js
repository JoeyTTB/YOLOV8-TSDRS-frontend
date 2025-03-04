document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();

    // 获取DOM元素
    const logoutBtn = document.getElementById('logoutBtn');
    const currentTimeSpan = document.getElementById('currentTime');
    const addFeedbackBtn = document.getElementById('addFeedbackBtn');
    const searchBtn = document.getElementById('searchBtn');
    const resetBtn = document.getElementById('resetBtn');
    const searchInput = document.getElementById('searchInput');
    const modal = document.getElementById('feedbackModal');
    const closeBtn = document.querySelector('.close');
    const saveFeedbackBtn = document.getElementById('saveFeedback');
    const feedbackContent = document.getElementById('feedbackContent');
    const modalTitle = document.getElementById('modalTitle');

    let currentFeedbackId = null;

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

    // 加载意见列表
    async function loadFeedbacks(searchText = '') {
        const token = localStorage.getItem('token');
        const currentUsername = localStorage.getItem('username');
        if (!token || !currentUsername) return;

        try {
            let url = 'http://localhost:8082/feedback/list';
            if (searchText) {
                url += '?content=' + encodeURIComponent(searchText);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': token
                }
            });
            const result = await response.json();
            
            const feedbackTableBody = document.getElementById('feedbackTableBody');
            if (!feedbackTableBody) return;

            if (!result.code === 1 || !result.data || result.data.length === 0) {
                feedbackTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-hint">暂无意见反馈</td>
                    </tr>
                `;
                return;
            }

            feedbackTableBody.innerHTML = result.data.map(feedback => `
                <tr>
                    <td>${feedback.username}</td>
                    <td class="feedback-content">${feedback.opinion_content}</td>
                    <td>${formatDateTime(feedback.created_at)}</td>
                    <td class="feedback-actions">
                        ${feedback.username === currentUsername ? `
                            <button class="edit-feedback-btn" data-id="${feedback.id}" 
                                    data-content="${feedback.opinion_content}">修改</button>
                            <button class="delete-feedback-btn" data-id="${feedback.id}">删除</button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');

            // 添加事件监听
            document.querySelectorAll('.edit-feedback-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    const content = this.getAttribute('data-content');
                    openEditModal(id, content);
                });
            });

            document.querySelectorAll('.delete-feedback-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    handleDelete(id);
                });
            });
        } catch (error) {
            console.error('获取意见反馈失败:', error);
            const feedbackTableBody = document.getElementById('feedbackTableBody');
            if (feedbackTableBody) {
                feedbackTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-hint">加载失败</td>
                    </tr>
                `;
            }
        }
    }

    // 打开编辑模态框
    function openEditModal(id = null, content = '') {
        currentFeedbackId = id;
        modalTitle.textContent = id ? '修改意见' : '添加意见';
        feedbackContent.value = content;
        modal.classList.add('show');
    }

    // 关闭模态框
    function closeModal() {
        modal.classList.remove('show');
        currentFeedbackId = null;
        feedbackContent.value = '';
    }

    // 保存意见
    async function saveFeedback() {
        const content = feedbackContent.value.trim();
        if (!content) {
            alert('请输入意见内容');
            return;
        }

        // 添加字数限制检查
        if (content.length > 50) {
            alert('意见内容不能超过50字');
            return;
        }

        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        if (!username || !token) {
            alert('请先登录');
            return;
        }

        try {
            const url = currentFeedbackId ? 
                'http://localhost:8082/feedback/update' : 
                'http://localhost:8082/feedback/add';

            const response = await fetch(url, {
                method: currentFeedbackId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    id: currentFeedbackId,
                    username: username,
                    opinion_content: content
                })
            });

            const result = await response.json();
            if (result.code === 1) {
                alert(currentFeedbackId ? '修改成功！' : '添加成功！');
                closeModal();
                loadFeedbacks(searchInput.value);
            } else {
                alert(currentFeedbackId ? '修改失败：' : '添加失败：' + result.msg);
            }
        } catch (error) {
            console.error('保存意见失败:', error);
            alert('操作失败，请稍后重试');
        }
    }

    // 删除意见
    async function handleDelete(id) {
        if (!confirm('确定要删除这条意见吗？')) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('请先登录');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8082/feedback/delete/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token
                }
            });

            const result = await response.json();
            if (result.code === 1) {
                alert('删除成功！');
                loadFeedbacks(searchInput.value);
            } else {
                alert('删除失败：' + result.msg);
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请稍后重试');
        }
    }

    // 格式化日期时间
    function formatDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('zh-CN');
    }

    // 事件监听
    addFeedbackBtn.addEventListener('click', () => openEditModal());
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    saveFeedbackBtn.addEventListener('click', saveFeedback);
    searchBtn.addEventListener('click', () => loadFeedbacks(searchInput.value));
    resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        loadFeedbacks();
    });

    // 初始加载
    loadFeedbacks();

    // 添加字数限制提示
    feedbackContent.addEventListener('input', function() {
        const maxLength = 50;
        const currentLength = this.value.length;
        if (currentLength > maxLength) {
            this.value = this.value.substring(0, maxLength);
            alert('意见内容不能超过50字');
        }
    });
}); 