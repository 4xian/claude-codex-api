# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 CLI 工具，用于管理 Claude Code 和 Codex 的 API 配置。主要功能包括：
- 在多个 API 配置间快速切换
- 管理系统环境变量
- 测试 API 延迟和可用性
- 自动选择最优配置
- 支持多种配置文件格式（JSON、JSON5、YAML、TOML）
- 国际化支持（中文/英文）

## 构建和开发命令

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建生产版本
npm run build

# 代码格式化
npm run format

# 本地测试 CLI（构建后）
node bin/ccapi <command>

# 全局安装本地版本进行测试
npm link
ccapi <command>
npm unlink -g @4xian/ccapi
```

## 项目架构

### 核心目录结构

```
src/
├── commands/           # 命令处理模块
│   ├── claude/        # Claude Code 相关命令
│   │   ├── auto.js    # 自动选择最优配置
│   │   ├── clear.js   # 清除配置
│   │   ├── env.js     # 环境变量管理
│   │   ├── list.js    # 列举配置
│   │   ├── ping.js    # 网络延迟测试
│   │   ├── set.js     # 设置配置路径
│   │   ├── test.js    # API 可用性测试
│   │   └── use.js     # 切换配置
│   ├── codex/         # Codex 相关命令
│   ├── lang.js        # 语言切换
│   ├── update.js      # 版本更新
│   └── version.js     # 版本信息
├── utils/             # 工具模块
│   ├── config.js      # 配置管理核心
│   ├── config-reader.js  # 多格式配置文件读写
│   ├── file.js        # 文件操作
│   ├── env.js         # 环境变量操作
│   ├── validator.js   # 配置验证
│   ├── latency-tester.js  # 延迟测试
│   ├── sse-client.js  # SSE 客户端（API 测试）
│   ├── version-checker.js # 版本检查
│   └── constants.js   # 常量定义
├── i18n/              # 国际化
│   ├── zh.js          # 中文
│   └── en.js          # 英文
└── index.js           # CLI 入口

dist/                  # 构建输出（Rollup 打包）
bin/ccapi              # CLI 可执行文件入口
```

### 关键架构设计

1. **配置文件系统**
   - 用户配置：`~/.ccapi-config.json` - 存储 settings.json 路径、API 配置文件路径等
   - Claude Code 配置：`~/.claude/settings.json` - Claude Code 的配置文件
   - API 配置文件：用户自定义位置，支持 JSON/JSON5/YAML/TOML 格式

2. **配置读写层（config-reader.js）**
   - 统一处理多种配置文件格式
   - 使用 JSON5、js-yaml、js-toml、@iarna/toml 解析不同格式
   - 自动根据文件扩展名选择解析器

3. **命令处理流程**
   - 所有命令通过 commander.js 注册
   - 异步初始化国际化文本
   - 后台检查版本更新（可配置关闭）
   - 命令执行后自动触发版本检查

4. **环境变量管理**
   - 支持同时修改 settings.json 和系统环境变量
   - 可通过 `useNoEnv` 配置项控制是否同步系统环境变量
   - 环境变量键名定义在 `constants.js` 的 `CLAUDE_ENV_KEYS`

5. **测试机制**
   - ping 测试：纯网络连通性测试
   - test 测试：模拟 Claude CLI 请求或使用真实 CLI 环境
   - 支持并发测试和超时控制

## 开发注意事项

### 修改命令逻辑
- 所有命令处理函数都是异步的
- 使用 `t()` 函数获取国际化文本
- 错误处理应抛出带有清晰消息的 Error
- 成功消息使用 chalk 进行彩色输出

### 添加新命令
1. 在 `src/commands/` 下创建命令文件
2. 导出异步函数处理命令逻辑
3. 在 `src/index.js` 中导入并注册命令
4. 在 `src/i18n/` 中添加对应的国际化文本

### 配置文件格式支持
- 所有配置读写必须通过 `config-reader.js`
- 支持的格式定义在 `SUPPORTED_FORMATS` 常量
- 添加新格式需要：
  1. 更新 `SUPPORTED_FORMATS`
  2. 在 `readConfigFile` 和 `writeConfigFile` 中添加解析/序列化逻辑
  3. 安装对应的解析库

### 构建配置
- 使用 Rollup 打包为单个 CJS 文件
- 保留 console 输出（CLI 工具需要）
- 保留函数名（便于调试）
- 外部化 Node.js 内置模块（fs、path、os、util）

### 代码风格
- 使用 Prettier 格式化
- Husky + lint-staged 在提交前自动格式化
- 函数使用 JSDoc 注释说明用途

### 发布流程
- `npm run build` 构建
- `npm version <patch|minor|major>` 更新版本
- `npm publish` 发布到 npm
- `prepublishOnly` 钩子会自动执行构建

## 配置文件示例

用户的 `~/.ccapi-config.json`:
```json
{
  "settingsPath": "~/.claude/settings.json",
  "apiConfigPath": "/path/to/api.json5",
  "codexConfigPath": "~/.codex/config.toml",
  "pingTimeout": 5000,
  "testTimeout": 30000,
  "testResponse": true,
  "testConcurrency": 3,
  "update": true,
  "useNoEnv": true,
  "language": "zh"
}
```

API 配置文件格式（支持数组配置）:
```json5
{
  "config-name": {
    "url": ["https://api1.com", "https://api2.com"],
    "token": ["token1", "token2"],
    "model": ["claude-sonnet-4-20250514"],
    "fast": ["claude-3-5-haiku-20241022"],
    "timeout": 600000,
    "tokens": 65000
  }
}
```

## 常见问题

### 调试 CLI
- 设置 `NODE_ENV=development` 查看详细错误堆栈
- 在 `config-reader.js` 中有 `console.log` 用于调试配置读取

### 测试超时
- 调整 `~/.ccapi-config.json` 中的 `pingTimeout` 和 `testTimeout`
- CLI 模式测试默认超时 100 秒，可能需要更长时间

### 环境变量不生效
- Windows 需要重启终端或 Claude Code
- 检查 `useNoEnv` 配置是否为 true
- 使用 `ccapi env` 查看当前环境变量状态
