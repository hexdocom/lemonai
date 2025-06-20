# README_CN

<div align=center>
  <img src="./public/img/Lemon_logo.png" width="400">
</div>

Lemon 提供 macOS 和 Windows 桌面应用程序，你可以在官网 [www.lemonai.cc](https://www.lemonai.cc) 进行下载。

<p align="center">
  <a href="https://lemon-11.gitbook.io/lemon-docs">快速了解 Lemon AI</a> ·
  <a href="https://lemon-11.gitbook.io/lemon-docs/kai-fa-bu-shu-zhi-nan/docker-kuai-su-bu-shu">Docker快速部署</a> ·
  <a href="https://lemon-11.gitbook.io/lemon-docs">文档</a> ·
</p>

<p align="center">
  <a href="./README.md"><img alt="README in English" src="https://img.shields.io/badge/English-d9d9d9"></a>
  <a href="./README_CN.md"><img alt="简体中文版自述文件" src="https://img.shields.io/badge/简体中文-d9d9d9"></a>
</p>

Lemon 是一款开源的General AI Agent通用智能体，能够从需求计划到成果交付全流程自动化，它通过独立思考和系统规划，在虚拟环境中灵活调用各类工具，如编写并执行代码、智能浏览网页、操作网页应用、命令执行等。Lemon 擅长将复杂任务系统化分解并有序执行，自动分析任务、安排步骤优先级、动态调整计划，并实时跟踪进度。旨在助力用户高效完成各类任务。

### 功能与特点

* **复杂任务解决**：Lemon能够解决各类复杂多变的任务，包括但不限于市场调研、文件处理、旅行规划和数据分析。它通过独立思考和系统规划，在虚拟环境中灵活调用各类工具，如编写并执行代码、智能浏览网页、操作网页应用等。
* **自主性和目标导向**：Lemon 具备高度的自主性，能够在无需人类干预的情况下独立完成任务。它能够根据预设目标进行感知、推理、决策和行动。
* **实时任务监控**：用户可以通过页面端实时查看任务的执行状态
* **多场景覆盖**：市场调研、金融分析、数据分析、代码编程、生活规划等领域的复杂任务处理。
* **自订阅模式**：**除默认模型外**，支持自定义模型接入和在线模型接入，通过配置模型API进行使用。

### 使用 Lemon

* 使用这个[入门指南](https://lemon-11.gitbook.io/lemon-docs)快速在您的环境中运行 Lemon。更多参考和详细说明请参阅我们的文档。

### 运行 Lemon

---

#### 系统要求 <a href="#system-requirements" id="system-requirements"></a>

* [支持 Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/#system-requirements)的 MacOS
* Linux
* [支持WSL](https://learn.microsoft.com/en-us/windows/wsl/install)和[Docker Desktop 的](https://docs.docker.com/desktop/setup/install/windows-install/#system-requirements)Windows

建议使用具有现代处理器和至少**4GB RAM的系统来运行 Lemon。**

#### **MacOS**

**Docker 桌面**

1.  [在 Mac 上安装 Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install)。
2.  打开 Docker Desktop，转到`Settings > Advanced`并确保`Allow the default Docker socket to be used`已启用。

#### **Linux**

使用 Ubuntu 22.04 测试。

**Docker 桌面**

1.  [在 Linux 上安装 Docker Desktop](https://docs.docker.com/desktop/setup/install/linux/)。

#### **Windows**

**WSL**

1.  [安装 WSL](https://learn.microsoft.com/en-us/windows/wsl/install)。
2.  `wsl --version`在 powershell 中运行并确认`Default Version: 2`。

**Docker 桌面**

1.  [在 Windows 上安装 Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install)。
2.  打开Docker Desktop，前往`Settings`并确认以下内容：

    * 常规：`Use the WSL 2 based engine`已启用。
    * 资源 > WSL 集成：`Enable integration with my default WSL distro`已启用。

必须在 WSL 终端内运行以下用于启动应用程序的 docker 命令。

### 启动应用程序 <a href="#start-the-app" id="start-the-app"></a>

运行Lemon最简单的方法是使用 Docker。

```bash
docker pull hexdolemonai/lemon-runtime-sandbox:latest

docker run -it --rm --pull=always \
  --name lemon-app \
  --env DOCKER_HOST_ADDR=host.docker.internal \
  --env ACTUAL_HOST_WORKSPACE_PATH=${WORKSPACE_BASE:-$PWD/workspace} \
  --publish 5005:5005 \
  --add-host host.docker.internal:host-gateway \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume ~/.cache:/.cache \
  --volume ${WORKSPACE_BASE:-$PWD/workspace}:/workspace \
  --volume ${WORKSPACE_BASE:-$PWD/data}:/app/data \
  --interactive \
  --tty \
  hexdolemonai/lemon:latest make run
```

#### 贡献

对于那些想要贡献代码的人，请参阅我们的[贡献指南](https://github.com/hexdocom/lemon/blob/main/CONTRIBUTING_CN.md)。同时，请考虑通过社交媒体、活动和会议来支持 Lemon 的分享。

### 社区与支持

---

我们欢迎您为 Lemon 作出贡献，以帮助改善 Lemon。包括：提交代码、问题、新想法，或分享您基于 Lemon 创建的有趣且有用的 AI 应用程序。同时，我们也欢迎您在不同的活动、会议和社交媒体上分享 Lemon。

* [GitHub Issues](https://github.com/hexdocom/lemon/issues)。👉：使用 Lemon 时遇到的错误和问题，请参阅贡献指南
* 电子邮件支持👉：关于使用 Lemon的问题。
* [X(Twitter)](https://x.com/LemonAI_cc)。👉：分享您的应用程序并与社区交流。
* 商业许可。👉：有关商业用途许可 Lemon的商业咨询。

### 安全问题

---

为了保护您的隐私，请避免在 GitHub 上发布安全问题。发送问题至service@hexdo.com我们将为您做更进一步的解答。

### 执照

---

本仓库遵循Lemon Open Source License 协议开源，该许可证本质上是Apache 2.0，但有一些额外的限制。
