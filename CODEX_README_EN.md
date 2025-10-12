# Codex Configuration Guide

English | [中文](./CODEX_README.md) | [Claude Documentation](./README_EN.md)
**Current document is for Codex configuration. For Claude Code documentation, click the link above ↗️**

## Features

- 🔄 **One-Click Switching** - Quickly switch between different Codex AI providers
- 🔐 **Auto Configuration** - Automatically updates auth.json and system environment variables
- 📊 **Latency Testing** - Quickly and simultaneously test all transit station latency and API configuration availability
- 🎯 **Auto Optimization** - Automatically test and switch to optimal configuration with lowest latency
- 🌍 **Internationalization** - Supports Chinese and English interface language switching

## Quick Start

### 1. Configure config.toml

```bash
Codex uses config.toml as the default configuration file, located at:
【Windows】C:\Users\Administrator\.codex\config.toml
【Mac/Linux】~/.codex/config.toml

**Note: Before using commands, you need to configure api_key and model in config.toml file (these are non-official properties, used by ccapi only):**

api_key: Array format, used for switching different environment variables
model: Array format, used for switching different models
```

```toml
Example:
[model_providers.any]
name = "any"
base_url = "https://anyrouter.top/v1"
env_key = "any"
wire_api = "responses"
requires_openai_auth = true

--Add the following two items to enable normal configuration switching--
api_key = [
  "your-api-key1",
  "your-api-key2"
]
models = [
  "gpt-5-codex",
  "gpt-5"
]
```

```bash
# If your codex config file is not in default location, you can set custom path
ccapi cx set <path>
Example: ccapi cx set ~/.codex/config.toml

# You can also configure Codex config path in ~/.ccapi-config.json
```

```json5
{
  "codexConfigPath": "~/.codex/config.toml"
}
```

```bash
# View current codex config path
ccapi cx set
```

### 2. View Available Providers

```bash
ccapi cx ls or ccapi codex ls
```

### 3. Switch Provider

Switch to specified Codex provider, optionally switch model and api_key simultaneously.

```bash
Note: The name to switch is the field after model_providers, e.g., [model_providers.any] is "any", not the name field in the config
# Basic switch
ccapi cx use any

# Switch model (use 2nd model, index starts from 1)
ccapi cx use any -m 2

# Switch api_key (use 2nd api_key, index starts from 1)
ccapi cx use any -k 2

# Switch both model and api_key (use 2nd model, 2nd api_key, index starts from 1)
ccapi cx use any -m 2 -k 2
```

### 4. Test Provider URL Latency

```bash
ccapi cx ping
```

### 5. Test Provider's api_key Validity in Codex CLI

```bash
# Test all providers' validity
ccapi cx test

# Test single provider's validity
ccapi cx test any
```

### 6. Auto Find Optimal Route and Switch Configuration

```bash
# Will first test all configurations, then select the optimal configuration for automatic switching, defaults to test command results as benchmark for switching
ccapi cx auto

# Use test results as benchmark for switching (default)
ccapi cx auto -t

# Use ping results as benchmark for switching
ccapi cx auto -p

```

### 7. Update Check

The program has built-in version checking. If a new version is published on npm, update prompts will be shown during use. If you don't want prompts, you can add the variable update: false in ~/.ccapi-config.json file to disable

```bash
# Automatically update ccapi to the latest version
ccapi update
```

### 8. Language Settings (Internationalization)

The program supports bilingual interface in Chinese and English, you can switch display language as needed, defaults to Chinese:

```bash
# View current language settings
ccapi lang

# Switch to Chinese
ccapi lang zh

# Switch to English
ccapi lang en

# You can also modify directly in configuration file ~/.ccapi-config.json
{
  "language": "zh"
}
```

### 9. Complete ccapi-config.json Configuration

This file is the configuration file used by ccapi, where you can configure options. The specific file is located at ~/.ccapi-config.json.

```bash
{
  # settings.json file path
  "settingsPath": "~/.claude/settings.json",
  # api configuration file path
  "apiConfigPath": "/Users/4xian/Desktop/api.json5",
  # codex configuration file path (optional)
  "codexConfigPath": "~/.codex/config.toml",
  # ping command timeout
  "pingTimeout": 30000,
  # test command timeout
  "testTimeout": 100000,
  # ping, test command result display
  "testResponse": true,
  # whether update prompts are needed
  "update": true,
  # whether to synchronously modify system environment variables when using use command
  "useNoEnv": true,
  # interface language setting (zh: Chinese, en: English)
  "language": "zh"
}
```

## FAQ

### Q1: What if config file doesn't exist?

**A:** ccapi will auto-detect default path. If config file doesn't exist, it shows an error with default path. You need to:

1. Ensure Codex is installed and initialized
2. Or manually create config file
3. Use `ccapi cx set` to specify custom path

### Q2: Why doesn't it take effect after switching?

**A:** Environment variables require terminal restart. Please:

1. Close current terminal
2. Open new terminal
3. Verify environment variable: `echo xxx` (replace with your env_key)

### Q3: How to manage multiple providers?

**A:** Add multiple providers in config file's `model_providers`:

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

Then use `ccapi cx use provider1` or `ccapi cx use provider2` to switch.
