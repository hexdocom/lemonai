
async function checkSystem() {
    return await electronAPIivoke("checkSystem")
}

async function checkDockerInstall(){
    return await electronAPIivoke("checkDockerInstall")
}
async function checkDockerRunning(){
    return await electronAPIivoke("checkDockerRunning")
}

async function checkDockerEnvironmentReady(){
    return await electronAPIivoke("checkDockerEnvironmentReady")
}
async function attemptStartDocker(){
    return await electronAPIivoke("attemptStartDocker")
}
async function electronAPIivoke(key,args=undefined ){
    return await window.electronAPI.invoke(key,args)
}




export {
    checkSystem,
    checkDockerInstall,
    checkDockerRunning,
    checkDockerEnvironmentReady,
    attemptStartDocker
}