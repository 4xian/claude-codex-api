const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const { exec } = require('child_process')
const { promisify } = require('util')
const chalk = require('chalk')
const { CLAUDE_ENV_KEYS } = require('./constants')
const { t } = require('./i18n')

const execAsync = promisify(exec)
const maxText = 30

// 配置标识环境变量名
const CONFIG_IDENTIFIER = 'CCAPI_CURRENT_CONFIG'

/**
 * 获取当前平台类型
 */
async function getPlatformType() {
  const platform = os.platform()
  if (platform === 'win32') return 'windows'
  if (platform === 'darwin') return 'mac'
  if (platform === 'linux') return 'linux'

  throw new Error(await t('utils.PLATFORM_NOT_SUPPORTED', platform))
}

/**
 * 获取Shell配置文件路径（Mac/Linux）
 */
async function getShellConfigPath() {
  const homeDir = os.homedir()
  const shell = process.env.SHELL || '/bin/bash'

  // 优先级: .zshrc > .bashrc > .bash_profile > .profile
  const configFiles = [
    path.join(homeDir, '.zshrc'),
    path.join(homeDir, '.bashrc'),
    path.join(homeDir, '.bash_profile'),
    path.join(homeDir, '.profile')
  ]

  // 如果是zsh，优先使用.zshrc
  if (shell.includes('zsh')) {
    return configFiles[0]
  }

  // 寻找第一个存在的配置文件
  for (const configFile of configFiles) {
    if (await fs.pathExists(configFile)) {
      return configFile
    }
  }

  // 如果都不存在，创建对应shell的默认配置文件
  if (shell.includes('zsh')) {
    return configFiles[0] // .zshrc
  }
  return configFiles[1] // .bashrc
}

/**
 * 删除Windows环境变量
 */
async function removeWindowsEnvVar(key) {
  try {
    // Windows删除环境变量，设置为空值
    const command = `reg delete "HKEY_CURRENT_USER\\Environment" /v "${key}" /f`
    await execAsync(command)
    return true
  } catch (error) {
    // 忽略变量不存在的错误
    if (error.message.includes('ERROR: The system was unable to find')) {
      return true
    }
    return false
  }
}

/**
 * 设置Unix系统环境变量（Mac/Linux）- 批量设置
 */
async function setUnixEnvVars(envVars) {
  try {
    const configPath = await getShellConfigPath()

    // 读取现有配置文件内容
    let content = ''
    if (await fs.pathExists(configPath)) {
      content = await fs.readFile(configPath, 'utf8')
    }

    // CCAPI环境变量标记区域
    const startMarker = '# CCAPI Environment Variables - START'
    const endMarker = '# CCAPI Environment Variables - END'

    // 移除旧的CCAPI配置区域
    const startIndex = content.indexOf(startMarker)
    const endIndex = content.indexOf(endMarker)

    if (startIndex !== -1 && endIndex !== -1) {
      content = content.substring(0, startIndex) + content.substring(endIndex + endMarker.length + 1)
    }

    // 构建新的环境变量区域
    const envLines = ['', startMarker, ...Object.entries(envVars).map(([k, v]) => `export ${k}="${v}"`), endMarker, '']

    // 写入配置文件
    const newContent = content.trim() + '\n' + envLines.join('\n')
    await fs.writeFile(configPath, newContent)

    return true
  } catch (error) {
    console.error(chalk.red(await t('utils.ENV_SET_FAILED')), error.message)
    return false
  }
}

/**
 * 设置Windows系统环境变量 - 批量设置
 */
async function setWindowsEnvVars(envVars) {
  try {
    // Windows需要逐个设置，但我们可以并行执行
    const promises = Object.entries(envVars).map(async ([key, value]) => {
      try {
        const command = `setx "${key}" "${value}"`
        await execAsync(command)
        return { key, success: true }
      } catch (error) {
        console.error(chalk.red(await t('utils.ENV_SET_FAILED_KEY', key)), error.message)
        return { key, success: false, error: error.message }
      }
    })

    const allResults = await Promise.allSettled(promises)
    let successCount = 0

    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++
      }
    })

    return successCount === Object.keys(envVars).length
  } catch (error) {
    console.error(chalk.red(await t('utils.ENV_SET_FAILED')), error.message)
    return false
  }
}

/**
 * 删除Unix系统环境变量（Mac/Linux）
 */
async function removeUnixEnvVars() {
  try {
    const configPath = await getShellConfigPath()

    if (!(await fs.pathExists(configPath))) {
      return true
    }

    const content = await fs.readFile(configPath, 'utf8')

    // CCAPI环境变量标记区域
    const startMarker = '# CCAPI Environment Variables - START'
    const endMarker = '# CCAPI Environment Variables - END'

    // 移除CCAPI配置区域
    const startIndex = content.indexOf(startMarker)
    const endIndex = content.indexOf(endMarker)

    if (startIndex !== -1 && endIndex !== -1) {
      const newContent = content.substring(0, startIndex) + content.substring(endIndex + endMarker.length + 1)
      await fs.writeFile(configPath, newContent.trim() + '\n')
    }

    return true
  } catch (error) {
    console.error(chalk.red.bold(await t('utils.ENV_DELETE_FAILED')), error.message)
    return false
  }
}

/**
 * 获取系统中已设置的相关环境变量
 */
async function getSystemEnvVars() {
  const envVars = {}

  // 获取所有CLAUDE_ENV_KEYS相关的环境变量
  const allKeys = Object.values(CLAUDE_ENV_KEYS)
  allKeys.push(CONFIG_IDENTIFIER) // 添加配置标识符

  for (const key of allKeys) {
    const value = process.env[key]
    if (value) {
      envVars[key] = value
    }
  }

  return envVars
}

/**
 * 设置配置到系统环境变量
 */
async function setSystemEnvVars(config, configName, tip = true) {
  try {
    const platform = await getPlatformType() // 这里会抛出不支持平台的错误

    // console.log(await t('use.SWITCHING_ENV'))

    // 构建所有要设置的环境变量
    const envVarsToSet = {}

    // 添加配置标识符
    envVarsToSet[CONFIG_IDENTIFIER] = configName

    // 遍历配置对象，添加相关环境变量
    for (const [configKey, envKey] of Object.entries(CLAUDE_ENV_KEYS)) {
      if (config[configKey]) {
        let value = config[configKey]

        // 处理数组类型，取第一个值
        if (Array.isArray(value)) {
          value = value[0]
        }

        envVarsToSet[envKey] = value
      }
    }

    // 根据平台设置环境变量
    let success = false
    if (platform === 'windows') {
      try {
        await clearSystemEnvVars(false)
      } catch (e) {}
      success = await setWindowsEnvVars(envVarsToSet)
    } else {
      success = await setUnixEnvVars(envVarsToSet)
    }

    if (!tip) return success

    if (success) {
      // 显示已设置的环境变量
      console.log()
      console.log(
        chalk.green.bold(await t('utils.ENV_SET_SUCCESS_MSG', configName)),
        chalk.yellow.bold(await t('success.RESTART_TERMINAL'))
      )
      console.log()

      // 按照CLAUDE_ENV_KEYS的顺序显示环境变量
      for (const [configKey, envKey] of Object.entries(CLAUDE_ENV_KEYS)) {
        if (envVarsToSet[envKey]) {
          let displayValue = envVarsToSet[envKey]

          // 对敏感信息进行脱敏处理
          if (configKey === 'key' || configKey === 'token') {
            displayValue = displayValue.length > maxText ? displayValue.slice(0, maxText) + '...' : displayValue
          }

          console.log(`  ${chalk.cyan(envKey)}: ${chalk.green(displayValue)}`)
        }
      }
      console.log()
    } else {
      console.log()
      console.error(chalk.red.bold(await t('utils.ENV_SET_FAILED_MSG')))
    }

    return success
  } catch (error) {
    console.error(chalk.red(await t('utils.ENV_SET_FAILED')), error.message)
    return false
  }
}

/**
 * 清除系统中的相关环境变量
 */
async function clearSystemEnvVars(tip = true) {
  try {
    const platform = await getPlatformType()
    // console.log(chalk.green.bold('正在清除系统环境变量...'))

    if (platform === 'windows') {
      // Windows: 删除注册表中的环境变量
      const allKeys = Object.values(CLAUDE_ENV_KEYS)
      allKeys.push(CONFIG_IDENTIFIER)

      let successCount = 0
      for (const key of allKeys) {
        const success = await removeWindowsEnvVar(key)
        if (success) successCount++
      }
    } else {
      // Unix: 删除shell配置文件中的环境变量
      await removeUnixEnvVars()
    }
    if (tip) {
      console.log(
        chalk.green.bold(await t('utils.ENV_CLEAR_SUCCESS')),
        chalk.yellow.bold(await t('success.RESTART_TERMINAL'))
      )
    }
    return true
  } catch (error) {
    console.error(chalk.red.bold(await t('utils.ENV_CLEAR_FAILED')), error.message)
    return false
  }
}

/**
 * 获取当前使用的配置名称
 */
function getCurrentConfigName() {
  return process.env[CONFIG_IDENTIFIER] || null
}

/**
 * 检测环境变量设置状态
 */
async function checkEnvStatus() {
  const envVars = await getSystemEnvVars()
  const currentConfig = getCurrentConfigName()

  return {
    hasEnvVars: Object.keys(envVars).length > 1, // 除了CONFIG_IDENTIFIER之外还有其他变量
    currentConfig,
    envVars
  }
}

module.exports = {
  getSystemEnvVars,
  setSystemEnvVars,
  clearSystemEnvVars,
  getCurrentConfigName,
  checkEnvStatus,
  CONFIG_IDENTIFIER
}
