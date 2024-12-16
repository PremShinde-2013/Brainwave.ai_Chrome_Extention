// floatingBallState.js 内容
const ballState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startRight: 0,
    startBottom: 0,
    isProcessing: false
};

function getState() {
    return ballState;
}

function updateState(newState) {
    Object.assign(ballState, newState);
    return ballState;
}

async function loadPosition() {
    try {
        const result = await chrome.storage.local.get('floatingBallPosition');
        return result.floatingBallPosition || {
            right: '20px',
            bottom: '20px'
        };
    } catch (error) {
        console.error('加载悬浮球位置失败:', error);
        return {
            right: '20px',
            bottom: '20px'
        };
    }
}

async function savePosition(position) {
    try {
        await chrome.storage.local.set({ floatingBallPosition: position });
    } catch (error) {
        console.error('保存悬浮球位置失败:', error);
    }
}

// floatingBallUI.js 内容
function createFloatingBallStyle() {
    const style = document.createElement('style');
    style.textContent = `
        #blinko-floating-ball {
            position: fixed;
            width: min(50px, 5vw);
            height: min(50px, 5vw);
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
            width: 60%;
            height: 60%;
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

        @media (max-width: 768px) {
            #blinko-floating-ball {
                width: min(40px, 8vw);
                height: min(40px, 8vw);
            }
        }
    `;
    return style;
}

function createFloatingBallElement() {
    const ball = document.createElement('div');
    ball.id = 'blinko-floating-ball';
    ball.innerHTML = `
        <div class="ball-icon">
            <img src="${chrome.runtime.getURL('images/icon128.png')}" alt="Blinko">
        </div>
        <div class="loading-circle"></div>
    `;
    return ball;
}

function setFloatingBallPosition(ball, position) {
    Object.assign(ball.style, position);
}

function showLoadingState(ball) {
    ball.classList.add('processing');
}

function hideLoadingState(ball) {
    ball.classList.remove('processing');
}

function showSuccessState(ball) {
    ball.classList.remove('processing');
    ball.classList.add('success');
    const iconImg = ball.querySelector('img');
    iconImg.src = chrome.runtime.getURL('images/icon128_success_reverse.png');
}

function resetState(ball) {
    ball.classList.remove('success', 'processing');
    const iconImg = ball.querySelector('img');
    iconImg.src = chrome.runtime.getURL('images/icon128.png');
}

function removeFloatingBall() {
    const ball = document.getElementById('blinko-floating-ball');
    if (ball) {
        ball.remove();
    }
}

// floatingBallHandler.js 内容
function handleDragStart(e, ball) {
    const state = getState();
    if (state.isProcessing) return;
    
    updateState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY
    });
    
    const rect = ball.getBoundingClientRect();
    updateState({
        startRight: window.innerWidth - rect.right,
        startBottom: window.innerHeight - rect.bottom
    });
    
    ball.style.transition = 'none';
}

function handleDragMove(e, ball) {
    const state = getState();
    if (!state.isDragging) return;
    
    const deltaX = state.startX - e.clientX;
    const deltaY = state.startY - e.clientY;
    
    const newRight = state.startRight + deltaX;
    const newBottom = state.startBottom + deltaY;
    
    ball.style.right = newRight + 'px';
    ball.style.bottom = newBottom + 'px';
}

function handleDragEnd(ball) {
    const state = getState();
    if (!state.isDragging) return;
    
    updateState({ isDragging: false });
    ball.style.transition = 'transform 0.5s ease';
    
    // 保存新位置
    const position = {
        right: ball.style.right,
        bottom: ball.style.bottom
    };
    savePosition(position);
}

async function handleClick(ball) {
    const state = getState();
    if (state.isDragging || state.isProcessing) return;
    
    updateState({ isProcessing: true });
    showLoadingState(ball);

    try {
        // 获取页面内容
        const content = document.body.innerText;
        const metadata = {
            title: document.title,
            url: window.location.href
        };

        // 发送消息给background script处理
        const response = await chrome.runtime.sendMessage({
            action: 'processAndSendContent',
            content: content,
            title: metadata.title,
            url: metadata.url
        });

        if (response.success) {
            // 显示成功动画
            showSuccessState(ball);

            // 3秒后恢复原状
            setTimeout(() => {
                resetState(ball);
                updateState({ isProcessing: false });
            }, 3000);
        } else {
            throw new Error('Failed to process content');
        }
    } catch (error) {
        console.error('Error processing content:', error);
        resetState(ball);
        updateState({ isProcessing: false });
    }
}

function initializeEventListeners(ball) {
    // 处理拖拽
    ball.addEventListener('mousedown', e => handleDragStart(e, ball));
    document.addEventListener('mousemove', e => handleDragMove(e, ball));
    document.addEventListener('mouseup', () => handleDragEnd(ball));

    // 处理点击
    ball.addEventListener('click', () => handleClick(ball));
}

// 主要逻辑
async function createFloatingBall() {
    try {
        // 检查是否启用悬浮球
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings || {};
        if (settings.enableFloatingBall === false) {
            return;
        }

        // 添加样式
        const style = createFloatingBallStyle();
        document.head.appendChild(style);

        // 创建悬浮球元素
        const ball = createFloatingBallElement();

        // 从存储中获取位置
        const position = await loadPosition();
        setFloatingBallPosition(ball, position);

        // 添加到页面
        document.body.appendChild(ball);

        // 初始化事件监听器
        initializeEventListeners(ball);
    } catch (error) {
        console.error('创建悬浮球时出错:', error);
    }
}

function initializeMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateFloatingBallState') {
            if (request.enabled) {
                const ball = document.getElementById('blinko-floating-ball');
                if (!ball) {
                    createFloatingBall();
                }
            } else {
                removeFloatingBall();
            }
        }
    });
}

// 初始化
async function initialize() {
    initializeMessageListener();
    await createFloatingBall();
}

// 启动初始化
initialize();