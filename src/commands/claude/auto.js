const chalk = require('chalk')
const pingCommand = require('./ping')
const testCommand = require('./test')
const useCommand = require('./use')
const { validateConfig } = require('../../utils/config')
const { readConfigFile } = require('../../utils/file')
const { t } = require('../../utils/i18n')

/**
 * 分析测试结果，从已排序的结果中选择最优配置
 * @param {Array} sortedResults - 排序后的测试结果
 * @param {boolean} isTestMode - 是否为test模式（true=test, false=ping）
 */
function analyzeBestConfig(sortedResults, isTestMode = false) {
  const allValidResults = []

  for (const configResult of sortedResults) {
    const { configName, results } = configResult

    // 遍历该配置的所有结果
    for (let i = 0; i < results.length; i++) {
      const result = results[i]

      let isValidResult = false

      if (isTestMode) {
        isValidResult =
          result.success === true &&
          typeof result.latency === 'number' &&
          result.latency > 0 &&
          result.latency !== Infinity &&
          !isNaN(result.latency)
      } else {
        isValidResult =
          typeof result.latency === 'number' &&
          result.latency > 0 &&
          result.latency !== Infinity &&
          !isNaN(result.latency)
      }

      if (isValidResult) {
        allValidResults.push({
          configName: configName,
          latency: result.latency,
          url: result.url,
          urlIndex: i,
          keyIndex: i,
          tokenIndex: i
        })
      }
    }
  }

  // 如果没有有效结果，返回默认值
  if (allValidResults.length === 0) {
    return {
      configName: null,
      latency: Infinity,
      url: null,
      urlIndex: -1,
      keyIndex: -1,
      tokenIndex: -1
    }
  }

  // 按延迟从小到大排序，选择延迟最低的配置
  allValidResults.sort((a, b) => a.latency - b.latency)

  return allValidResults[0]
}

/**
 * 构建use命令的选项对象
 */
async function buildUseOptions(configName, bestResult, apiConfig) {
  const config = apiConfig[configName]
  const options = {}

  // 处理URL索引
  if (Array.isArray(config.url) && bestResult.urlIndex >= 0) {
    options.url = (bestResult.urlIndex + 1).toString() // 转换为1开始的索引
  }

  // 处理Key索引
  if (Array.isArray(config.key) && bestResult.keyIndex >= 0) {
    const actualKeyIndex = Math.min(bestResult.keyIndex, config.key.length - 1)
    options.key = (actualKeyIndex + 1).toString()
  }

  // 处理Token索引
  if (Array.isArray(config.token) && bestResult.tokenIndex >= 0) {
    const actualTokenIndex = Math.min(bestResult.tokenIndex, config.token.length - 1)
    options.token = (actualTokenIndex + 1).toString()
  }

  // Model和Fast默认使用第一个（如果是数组的话）
  if (Array.isArray(config.model)) {
    options.model = '1'
  }

  if (Array.isArray(config.fast)) {
    options.fast = '1'
  }

  return options
}

/**
 * 自动选择最优配置命令
 */
async function autoCommand(configName = null, options = {}) {
  try {
    let sortedResults
    let isTestMode = true

    if (options.ping) {
      // console.log(chalk.cyan('使用 ping 测试模式（快速网络延迟测试）...'))
      sortedResults = await pingCommand(configName)
      isTestMode = false
    } else {
      // console.log(chalk.cyan('使用 test 测试模式（真实API可用性测试）...'))
      sortedResults = await testCommand(configName, 0, 0)
      isTestMode = true
    }

    if (!sortedResults || sortedResults.length === 0) {
      console.error(chalk.red(await t('test.ERROR') + ':'), await t('auto.NO_CONFIGS_AVAILABLE'))
      process.exit(1)
    }

    // 从已排序的结果中选择最优配置
    const bestResult = analyzeBestConfig(sortedResults, isTestMode)

    if (!bestResult.configName) {
      const tip = configName ? `${configName}: ${await t('test.ERROR')}!` : await t('test.NO_AVAILABLE_CONFIG') + '!'
      console.error(chalk.red.bold(tip))
      process.exit(1)
    }

    console.log(chalk.green.bold(await t('auto.FOUND_OPTIMAL_CONFIG')))

    // 读取配置文件以构建use命令参数
    const config = await validateConfig()
    const apiConfig = await readConfigFile(config.apiConfigPath)

    // 构建use命令的选项
    const useOptions = await buildUseOptions(bestResult.configName, bestResult, apiConfig)

    // 执行切换
    await useCommand(bestResult.configName, useOptions)
  } catch (error) {
    console.error(chalk.red(await t('auto.AUTO_SWITCH_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = autoCommand
