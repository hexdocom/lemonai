// main.js

const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const http = require('http');
const { URL } = require('url'); // Node.js 的 URL 类
const { exec, spawn } = require('child_process');
import { initDockerSetupService, checkAndRunDockerSetup, DOCKER_SETUP_DONE_KEY, checkSystem, checkDockerInstall, checkDockerRunning, checkDockerEnvironmentReady, attemptStartDocker } from './dockerSetupService.js';

let mainWindow;
let backendProcess; // 你的后端进程变量

// Store 实例将在异步加载后创建
let store;

const dotenv = require('dotenv');
const fs = require('fs');

const isDev = !app.isPackaged; // 是否为开发环境

// 判断环境来设定 .env 文件路径
const envPath = isDev
    ? path.resolve(process.cwd(), '.env') // 开发环境
    : path.resolve(process.resourcesPath, '.env'); // 打包后

// 安全地加载 .env
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ .env 加载成功:', process.env);
} else {
    console.error('❌ .env 文件不存在:', envPath);
}

if (app && app.getPath) {
    const dataUserPath = app.getPath("userData");
    console.log("ELECTRON.APP.USER.PATH", dataUserPath);
    process.env.LEMON_AI_PATH = dataUserPath;
}


// 防止多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.log('Another instance is running, quitting...');
    app.quit();
} else {
    app.on('second-instance', () => {
        console.log('Second instance detected');
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    function executeDockerInfo() {
        return new Promise((resolve, reject) => {
            const cmd = process.platform === 'win32'
                ? 'powershell -Command "Get-Command docker | Select-Object -ExpandProperty Source"'
                : 'which docker';

            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Docker 检测失败:', error.message);
                    return reject({ error, stderr });
                }

                const dockerPath = stdout.trim();
                if (!dockerPath) return reject({ error: 'Docker 路径为空', stderr });

                console.log('✅ 检测到 Docker 路径:', dockerPath);

                // 提取路径目录部分（不包括 docker 本身）
                const dockerDir = path.dirname(dockerPath);
                resolve(dockerDir);
            });
        });
    }

    function addToEnvPath(dir) {
        const delimiter = process.platform === 'win32' ? ';' : ':';
        const pathSet = new Set(process.env.PATH.split(delimiter));
        pathSet.add(dir);
        process.env.PATH = Array.from(pathSet).join(delimiter);
    }

    // 初始 PATH 设置（用于前置查找）
    function setupInitialDockerPathEnv() {
        const platform = process.platform;
        const customPaths = new Set();
        if (platform === 'darwin') {
            customPaths.add('/usr/bin');
            customPaths.add('/bin');
            customPaths.add('/usr/sbin');
            customPaths.add('/sbin');
            customPaths.add('/Applications/Docker.app/Contents/Resources/bin');
            customPaths.add('/opt/homebrew/bin');
        } else if (platform === 'win32') {
            customPaths.add('C:\\Program Files\\Docker\\Docker\\resources\\bin');
        }

        const delimiter = platform === 'win32' ? ';' : ':';
        const originalPaths = process.env.PATH.split(delimiter);
        originalPaths.forEach(p => customPaths.add(p));

        process.env.PATH = Array.from(customPaths).join(delimiter);
    }


    function createWindow() {
        console.log('Creating new window at:', new Date().toISOString());
        console.log('preload path', path.join(__dirname, '../preload.js'),);
        mainWindow = new BrowserWindow({
            width: 1000,
            height: 800,
            webPreferences: {
                nodeIntegration: false, // 保持 false，使用 preload
                contextIsolation: true, // 保持 true，使用 preload
                preload: path.join(__dirname, '../preload.js'), // 使用你的 preload 脚本
            },
            // 这里不再加载页面，加载哪个页面由 checkAndRunDockerSetup 决定
        });

        mainWindow.on('closed', () => {
            console.log('Window closed');
            mainWindow = null;
        });

        // 返回窗口实例
        return mainWindow;
    }
    

    ipcMain.handle('checkSystem', async (event, data) => {
        try {
            const sys = await checkSystem()
            return {
                "status": true, "code": 1, 'meta': {
                    "sys": sys,
                }
            }
        } catch (e) {
            return {
                "status": false, "code": 0, 'meta': {
                    "error": e.message,
                }
            }
        }
    });

    ipcMain.handle('checkDockerInstall', async (event, data) => {
        const isInstall = await checkDockerInstall()
        if (!isInstall) {
            return {
                "status": false, "code": 0, 'meta': {
                    "error": 'docker not install',
                }
            }
        } else {
            return {
                "status": true, "code": 1, 'meta': {

                }
            }

        }

    })
    ipcMain.handle('checkDockerRunning', async (event, data) => {
        try{
            const isRunning = await checkDockerRunning()
            return {
                "status": true, "code": 1, 'meta': {
                    "isRunning": isRunning
                }
            }
        }catch(e){
            return {
                "status": false, "code": 0, 'meta': {
                    "error": e.message,
                }
            }
        }
    })
    ipcMain.handle('checkDockerEnvironmentReady', async (event, data) => {
        const isReady = await checkDockerEnvironmentReady()
        if (!isReady) {
            return {
                "status": false, "code": 0, 'meta': {
                    "error": 'docker image not ready',
                }
            }
        } else {
            return {
                "status": true, "code": 1, 'meta': {

                }
            }
        }
    });
    ipcMain.handle('attemptStartDocker', async (event, data) => {
        const isStarted = await attemptStartDocker()
        if (!isStarted) {
            return {
                "status": false, "code": 0, 'meta': {
                    "error": isStarted,
                }
            }
        } else {
            return {
                "status": true, "code": 1, 'meta': {

                }
            }
        }

    })

    ipcMain.on('setup-complete-load-main', (event) => {
        // 获取发送消息的窗口
        // 或者直接使用外部作用域的 mainWindow 变量
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) {
            console.error('主进程收到加载主页面请求，但找不到对应的窗口');
            return;
        }

        console.log('主进程收到渲染进程的加载主页面请求，开始执行加载主页面逻辑...');

        // 执行加载主页面的逻辑
    });

    let deeplinkUrl = '';

    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';

    // 注册协议（Windows 要指定 exe）
    if (!app.isDefaultProtocolClient('lemonai')) {
        if (isWin) {
            app.setAsDefaultProtocolClient('lemonai', process.execPath, []);
        } else {
            app.setAsDefaultProtocolClient('lemonai');
        }
    }

    




    function handleDeepLink(url) {
        try {
            const parsedUrl = new URL(url);
            const pathname = parsedUrl.pathname;
            const host = parsedUrl.hostname;
            const target = host || pathname.replace(/^\//, '');

            const sendToRenderer = (channel, data) => {
                if (mainWindow) {
                    mainWindow.webContents.send(channel, data);
                    mainWindow.focus();
                } else {
                    // App 还没 ready，缓存消息
                    deeplinkUrl = JSON.stringify({ channel, data });
                }
            };

            switch (target) {
                case 'auth': {
                    const code = parsedUrl.searchParams.get('code');
                    const state = parsedUrl.searchParams.get('state');
                    sendToRenderer('oauth-login-success', { code, state });
                    break;
                }

                case 'pay-result': {
                    const orderId = parsedUrl.searchParams.get('orderId');
                    const amount = parsedUrl.searchParams.get('amount');
                    const currency = parsedUrl.searchParams.get('currency');
                    const status = parsedUrl.searchParams.get('status');
                    sendToRenderer('stripe-payment-success', { orderId, amount, currency, status });
                    break;
                }

                case 'payment-cancelled': {
                    sendToRenderer('stripe-payment-cancel', {});
                    break;
                }

                default: {
                    console.warn('⚠️ Unknown deep link target:', target);
                }
            }
        } catch (err) {
            console.error('Failed to handle deep link:', err);
        }
    }


    // 单实例锁
    const gotLock = app.requestSingleInstanceLock();

    if (!gotLock) {
        app.quit();
    } else {
        if (isWin) {
            // Windows：通过 argv 获取协议参数
            app.on('second-instance', (event, argv) => {
                console.log("argv ======", argv);
                const urlArg = argv.find(arg => arg.startsWith('lemonai://'));
                if (urlArg) {
                    console.log("urlArg ==== ", urlArg);
                    deeplinkUrl = urlArg;
                    handleDeepLink(urlArg);
                }
            });
        }

        if (isMac) {
            // macOS：使用 open-url 事件
            // 处理 macOS 的协议打开事件
            app.on('open-url', (event, url) => {
                event.preventDefault();
                console.log('🍋 Received lemonai:// URL:', url);
                handleDeepLink(url);
            })
        }
    }



    // 将整个 then 回调函数标记为 async
    app.whenReady().then(async () => {
        console.log('Electron Main: App ready.');
        console.log('当前系统平台：', process.platform);
        // 预置常见路径，避免找不到 docker
        setupInitialDockerPathEnv();
        try {
            const dockerDir = await executeDockerInfo();
            addToEnvPath(dockerDir);
            console.log('🎯 Docker 所在目录添加到 PATH：', dockerDir);
        } catch (err) {
            console.error('🚫 获取 Docker 路径失败:', err);
        }


        // --- 使用动态 import 异步加载 electron-store ---
        let StoreModule;
        try {
            // 使用 await 等待 electron-store 模块加载完成
            StoreModule = await import('electron-store');
            console.log('electron-store module imported dynamically.');
        } catch (err) {
            console.error('Failed to dynamically import electron-store:', err);
            // 如果 electron-store 加载失败，这是个严重错误，可能需要退出应用或提示用户
            app.quit(); // 选择退出应用
            return; // 停止后续执行
        }

        // 从动态导入的模块中获取 Store 构造函数 (通常在 .default 属性上)
        const Store = StoreModule.default;

        // 创建 Store 实例 (现在确保在 electron-store 加载并获取构造函数之后)
        store = new Store();
        console.log('electron-store instance created.');
        console.log('=== userData ====', app.getPath('userData'));

        // --- 现在可以继续执行依赖 store 实例的逻辑 ---

        // 初始化 Docker 设置服务，传入 store 和用户数据路径
        // initDockerSetupService 负责设置 IPC 监听器
        //     initDockerSetupService({
        //         store: store, // 将 Store 实例传递进去
        //         userDataPath: app.getPath('userData'), // 将用户数据路径传递进去
        //     });
        //     console.log('Docker setup service initialized.');


        //数据库初始化 sqllite3 
        //node src/models/sync.js
        require(path.join(__dirname, '../src/models/sync.js'));
        console.log('Database initialized.');

        // 启动后端进程 (时机可能需要调整，确保后端在 Docker 就绪后才能正常工作)
        console.log('Spawning backend process...');
        try {
            // @ts-ignore
            // 确保你的 '../bin/www' 文件能够通过 require 正常启动后端服务
            require(path.join(__dirname, '../bin/www'));
            console.log('Backend process started.');
        } catch (err) {
            console.error('Failed to start backend service:', err);
            // 考虑在这里处理后端启动失败的情况
        }


        // 创建主窗口
        const createdWindow = createWindow(); // 获取创建的窗口实例
        if (process.env.NODE_ENV === 'development') {
            mainWindow.loadURL('http://localhost:5005');
        } else {
            mainWindow.loadFile(path.join(__dirname, 'renderer/main_window/index.html'));
        }
        console.log('Main window created.');



        // 运行 Docker 设置检查和流程
        //     checkAndRunDockerSetup(createdWindow);
        console.log('Docker setup check initiated.');

        // 其他 app ready 后续逻辑...

        function isAllowedRedirectUrl(url) {
            const whitelist = [
                //           'https://accounts.google.com/o/oauth2',
                //           'https://accounts.google.com/',
                //           'https://www.google.com/accounts',
                //           'https://checkout.stripe.com'
            ];

            return whitelist.some(allowed => url.startsWith(allowed));
        }


        // 拦截新窗口打开
        createdWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (isAllowedRedirectUrl(url)) {
                // 对于谷歌登录链接，允许在应用内打开（action: 'allow'）
                return { action: 'allow' };
            }

            // 其他 http/https 链接都用系统浏览器打开
            if (url.startsWith('http')) {
                shell.openExternal(url);
                return { action: 'deny' };
            }

            return { action: 'allow' };
        });

        // 拦截页面内跳转
        createdWindow.webContents.on('will-navigate', (event, url) => {
            if (isAllowedRedirectUrl(url)) {
                // 对于谷歌登录相关的 URL，允许跳转，什么都不做
                return;
            }

            // 非谷歌登录且为新的 http/https 跳转，阻止并用系统浏览器打开
            if (url.startsWith('http') && url !== createdWindow.webContents.getURL()) {
                event.preventDefault();
                shell.openExternal(url);
            }
        });
    });


    app.on('before-quit', () => {
        console.log('App quitting, killing backend process...');
        // 如果你的后端是通过 spawn 启动的，在这里杀死进程
        // if (backendProcess && !backendProcess.killed) {
        //     backendProcess.kill();
        // }
    });

    app.on('activate', () => {
        // 当应用激活但没有可见窗口时
        if (mainWindow === null) {
            const createdWindow = createWindow();
            // 如果是新创建的窗口，同样需要运行检查
            // 这里的逻辑依赖 store 已经创建和服务已经初始化，
            // 考虑到这是 activate 事件，通常 app.whenReady 已经执行过了，所以 store 应该已经创建。
            //       checkAndRunDockerSetup(createdWindow);
        }
    });
}
