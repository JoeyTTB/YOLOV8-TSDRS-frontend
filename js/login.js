document.addEventListener('DOMContentLoaded', function() {
    // 修改默认用户
    const defaultUser = {
        username: 'test',
        password: '12345678'
    };

    // 获取DOM元素
    const loginForm = document.getElementById('loginForm');
    const captchaCanvas = document.getElementById('captchaCanvas');
    
    // 生成验证码
    let captchaText = '';
    
    function generateCaptcha() {
        const ctx = captchaCanvas.getContext('2d');
        ctx.clearRect(0, 0, captchaCanvas.width, captchaCanvas.height);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, captchaCanvas.width, captchaCanvas.height);
        
        captchaText = Math.random().toString(36).substring(2, 8).toUpperCase();
        ctx.font = '24px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(captchaText, captchaCanvas.width/2, captchaCanvas.height/2);
    }

    generateCaptcha();
    captchaCanvas.addEventListener('click', generateCaptcha);

    // 处理登录表单提交
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const captchaInput = document.getElementById('captchaInput').value.trim();

            if (!username || !password || !captchaInput) {
                alert('请填写所有字段！');
                return;
            }

            if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
                alert('验证码错误！');
                generateCaptcha();
                return;
            }

            // 默认用户直接登录
            if (username === defaultUser.username && password === defaultUser.password) {
                localStorage.setItem('username', username);
                localStorage.setItem('token', 'default_token'); // 设置默认token
                window.location.replace('user.html');
                return;
            }

            // 非默认用户发送到后端验证
            try {
                const response = await fetch('http://localhost:8082/account/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });
                const data = await response.json();
                if (data.code != 5) {
                    throw new Error(data.msg);
                }
                localStorage.setItem('token', data.data);
                localStorage.setItem('username', username);
                window.location.replace('user.html');
            } catch (error) {
                alert('登录失败：' + error.message);
                generateCaptcha();
            }
        });
    }

    // 处理注册表单提交
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const rePassword = document.getElementById('confirmPassword').value.trim();
            const captchaInput = document.getElementById('captchaInput').value.trim();

            // 用户名验证
            if (!username) {
                alert('请输入用户名！');
                return;
            }
            if (username.length < 4 || username.length > 20) {
                alert('用户名长度应在4-20个字符之间！');
                return;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                alert('用户名只能包含字母、数字和下划线！');
                return;
            }

            // 密码验证
            if (!password) {
                alert('请输入密码！');
                return;
            }
            if (password.length < 6 || password.length > 20) {
                alert('密码长度应在6-20个字符之间！');
                return;
            }
            if (!/^[a-zA-Z0-9_@#$%^&*]+$/.test(password)) {
                alert('密码只能包含字母、数字和特殊字符(_@#$%^&*)！');
                return;
            }

            // 验证码验证
            if (!captchaInput) {
                alert('请输入验证码！');
                return;
            }
            if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
                alert('验证码错误！');
                generateCaptcha();
                return;
            }

            try {
                // 发送注册请求到后端
                const response = await fetch('http://localhost:8082/account/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password,
                        rePassword: rePassword
                    })
                });
                const data = await response.json();
                if (data.code != 9) {
                    throw new Error(data.msg || '注册失败');
                }

                alert('注册成功！请登录');
                window.location.href = 'login.html';
            } catch (error) {
                if (error.message.includes('用户名已存在')) {
                    alert('该用户名已被注册！');
                } else {
                    alert('注册失败：' + error.message);
                }
                generateCaptcha();
            }
        });
    }
}); 