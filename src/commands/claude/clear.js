const chalk = require('chalk')
const readline = require('readline')
const { validateConfig } = require('../../utils/config')
const { readConfigFile, writeConfigFile, backupFile } = require('../../utils/file')
const { validateSettingsConfig } = require('../../utils/validator')
const { CLAUDE_ENV_KEYS } = require('../../utils/constants')
const { 
  clearSystemEnvVars, 
  checkEnvStatus, 
  getCurrentConfigName 
} = require('../../utils/env')
const { t } = require('../../utils/i18n')
const maxText = 30

/**
 * 清除settings.json中的配置字段
 */
function clearSettingsConfig(settingsData) {
  if (!settingsData.env) {
    return settingsData
  }

  // 清除所有相关的环境变量配置
  const envKeys = Object.values(CLAUDE_ENV_KEYS)
  for (const key of envKeys) {
    delete settingsData.env[key]
  }

  return settingsData
}

/**
 * 获取用户确认
 */
async function getUserConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(async (resolve) => {
    const message = await t('clear.CONFIRM')
    rl.question(chalk.red(message), (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

/**
 * 显示将要清除的内容预览
 */
async function showClearPreview() {
  try {
    const status = await checkEnvStatus()
    const currentConfig = getCurrentConfigName()

    console.log(chalk.blue.bold(await t('clear.PREPARE_TO_CLEAR')))
    console.log()

    // 显示settings.json中的配置
    try {
      const config = await validateConfig()
      const settingsData = await readConfigFile(config.settingsPath)
      
      if (settingsData.env && Object.keys(settingsData.env).length > 0) {
        console.log(chalk.yellow.bold(await t('clear.SETTINGS_ENV_CONFIG')))
        for (const [key, value] of Object.entries(settingsData.env)) {
          if (Object.values(CLAUDE_ENV_KEYS).includes(key)) {
            let displayValue = value
            if (key.includes('API_KEY') || key.includes('AUTH_TOKEN')) {
              displayValue = displayValue.length > maxText ? displayValue.slice(0, maxText) + '...' : displayValue
            }
            console.log(`  ${chalk.cyan(key)}: ${chalk.green(displayValue)}`)
          }
        }
        console.log()
      } else {
        console.log(chalk.dim(await t('clear.NO_SETTINGS_CONFIG')))
        console.log()
      }
    } catch (error) {
      console.log(chalk.yellow(await t('clear.CANT_READ_SETTINGS')))
      console.log()
    }

    // 显示系统环境变量
    if (status.hasEnvVars || currentConfig) {
      console.log(chalk.yellow.bold(await t('clear.SYSTEM_ENV_VARS')))
      
      for (const [key, value] of Object.entries(status.envVars)) {
        if (key !== 'CCAPI_CURRENT_CONFIG') {
          let displayValue = value
          if (key.includes('API_KEY') || key.includes('AUTH_TOKEN')) {
            displayValue = displayValue.length > maxText ? displayValue.slice(0, maxText) + '...' : displayValue
          }
          console.log(`  ${chalk.cyan(key)}: ${chalk.green(displayValue)}`)
        }
      }
      console.log()
    } else {
      console.log(chalk.dim(await t('clear.NO_SYSTEM_ENV_VARS')))
      console.log()
    }

    return status.hasEnvVars || currentConfig || false
  } catch (error) {
    console.error(chalk.red(await t('clear.CLEAR_PREVIEW_FAILED')), error.message)
    return false
  }
}

/**
 * 全量清理命令
 */
async function clearCommand() {
  try {
    // 显示将要清除的内容
    const hasContent = await showClearPreview()

    if (!hasContent) {
      // 检查settings.json
      let hasSettingsConfig = false
      try {
        const config = await validateConfig()
        const settingsData = await readConfigFile(config.settingsPath)
        if (settingsData.env && Object.keys(settingsData.env).length > 0) {
          hasSettingsConfig = Object.values(CLAUDE_ENV_KEYS).some(key => settingsData.env[key])
        }
      } catch (error) {
        // 忽略错误，继续检查
      }

      if (!hasSettingsConfig) {
        console.log(chalk.green(await t('clear.NO_CONFIG_TO_CLEAR')))
        return
      }
    }

    console.log(chalk.red.bold(await t('clear.WARNING_CLEAR_ALL')))
    console.log(chalk.red(await t('clear.WILL_CLEAR_SETTINGS')))
    console.log(chalk.red(await t('clear.WILL_CLEAR_SYSTEM')))
    console.log()

    // 第一次确认
    const firstConfirm = await getUserConfirmation()
    if (!firstConfirm) {
      return
    }

    console.log()
    
    let settingsCleared = false
    let envCleared = false

    // 清理 settings.json
    try {
      const config = await validateConfig()
      const settingsData = await readConfigFile(config.settingsPath)
      
      if (validateSettingsConfig(settingsData)) {
        // 备份 settings.json
        const backupPath = await backupFile(config.settingsPath)
        console.log(await t('clear.SETTINGS_BACKED_UP', backupPath))

        // 清理配置
        const clearedSettings = clearSettingsConfig(settingsData)
        await writeConfigFile(config.settingsPath, clearedSettings)
        
        console.log(chalk.green.bold(await t('clear.SETTINGS_CONFIG_CLEARED')))
        settingsCleared = true
      }
    } catch (error) {
      console.log(chalk.yellow(await t('clear.SETTINGS_CLEAR_FAILED')), error.message)
    }

    // 清理系统环境变量
    try {
      envCleared = await clearSystemEnvVars()
    } catch (error) {

    }

  } catch (error) {
    console.error(chalk.red(await t('clear.CLEAR_CMD_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = clearCommand
