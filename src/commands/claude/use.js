const chalk = require('chalk')
const { validateConfig, readConfig } = require('../../utils/config')
const { readConfigFile, writeConfigFile, backupFile } = require('../../utils/file')
const { validateApiConfig, validateSettingsConfig, validateConfigName } = require('../../utils/validator')
const { CLAUDE_ENV_KEYS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants')
const { setSystemEnvVars } = require('../../utils/env')
const { t } = require('../../utils/i18n')

/**
 * 检查是否为当前配置
 */
function isCurrentConfig(settingsData, targetConfig) {
  const env = settingsData.env || {}

  return env[CLAUDE_ENV_KEYS.url] === targetConfig.url && env[CLAUDE_ENV_KEYS.model] === targetConfig.model
}

/**
 * 更新settings.json中的环境变量
 */
function updateSettingsEnv(settingsData, targetConfig) {
  // 确保env对象存在
  if (!settingsData.env) {
    settingsData.env = {}
  }

  const env = settingsData.env

  // 更新URL（必需）
  env[CLAUDE_ENV_KEYS.url] = targetConfig.url

  // 更新Model（可选）
  env[CLAUDE_ENV_KEYS.model] = targetConfig.model

  // 轻量模型（可选）
  if (targetConfig.fast) {
    env[CLAUDE_ENV_KEYS.fast] = targetConfig.fast
  } else {
    delete env[CLAUDE_ENV_KEYS.fast]
  }

  // API请求超时时间（可选）
  if (targetConfig.timeout) {
    env[CLAUDE_ENV_KEYS.timeout] = targetConfig.timeout
  } else {
    delete env[CLAUDE_ENV_KEYS.timeout]
  }

  if (targetConfig.tokens) {
    env[CLAUDE_ENV_KEYS.tokens] = targetConfig.tokens
  } else {
    delete env[CLAUDE_ENV_KEYS.tokens]
  }

  if (targetConfig.key && targetConfig.token) {
    env[CLAUDE_ENV_KEYS.key] = targetConfig.key
    env[CLAUDE_ENV_KEYS.token] = targetConfig.token
  } else {
    // 更新Key（如果有值）
    if (targetConfig.key) {
      env[CLAUDE_ENV_KEYS.key] = targetConfig.key
      delete env[CLAUDE_ENV_KEYS.token]
    }

    // 更新Token（如果有值）
    if (targetConfig.token) {
      env[CLAUDE_ENV_KEYS.token] = targetConfig.token
      delete env[CLAUDE_ENV_KEYS.key]
    }
  }

  if (targetConfig.http) {
    // HTTP代理（可选）
    env[CLAUDE_ENV_KEYS.http] = targetConfig.http
  } else {
    delete env[CLAUDE_ENV_KEYS.http]
  }
  if (targetConfig.https) {
    // HTTPS代理（可选）
    env[CLAUDE_ENV_KEYS.https] = targetConfig.https
  } else {
    delete env[CLAUDE_ENV_KEYS.https]
  }
  return settingsData
}

/**
 * 解析和选择字段值（支持 URL、Key、Token、Model、Fast）
 */
async function selectFieldValue(fieldValue, selectedIndex, defaultValue) {
  if (Array.isArray(fieldValue)) {
    // 数组情况：选择指定索引的值，默认为第一个
    const index = selectedIndex > 0 ? selectedIndex - 1 : 0
    if (index >= fieldValue.length) {
      throw new Error(await t('common.INDEX_OUT_OF_RANGE', selectedIndex, `1-${fieldValue.length}`))
    }
    return fieldValue[index]
  } else {
    // 字符串情况：直接返回，忽略索引参数
    return fieldValue || defaultValue
  }
}

/**
 * 使用指定配置命令
 */
async function useCommand(configName, options = {}) {
  try {
    // 验证配置
    const config = await validateConfig()

    // 读取API配置文件
    const apiConfig = await readConfigFile(config.apiConfigPath)
    if (!validateApiConfig(apiConfig)) {
      console.error(chalk.red(await t('common.PARAMETER_ERROR')), await t('use.API_FORMAT_ERROR'))
      return
    }

    // 验证配置名称是否存在
    if (!validateConfigName(apiConfig, configName)) {
      console.error(chalk.red(await t('common.CONFIG_ERROR')), `${await t(ERROR_MESSAGES.CONFIG_NAME_NOT_FOUND)}: ${configName}`)
      console.log(chalk.green(await t('common.AVAILABLE_CONFIGS')), Object.keys(apiConfig).join(', '))
      return
    }

    // 读取settings.json文件
    const settingsData = await readConfigFile(config.settingsPath)
    if (!validateSettingsConfig(settingsData)) {
      console.error(chalk.red(await t('common.PARAMETER_ERROR')), await t('use.SETTINGS_FORMAT_ERROR'))
      return
    }

    const originalConfig = apiConfig[configName]

    // 创建配置副本用于修改
    const targetConfig = { ...originalConfig }

    // 设置默认值
    targetConfig.model = targetConfig.model || 'claude-sonnet-4-5-20250929'
    // targetConfig.fast = targetConfig.fast || 'claude-3-5-haiku-20241022';
    // targetConfig.timeout = targetConfig.timeout || "600000";

    try {
      // 根据参数选择各字段值
      const selectedUrl = await selectFieldValue(
        targetConfig.url,
        options.url ? parseInt(options.url) : 0,
        targetConfig.url // URL 没有默认值，使用原值
      )

      const selectedKey = await selectFieldValue(
        targetConfig.key,
        options.key ? parseInt(options.key) : 0,
        targetConfig.key // Key 没有默认值，使用原值
      )

      const selectedToken = await selectFieldValue(
        targetConfig.token,
        options.token ? parseInt(options.token) : 0,
        targetConfig.token // Token 没有默认值，使用原值
      )

      const selectedModel = await selectFieldValue(
        targetConfig.model,
        options.model ? parseInt(options.model) : 0,
        'claude-sonnet-4-5-20250929'
      )

      const selectedFast = await selectFieldValue(targetConfig.fast, options.fast ? parseInt(options.fast) : 0, '')

      // 更新目标配置为选中的具体值
      targetConfig.url = selectedUrl
      targetConfig.key = selectedKey
      targetConfig.token = selectedToken
      targetConfig.model = selectedModel
      targetConfig.fast = selectedFast
    } catch (error) {
      console.error(chalk.red(await t('common.PARAMETER_ERROR')), error.message)
      return
    }

    // 检查是否已经是当前配置
    // if (isCurrentConfig(settingsData, targetConfig)) {
    //   console.log(chalk.yellow(ERROR_MESSAGES.SAME_CONFIG));
    //   return;
    // }

    // 备份settings.json
    const backupPath = await backupFile(config.settingsPath)
    console.log(await t(SUCCESS_MESSAGES.BACKUP_CREATED), `(${backupPath})`)

    // 更新配置
    console.log(await t('use.SWITCHING_CONFIG', configName))
    const updatedSettings = updateSettingsEnv(settingsData, targetConfig)

    // 保存更新后的settings.json
    await writeConfigFile(config.settingsPath, updatedSettings)

    // 同步设置到系统环境变量
    let success = false
    const configData = await readConfig()
    const updateEnv = configData.useNoEnv !== void 0 ? configData.useNoEnv : true
    if (updateEnv) {
      try {
        success = await setSystemEnvVars(targetConfig, configName, false)
      } catch (error) {
        console.log(chalk.red(await t('use.SETTINGS_SUCCESS_ENV_FAILED')))
      }
    }

    // 显示成功信息
    console.log()
    console.log(
      chalk.green.bold(await t(SUCCESS_MESSAGES.CONFIG_SWITCHED)) + chalk.yellow.bold(await t(SUCCESS_MESSAGES.RESTART_TERMINAL))
    )
    if (success) {
      console.log(chalk.cyan(await t('use.CONFIG_SYNCED')))
    }
    console.log()
    console.log(chalk.green.bold(await t('use.CURRENT_CONFIG_DETAILS')))
    console.log(await t('use.NAME_LABEL', chalk.cyan(configName)))
    console.log(await t('use.URL_LABEL', chalk.cyan(targetConfig.url)))

    // 显示选中的模型信息
    console.log(await t('use.MODEL_LABEL', chalk.cyan(targetConfig.model)))

    if (targetConfig.fast) {
      console.log(await t('use.FAST_LABEL', chalk.cyan(targetConfig.fast)))
    }

    if (targetConfig.key) {
      const maskedKey = targetConfig.key.length > 25 ? targetConfig.key.slice(0, 25) + '...' : targetConfig.key
      console.log(await t('use.KEY_LABEL', chalk.cyan(maskedKey)))
    }
    if (targetConfig.token) {
      const maskedToken = targetConfig.token.length > 25 ? targetConfig.token.slice(0, 25) + '...' : targetConfig.token
      console.log(await t('use.TOKEN_LABEL', chalk.cyan(maskedToken)))
    }
    if (targetConfig.http) {
      console.log(await t('use.HTTP_LABEL', chalk.cyan(targetConfig.http)))
    }
    if (targetConfig.https) {
      console.log(await t('use.HTTPS_LABEL', chalk.cyan(targetConfig.https)))
    }
    console.log()
  } catch (error) {
    const no = error.message.includes('未设置') || error.message.includes('不存在') || error.message.includes('Not set')
    if (no) {
      console.error(chalk.red(await t('common.CONFIG_ERROR')), error.message)
      console.log(await t('use.USE_SET_CMD', chalk.cyan('ccapi set')))
    } else {
      console.error(chalk.red(await t('use.SWITCH_CONFIG_FAILED')), error.message)
    }
    process.exit(1)
  }
}

module.exports = useCommand
