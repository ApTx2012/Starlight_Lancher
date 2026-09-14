# 托管整合包与增量同步

皮肤站后台的「Mod 管理 → 管理整合包」接收完整 ZIP。上传后产生草稿，先显示新增、修改、删除、覆盖策略、游戏组件和启动参数的变化。管理员选择「认可变更并发布」后，发布状态与审计记录在同一数据库事务提交，用户才可获取该版本。更新时需要选择已有整合包；与当前版本内容相同的 ZIP 不产生新版本。

启动器支持两种实例类型，可在创建页、实例设置或「Mod → 管理整合包」中选择：

- **StarLight 实例**：自动同步 StarLight 服务器发布的变更，游玩 StarLight 服务器必选。首次需要在整合包管理中选定并安装官方整合包；未配置完成时阻止启动。之后联网启动前自动同步，离线启动使用已经安装的版本。
- **本地实例**：跳过 StarLight 同步检查，启动更快，可自选整合包，适合第三方服务器和本地个人游玩。切换为本地时保留已有文件、存档和官方整合包绑定，停止后续自动同步；重新切回 StarLight 后可继续同步。

类型保存在实例配置的 `launch_overrides.instance_mode`（`starlight` / `local`），随配置保存、复制和恢复。不需要数据库结构迁移。兼容没有该字段的旧实例：存在官方整合包绑定则按 StarLight 实例处理，否则按本地实例处理。新建实例默认显式保存为本地类型；从其他启动器导入（包括旧 StarLight / Axolotl 配置）也按本地实例处理。外部关联、共享目录和第三方平台管理的实例不能开启 StarLight 自动同步。

同一实例的类型切换、同步和启动准备互斥，锁保持到游戏进程创建完成。不同实例不互相等待，本地实例启动不请求 StarLight 更新。新手引导在创建方式之前介绍类型选择；创建页、实例设置和 Mod 管理共用类型选择组件。

两端内容切换栏初始为 Mod，保存各自上次选择；新建 StarLight 实例后直接引导到整合包管理。

## ZIP 格式依据

- [HMCL 的 MCBBS 清单实现](https://github.com/HMCL-dev/HMCL/blob/main/HMCLCore/src/main/java/org/jackhuang/hmcl/modpack/mcbbs/McbbsModpackManifest.java)：优先识别 `mcbbs.packmeta`，兼容带 `addons` 的旧 `manifest.json`；安装 `overrides/` 文件，校验 `addon` 的 SHA-1，保留 `force` 策略，解析 CurseForge 文件引用与启动参数。
- [MultiMC 官方导出说明](https://github.com/MultiMC/Launcher/wiki/Export-Instance)：识别 `instance.cfg`、`mmc-pack.json` 的标准组件，以及 `.minecraft/` 或旧 `minecraft/` 内容目录。支持单层或多层外包目录，只允许 ZIP 内有一个明确的实例。
- 两种来源均支持原版、Forge、NeoForge、Fabric、Quilt 主加载器。MultiMC 的自定义 `patches`、`jarmods`、支持库、启动脚本、覆盖 JVM 参数，以及 MCBBS 自定义支持库和未适配组件会明确拒绝。它们需要另外的运行配置适配，不能被静默忽略。

## 差异协议

外部 ZIP 只作为导入格式。服务端生成统一清单：运行组件、启动参数、文件相对路径、SHA-256、字节数、覆盖策略和外部文件引用。对比解压后的内容，不比较 ZIP 二进制、时间戳或压缩率。

每个新增或变化的文件作为一个完整对象传输，未变化文件不下载。这里的粒度是文件级，不是 JAR 内的二进制补丁。对象按 SHA-256 去重；发布版本可直接从任意旧版本更新，不要求逐个应用中间补丁。CurseForge 引用通过启动器现有接口解析并校验下载，复用已有本地文件或缓存。

公共路由前缀为 `/starlight/mod/packs`：

| 请求 | 内容 |
| --- | --- |
| `GET /` | 每个整合包的最新已发布版本 |
| `GET /{packId}` | 指定整合包的最新已发布清单 |
| `GET /files/{releaseId}/{sha256}` | 该已发布版本中存在的文件对象 |
| `GET /admin` | 管理员的草稿和版本记录 |
| `POST /admin/upload?version=...&packId=...` | 上传一个完整 ZIP；新建时省略 `packId` |
| `POST /admin/{id}/publish` | 认可变更、写入审计并发布 |
| `DELETE /admin/{id}` | 撤销未发布草稿 |

数据表为 `launcher_modpack_release` 与 `launcher_modpack_audit`。文件位于 `runtimeUpdatePath` 同级的 `launcher-modpacks/objects`，不能直接挂载为公共静态目录。对象下载必须同时满足已发布状态和清单成员校验。重复发布同一草稿不重复写入审计；发布基线已变化的旧草稿不能发布。

## 本地应用与恢复

实例保存 `.starlight-pack.json` 作为上次同步清单。先验证并缓存全部变动文件，再通过持久化操作记录替换文件；失败或中断后恢复已替换的旧文件和实例配置。安装任务尚未停止时不开始恢复。运行中的游戏禁止同步。

删除只作用于上次清单管理且未被本地修改的文件。存档、截图、日志、备份、个人选项和服务器列表保留；`force=false` 的已修改本地文件也保留，并在手动同步结果中列出。其他用户添加的文件不作为删除目标。内部缓存与备份不会被 ZIP 覆盖，路径越界、大小写冲突、符号链接和 Windows 联接路径会被拒绝。跨版本只改变文件名大小写的更新目前需要新实例。

单次 ZIP 上限 4 GiB，最多 100,000 个条目，单文件最多 2 GiB，总解压大小最多 16 GiB。反向代理如另有限制，应同步配置上传请求上限。对象、历史版本和本地备份目前保留，尚未实现自动回收。

## 验证入口

- 服务端：`gradlew test --tests '*Modpack*'`，覆盖格式识别、内容校验、路径限制、文件差异、策略预览、审核前隔离、重复审核和过期草稿。
- 启动器：`cargo test -p theseus --lib api::pack::hosted::tests`，覆盖路径限制、冲突检测和修改/新增/删除文件的中断恢复。
- 桌面命令与权限：`cargo check -p theseus_gui`。
