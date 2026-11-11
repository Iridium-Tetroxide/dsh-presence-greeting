# dsh-presence

> 社区维护的第三方插件，与 DeepSeek AI 无隶属关系，也不是官方项目。

给 [DeepSeek Harness](https://github.com/deepseek-ai) 用的「在线状态」插件：判断你是不是坐在电脑前，并在你离开后回来时，按需在指定会话里自动发一条问候。

判定来源有三种，可以任意组合：

- **红外存在传感器** —— 通过 Windows HID 传感器集合 V2 暴露的 `Windows.Devices.Sensors.HumanPresenceSensor` 读取「有人 / 无人」和距离（毫米）。
- **摄像头测距** —— 用普通 RGB 摄像头 + OpenCV Haar 人脸检测，按「人脸像素宽度」估算距离；和传感器共用同一组距离阈值。
- **键盘鼠标** —— `GetLastInputInfo` 读取系统空闲时间，键盘和鼠标共用一条计时，任意一边有操作都算在线。

## 功能

- 离开 / 回来的判定来源可勾选，**勾选的来源必须同时满足**才切换状态；未启用或本机不可用的来源自动跳过。
- 距离判定带滞回（默认 200 cm 离开 / 100 cm 回来），键鼠判定带「回来」阈值（默认 0 秒 = 一有操作就回来）。
- 主动搭话可单独关闭：关掉后仍照常检测在线状态，只是不发送消息。
- 问候会话从工作区里选，按工作区分组、显示**会话名称**；问候语支持 `{away}` / `{awaySeconds}` 占位符。
- 传感器缺失、摄像头被遮挡、Python 依赖没装好都会优雅降级，不会误判成离开。

## 工作原理

```
index.js (Host 插件)
├── bridge.ps1   PowerShell 子进程 → NDJSON：传感器读数 + 键鼠空闲
├── camera.py    Python 子进程   → NDJSON：人脸框 + 估算距离
├── 判定引擎      证据状态机 away / present / hold / disabled / unavailable
└── 问候          sessionController.prompt() 注入目标会话
client.js (设置页)  ←同源 fetch→  /dsh-presence/{state,sessions,config,test-greeting}
```

- PowerShell / Python 只负责采集原始数据，阈值、规则、滞回、问候都在 Host 侧计算，改配置不需要重启脚本。
- 证据是五态的：`hold`（处于滞回带 / 刚离开）会阻塞状态切换；`disabled`、`unavailable` 会被跳过，因此缺硬件的机器仍然可用。
- 问候通过 `sessionController.prompt` 注入，等价于用户在那个会话里发了一条普通消息，会话助手会自然回应。

## 安装

### 通过 DSH CLI 安装（推荐）

```bash
dsh plugin --profile web add github:Iridium-Tetroxide/dsh-presence
```

如果这个包以后发布到了 npm，也可以直接用包名：

```bash
dsh plugin --profile web add dsh-presence
```

仓库地址：https://github.com/Iridium-Tetroxide/dsh-presence

### 本地目录安装

要求：Windows 10/11（HID 传感器与键鼠检测都依赖 Windows），DeepSeek Harness 带 `plugin_manager`。

把本仓库放到任意目录，然后在 Harness 里执行：

```
plugin_manager action:install_bundle target:<本仓库绝对路径>
```

也可以用源码目录直接安装（Harness 会以软链接方式引用，改代码后禁用/启用插件即可生效）。安装后设置页位于「设置 → 在线状态」。

## 配置项

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| 启用红外传感器 | 开 | 关闭后传感器证据为 `disabled` |
| 启用摄像头测距 | 关 | 用摄像头人脸宽度估算距离 |
| 摄像头设备编号 | 空 | OpenCV 设备索引，留空自动选择 |
| 人脸宽度假设 | 14 厘米 | 像素宽度换算距离用 |
| 摄像头水平视野 | 60 度 | 估算焦距像素用 |
| 无人脸多久判定离开 | 12 秒 | 画面持续没有人脸超过该值才判离开 |
| 检测键鼠使用情况 | 开 | 关闭后键鼠证据为 `disabled` |
| 判定「离开」的距离 | 200 厘米 | 距离 ≥ 该值视为离开 |
| 判定「回来」的距离 | 100 厘米 | 距离 ≤ 该值视为回来；两者之间保持原状态 |
| 判定「离开」的无操作时间 | 600 秒 | 键鼠空闲 ≥ 该值视为离开 |
| 判定「回来」的无操作时间 | 0 秒 | 0 表示键鼠一有操作就判定回来 |
| 判定「离开」的来源 | 全选 | 勾选键鼠 / 传感器 / 摄像头，全部符合才判定离开；一个都不勾 = 永不判定 |
| 判定「回来」的来源 | 全选 | 同上 |
| 启用主动搭话 | 开 | 关闭后只检测、不发消息 |
| 使用的会话 | 未选择 | 按工作区分组列出会话名称 |
| 问候提示词 | `我回来了，刚才离开了大约 {away}。` | 作为普通用户消息发到目标会话 |
| 问候冷却 | 120 秒 | 两次自动问候的最小间隔 |
| 采样间隔 | 500 毫秒 | 采集进程轮询间隔 |

## 摄像头依赖

摄像头测距需要 Python 3 与 OpenCV。依赖可以装进插件目录下的 `pydeps/`，不必污染系统 Python：

```powershell
python -m pip install --target .\pydeps -r requirements.txt
```

Host 启动 `camera.py` 时按以下顺序找 Python，并把 `pydeps` 加进 `PYTHONPATH`：

1. 环境变量 `DSH_PYTHON`
2. `DSH_HOME/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe`
3. PATH 上的 `python`

没有装好时插件照常运行，设置页会显示摄像头不可用。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/dsh-presence/state` | 当前判定、各来源证据、传感器读数、键鼠空闲、采集进程、上次问候 |
| GET | `/dsh-presence/sessions` | 可选会话（含名称）与工作区 |
| POST | `/dsh-presence/config` | 保存配置（写入 profile 的 `cordis.patch.yml`） |
| POST | `/dsh-presence/test-greeting` | 向当前选中会话试发一次问候 |

## 已知限制

- **不是所有机器都有红外存在传感器。** 没有时 `HumanPresenceSensor` 返回 null，插件自动降级为「传感器不可用」，可改用键鼠和摄像头。
- **Windows Hello 的红外摄像头不能被普通程序打开。** 它只注册在 `KSCATEGORY_SENSOR_CAMERA` 下，所以摄像头测距用的是 RGB 摄像头；距离是估算值，需要按坐姿校准「人脸宽度假设」和「水平视野」。
- **摄像头是单消费者设备。** 插件占用摄像头时，其它程序只能拿到黑帧。
- 画面几乎没有细节（物理快门关闭、镜头遮挡、环境过暗）时按「被遮挡 → 不可用」处理，不会误判离开。
- 同时勾选键鼠和摄像头时，离开时间由键鼠的 600 秒主导，摄像头只可能更早判定「有人」。
- 目标会话的工作区目录不存在时不会发送，会在状态里报错。

## 目录结构

```
index.js             Host 插件：配置、证据状态机、子进程管理、HTTP 路由
client.js            设置页（React，注册到 settings.section）
bridge.ps1           WinRT 存在传感器 + GetLastInputInfo 采集，输出 NDJSON
camera.py            OpenCV 人脸检测与距离估算，输出 NDJSON
cordis.patch.yml     bundle 补丁：插入插件行与默认配置
package.json         包元数据（dsh.bundle / dsh.client）
locale/              插件标题与描述（en / zh）
icon.svg             设置页图标
requirements.txt     摄像头依赖
```

## 关于

- 这是一个社区插件，按 DeepSeek Harness Plugin 规范实现：Host 侧 `index.js` 导出 `apply(ctx)` 与 `inject`，Client 侧 `client.js` 通过 `dsh.client` 注册设置页。
- 仓库 topic 标注为 `dsh-plugin`，便于插件目录扫描。
- 与 DeepSeek AI 无隶属关系，不代表官方立场。

## 许可证

本仓库暂未附带开源许可证。上传到 GitHub 前可按需要添加（例如 MIT、Apache-2.0）。
