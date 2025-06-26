// src/dockerSetupService.js

const { app, ipcMain, BrowserWindow} = require('electron');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Configuration Constants ---
const DOCKER_SETUP_DONE_KEY = 'dockerSetupDone';

// Complete image name and tag
const REQUIRED_DOCKER_IMAGE = 'hexdolemonai/lemon-runtime-sandbox:latest';

// Complete image package download address (you need to provide the actual download URL)
// Please replace with the actual network address where your lemon_runtime_sandbox.tar file is stored
const DOCKER_IMAGE_TAR_URL = '';

// Complete locally saved image package file name
const DOWNLOADED_IMAGE_FILE_NAME = 'lemon_runtime_sandbox.tar';

// --- Internal State (Set during initialization) ---
let store;
let userDataPath;


//获取dockerimagefilename  不同的系统架构不一样
function getDockerImageFileName() {
    let arch = process.arch;
    if (arch === 'x64' ) {
        return 'lemon_runtime_sandbox-x64.tar';
    } else if (arch === 'arm64') {
        return 'lemon_runtime_sandbox-arm64.tar';
    } else {
        return 'lemon_runtime_sandbox-x64.tar';
    }
}

// --- Initialization Function ---
function initDockerSetupService(options) {
    ({ store, userDataPath } = options);

    // --- IPC Handlers ---
    ipcMain.handle('check-docker-setup', async () => {
        const setupDone = store.get(DOCKER_SETUP_DONE_KEY, false);
        return setupDone;
    });

    ipcMain.handle('start-docker-setup', async (event) => {
        console.log('Triggering start-docker-setup');
        const mainWindow = BrowserWindow.fromWebContents(event.sender);
        checkAndRunDockerSetup(mainWindow)
       
    });
}

// --- Helper Functions (Async) ---

/**
 * Checks if Docker is installed and running
 */
const process = require('process');

/**
 * Checks Docker availability
 */
async function checkDockerAvailability(webContents) {
    try {
        await executeDockerInfo();
        return  true;
    } catch (error) {
        // Installation failed, install docker
        webContents.send('setup-status', { 
            step: 'installing-docker',
            message: 'Docker is not installed or not installing.'
        });
        // let res = await installDocker(webContents);
        // console.log('Docker installation result:', res);
        return  false;
    }
}


// Install Docker
//http://lemon-ai.oss-cn-beijing.aliyuncs.com/docker/Docker-windows.exe
async function installDocker(webContents) {
    try {
        // Step 1: Detect system
        const os = await checkSystem(); 
        console.log("System type", os);
        let download_file_name = "";

        switch (os) {
            case 'win64':
                download_file_name = 'Docker-windows.exe';
                break;
            case 'macos-apple':
                download_file_name = 'Docker-apple.dmg';
                break;
            case 'macos-intel':
                download_file_name = 'Docker-intel.dmg';
                break;
            default:
                return false; // If OS is not supported, return false directly
        }

        if (download_file_name !== "") {
            // const download_url = `https://lemon-ai.oss-cn-beijing.aliyuncs.com/docker/${download_file_name}`;
            // const downloadedFilePath = path.join(userDataPath, download_file_name);
            
            // // Download file
            // await downloadFile(download_url, downloadedFilePath, (progress) => {
            //     webContents.send('setup-status', { step: 'downloading', message: `Downloading installer package ${download_file_name}...`, progress: progress });
            // });
            // webContents.send('setup-status', { step: 'downloaded', message: `${download_file_name} download complete` });

            // // Execute installation
            // await executeInstaller(downloadedFilePath);
            // webContents.send('setup-status', { step: 'installed', message: `Waiting for installation to complete` });

            // // Check if Docker is installed successfully after a 3-second delay
            // await new Promise(resolve => setTimeout(resolve, 3000));
            // await checkDockerInstallation();
            // console.log('Docker installation completed.');
            // return true; // Return true if installation is successful
        } else {
            return false; // If the correct installer package is not selected, also return false
        }
    } catch (error) {
        console.error('Error during Docker installation:', error);
        webContents.send('setup-status', { step: 'error', message: `Installation error: ${error.message || error}` });
        return false; // Return false on error
    }
}

// Timer to check if Docker installation is complete
function checkDockerInstallation(interval = 3000) {
    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            exec('docker --version', (error, stdout, stderr) => {
                if (!error && !stderr && stdout.toString().includes('Docker version')) {
                    console.log('✅ Docker installed successfully');
                    clearInterval(timer);
                    resolve(); // Installation complete, Promise resolves successfully
                }else{
                    console.log('❌ Docker not installed successfully');
                }
                // If Docker is not found, continue to next check
            });
        }, interval);
    });
}

// Execute Docker installer
async function executeInstaller(filePath) {
    return new Promise((resolve, reject) => {
        let command;
        switch (process.platform) {
            case 'win32':
                command = `"${filePath}"`;
                break;
            case 'darwin':
                command = `open "${filePath}"`; // macOS will open DMG files in Finder by default
                break;
            default:
                reject(new Error(`Unsupported platform for installation: ${process.platform}`));
                return;
        }

        console.log(`Executing installation command: ${command}`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error during installation: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.warn(`Installation warning/info output:\n${stderr}`);
            }
            console.log(`Successful installation output:\n${stdout}`);
            resolve(stdout);
        });
    });
}

function checkSystem() {
    return new Promise((resolve, reject) => {
        if (process.platform === 'win32') {
            // Check if it's a 64-bit system
            resolve("win64")
        } else if (process.platform === 'darwin') {
            // Check if it's Apple Silicon
            if (isAppleSilicon()) {
                resolve("macos-apple")
            }else{
                resolve("macos-intel")
            }
        }
    })
}
function isAppleSilicon() {
    if (process.platform !== 'darwin') return false;
    try {
      // Run command to check hardware model in system report
      const model = exec('sysctl -n machdep.cpu.brand_string').toString();
      // Apple Silicon will have a specific identifier, e.g., "Apple M1"
      return model.includes('Apple');
    } catch (e) {
      console.error('Unable to determine processor type:', e);
      return false;
    }
  }



/**
 * Executes docker info command
 */
function executeDockerInfo() {
    return new Promise((resolve, reject) => {
        console.log('Current PATH:', process.env.PATH);
        exec('docker --version', (error, stdout, stderr) => {
            if (error) {
                console.error(`Docker check failed: ${error}`);
                console.error(`Stderr: ${stderr}`);
                return reject({ error, stderr });
            }
            resolve(stdout);
        });
    });
}

async function checkDockerInstall(){
    try {
        await executeDockerInfo();
        return  true;
    } catch (error) {
        return  false;
    }
}

//判断docker 有没有运行 使用 docker ps 判断
function checkDockerRunning() {
    return new Promise((resolve, reject) => {
        exec('docker ps', (error, stdout, stderr) => {
            if (error) {
                console.log('Docker is not running');
                console.error(`Docker check failed: ${error}`);
                console.error(`Stderr: ${stderr}`);
                return reject({ error, stderr });
            }
            if (stdout.includes('CONTAINER ID')) {
                console.log('Docker is running');
            } else {
                console.log('Docker is not running');
            }
            resolve(stdout);
        });
    });
}



/**
 * Handles Docker error messages
 */
function handleDockerError({ error, stderr }) {
    console.error(`Handling Docker error: ${stderr}`);

    if (isDockerNotInstalled(stderr)) {
        return handleError(new Error('Docker command not found. Please ensure Docker is installed and added to your system PATH.'));
    }

    if (isDockerNotRunning(stderr)) {
        console.error('Docker service is not running. Attempting to start Docker Desktop/Daemon...');
        attemptStartDocker()
            .then(() => console.log('Docker started successfully'))
            .catch(startError => handleError(startError));
        return;
    }

    if (isConnectionError(stderr)) {
        console.warn('Detected inability to connect to Docker engine. Attempting automatic repair...');
        attemptStartDocker()
            .then(() => console.log('Docker reconnected'))
            .catch(startError => handleError(startError));
        return;
    }

    handleError(new Error(`Unable to check Docker status: ${stderr}`));
}

/**
 * Checks if Docker is not installed
 */
function isDockerNotInstalled(stderr) {
    return stderr.includes('command not found') || stderr.includes("'docker' is not recognized");
}

/**
 * Checks if Docker is not running
 */
function isDockerNotRunning(stderr) {
    return stderr.includes('Is the docker daemon running?');
}

/**
 * Checks for connection error (e.g., Docker is running but cannot connect)
 */
function isConnectionError(stderr) {
    return stderr.includes('error during connect: Get');
}

/**
 * Attempts to start Docker based on the operating system
 */
function attemptStartDocker() {
    return new Promise((resolve, reject) => {
        const platform = process.platform;

        let command;
        if (platform === 'win32') {
            // Windows
            command = 'start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"';
        } else if (platform === 'darwin') {
            // macOS
            command = 'open -a Docker';
        } else {
            return reject('Unsupported operating system. Please start Docker manually.');
        }

        exec(command, (startError, startStdout, startStderr) => {
            if (startError) {
                console.error(`Failed to start Docker: ${startStderr}`);
                return reject(`Unable to start Docker Desktop: ${startStderr}`);
            }

            return  resolve("Docker Desktop started. Waiting a few seconds for Docker to run normally...");
        });
    });
}

/**
 * Unified error handling
 */
function handleError(err) {
    console.error(`Final error: ${err.message}`);
    throw err;
}
/**
 * Checks if the required Docker image exists
 */
async function checkDockerEnvironmentReady() {
     return new Promise((resolve, reject) => {
         // Use the refined image name for checking
         exec(`docker images -q ${REQUIRED_DOCKER_IMAGE}`, (error, stdout, stderr) => {
            if (error) {
                 console.warn(`Docker images check failed: ${stderr}`);
                 resolve(false);
            } else {
                resolve(stdout.trim().length > 0);
            }
        });
     });
}

/**
 * Downloads a file
 */
async function downloadFile(url, destinationPath, progressCallback) {
    console.log(`Downloading file from ${url} to ${destinationPath}`);
    // ... (download function remains unchanged)
     return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destinationPath);
        const request = https.get(url, (response) => {
            if (response.statusCode !== 200) {
                fs.unlink(destinationPath, () => {});
                return reject(new Error(`Download failed, HTTP status code: ${response.statusCode}`));
            }

            const totalLength = parseInt(response.headers['content-length'], 10);
            let downloadedLength = 0;

            response.on('data', (chunk) => {
                downloadedLength += chunk.length;
                if (totalLength) {
                    const progress = downloadedLength / totalLength;
                    if (progressCallback) progressCallback(progress);
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close(resolve);
            });

            file.on('error', (err) => {
                fs.unlink(destinationPath, () => {});
                reject(err);
            });
        });

        request.on('error', (err) => {
            fs.unlink(destinationPath, () => {});
            reject(err);
        });
    });
}

/**
 * Imports a Docker image (.tar)
 */
async function importDockerImage(imagePath) {
    return new Promise((resolve, reject) => {
        const dockerProcess = spawn('docker', ['load', '-i', imagePath]);

        dockerProcess.stdout.on('data', (data) => {
            console.log(`docker load stdout: ${data}`);
        });

        dockerProcess.stderr.on('data', (data) => {
            console.error(`docker load stderr: ${data}`);
        });

        dockerProcess.on('error', (error) => {
            console.error(`Failed to start docker load process: ${error}`);
            reject(new Error(`Unable to execute 'docker load' command: ${error.message}`));
        });

        dockerProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`'docker load' command failed, exit code: ${code}`));
            }
        });
    });
}


// --- Function to check and run setup flow ---
async function checkAndRunDockerSetup(mainWindow) {
    mainWindow.loadFile('setup.html');
    console.log("Triggering checkAndRunDockerSetup")
    const initialSetupDone = store.get(DOCKER_SETUP_DONE_KEY, false);
    let dockerEnvironmentIsActuallyReady = false;
    let errorMessage = null;

    try {
        console.log('Verifying current Docker environment state...');
        // --- Execute actual Docker environment check here ---

        // 1. Check if Docker is installed
        let res = await checkDockerAvailability(mainWindow);
        console.log('Docker availability check result:', res);
        if (!res) {
            throw new Error('Docker is not available.');
        }
        mainWindow.send('setup-status', { 
            step: 'startDocker',
            message: 'Checking if Docker is running...'
        });
        //判断daoker是否运行
        try {
            console.log('Checking if Docker is running...');
            await checkDockerRunning();

            console.log('Checking if Docker is running...2');
            mainWindow.send('setup-status', { 
                step: 'startDocker',
                message: 'Docker is running.'
            });
        } catch (error) {
            // Installation failed, install docker
            mainWindow.send('setup-status', { 
                step: 'startDocker',
                message: 'Docker is not running.'
            });
            // let res = await installDocker(webContents);
            // console.log('Docker installation result:', res);
            throw new Error('Docker is not started.');
        }
        //2. Run docker 
        // mainWindow.webContents.send('setup-status', { step: 'startDocker', message: `Starting Docker` });
        // res = await attemptStartDocker()
        // Delay for 3 seconds
        // await new Promise(resolve => setTimeout(resolve, 10000));
        mainWindow.webContents.send('setup-status', { step: 'checkDockerImages', message: `Checking required Docker images` });
        dockerEnvironmentIsActuallyReady = await checkDockerEnvironmentReady();
        console.log('Required Docker image ready:', dockerEnvironmentIsActuallyReady);

        // If both checks pass, the environment is ready
        if (dockerEnvironmentIsActuallyReady) {
             console.log('Docker environment is ready.');
             mainWindow.webContents.send('setup-status', { step: 'complete', message: `Docker image ${REQUIRED_DOCKER_IMAGE} is ready.` });
        } else {
            console.log('Docker environment is not ready');
            // Image not detected, start image download and installation
            // Full path to the locally saved image package

            // const downloadedFilePath = path.join(userDataPath, getDockerImageFileName());

            // 3. Download Docker image file
            // mainWindow.webContents.send('setup-status', { step: 'downloading', message: `Downloading image package ${getDockerImageFileName()}...`, progress: 0 });
            // Use the refined URL
            // await downloadFile(DOCKER_IMAGE_TAR_URL, downloadedFilePath, (progress) => {
            //         console.log(`Download progress: ${progress}%`);
            //         mainWindow.webContents.send('setup-status', { step: 'downloading', message: `Downloading image package ${getDockerImageFileName()}...`, progress: progress });
            // });
            // 4. Import Docker image
            // mainWindow.webContents.send('setup-status', { step: 'checkDockerImages', message: `Importing Docker image ${REQUIRED_DOCKER_IMAGE}...` });
            // await importDockerImage(downloadedFilePath);
            // 5. Mark setup as complete
            mainWindow.webContents.send('setup-status', { step: 'complete', message: `Docker image ${REQUIRED_DOCKER_IMAGE} is not ready.` });

            store.set(DOCKER_SETUP_DONE_KEY, false);
            dockerEnvironmentIsActuallyReady = false;
        }


    } catch (error) {
        // Catch any errors that occur during the check (e.g., Docker not running, Docker command not found, etc.)
        console.error('Docker environment verification failed:', error);
        errorMessage = `Docker environment check failed: ${error.message || error}`;
        dockerEnvironmentIsActuallyReady = false; // Check failed, environment not ready
    }

    // --- Decide which page to load based on the actual check result ---
    if (dockerEnvironmentIsActuallyReady) {
        console.log('Loading main window as Docker environment is ready.');
        // If the actual environment is ready, ensure the state in the store is also true
        if (!initialSetupDone) { // Only write if store is false to avoid unnecessary writes
             store.set(DOCKER_SETUP_DONE_KEY, true);
             console.log('Updated store: DOCKER_SETUP_DONE_KEY set to true.');
        }

        if (process.env.NODE_ENV === 'development') {
            mainWindow.loadURL('http://localhost:5005');
        } else {
            mainWindow.loadFile(path.join(__dirname, 'renderer/main_window/index.html'));
        }
    } else {
        console.log('Loading setup page as Docker environment is NOT ready.');
        // If the actual environment is not ready, ensure the state in the store is false
        if (initialSetupDone) { // Only write if store is true
             store.set(DOCKER_SETUP_DONE_KEY, false);
             console.log('Updated store: DOCKER_SETUP_DONE_KEY set to false.');
        }
    }
}



// --- Export the functions needed by main.js ---
export {
    initDockerSetupService,
    checkAndRunDockerSetup,
    DOCKER_SETUP_DONE_KEY,
    checkSystem,
    checkDockerInstall,
    checkDockerRunning,
    checkDockerEnvironmentReady,
    attemptStartDocker
};