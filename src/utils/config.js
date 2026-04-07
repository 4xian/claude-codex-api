const { readConfigFile, writeConfigFile, fileExists } = require('./file')
const { CONFIG_FILE, ERROR_MESSAGES } = require('../utils/constants')

/**
 * 读取用户配置
 */
async function readConfig() {
  try {
    if (!(await fileExists(CONFIG_FILE))) {
      return { lang: 'zh' } // 默认中文
    }
    const config = await readConfigFile(CONFIG_FILE)
    // 确保lang字段存在，默认为中文
    if (!config.lang) {
      config.lang = 'zh'
    }
    return config
  } catch (error) {
    throw new Error('Failed to read configuration: ' + error.message)
  }
}

/**
 * 写入用户配置
 */
async function writeConfig(config) {
  try {
    await writeConfigFile(CONFIG_FILE, config)
  } catch (error) {
    throw new Error('Failed to save configuration: ' + error.message)
  }
}

/**
 * 获取settings.json路径
 */
async function getSettingsPath() {
  const config = await readConfig()
  return config.settingsPath || null
}

/**
 * 获取api.json路径
 */
async function getApiConfigPath() {
  const config = await readConfig()
  return config.apiConfigPath || null
}

/**
 * 设置settings.json路径
 */
async function setSettingsPath(path) {
  const config = await readConfig()
  config.settingsPath = path
  await writeConfig(config)
}

/**
 * 设置api.json路径
 */
async function setApiConfigPath(path) {
  const config = await readConfig()
  config.apiConfigPath = path
  await writeConfig(config)
}

/**
 * 验证配置完整性
 */
async function validateConfig() {
  const config = await readConfig()

  if (!config.settingsPath) {
    throw new Error('settings.json file path not set')
  }

  if (!config.apiConfigPath) {
    throw new Error('API configuration file path not set')
  }

  if (!(await fileExists(config.settingsPath))) {
    throw new Error('settings file does not exist, please check path setting')
  }

  if (!(await fileExists(config.apiConfigPath))) {
    throw new Error(
      'api configuration file does not exist, please check path setting (supports JSON, JSON5, YAML, TOML formats)'
    )
  }

  return config
}

module.exports = {
  readConfig,
  writeConfig,
  getSettingsPath,
  getApiConfigPath,
  setSettingsPath,
  setApiConfigPath,
  validateConfig
}
