// 创建并初始化悬浮球
function createFloatingBall() {
    const ball = document.createElement('div');
    ball.id = 'blinko-floating-ball';
    ball.innerHTML = `
        <div class="ball-icon">
            <img src="${chrome.runtime.getURL('images/icon128.png')}" alt="Blinko">
        </div>
        <div class="loading-circle"></div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        #blinko-floating-ball {
            position: fixed;
            width: 50px;
            height: 50px;
            cursor: move;
            z-index: 10000;
            user-select: none;
            touch-action: none;
        }

        .ball-icon {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.5s ease;
        }

        .ball-icon img {
            width: 30px;
            height: 30px;
            transition: transform 0.5s ease;
        }

        .loading-circle {
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border: 2px solid transparent;
            border-top-color: #4CAF50;
            border-radius: 50%;
            display: none;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .processing .loading-circle {
            display: block;
        }

        .success .ball-icon img {
            transform: rotateY(180deg);
        }
    `;
    document.head.appendChild(style);

    // 从存储中获取位置
    chrome.storage.sync.get(['ballPosition'], function(result) {
        const position = result.ballPosition || { right: '20px', bottom: '20px' };
        Object.assign(ball.style, position);
        document.body.appendChild(ball);
    });

    let isProcessing = false;
    let isDragging = false;
    let startX, startY, startRight, startBottom;

    // 处理拖拽
    ball.addEventListener('mousedown', function(e) {
        if (isProcessing) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = ball.getBoundingClientRect();
        startRight = window.innerWidth - rect.right;
        startBottom = window.innerHeight - rect.bottom;
        
        ball.style.transition = 'none';
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const deltaX = startX - e.clientX;
        const deltaY = startY - e.clientY;
        
        const newRight = startRight + deltaX;
        const newBottom = startBottom + deltaY;
        
        ball.style.right = newRight + 'px';
        ball.style.bottom = newBottom + 'px';
    });

    document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        
        isDragging = false;
        ball.style.transition = 'transform 0.5s ease';
        
        // 保存新位置
        const position = {
            right: ball.style.right,
            bottom: ball.style.bottom
        };
        chrome.storage.sync.set({ ballPosition: position });
    });

    // 处理点击事件
    ball.addEventListener('click', async function(e) {
        if (isDragging || isProcessing) return;
        
        isProcessing = true;
        ball.classList.add('processing');

        try {
            // 获取页面内容
            const pageContent = document.body.innerText;
            const pageTitle = document.title;
            const url = window.location.href;

            // 发送消息给background script处理
            const response = await chrome.runtime.sendMessage({
                action: 'processAndSendContent',
                content: pageContent,
                title: pageTitle,
                url: url
            });

            if (response.success) {
                // 显示成功动画
                ball.classList.remove('processing');
                const iconImg = ball.querySelector('img');
                ball.classList.add('success');
                iconImg.src = chrome.runtime.getURL('images/icon128_success_reverse.png');

                // 3秒后恢复原状
                setTimeout(() => {
                    ball.classList.remove('success');
                    iconImg.src = chrome.runtime.getURL('images/icon128.png');
                    isProcessing = false;
                }, 3000);
            } else {
                throw new Error('Failed to process content');
            }
        } catch (error) {
            console.error('Error processing content:', error);
            ball.classList.remove('processing');
            isProcessing = false;
        }
    });
}

// 初始化悬浮球
createFloatingBall();
