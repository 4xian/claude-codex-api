# Codex 配置文档

[English](./CODEX_README_EN.md) | 中文 | [Claude文档](./README.md)
(当前文档为Codex配置介绍，查看Claude Code文档请点击右上角↗️查看)

## 功能特性

- 🔄 **一键切换** - 快速在不同 Codex AI 提供商之间切换
- 🔐 **自动配置** - 自动更新 auth.json 和系统环境变量
- 📊 **延迟测试** - 测试所有提供商的网络延迟
- 🎯 **自动优选** - 自动测试并切换到延迟最低的最优配置
- 🌍 **国际化支持** - 支持中文和英文界面语言切换

## 快速开始

### 1. 配置config.toml

```bash
# 查看当前配置路径（会显示默认路径）
ccapi cx set
# 或使用完整命令
ccapi codex set

# 如果配置文件不在默认位置，可以设置自定义路径
ccapi cx set <path>
例如: ccapi cx set ~/.codex/config.toml

# 也可以在 ~/.ccapi-config.json 中配置 Codex config路径
```json5
{
  "codexConfigPath": "~/.codex/config.toml"
}
```

**Codex官方默认配置config.toml路径：**

- macOS/Linux: `~/.codex/config.toml`
- Windows: `%USERPROFILE%\.codex\config.toml`

**注意：使用切换命令前需要在config.toml文件中配置 api_key 和 models (这两个属性非官方属性，仅ccapi使用)：**

- api_key: 切换环境变量使用
- models: 数组格式，切换不同模型使用

```toml
[model_providers.any]
name = "any"
base_url = "https://anyrouter.top/v1"
env_key = "any"
wire_api = "responses"
requires_openai_auth = true

--需添加下面两项才可正常切换配置--
api_key = "your-api-key"
models = [
  "gpt-5-codex",
  "gpt-5"
]
```

### 2. 查看可用提供商

```bash
ccapi cx ls 或 ccapi codex ls
```

### 3. 切换提供商

切换到指定的 Codex 提供商，可选择性地同时切换模型。

```bash
# 基本切换
ccapi cx use <提供商名称>

# 同时切换模型（使用第2个模型，模型索引从1开始）
ccapi cx use <提供商名称> -m <模型索引>

# 切换到 any 提供商，使用默认模型（第1个）
ccapi cx use any

# 切换到 any 提供商，使用第2个模型
ccapi cx use any -m 2

# 1. 修改配置文件的 `model_provider` 字段为指定的提供商名称
# 2. 如果指定了 `-m`，同时修改 `model` 字段为对应的模型
# 3. 更新 `~/.codex/auth.json` 文件的 `OPENAI_API_KEY` 字段
# 4. 设置系统环境变量（使用提供商的 `env_key` 作为键名）
```

### 4. 测试提供商的URL延迟

```bash
ccapi cx ping
```

### 5. 测试提供商的API是否在Codex Cli中可用

```bash
ccapi cx test
```

### 6. 自动查找最优路线并切换配置

```bash
# 会先进行所有配置测试，然后选择最优的配置进行自动切换，默认以test命令测试的结果为基准切换
ccapi cx auto

# 以ping结果为准进行切换
ccapi cx auto -p

# 以test结果为准进行切换(默认)
ccapi cx auto -t
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
api_key = "key1"
models = ["model1", "model2"]

[model_providers.provider2]
name = "Provider 2"
base_url = "https://api.provider2.com/v1"
env_key = "provider2"
api_key = "key2"
models = ["model3", "model4"]
```

然后使用 `ccapi -cx use provider1` 或 `ccapi -cx use provider2` 切换。
