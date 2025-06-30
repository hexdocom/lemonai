
# Lemon AI​ is the first Full-stack, Open-source, Agentic AI framework, offering a ​fully local alternative​ to platforms like Manus & Genspark AI. It features an integrated Code Interpreter VM sandbox for safe execution.​​

<div align=center>
  <img src="./public/img/Lemon_logo.png" width="400">
</div>
<p align="center">
  <a href="https://lemon-11.gitbook.io/lemonai">Get to know Lemon AI quickly</a> ·
  <a href="https://lemon-11.gitbook.io/lemonai/development-deployment-guidelines/docker-quick-deployment">Docker Quick Deployment</a> ·
  <a href="https://lemon-11.gitbook.io/lemonai/">Documentation</a> ·
  <a href="https://lemonai.cc/">Download the desktop app for macOS & Windows</a> ·
</p>

<p align="center">
  <a href="./README.md"><img alt="README in English" src="https://img.shields.io/badge/English-d9d9d9"></a>
  <a href="./README_CN.md"><img alt="简体中文版自述文件" src="https://img.shields.io/badge/简体中文-d9d9d9"></a>
</p>

**Lemon AI​** is the first **​full-stack, open-source, agentic AI framework**, offering a **​fully local alternative​** to platforms like **Manus & Genspark AI. It features an integrated Code Interpreter VM sandbox for safe execution**.​​

**​Lemon AI empowers deep research, web browsing, viable coding, and data analysis – running entirely on your local hardware.​​** It supports ​**planning, action, reflection, and memory​** functionalities using **​local LLMs**​ (like DeepSeek, Qwen, Llama, Gemma) via **Ollama**, ensuring **​complete privacy and zero cloud dependency.**

For enhanced security, Lemon AI operates within a ​**local Virtual Machine (VM) sandbox.** This sandbox **​protects your machine's files and operating system​** by safely handling all code writing, execution, and editing tasks.

Additionally, Lemon AI provides the **​flexibility to configure enhanced results**​ using APIs from leading cloud models like **​Claude, GPT, Gemini, and Grok.**

<a href="https://youtu.be/OmU_4rrZUHE?si=iseqOl5TV2n2kovy">
  <figure>
    <img src="./public/img/githubvideo.png" alt="">
  </figure>
</a>

### function and characteristic
The world's first full-stack open-source AI Agentic framework with comprehensive capabilities
#### Multi: Infinite possibilities
Universal AI Agent capabilities supporting unlimited task scenarios, including:
- Deep search & research reports
- Code generation & data analysis
- Content creation & document processing
Supports experience repository for self-learning and extending enterprise-specific customizations.

**Deployment options:** Open source code, Container, Client application, Online subscription - compatible with cloud/local/all-in-one systems

#### Fast: Rapid Deploy
One-click deployment for immediate usage with minimal technical requirements:
- Simplified installation process for all deployment options
- Quick setup without complex configurations
- Ready-to-use system within minutes

Supporting various deployment environments from personal computers to enterprise servers, with comprehensive documentation for smooth implementation.

#### Good: Powerful & Flexibility
Feature-rich framework with extensive capabilities:
- Virtual machine integration
- Code generation & execution
- Browser operations & web search
- Multi-tool integration

Highly adaptable architecture allows for custom modifications and extensions to fit specific business requirements and integration with existing systems.

#### Economic: Same quality，10x cheaper
Dramatically reduced operational costs:
- Task execution costs 1/10 - 1/100 of other agent products
- Open source subscription model
- Based on open source DeepSeekV3 model

Significant cost savings without compromising on quality or performance, making advanced AI capabilities accessible to organizations of all sizes.

### Using Lemon

* Quickly get Lemon running in your environment with this starter guide. Use our [documentation](https://document.lemonai.cc/) for further references and more in-depth instructions.

### System Requirements[​](https://docs.all-hands.dev/modules/usage/installation#system-requirements) <a href="#system-requirements" id="system-requirements"></a>

* MacOS with [Docker Desktop support](https://docs.docker.com/desktop/setup/install/mac-install/#system-requirements)
* Linux
* Windows with [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) and [Docker Desktop support](https://docs.docker.com/desktop/setup/install/windows-install/#system-requirements)

A system with a modern processor and a minimum of **4GB RAM** is recommended to run Lemon.

### Prerequisites <a href="#prerequisites" id="prerequisites"></a>

#### MacOS

**Docker Desktop**

1. [Install Docker Desktop on Mac](https://docs.docker.com/desktop/setup/install/mac-install).
2. Open Docker Desktop, go to `Settings > Advanced` and ensure `Allow the default Docker socket to be used` is enabled.

#### Linux

Tested with Ubuntu 22.04.

**Docker Desktop**

1. [Install Docker Desktop on Linux](https://docs.docker.com/desktop/setup/install/linux/).

#### Windows

**WSL**

1. [Install WSL](https://learn.microsoft.com/en-us/windows/wsl/install).
2. Run `wsl --version` in powershell and confirm `Default Version: 2`.

**Docker Desktop**

1. [Install Docker Desktop on Windows](https://docs.docker.com/desktop/setup/install/windows-install).
2. Open Docker Desktop, go to `Settings` and confirm the following:

* General: `Use the WSL 2 based engine` is enabled.
* Resources > WSL Integration: `Enable integration with my default WSL distro` is enabled.

**note**

The docker command below to start the app must be run inside the WSL terminal.

### Start the App <a href="#start-the-app" id="start-the-app"></a>

The easiest way to run Lemon is in Docker.

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

#### Contributing

For those who'd like to contribute code, see our [Contribution Guide](https://github.com/hexdocom/lemon/blob/main/CONTRIBUTING.md). At the same time, please consider supporting Lemon by sharing it on social media and at events and conferences.

### Community & contact

We welcome your contribution to lemon to help improve lemon. Include: submit code, questions, new ideas, or share interesting and useful AI applications you have created based on lemon. We also welcome you to share lemon at different events, conferences and social media.

* [GitHub Issues](https://github.com/hexdocom/Lemon/issues).Best for: bugs you encounter using Lemon.AI, and feature proposals. See our [Contribution Guide](https://github.com/hexdocom/lemon/blob/main/CONTRIBUTING.md).
* [X(Twitter)](https://x.com/LemonAI_cc). Best for: sharing your applications and hanging out with the community.
* [Discord](https://discord.gg/nQVE5mBy). Best for: sharing your applications and hanging out with the community.
* commercial license（[service@hexdo.com](mailto:service@hexdo.com)）. Business consulting on commercial use licensing lemon.

### Star History

[![Star History Chart](https://api.star-history.com/svg?repos=hexdocom/lemonai&type=Date)](https://www.star-history.com/#hexdocom/lemonai&Date)

### Security disclosure

To protect your privacy, please avoid posting security issues on GitHub. Instead, send your questions to [service@hexdo.com](mailto:service@hexdo.com) and we will provide you with a more detailed answer.

### License

This repository is available under the [Lemon Open Source License](https://github.com/hexdocom/lemon/blob/main/LICENSE), which is essentially Apache 2.0 with a few additional restrictions.
