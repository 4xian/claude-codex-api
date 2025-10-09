const chalk = require('chalk')
const { validateConfig } = require('../../utils/config')
const { readConfigFile } = require('../../utils/file')
const { validateApiConfig } = require('../../utils/validator')
const { readConfig } = require('../../utils/config')
const LatencyTester = require('../../utils/latency-tester')
const { t } = require('../../utils/i18n')

let configData
const maxText = 50
/**
 * 获取配置数据
 */
async function getConfigData() {
  configData = await readConfig()
}

// 初始化配置
getConfigData()

/**
 * 延迟分级颜色配置
 */
const LATENCY_COLORS = {
  EXCELLENT: { color: chalk.green, threshold: 300 },
  GOOD: { color: chalk.yellow, threshold: 800 },
  POOR: { color: chalk.red, threshold: Infinity }
}

/**
 * 获取延迟颜色和状态
 */
function getLatencyColor(latency) {
  if (latency === 'error') {
    return { color: chalk.red, text: 'error', status: '●' }
  }

  const ms = parseInt(latency)
  if (ms <= LATENCY_COLORS.EXCELLENT.threshold) {
    return {
      color: LATENCY_COLORS.EXCELLENT.color,
      text: `${ms}ms`,
      status: '●'
    }
  } else if (ms <= LATENCY_COLORS.GOOD.threshold) {
    return { color: LATENCY_COLORS.GOOD.color, text: `${ms}ms`, status: '●' }
  } else {
    return { color: LATENCY_COLORS.POOR.color, text: `${ms}ms`, status: '●' }
  }
}

/**
 * 显示加载动画
 */
function showSpinner() {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  return setInterval(() => {
    process.stdout.write(`\r${frames[i]} `)
    i = (i + 1) % frames.length
  }, 100)
}

/**
 * 格式化URL显示
 */
function formatUrl(url, maxLength = maxText) {
  if (url.length > maxLength) {
    return url.slice(0, maxLength - 3) + '...'
  }
  return url
}

/**
 * 测试单个配置的所有URL延迟
 */
async function testConfigurationPing(configName, config) {
  const urls = Array.isArray(config.url) ? config.url : [config.url]

  // 获取超时配置，默认5000ms
  const timeout = configData && configData.pingTimeout ? configData.pingTimeout : 5000

  // 使用 LatencyTester 并行测试所有URL
  const results = await LatencyTester.testMultipleUrls(urls, 'auto', timeout)

  return {
    configName,
    results: results.map((result) => ({
      url: result.url,
      success: result.success,
      latency: result.latency,
      error: result.error,
      response: null, // ping 命令不返回响应内容，只测试延迟
      index: result.index,
      configName
    }))
  }
}

/**
 * 获取配置结果中的最佳延迟信息
 */
function getBestLatencyInfo(results) {
  // 从所有有数字延迟的结果中获取最佳延迟
  const numericResults = results
    .filter((r) => typeof r.latency === 'number' && r.latency > 0 && r.latency !== Infinity)
    .sort((a, b) => a.latency - b.latency)

  if (numericResults.length > 0) {
    return { latency: numericResults[0].latency, url: numericResults[0].url }
  }

  return { latency: Infinity, url: null }
}

/**
 * 获取配置结果中的最佳延迟（向后兼容）
 */
function getBestLatency(results) {
  const info = getBestLatencyInfo(results)
  return info.latency
}

/**
 * 对测试结果进行排序和分组（按配置分组，配置内按原始顺序）
 */
function sortTestResults(allResults) {
  // 对每个配置的results内部保持原始顺序（按index排序）
  const sortedResults = allResults.map((configResult) => {
    const sortedConfigResults = configResult.results.sort((a, b) => {
      // 按原始配置文件中的顺序排序（使用index字段）
      if (a.index !== undefined && b.index !== undefined) {
        return a.index - b.index
      }
      return 0
    })

    return {
      ...configResult,
      results: sortedConfigResults
    }
  })

  // 按配置的最佳延迟排序配置
  const finalSorted = sortedResults.sort((a, b) => {
    const bestLatencyA = getBestLatency(a.results)
    const bestLatencyB = getBestLatency(b.results)

    // 如果都有成功的结果，按最佳延迟排序
    if (bestLatencyA !== Infinity && bestLatencyB !== Infinity) {
      return bestLatencyA - bestLatencyB
    }

    // 有成功结果的排在前面
    if (bestLatencyA !== Infinity && bestLatencyB === Infinity) return -1
    if (bestLatencyA === Infinity && bestLatencyB !== Infinity) return 1

    // 都没有成功结果，按配置名排序
    return a.configName.localeCompare(b.configName)
  })

  return finalSorted
}

/**
 * 显示排序后的测试结果
 */
async function displayPingResults(sortedResults) {
  console.log()
  console.log(chalk.yellow.bold(await t('ping.LATENCY_TEST_RESULTS')))
  console.log()

  for (const configResult of sortedResults) {
    const configIndex = sortedResults.indexOf(configResult)
    // 获取并显示配置的最佳延迟和地址
    const bestInfo = getBestLatencyInfo(configResult.results)

    let bestText
    if (bestInfo.latency === Infinity) {
      bestText = await t('test.FAILED')
    } else {
      const shortUrl = formatUrl(bestInfo.url)
      bestText = `${shortUrl}`
    }

    // 显示配置名和最佳延迟信息
    console.log(
      chalk.cyan.bold(`[${configResult.configName}]`) + chalk.cyan.bold(`(${await t('ping.BEST_ROUTE', bestText)})`)
    )

    configResult.results.forEach((result, index) => {
      const { color, text, status } = getLatencyColor(result.latency)

      // ping 命令的响应显示逻辑
      let responseDisplay = ''
      const show = configData.testResponse === void 0 ? true : !!configData.testResponse;
      if (show) {
        const responseText = result.error || 'Success'
        const finalResponse = responseText.length > maxText ? responseText.slice(0, maxText) + '...' : responseText
        responseDisplay = ` [Response: ${finalResponse}]`
      }

      const urlFormatted = formatUrl(result.url)
      const resultLine = `    ${index + 1}.[${urlFormatted}] ${color(status)} ${color.bold(text)}${responseDisplay}`

      console.log(resultLine)
    })

    // 在每个配置后添加空行
    if (configIndex < sortedResults.length - 1) {
      console.log()
    }
  }

  console.log()
}

/**
 * ping 命令的主函数
 */
async function pingCommand(configName = null) {
  try {
    // 验证配置
    const config = await validateConfig()

    // 读取API配置文件
    const apiConfig = await readConfigFile(config.apiConfigPath)
    if (!validateApiConfig(apiConfig)) {
      console.error(chalk.red((await t('test.ERROR')) + ':'), await t('ping.CONFIG_FORMAT_ERROR'))
      return
    }

    let configsToTest = {}

    if (configName) {
      // 测试指定配置
      if (!apiConfig[configName]) {
        console.error(chalk.red((await t('test.ERROR')) + ':'), await t('ping.CONFIG_NOT_EXIST', configName))
        console.log(chalk.green(await t('ping.AVAILABLE_CONFIGS')), Object.keys(apiConfig).join(', '))
        return
      }
      configsToTest[configName] = apiConfig[configName]
    } else {
      // 测试所有配置
      configsToTest = apiConfig
    }

    // 显示测试进度信息
    const totalConfigs = Object.keys(configsToTest).length
    console.log(chalk.green.bold(await t('ping.TESTING_CONFIGS', totalConfigs)))

    // 显示测试方法信息
    // const methodInfo = await LatencyTester.getTestMethodInfo()

    // 显示全局加载动画
    const globalSpinner = showSpinner()

    // 创建所有配置的并行测试任务
    const testPromises = Object.entries(configsToTest).map(([name, configdata]) =>
      testConfigurationPing(name, configdata)
    )

    // 等待所有配置测试完成
    const allResults = await Promise.all(testPromises)

    // 清除加载动画
    clearInterval(globalSpinner)
    process.stdout.write('\r\u001b[K') // 清除当前行

    // 整理并排序所有测试结果
    const sortedResults = sortTestResults(allResults)

    // 显示排序后的结果
    await displayPingResults(sortedResults)

    // 显示测试完成信息
    const totalUrls = sortedResults.reduce((total, config) => total + config.results.length, 0)
    const successUrls = sortedResults.reduce(
      (total, config) => total + config.results.filter((r) => r.success).length,
      0
    )

    console.log(chalk.green.bold(await t('ping.LATENCY_TEST_COMPLETE', successUrls, totalUrls)))

    return sortedResults
  } catch (error) {
    console.error(chalk.red(await t('ping.LATENCY_TEST_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = pingCommand
