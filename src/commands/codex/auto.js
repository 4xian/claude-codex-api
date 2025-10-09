const chalk = require('chalk')
const codexPingCommand = require('./ping')
const codexTestCommand = require('./test')
const codexUseCommand = require('./use')
const { getCodexProviders } = require('../../utils/codex-config')
const { t } = require('../../utils/i18n')

/**
 * 分析测试结果，从已排序的结果中选择最优配置
 * @param {Array} sortedResults - 排序后的测试结果
 * @param {boolean} isTestMode - 是否为test模式（true=test, false=ping）
 */
function analyzeBestProvider(sortedResults, isTestMode = false) {
  const allValidResults = []

  for (const result of sortedResults) {
    const { name, url, latency, success } = result

    let isValidResult = false

    if (isTestMode) {
      // test 模式：需要 success 为 true 且有有效延迟
      isValidResult =
        success === true &&
        typeof latency === 'number' &&
        latency > 0 &&
        latency !== Infinity &&
        !isNaN(latency)
    } else {
      // ping 模式：只需要有有效延迟
      isValidResult =
        typeof latency === 'number' &&
        latency > 0 &&
        latency !== Infinity &&
        !isNaN(latency)
    }

    if (isValidResult) {
      allValidResults.push({
        providerName: name,
        latency: latency,
        url: url
      })
    }
  }

  // 如果没有有效结果，返回默认值
  if (allValidResults.length === 0) {
    return {
      providerName: null,
      latency: Infinity,
      url: null
    }
  }

  // 按延迟从小到大排序，选择延迟最低的配置
  allValidResults.sort((a, b) => a.latency - b.latency)

  return allValidResults[0]
}

/**
 * 构建 use 命令的选项对象
 */
async function buildUseOptions(providerName, bestResult, providers) {
  const provider = providers[providerName]
  const options = {}

  // 处理 model 索引（如果 models 是数组，默认选择第一个）
  if (Array.isArray(provider.models) && provider.models.length > 0) {
    options.model = '1'
  }

  return options
}

/**
 * 自动选择最优 Codex 提供商命令
 */
async function codexAutoCommand(providerName = null, options = {}) {
  try {
    let sortedResults
    let isTestMode = true

    if (options.ping) {
      // console.log(chalk.cyan('使用 ping 测试模式（快速网络延迟测试）...'))
      sortedResults = await codexPingCommand(providerName)
      isTestMode = false
    } else {
      // console.log(chalk.cyan('使用 test 测试模式（真实API可用性测试）...'))
      sortedResults = await codexTestCommand(providerName)
      isTestMode = true
    }

    if (!sortedResults || sortedResults.length === 0) {
      console.error(chalk.red(await t('test.ERROR') + ':'), await t('auto.NO_CONFIGS_AVAILABLE'))
      process.exit(1)
    }

    // 从已排序的结果中选择最优配置
    const bestResult = analyzeBestProvider(sortedResults, isTestMode)

    if (!bestResult.providerName) {
      const tip = providerName
        ? `${providerName}: ${await t('test.ERROR')}!`
        : await t('codex.NO_AVAILABLE_PROVIDERS') + '!'
      console.error(chalk.red.bold(tip))
      process.exit(1)
    }

    console.log(chalk.green.bold(await t('auto.FOUND_OPTIMAL_CONFIG')))

    // 读取 providers 配置
    const providers = await getCodexProviders()

    // 构建 use 命令的选项
    const useOptions = await buildUseOptions(bestResult.providerName, bestResult, providers)

    // 执行切换
    await codexUseCommand(bestResult.providerName, useOptions)
  } catch (error) {
    console.error(chalk.red(await t('auto.AUTO_SWITCH_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = codexAutoCommand
