# Codex 配置文档

[English](./CODEX_README_EN.md) | 中文 | [Claude文档](./README.md)
**当前文档为Codex配置介绍，查看Claude Code文档请点击右上角↗️查看**

## 功能特性

- 🔄 **一键切换** - 快速在不同 Codex AI 提供商之间切换
- 🔐 **自动配置** - 自动更新 auth.json 和系统环境变量
- 📊 **延迟测试** - 快速同时测试所有中转站延迟以及API配置的可用性
- 🎯 **自动优选** - 自动测试并切换到延迟最低的最优配置
- 🌍 **国际化支持** - 支持中文和英文界面语言切换

## 快速开始

### 1. 配置config.toml

```bash
codex默认使用的配置文件是config.toml，默认路径在：
【windows】C:\Users\Administrator\.codex\config.toml
【mac/linux】~/.codex/config.toml

**注意：使用命令前需要在config.toml文件中配置 api_key 和 model (这两个属性非官方属性，仅ccapi使用)：**

api_key: 数组格式，切换不同环境变量使用
model: 数组格式，切换不同模型使用

```toml
示例:
[model_providers.any]
name = "any"
base_url = "https://anyrouter.top/v1"
env_key = "any"
wire_api = "responses"
requires_openai_auth = true

--需添加下面两项才可正常切换配置--
api_key = [
  "your-api-key1",
  "your-api-key2"
]
models = [
  "gpt-5-codex",
  "gpt-5"
]

# 如果你的codex配置文件不在默认位置，可以设置自定义路径
ccapi cx set <path>
例如: ccapi cx set ~/.codex/config.toml

# 也可以在 ~/.ccapi-config.json 中配置 Codex config路径
```json5
{
  "codexConfigPath": "~/.codex/config.toml"
}

# 查看当前codex配置路径
ccapi cx set
```

### 2. 查看可用提供商

```bash
ccapi cx ls 或 ccapi codex ls
```

### 3. 切换提供商

切换到指定的 Codex 提供商，可选择性地同时切换模型和api_key

```bash
注意切换的名称是model_providers后面的字段，比如[model_providers.any] 则是any，不是配置中的name字段
# 基本切换
ccapi cx use any

# 切换模型 (使用第2个模型，索引从1开始)
ccapi cx use any -m 2

# 切换api_key (使用第2个api_key，索引从1开始)
ccapi cx use any -k 2

# 同时切换模型和api_key（使用第2个模型，第2个api_key，索引从1开始）
ccapi cx use any -m 2 -k 2
```

### 4. 测试提供商的URL延迟

```bash
ccapi cx ping
```

### 5. 测试提供商的api_key在Codex Cli中的有效性

```bash
# 测试所有的提供商的有效性
ccapi cx test

# 测试单个提供商的有效性
ccapi cx test any
```

### 6. 自动查找最优路线并切换配置

```bash
# 会先进行所有配置测试，然后选择最优的配置进行自动切换，默认以test命令测试的结果为基准切换
ccapi cx auto

# 以test结果为准进行切换(默认)
ccapi cx auto -t

# 以ping结果为准进行切换
ccapi cx auto -p

```

### 7. 更新检查

程序自带版本检查，若npm发布新版则在使用过程中会进行更新提示，若不想要提示可在 ~/.ccapi-config.json 文件中新增变量 update: false关闭

```bash
# 自动更新 ccapi 到最新版本
ccapi update
```

### 8. 语言设置 (国际化)

程序支持中英文双语界面，可以根据需要切换显示语言，默认中文：

```bash
# 查看当前语言设置
ccapi lang

# 切换为中文
ccapi lang zh

# 切换为英文
ccapi lang en

# 也可直接在配置文件修改 ~/.ccapi-config.json
{
  "language": "zh"
}
```

### 9. 完整的ccapi-config.json配置

该文件是ccapi使用的配置文件，可在此进行选项配置，具体文件在 ~/.ccapi-config.json。

```bash
{
  # settings.json文件路径
  "settingsPath": "~/.claude/settings.json",
  # api配置文件路径
  "apiConfigPath": "/Users/4xian/Desktop/api.json5",
  # codex配置文件路径(可选)
  "codexConfigPath": "~/.codex/config.toml",
  # ping命令超时时间
  "pingTimeout": 30000,
  # test命令超时时间
  "testTimeout": 100000,
  # ping、test命令返回结果显示
  "testResponse": true,
  # 是否需要更新提示
  "update": true,
  # 使用use命令时是否同步修改系统环境变量
  "useNoEnv": true,
  # 界面语言设置 (zh: 中文, en: 英文)
  "language": "zh"
}
```

## 常见问题

### Q1: 配置文件不存在怎么办？

**A:** ccapi 会自动检测默认路径。如果配置文件不存在，会提示错误并显示默认路径。你需要：

1. 确保 Codex 已安装并初始化
2. 或者手动创建配置文件
3. 使用 `ccapi -cx set` 指定自定义路径

### Q2: 切换后为什么不生效？

**A:** 环境变量需要重启终端才能生效。请：

1. 关闭当前终端
2. 打开新终端
3. 验证环境变量：`echo xxx`（替换为你的 env_key）

### Q3: 如何管理多个提供商？

**A:** 在配置文件的 `model_providers` 中添加多个提供商：

```toml
[model_providers.provider1]
name = "Provider 1"
base_url = "https://api.provider1.com/v1"
env_key = "provider1"
api_key = ["key1"]
model = ["model1", "model2"]

[model_providers.provider2]
name = "Provider 2"
base_url = "https://api.provider2.com/v1"
env_key = "provider2"
api_key = ["key2"]
model = ["model3", "model4"]
```

然后使用 `ccapi -cx use provider1` 或 `ccapi -cx use provider2` 切换。
