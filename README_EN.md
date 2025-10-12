# @4xian/ccapi

English | [中文](./README.md) | [Codex Documentation](./CODEX_README_EN.md)

A CLI tool for managing Claude Code and Codex configurations, allowing one-click switching between multiple transit station API configurations;
One-click switching of system environment variables, one-click testing of API latency, one-click testing of API validity, automatic optimal route switching with internationalization support.
**Current document is for Claude Code configuration. For Codex documentation, click the link above ↗️**

## Features

- 🚀 **One-Click Switching** - Easily switch between different Claude / Codex API configurations
- 🌐 **Environment Variable Management** - One-click setup of API configurations to system environment variables
- ⚡ **Latency Testing** - Quickly and simultaneously test all transit station latency and API configuration availability
- 🎯 **Auto Optimization** - Automatically test and switch to optimal configuration with lowest latency
- 📄 **Multi-format Support** - Supports JSON, JSON5, YAML, TOML configuration files
- 🌍 **Internationalization** - Supports Chinese and English interface language switching

## Installation

### Global Installation (Recommended)

```bash
# Install
npm install -g @4xian/ccapi

# Uninstall
npm uninstall -g @4xian/ccapi
```

## Usage

### 1. Check Version

```bash
ccapi -v
```

### 2. Set Configuration File Path

First-time use requires setting the path to Claude Code's settings.json file and custom API configuration file path:

```bash
# Windows default settings.json path: C:\Users\Administrator\.claude\settings.json
# Mac default settings.json path: ~/.claude/settings.json
# If settings.json file doesn't exist, you can create one yourself

# Three ways to set paths (examples):
1. Mac: Set both paths simultaneously
ccapi set --settings ~/.claude/settings.json --api /Users/4xian/Desktop/api.json5

2. Set separately
ccapi set --settings ~/.claude/settings.json
ccapi set --api /Users/4xian/Desktop/api.json5

3. Directly modify paths in configuration file
# (If .ccapi-config.json file doesn't exist, you can create one yourself)
In ~/.ccapi-config.json file (at same level as .claude), there are path storage variables, modify directly:
  {
    "settingsPath": "~/.claude/settings.json",
    "apiConfigPath": "/Users/4xian/Desktop/api.json5",
  }

# Query current configuration file paths
ccapi set
```

### 3. Important: Custom API Configuration File Format (Pay attention to correct format)

Supports multiple configuration file formats: **JSON, JSON5, YAML, TOML**
Create a configuration file (such as `api.json`, `api.yaml`, `api.json5` or `api.toml`) with the following format:

**JSON5 Format Example:**

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
  // Recommended to use array format for multiple configurations
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

**YAML Format Example:**

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

**Field Description:**
[Different providers may offer either key or token. If one doesn't work, try switching between key and token]
[This tool only provides quick environment variable switching functionality, therefore only supports Anthropic format configuration, as long as Claude Code can use it]

- `url`: API provider server address (required)
  - **String format**: Directly specify a single URL
  - **Array format**: Specify multiple URLs, supports switching via index
- `key`: API_KEY (only one of key and token is required)
  - **String format**: Directly specify a single API Key
  - **Array format**: Specify multiple API Keys, supports switching via index
- `token`: AUTH_TOKEN (only one of key and token is required)
  - **String format**: Directly specify a single Auth Token
  - **Array format**: Specify multiple Auth Tokens, supports switching via index
- `model`: Model name (optional, default: claude-sonnet-4-20250514)
  - **String format**: Directly specify a single model
  - **Array format**: Specify multiple models, supports switching via index
- `fast`: Fast model name (optional, default: claude-3-5-haiku-20241022)
  - **String format**: Directly specify a single fast model
  - **Array format**: Specify multiple fast models, supports switching via index
- `timeout`: Request timeout (optional, default: official 600000ms)
- `tokens`: Maximum output tokens (optional, default: follow official settings)
- `http`: Specify HTTP proxy server for network connections
- `https`: Specify HTTPS proxy server for network connections

### 4. List Available Configurations in API Configuration File

```bash
ccapi ls or ccapi list
```

**Display Description:**

- Configurations marked with `*` indicate currently active configuration
- For array format url/key/token/model/fast, index numbers are displayed

### 5. Freely Switch Configurations (Must restart Claude Code terminal after switching!!!)

#### Basic Switching

```bash
# Switch to specified configuration (using default model, arrays default to first element)
ccapi use openrouter

# For string format model/fast, direct switching
ccapi use anyrouter
```

#### Advanced Switching (for Array Format)

```bash
# Switch to multiconfig configuration, using 1st url, 1st token, 2nd model, 1st fast model
ccapi use multiconfig -u 1 -t 1 -m 2 -f 1

# Switch only specific field indices
ccapi use multiconfig -k 1      # Switch to specific Key only
ccapi use multiconfig -t 2      # Switch to specific Token only
ccapi use multiconfig -u 1      # Switch to specific URL only
ccapi use multiconfig -m 3      # Switch to specific Model only
ccapi use multiconfig -f 2      # Switch to specific Fast Model index only
```

#### Complete Configuration Cleanup

```bash
# Clear all current configurations from both settings.json and system environment variables
ccapi clear
```

**Parameter Description:**

- `-u <index>`: Specify URL index to use (counting from 1)
- `-k <index>`: Specify Key index to use (counting from 1)
- `-t <index>`: Specify Token index to use (counting from 1)
- `-m <index>`: Specify model index to use (counting from 1)
- `-f <index>`: Specify fast model index to use (counting from 1)
- For string format configurations, index parameters are automatically ignored
- When no index is specified, defaults to the first element of the array
- You can combine these parameters in any way
- This command will also modify system environment variables, i.e., both settings.json and system variables are modified simultaneously. If you don't want to modify system environment variables, you can add the field useNoEnv: false in ~/.ccapi-config.json file (at same level as .claude)

```bash
  {
    "settingsPath": "~/.claude/settings.json",
    "apiConfigPath": "/Users/4xian/Desktop/api.json5",
    "useNoEnv": false
  }
```

### 6. System Environment Variable Management

Environment variable functionality allows you to set configurations to system environment variables

#### View Current Environment Variable Status

```bash
# Display currently set Claude Code related environment variables in system
ccapi env
```

Display example:

```text
Current System Environment Variables: openrouter

  CCAPI_CURRENT_CONFIG: openrouter
  ANTHROPIC_BASE_URL: https://api.openrouter.ai
  ANTHROPIC_AUTH_TOKEN: your-auth-token...
  ANTHROPIC_MODEL: claude-sonnet-4-20250514
  ANTHROPIC_SMALL_FAST_MODEL: claude-3-5-haiku-20241022
```

#### Set Configuration to Environment Variables

```bash
# Basic setup
ccapi env openrouter

# Specify array indices (for array configurations)
ccapi env multiconfig -u 1 -k 2 -t 1 -m 2 -f 1
```

**Parameter Description:**

- `-u <index>`: Specify URL index to use (counting from 1)
- `-k <index>`: Specify Key index to use (counting from 1)
- `-t <index>`: Specify Token index to use (counting from 1)
- `-m <index>`: Specify model index to use (counting from 1)
- `-f <index>`: Specify fast model index to use (counting from 1)

#### Clear Environment Variables

```bash
# Clear all system environment variables related to current configuration
ccapi env clear
```

#### Complete Cleanup

```bash
# Clear all current configurations from both settings.json and system environment variables
ccapi clear
```

### 7. Network Latency Testing (Ping)

Quickly test network latency for all gateway URLs in configurations (only tests network connectivity, not API availability).

```bash
# Test all configurations
ccapi ping

# Test specific configuration
ccapi ping openrouter
```

### 8. Test API Availability

Test whether gateway API configurations are available in Claude Code, which can truly reflect whether configurations are effective

```bash
# Test all configurations
ccapi test

# Test specific configuration
ccapi test openrouter

# Use Claude Code CLI method for testing (more accurate but slower)
ccapi test -c
ccapi test -c openrouter
```

**Test Method Description:**

- **Default Method**: Uses API mock method, directly simulates Claude CLI requests, fast, accuracy can reach 100%
- **CLI Method** (`-c` option): Uses real Claude Code CLI environment, highest accuracy, may call various mcp services, slower (about 1 minute)

**Configuration Description:**

- **ping test timeout**: Defaults to 5 seconds, can be controlled by adding timeout variable in ~/.ccapi-config.json file, e.g.: pingTimeout: 5000
- **test test timeout**: Defaults to 30 seconds (API mock method) or 100 seconds (CLI method), can be controlled by adding timeout variable in ~/.ccapi-config.json file, e.g.: testTimeout: 30000
- **Test result response**: Displayed by default. Since different providers return different results, response results are for reference only. Can control result display by adding variable in ~/.ccapi-config.json file, e.g.: testResponse: true
- **test cli mode test concurrency**: Defaults to 3. Due to high performance consumption of cli mode testing, batch testing is adopted. If all test results are timed out, it is recommended to set a smaller value and extend the timeout period.

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

- For array format URLs, all URL addresses will be tested, array configuration URLs will not be sorted by latency internally, maintaining original URL order
- Configurations sorted by best latency, lowest latency configurations appear first
- Shows optimal route (fastest URL address) for each configuration

**Test Result Example:**

```text
Test Results (sorted by latency from low to high): 

【xxx】(Optimal Route: xxx/claude)
    1.[https://xxx/claude] ● 628ms 

【multiconfig】(Optimal Route: api.example1.com)
    1.[https://api.example1.com] ● 856ms 
    2.[https://api.example2.com] ● 892ms 

```

### 9. Auto Select Optimal Configuration

First perform latency testing, then select the optimal one for configuration switching. Test benchmark can be selected from one of the two methods above

#### Basic Auto Selection

```bash
# Will first test all configurations, then select the optimal configuration for automatic switching, defaults to test command results as benchmark for switching
ccapi auto

# Use ping results as benchmark for switching
ccapi auto -p

# Use test results as benchmark for switching (default)
ccapi auto -t

# Test only single configuration, select optimal switching from it (suitable for single configuration with multiple URLs)
ccapi auto multiconfig -t
```

#### Multi-command Combined Execution

```bash
# Commonly used for combined commands, this way optimal route is selected every time before starting claude
ccapi auto && claude

# Can also define custom alias, use alias to start each time
alias cc=ccapi auto && claude
cc
```

**Feature Description:**

- **Notes**:
  - For array format configurations, automatically selects optimal URL
  - In test testing, if KEY/TOKEN are arrays, they will align with optimal URL index pairing, e.g.: if optimal URL is index 1, KEY/TOKEN will also select index 1; if optimal URL is 2, KEY/TOKEN will also select index 2. If you don't want automatic KEY/TOKEN switching, configure them as single values instead
- **Interesting Combinations**:
  - Due to automatic configuration alignment rules, you can configure multiple providers in one configuration, e.g.:

    ```json5
      {
        "aaa": {
          "url": [
            "https://first-provider.com",
            "https://second-provider.com",
            "https://third-provider.com",
          ],
          "token": [
            "first-provider-token",
            "second-provider-token",
            "third-provider-token",
          ],
          "model": ["xxx"]
        },
        "bbb": {
          "url": [
            "https://first-provider.com",
            "https://second-provider.com",
            "https://third-provider.com",
          ],
          "key": [
            "first-provider-key",
            "second-provider-key",
            "third-provider-key",
          ],
          "model": ["xxx"]
        },
      }
    ```

    - This way, automatically selecting the first provider will also automatically select the first provider's token, selecting the second provider will automatically select the second provider's token...
    - Note: group token-type providers together, and key-type providers together

### 10. Update Check

The program has built-in version checking. If a new version is published on npm, update prompts will be shown during use. If you don't want prompts, you can add the variable update: false in ~/.ccapi-config.json file to disable

```bash
# Automatically update ccapi to the latest version
ccapi update
```

### 11. Language Settings (Internationalization)

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

### 12. Complete ccapi-config.json Configuration

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

## Others

- Node.js >= 18.0.0
- Supported OS: macOS, Linux, Windows
