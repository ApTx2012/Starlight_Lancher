<div align="center">
  <img src="./apps/app/icons/128x128.png" width="128" height="128" alt="Starlight Launcher Logo" />
  <h1>Starlight Launcher</h1>
  <p><strong>StarLight Server 官方定制 Minecraft 启动器 —— 为星光玩家打造的一站式游戏体验。</strong></p>

  <p>
    <a href="https://github.com/ApTx2012/Starlight_Lancher/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/ApTx2012/Starlight_Lancher/axolotl-ci.yml?style=for-the-badge&logo=github" alt="Desktop CI" />
    </a>
    <a href="https://github.com/ApTx2012/Starlight_Lancher/releases">
      <img src="https://img.shields.io/github/downloads/ApTx2012/Starlight_Lancher/total?style=for-the-badge&logo=github" alt="Downloads" />
    </a>
    <a href="https://github.com/ApTx2012/Starlight_Lancher/stargazers">
      <img src="https://img.shields.io/github/stars/ApTx2012/Starlight_Lancher?style=for-the-badge&logo=github&color=ffb800" alt="Stars" />
    </a>
    <a href="COPYING.md">
      <img src="https://img.shields.io/badge/License-GPL_3.0-blue.svg?style=for-the-badge" alt="License" />
    </a>
  </p>

  <p>
    <a href="https://github.com/ApTx2012/Starlight_Lancher/releases/latest">下载最新版</a> ｜
    <a href="https://www.starlight.cool/">StarLight 官网</a> ｜
    <a href="https://sls.wiki/">服务器 Wiki</a> ｜
    <a href="https://skin.starlight.cool/">皮肤站</a>
  </p>
</div>

---

## 简介

**Starlight Launcher** 是基于 [Axolotl Launcher](https://github.com/Mystic-Stars/Axolotl) 深度定制的 Minecraft Java 版桌面启动器，专为 **[StarLight Server](https://www.starlight.cool/)**（星光服务器）玩家量身打造。

在保留 Axolotl 全部核心能力的基础上，Starlight Launcher 进行了面向 SLS 生态的二开与创新：

- **SLS 专属集成** —— 预置 StarLight Server 连接配置，开箱即用，无需手动填入服务器地址。
- **皮肤站无缝对接** —— 内置 [SLS 皮肤站](https://skin.starlight.cool/) 快捷入口，换装更方便。
- **Wiki 深度链接** —— 一键跳转 [SLS Wiki](https://sls.wiki/)，查阅服务器规则、玩法指南与历史。
- **定制化视觉体验** —— 围绕 StarLight 品牌重新设计主题与配色，为星光玩家带来统一的视觉语言。
- **持续跟进上游更新** —— 同步 Axolotl Launcher 的功能迭代与 Bug 修复，保障长期可用性。

## 关于 StarLight Server

**StarLight Server（SLS）** 是 [The Land of StarLight（TLSL）](https://sls.wiki/) 旗下的 Minecraft 综合服务器，始建于 2014 年，前身为 2012 年的凋灵服务器（TWS）。

| 特性 | 说明 |
|---|---|
| **高性能硬件** | AMD 9950X（16 核 4.4GHz 锁频）、128GB DDR4、三星 990Pro SSD |
| **多版本兼容** | Java 版 1.9.X ~ 1.21.X，以及基岩版跨版本接入 |
| **生电 + 生存分离** | 外服提供领地系统供休闲玩家，内服面向硬核生电玩家 |
| **完善的防熊机制** | 领地保护 + 内外服审核分离，守护你的每一块方块 |

> 加入 [StarLight 官网](https://www.starlight.cool/) 了解更多信息，或通过官网指引加入审核群获取白名单。

## 核心功能

| 功能 | 描述 |
|---|---|
| **Modrinth + CurseForge 集成** | 在启动器内浏览、安装、更新模组、整合包、资源包与光影 |
| **实例管理** | 轻松创建、导入和管理多个游戏实例，支持符号链接导入 |
| **多账户认证** | Microsoft 登录、离线账户、Yggdrasil 认证（LittleSkin 预设 + 自定义服务器） |
| **个性化主题** | 亮色 / 暗色 / OLED / 跟随系统，自定义强调色、背景与透明度 |
| **Axolotl 实验室** | 内置种子地图、渐变文字生成器、3D 投影工坊等实用工具 |
| **自动更新** | 基于 Tauri 签名校验，后台静默更新，无需手动操作 |
| **跨平台** | 原生支持 Windows、macOS（Intel & Apple Silicon）及主流 Linux 发行版 |

## 下载与安装

前往 [GitHub Releases](https://github.com/ApTx2012/Starlight_Lancher/releases/latest) 下载适合你操作系统的最新版本。

| 系统平台 | 推荐下载 |
|---|---|
| **Windows** (10/11 x64) | `.exe` (NSIS) 安装程序 |
| **macOS** | 通用 `.dmg` 镜像 |
| **Linux** (x64) | `.AppImage` / `.deb` / `.rpm` |

<details>
<summary><b>Linux 包管理器安装</b></summary>

**Arch Linux (AUR)**：

```bash
# 源码构建版
yay -S starlight-launcher

# 预编译版
yay -S starlight-launcher-bin
```

**Debian / Ubuntu (APT)**：

```bash
curl -fsSL https://ppa.axlmc.org/setup.sh | sudo bash
sudo apt install starlight-launcher
```

</details>

## 参与开发

Starlight Launcher 的进步离不开社区的支持。

- 遇到 Bug 或有功能建议？欢迎提交 [Issue](https://github.com/ApTx2012/Starlight_Lancher/issues)
- 想贡献代码？请先阅读 [贡献指南 (CONTRIBUTING.md)](CONTRIBUTING.md) 与 [行为准则 (CODE_OF_CONDUCT.md)](CODE_OF_CONDUCT.md)

## 许可证

本项目基于 **GPL-3.0** 许可证开源。详见 [COPYING.md](COPYING.md)。

## 致谢

- **[Axolotl Launcher](https://github.com/Mystic-Stars/Axolotl)** —— Starlight Launcher 的上游项目，感谢 Mystic-Stars 团队提供的优秀开源基础。
- **[Modrinth](https://github.com/modrinth/code)** —— Axolotl Launcher 的原始构建基础。
- 所有 [StarLight Server](https://www.starlight.cool/) 的玩家与贡献者 —— 你们是星光持续闪耀的动力。

---

<div align="center">
  <p>
    <strong>StarLight Server · The Land of StarLight</strong><br>
    <a href="https://www.starlight.cool/">官网</a> · <a href="https://sls.wiki/">Wiki</a> · <a href="https://skin.starlight.cool/">皮肤站</a>
  </p>
  <p><sub>本项目是调用 Modrinth 公开 API 的独立客户端，与 Rinth, Inc. 无任何关联。</sub></p>
</div>
