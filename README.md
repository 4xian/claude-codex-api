# @4xian/ccapi

[English](./README_EN.md) | 中文 | [Codex文档](./CODEX_README.md)

一个Claude 和 Codex 配置管理工具，一键切换多个中转站API配置；
一键切换系统环境变量，一键测试API延迟，一键测试API有效性，自动择优线路切换与国际化支持。
**当前文档为Claude Code配置介绍，Codex文档请点击右上角↗️查看**

## 功能特性

- 🚀 **一键切换** - 轻松在不同 Claude / Codex API 配置间切换
- 🌐 **环境变量管理** - 一键设置API配置到系统环境变量
- ⚡ **延迟测试** - 快速同时测试所有中转站延迟以及API配置的可用性
- 🎯 **自动优选** - 自动测试并切换到延迟最低的最优配置
- 📄 **多格式支持** - 支持 JSON、JSON5、YAML、TOML 配置文件
- 🌍 **国际化支持** - 支持中文和英文界面语言切换

## 安装

### 全局安装（推荐）

```bash
# 安装
npm install -g @4xian/ccapi

# 卸载
npm uninstall -g @4xian/ccapi
```

## 使用方法

### 1. 查看版本

```bash
ccapi -v
```

### 2. 设置配置文件路径

初次使用需要设置Claude Code的settings.json 文件路径和自定义API配置文件路径：

```bash
# windows 默认settings.json路径在 C:\Users\Administrator\.claude\settings.json
# mac 默认settings.json路径在 ~/.claude/settings.json
# 若无settings.json文件可自己创建一个

# 三种方式设置路径(例如)：
1. mac同时设置两个路径
ccapi set --settings ~/.claude/settings.json --api /Users/4xian/Desktop/api.json5

2.分别设置
ccapi set --settings ~/.claude/settings.json
ccapi set --api /Users/4xian/Desktop/api.json5

3.直接在配置文件中修改路径
# (若无 .ccapi-config.json 文件可自己创建一个)
在 ~/.ccapi-config.json 文件中(与.claude同级)，有存储路径的变量，直接修改即可
  {
    "settingsPath": "~/.claude/settings.json",
    "apiConfigPath": "/Users/4xian/Desktop/api.json5",
  }

# 查询当前设置的配置文件路径
ccapi set
```

### 3. 重要：自定义API配置文件格式(注意格式要配置正确)

支持多种配置文件格式：**JSON、JSON5、YAML、TOML**
创建一个配置文件（如 `api.json`、`api.yaml`、`api.json5` 或 `api.toml`），格式如下：

**JSON5 格式示例：**

```json5
{
  "openrouter": {
    "url": "https://api.openrouter.ai",
    "token": "your-auth-token",
    "model": "claude-sonnet-4-20250514",
    "fast": "claude-3-5-haiku-20241022",
    "timeout": 600000,
    "tokens": 65000
  },
  // 推荐使用数组形式，可进行多个配置
  "multiconfig": {
    "url": [
      "https://api.example1.com",
      "https://api.example2.com"
    ],
    "token": [
      "token1-for-auth",
      "token2-for-auth"
    ],
    "model": [
      "claude-sonnet-4-5-20250929",
      "claude-sonnet-4-20250514"
    ]
  }
}
```

**YAML 格式示例：**

```yaml
openrouter:
  url: "https://api.openrouter.ai"
  token: "your-auth-token"
  model: "claude-sonnet-4-20250514"
  fast: "claude-3-5-haiku-20241022"
  timeout: 600000
  tokens: 65000

multiconfig:
  url:
    - "https://api.example1.com"
    - "https://api.example2.com"
  token:
    - "token1-for-auth"
    - "token2-for-auth"
  model:
    - "claude-sonnet-4-5-20250929"
    - "claude-sonnet-4-20250514"
```

**字段说明：**
【不同厂商提供的可能是key, 也可能是token, 若不能使用可将key和token互换一下】
【本工具只提供快速切换环境变量的功能，因此只支持Anthropic格式的配置, 只要Claude Code能用就都可以】

- `url`: API厂商服务器地址（必需）
  - **字符串格式**: 直接指定一个URL
  - **数组格式**: 可指定多个URL，支持通过索引切换
- `key`: API_KEY（key 和 token 同时只需要一个）
  - **字符串格式**: 直接指定一个API Key
  - **数组格式**: 可指定多个API Key，支持通过索引切换
- `token`: AUTH_TOKEN（key 和 token 同时只需要一个）
  - **字符串格式**: 直接指定一个Auth Token
  - **数组格式**: 可指定多个Auth Token，支持通过索引切换
- `model`: 模型名称（非必需，默认claude-sonnet-4-20250514）
  - **字符串格式**: 直接指定一个模型
  - **数组格式**: 可指定多个模型，支持通过索引切换
- `fast`: 快速模型名称（非必需，默认claude-3-5-haiku-20241022）
  - **字符串格式**: 直接指定一个快速模型
  - **数组格式**: 可指定多个快速模型，支持通过索引切换
- `timeout`: 请求超时时间（非必需，默认为官方600000ms）
- `tokens`: 最大输出令牌数（非必需，默认以官方为准）
- `http`: 为网络连接指定 HTTP 代理服务器
- `https`: 为网络连接指定 HTTPS 代理服务器

### 4. 列举api配置文件中的可用配置

```bash
ccapi ls 或者 ccapi list
```

**显示说明：**

- 带`*`号的配置表示当前正在使用
- 对于数组格式的 url/key/token/model/fast，会显示索引编号

### 5. 自由切换配置 (切换后重启Claude Code终端才会生效!!!)

#### 基本切换

```bash
# 切换到指定配置（使用默认模型，配置若为数组，则默认使用第一个）
ccapi use openrouter

# 对于字符串格式的 model/fast，直接切换
ccapi use anyrouter
```

#### 高级切换（适用于数组格式）

```bash
# 切换到 multiconfig 配置，并使用第一个url,第一个token,第2个模型，第1个快速模型
ccapi use multiconfig -u 1 -t 1 -m 2 -f 1

# 只切换某些字段的索引
ccapi use multiconfig -k 1      # 只切换到某个Key
ccapi use multiconfig -t 2      # 只切换到某个Token
ccapi use multiconfig -u 1      # 只切换到某个URL
ccapi use multiconfig -m 3      # 只切换到某个Model
ccapi use multiconfig -f 2      # 只切换到某个Fast Model索引
```

#### 完全清除配置

```bash
# 同时清除 settings.json 和系统环境变量中的所有当前配置
ccapi clear
```

**参数说明：**

- `-u <index>`: 指定要使用的URL索引（从1开始计数）
- `-k <index>`: 指定要使用的Key索引（从1开始计数）
- `-t <index>`: 指定要使用的Token索引（从1开始计数）
- `-m <index>`: 指定要使用的模型索引（从1开始计数）
- `-f <index>`: 指定要使用的快速模型索引（从1开始计数）
- 对于字符串格式的配置，会自动忽略索引参数
- 不指定索引时默认使用数组的第一个元素
- 可以任意组合使用这些参数
- 该命令同时会修改系统环境变量，即settings.json和系统变量同时修改，若不想修改系统环境变量可在 ~/.ccapi-config.json 文件中(与.claude同级)，增加字段 useNoEnv: false 即可

```bash
  {
    "settingsPath": "~/.claude/settings.json",
    "apiConfigPath": "/Users/4xian/Desktop/api.json5",
    "useNoEnv": false
  }
```

### 6. 系统环境变量管理

环境变量功能允许你将配置设置到系统环境变量中

#### 查看当前环境变量状态

```bash
# 显示当前系统中已设置的 Claude Code 相关环境变量
ccapi env
```

显示示例：

```text
当前系统环境变量: openrouter

  CCAPI_CURRENT_CONFIG: openrouter
  ANTHROPIC_BASE_URL: https://api.openrouter.ai
  ANTHROPIC_AUTH_TOKEN: your-auth-token...
  ANTHROPIC_MODEL: claude-sonnet-4-20250514
  ANTHROPIC_SMALL_FAST_MODEL: claude-3-5-haiku-20241022
```

#### 设置配置到环境变量

```bash
# 基本设置
ccapi env openrouter

# 指定数组索引（适用于数组配置）
ccapi env multiconfig -u 1 -k 2 -t 1 -m 2 -f 1
```

**参数说明：**

- `-u <index>`: 指定要使用的URL索引（从1开始计数）
- `-k <index>`: 指定要使用的Key索引（从1开始计数）
- `-t <index>`: 指定要使用的Token索引（从1开始计数）
- `-m <index>`: 指定要使用的模型索引（从1开始计数）
- `-f <index>`: 指定要使用的快速模型索引（从1开始计数）

#### 清除环境变量

```bash
# 清除当前配置相关的所有系统环境变量
ccapi env clear
```

#### 完全清理

```bash
# 同时清除 settings.json 和系统环境变量中的所有当前配置
ccapi clear
```

### 7. 网络延迟测试 (Ping)

快速测试配置中所有中转站 URL 的网络延迟（仅测试网络连通性，不验证 API 可用性）。

```bash
# 测试所有配置
ccapi ping

# 测试指定配置
ccapi ping openrouter
```

### 8. 测试API可用性

测试中转站API配置在Claude Code中是否可用，可以真实的反映出配置是否有效

```bash
# 测试所有配置
ccapi test

# 测试指定配置
ccapi test openrouter

# 使用 Claude Code CLI 方式测试（更准确，但速度较慢）
ccapi test -c
ccapi test -c openrouter
```

**测试方式说明：**

- **默认方式**：使用接口模拟方式，直接模拟Claude CLI请求，速度快，准确性可达100%
- **CLI方式**（`-c` 选项）：使用真实的Claude Code CLI环境，准确度最高，可能会出现调用各种mcp服务情况，速度较慢（1分钟左右）

**配置说明：**

- **ping测试超时时间**：默认为5秒，可在 ~/.ccapi-config.json 文件中新增变量控制超时，如：pingTimeout: 5000
- **test测试超时时间**：默认为30秒（接口模拟方式）或 100秒（CLI方式），可在 ~/.ccapi-config.json 文件中新增变量控制超时，如：testTimeout: 30000
- **测试返回的结果**：默认显示，由于厂商不同，返回结果仅供参考，可在 ~/.ccapi-config.json 文件中新增变量是否显示结果，如：testResponse: true
- **test cli模式测试并发**：默认为3，cli模式测试由于消耗性能较高，采用分批测试，若测试结果全部都超时，建议数值小点，超时时间拉长

  ```json5
  {
    "settingsPath": "~/.claude/settings.json",
    "apiConfigPath": "/Users/4xian/Desktop/api.json5",
    "pingTimeout": 5000,
    "testTimeout": 30000,
    "testResponse": true,
    "testConcurrency": 3
  }
  ```

- 对于数组格式的URL，会测试所有URL地址，数组配置的URL内部不会按延迟排序，保持原有的URL顺序
- 配置按最佳延迟排序，延迟最低的配置排在前面
- 显示每个配置的最优路线（最快的URL地址）

**测试结果示例：**

```text
测试结果(按延迟从低到高): 

【xxx】(最优路线: xxx/claude)
    1.[https://xxx/claude] ● 628ms 

【multiconfig】(最优路线: api.example1.com)
    1.[https://api.example1.com] ● 856ms 
    2.[https://api.example2.com] ● 892ms 

```

### 9. 自动选择最优配置

首先进行延迟测试，然后选择最优的进行切换配置，测试基准可按上诉两种方式选择其一为准

#### 基本自动选择

```bash
# 会先进行所有配置测试，然后选择最优的配置进行自动切换，默认以test命令测试的结果为基准切换
ccapi auto

# 以ping结果为准进行切换
ccapi auto -p

# 以test结果为准进行切换(默认)
ccapi auto -t

# 只测试单个配置，从中选择最优切换(适用于单个配置中多URL的情况)
ccapi auto multiconfig -t
```

#### 多命令配合执行

```bash
# 常用于组合命令，这样每次启动claude前都会选择最优路线
ccapi auto && claude

# 也可以自定义别名，每次使用别名启动
alias cc=ccapi auto && claude
cc
```

**功能说明：**

- **注意事项**：
  - 对于数组格式的配置，自动选择最优URL
  - test测试中，若KEY/TOKEN为数组，则会对齐最优URL索引进行搭配，比如：最优URL为索引1，KEY/TOKEN也会选择索引1，最优URL为2，KEY/TOKEN也会选择索引2，若不想自动切换KEY/TOKEN，将其始终配为一个即可
- **趣味搭配**：
  - 由于自动配置的对齐规则，可以在一个配置中进行多厂商配置，比如：

    ```json5
      {
        "aaa": {
          "url": [
            "https: 第一个厂商.com",
            "https: 第二个厂商.com",
            "https: 第三个厂商.com",
          ],
          "token": [
            "第一个厂商的token",
            "第二个厂商的token",
            "第三个厂商的token",
          ],
          "model": ["xxx"]
        },
        "bbb": {
          "url": [
            "https: 第一个厂商.com",
            "https: 第二个厂商.com",
            "https: 第三个厂商.com",
          ],
          "key": [
            "第一个厂商的key",
            "第二个厂商的key",
            "第三个厂商的key",
          ],
          "model": ["xxx"]
        },
      }
    ```

    - 这样自动选择第一个厂商的同时会自动选择第一个厂商的token，选择第二个厂商的同时会自动选择第二个厂商的token...
    - 注意token类的厂商放一起，key类的厂商放一起

### 10. 更新检查

程序自带版本检查，若npm发布新版则在使用过程中会进行更新提示，若不想要提示可在 ~/.ccapi-config.json 文件中新增变量 update: false关闭

```bash
# 自动更新 ccapi 到最新版本
ccapi update
```

### 11. 语言设置 (国际化)

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

### 12. 完整的ccapi-config.json配置

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

## 其他

- Node.js >= 18.0.0
- 支持的操作系统: macOS, Linux, Windows
