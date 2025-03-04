document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const rechargeBtn = document.getElementById('rechargeBtn');
    const rechargePanel = document.getElementById('rechargePanel');
    const productIntro = document.getElementById('productIntro');
    const rechargeItems = document.querySelectorAll('.recharge-item');
    const payButton = document.getElementById('payButton');
    
    // 当前选中的充值选项
    let selectedAmount = null;

    // 点击会员充值按钮
    rechargeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // 显示充值面板，隐藏产品介绍
        rechargePanel.style.display = 'block';
        productIntro.style.display = 'none';
        
        // 更新侧边栏active状态
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        rechargeBtn.classList.add('active');
    });

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
    payButton.addEventListener('click', function() {
        if (!selectedAmount) {
            alert('请选择充值金额');
            return;
        }
        
        // 检查用户是否登录
        const token = localStorage.getItem('token');
        if (!token) {
            alert('请先登录');
            window.location.href = 'login.html';
            return;
        }

        // TODO: 调用后端支付接口
        alert(`即将支付 ${selectedAmount} 元`);
        // 这里可以添加实际的支付逻辑
    });

    // 点击其他侧边栏选项
    document.querySelectorAll('.sidebar-item').forEach(item => {
        if (item.id !== 'rechargeBtn') {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                // 如果点击的是首页
                if (this.textContent === '首页') {
                    rechargePanel.style.display = 'none';
                    productIntro.style.display = 'block';
                }
                // 更新active状态
                document.querySelectorAll('.sidebar-item').forEach(i => {
                    i.classList.remove('active');
                });
                this.classList.add('active');
            });
        }
    });
}); 