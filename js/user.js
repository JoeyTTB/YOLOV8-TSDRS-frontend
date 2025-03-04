document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();
    //显示用户头像
    getUserAvatar();

    // 获取DOM元素
    const uploadBox = document.getElementById('uploadBox');
    const uploadSection = document.getElementsByClassName('upload-section');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const previewContainer = document.getElementById('previewContainer');
    const resultContainer = document.getElementById('resultContainer');
    const logoutBtn = document.getElementById('logoutBtn');
    const uploadAvatar = document.getElementById('uploadAvatar');
    const currentTimeSpan = document.getElementById('currentTime');
    const videoBtn = document.getElementById('videoBtn');

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

    //打开摄像头并预览
    let isCameraOpen = false;
    let stream = null;
    if(videoBtn) {
        videoBtn.addEventListener('click', async function()  {
            isCameraOpen = !isCameraOpen;
            const previewHTML = `<video id="videoElement" autoplay playsInline></video>`;
            previewContainer.innerHTML = previewHTML;
            const videoEl = document.getElementById('videoElement');
            if(isCameraOpen == false) {
                analyzeBtn.disabled = true;
                if (videoEl.srcObject) {
                    const tracks = videoEl.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                    videoEl.srcObject = null;
                    stream = null;
                }
                // 清除预览
                previewContainer.innerHTML = '<div class="empty-hint">暂无预览内容</div>';
                
                // 禁用分析按钮
                analyzeBtn.disabled = true;
                
                // 清除结果
                resultContainer.innerHTML = '<div class="empty-hint">暂无识别结果</div>';

                // 清除本地存储中的相关数据
                localStorage.removeItem('currentFile');
                localStorage.removeItem('preview');
                localStorage.removeItem('lastResult');
                videoBtn.textContent = '开启摄像头';
                videoBtn.style = `background-color: #3498db;color: white;padding: 5px;margin-left: 50px;
                border: none;border-radius: 4px;cursor: pointer;transition: 0.3s;`
                uploadBox.hidden = false;
                videoBtn.disabled = false;
                analyzeBtn.addEventListener('click', startCameraAnalysis);
                window.location.reload();
            } else {
                uploadBox.hidden = true;
                videoBtn.textContent = '关闭摄像头';
                videoBtn.style = `background-color: #e74c3c;color: white;padding: 5px;margin-left: 50px;
                border: none;border-radius: 4px;cursor: pointer;transition: 0.3s;`
                analyzeBtn.addEventListener('click', startCameraAnalysis);
            }
            const navigator = window.navigator.mediaDevices;
            const devices = await navigator.enumerateDevices();
            if (devices) {
                stream = await navigator.getUserMedia({
                    audio: false,
                    video: {
                    width: 300,
                    height: 300,
                    facingMode: "user", // 前置摄像头
                    },
                });
                if (!videoEl) return;
                videoEl.srcObject = stream;
                videoEl.play();
                analyzeBtn.disabled = false;
            }
            videoBtn.disabled = false;
        });
    }

    // 文件上传相关事件监听
    uploadBox.addEventListener('click', () => fileInput.click());
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    analyzeBtn.addEventListener('click', startAnalysis);

    // 处理拖拽
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.style.borderColor = '#3498db';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.style.borderColor = '#ddd';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files[0]);
        }
    }

    // 处理文件选择
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            handleFiles(file);
        }
    }

    // 处理文件
    function handleFiles(file) {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        const validVideoTypes = ['video/mp4', 'video/avi'];
        
        if (!validImageTypes.includes(file.type) && !validVideoTypes.includes(file.type)) {
            alert('请上传支持的文件格式！');
            return;
        }

        // 显示文件信息
        fileInfo.style.display = 'flex';
        document.getElementById('fileName').textContent = `文件名: ${file.name} | 大小: ${formatFileSize(file.size)}`;
        analyzeBtn.disabled = false;
        videoBtn.disabled = true;

        // 保存文件信息到本地存储
        const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date().toLocaleString()
        };
        localStorage.setItem('currentFile', JSON.stringify(fileData));

        // 预览
        if (validImageTypes.includes(file.type)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 300px;">`;
                previewContainer.innerHTML = previewHTML;
                localStorage.setItem('preview', previewHTML);
            };
            reader.readAsDataURL(file);
        } else {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.maxHeight = '300px';
            previewContainer.innerHTML = '';
            previewContainer.appendChild(video);
        }
    }

    let ws = null;
    let mediaSource = null;
    let sourceBuffer = null;
    
    async function startCameraAnalysis() {
        // 向服务器传输数据
        analyzeBtn.disabled = true;
        ws = io('http://localhost:5000'); // WebSocket监听地址
        const resultHTML = `<video id="videoResElement" style='width: 300px;height: 300px' autoplay playsInline></video>`;
        resultContainer.innerHTML = resultHTML;
        const videoResEl = document.getElementById('videoResElement');
    
        // 创建MediaSource对象
        mediaSource = new MediaSource();
        videoResEl.src = URL.createObjectURL(mediaSource);
        mediaSource.addEventListener('sourceopen', handleSourceOpen);
    
        ws.on('connect', () => {
            console.log('WebSocket connection established');
                    // 创建一个 MediaRecorder 实例
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8' });
    
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0 && ws.connected) {
                            ws.emit('video_stream', event.data);
                            console.log('video sent');
                        }
                    };
    
                    // 开始录制
                    mediaRecorder.start(500); // 每 500ms 发送一次数据
    
            // 接收处理后的视频流
            ws.on('processed_video', (data) => {
                console.log('Received processed data');
                console.log("byteLength: " + data.byteLength);
                if (sourceBuffer) {
                    try {
                        if (sourceBuffer.updating) {
                            // 如果SourceBuffer正在更新，等待它回到open状态
                            sourceBuffer.addEventListener('updateend', () => {
                                sourceBuffer.appendBuffer(data);
                            });
                        } else {
                            sourceBuffer.appendBuffer(data);
                        }
                    } catch (e) {
                        console.error('Error appending buffer:', e);
                        if (e.name === 'QuotaExceededError') {
                            // 如果是缓存满的问题，可以尝试结束当前buffer并创建新的
                            sourceBuffer.abort();
                            sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs=vp8');
                            sourceBuffer.appendBuffer(data);
                        }
                    }
                }
            });
        });
    
        ws.on('disconnect', () => {
            console.log('WebSocket connection closed');
            analyzeBtn.disabled = false;
            if (mediaSource) {
                mediaSource.endOfStream();
            }
        });
    
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            analyzeBtn.disabled = false;
            if (mediaSource) {
                mediaSource.endOfStream();
            }
        });
    }
    
    function handleSourceOpen() {
        console.log('MediaSource opened');
        sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs=vp8');
        console.log('source buffer created');
    }

    async function startAnalysis() {
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            resultContainer.innerHTML = '<div class="loading">正在分析中，请稍候...</div>';
            analyzeBtn.disabled = true;

            // 获取token
            const token = localStorage.getItem('token');
            let response;

            // 发送请求到后端API
            if(file.type.includes('image')) {
                response = await fetch('http://localhost:8082/api/detect_image', {
                    method: 'POST',
                    headers: {
                        'Authorization': token  // 添加认证头
                    },
                    body: formData
                });
            }
            else if(file.type.includes('video')) {
                response = await fetch('http://localhost:8082/api/detect_video', {
                    method: 'POST',
                    headers: {
                        'Authorization': token  // 添加认证头
                    },
                    body: formData
                });
            }
            const result = await response.json();
            if (result.code != 1) {
                if (response.status === 403) {
                    // token失效，跳转到登录页
                    localStorage.clear();
                    window.location.replace('login.html');
                    return;
                }
                throw new Error(`请求失败: ${result.msg}`);
            }
            displayResults(result);
            
            // 更新积分信息
            await updatePoints();
            
            // 保存到历史记录
            const username = localStorage.getItem('username');
            const historyData = {
                fileName: file.name,
                fileType: file.type.includes('image') ? '图片' : '视频',
                analysisResult: result.data,
                username: username
            };
            
            const historyResponse = await fetch('http://localhost:8082/history/save', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(historyData)
            });

            const historyResult = await historyResponse.json();
            if (historyResult.code !== 1) {
                console.error('保存历史记录失败:', historyResult.msg);
            }

        } catch (error) {
            resultContainer.innerHTML = `<div class="error">分析失败: ${error.message}</div>`;
            console.error('分析错误:', error);
        } finally {
            analyzeBtn.disabled = false;
        }
    }

    // 恢复上次的分析状态
    function restoreLastAnalysis() {
        const currentFile = localStorage.getItem('currentFile');
        const preview = localStorage.getItem('preview');
        const lastResult = localStorage.getItem('lastResult');

        if (currentFile) {
            const fileData = JSON.parse(currentFile);
            fileInfo.style.display = 'flex';
            document.getElementById('fileName').textContent = `文件名: ${fileData.name} | 大小: ${formatFileSize(fileData.size)}`;
            analyzeBtn.disabled = false;
            videoBtn.disabled = true;
        }

        if (preview) {
            previewContainer.innerHTML = preview;
        }

        if (lastResult) {
            displayResults(JSON.parse(lastResult));
        }
    }

    // 页面加载时恢复状态
    restoreLastAnalysis();

    // 修改删除文件按钮的事件监听
    const deleteFileBtn = document.getElementById('deleteFile');
    if (deleteFileBtn) {
        deleteFileBtn.addEventListener('click', function() {
            // 清除文件输入
            fileInput.value = '';
            
            // 清除文件信息显示
            fileInfo.style.display = 'none';
            
            // 清除预览
            previewContainer.innerHTML = '<div class="empty-hint">暂无预览内容</div>';
            
            // 禁用分析按钮
            analyzeBtn.disabled = true;
            // 开启摄像头按钮
            videoBtn.disabled = false;

            // 清除结果
            resultContainer.innerHTML = '<div class="empty-hint">暂无识别结果</div>';

            // 清除本地存储中的相关数据
            localStorage.removeItem('currentFile');
            localStorage.removeItem('preview');
            localStorage.removeItem('lastResult');
        });
    }

    // 修改显示结果的函数
    function displayResults(result) {
        if (!result || !result.data) {
            resultContainer.innerHTML = '<div class="empty-hint">未获取到处理结果</div>';
            return;
        }

        // 只显示下载链接
        const resultHTML = `
            <div class="download-section">
                <h4>处理结果下载</h4>
                <a href="${result.data}" 
                   class="download-btn" 
                   target="_blank" 
                   download>
                    下载处理结果
                </a>
                <p class="download-hint">点击按钮下载处理后的文件</p>
            </div>
        `;

        resultContainer.innerHTML = resultHTML;
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 添加历史记录操作函数
    function viewRecord(button) {
        const row = button.closest('tr');
        const fileName = row.cells[1].textContent;
        const fileType = row.cells[2].textContent;
        const result = row.cells[3].textContent;
        
        alert(`查看记录：\n文件名：${fileName}\n文件类型：${fileType}\n识别结果：${result}`);
    }

    function deleteRecord(button) {
        if (confirm('确定要删除这条记录吗？')) {
            const row = button.closest('tr');
            row.remove();
        }
    }

    // 更新积分信息的函数
    async function updatePoints() {
        try {
            const username = localStorage.getItem('username');
            const token = localStorage.getItem('token');
            
            const response = await fetch(`http://localhost:8082/points/update/${username}`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (result.code !== 1) {
                throw new Error(result.msg);
            }
        } catch (error) {
            console.error('更新积分失败:', error);
        }
    }

    // 点击其他导航项时隐藏充值面板
    document.querySelectorAll('.nav-menu a').forEach(item => {
        item.addEventListener('click', function(e) {
            // 更新导航菜单active状态
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
});