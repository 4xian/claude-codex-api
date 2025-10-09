# Codex Configuration Guide

English | [中文](./CODEX_README.md) | [Claude Documentation](./README_EN.md)
(Current document is for Codex configuration. For Claude Code documentation, click the link above ↗️)

## Features

- 🔄 **One-Click Switching** - Quickly switch between different Codex AI providers
- 🔐 **Auto Configuration** - Automatically updates auth.json and system environment variables
- 📊 **Latency Testing** - Test network latency for all providers
- 🎯 **Auto Optimization** - Automatically test and switch to optimal configuration with lowest latency
- 🌍 **Internationalization** - Supports Chinese and English interface language switching

## Quick Start

### 1. Configure config.toml

```bash
# View current config path (shows default path)
ccapi cx set
# Or use full command
ccapi codex set

# If config file is not in default location, set custom path
ccapi cx set <path>
Example: ccapi cx set ~/.codex/config.toml

# Can also configure Codex config path in ~/.ccapi-config.json
```json5
{
  "codexConfigPath": "~/.codex/config.toml"
}
```

**Official Codex default config.toml paths:**

- macOS/Linux: `~/.codex/config.toml`
- Windows: `%USERPROFILE%\.codex\config.toml`

**Note: Before using switch command, you need to configure api_key and models in config.toml file (these are non-official properties, used by ccapi only):**

- api_key: Used for switching environment variables
- models: Array format, used for switching different models

```toml
[model_providers.any]
name = "any"
base_url = "https://anyrouter.top/v1"
env_key = "any"
wire_api = "responses"
requires_openai_auth = true

--Add the following two items to enable normal configuration switching--
api_key = "your-api-key"
models = [
  "gpt-5-codex",
  "gpt-5"
]
```

### 2. View Available Providers

```bash
ccapi cx ls or ccapi codex ls
```

### 3. Switch Provider

Switch to specified Codex provider, optionally switch model simultaneously.

```bash
# Basic switch
ccapi cx use <provider-name>

# Switch with model (use 2nd model, model index starts from 1)
ccapi cx use <provider-name> -m <model-index>

# Switch to any provider, use default model (1st)
ccapi cx use any

# Switch to any provider, use 2nd model
ccapi cx use any -m 2

# 1. Modifies config file's `model_provider` field to specified provider name
# 2. If `-m` is specified, also modifies `model` field to corresponding model
# 3. Updates `~/.codex/auth.json` file's `OPENAI_API_KEY` field
# 4. Sets system environment variable (uses provider's `env_key` as key name)
```

### 4. Test Provider URL Latency

```bash
ccapi cx ping
```

### 5. Test if Provider API Works in Codex CLI

```bash
ccapi cx test
```

### 6. Auto Select Optimal Configuration

```bash
# Will first test all configurations, then select the optimal configuration for automatic switching, defaults to test command results as benchmark for switching
ccapi cx auto

# Use ping results as benchmark for switching
ccapi cx auto -p

# Use test results as benchmark for switching (default)
ccapi cx auto -t
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
api_key = "key1"
models = ["model1", "model2"]

[model_providers.provider2]
name = "Provider 2"
base_url = "https://api.provider2.com/v1"
env_key = "provider2"
api_key = "key2"
models = ["model3", "model4"]
```

Then use `ccapi cx use provider1` or `ccapi cx use provider2` to switch.
