const chalk = require('chalk')
const { getCodexProviders } = require('../../utils/codex-config')
const { readConfig } = require('../../utils/config')
const LatencyTester = require('../../utils/latency-tester')
const { t } = require('../../utils/i18n')

let configData
const maxText = 50

async function getConfigData() {
  configData = await readConfig()
}

getConfigData()

const LATENCY_COLORS = {
  EXCELLENT: { color: chalk.green, threshold: 300 },
  GOOD: { color: chalk.yellow, threshold: 800 },
  POOR: { color: chalk.red, threshold: Infinity }
}

function getLatencyColor(latency) {
  if (latency === 'error' || latency === Infinity) {
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

function showSpinner() {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  return setInterval(() => {
    process.stdout.write(`\r${frames[i]} `)
    i = (i + 1) % frames.length
  }, 100)
}

function formatUrl(url, maxLength = maxText) {
  if (url.length > maxLength) {
    return url.slice(0, maxLength - 3) + '...'
  }
  return url
}

async function codexPingCommand() {
  try {
    const providers = await getCodexProviders()

    if (!providers || Object.keys(providers).length === 0) {
      console.log(chalk.yellow(await t('codex.NO_PROVIDERS')))
      return
    }

    const totalProviders = Object.keys(providers).length
    console.log(chalk.green.bold(await t('codex.TESTING_LATENCY_COUNT', totalProviders)))

    const globalSpinner = showSpinner()

    const testPromises = Object.entries(providers).map(async ([name, config]) => {
      if (!config.base_url) {
        return {
          name,
          url: null,
          success: false,
          latency: Infinity,
          error: await t('codex.NO_URL')
        }
      }

      try {
        const timeout = configData && configData.pingTimeout ? configData.pingTimeout : 5000
        const latency = await LatencyTester.testUrl(config.base_url, 'auto', timeout)
        return {
          name,
          url: config.base_url,
          success: true,
          latency,
          error: null
        }
      } catch (error) {
        return {
          name,
          url: config.base_url,
          success: false,
          latency: Infinity,
          error: error.message
        }
      }
    })

    const allResults = await Promise.all(testPromises)

    clearInterval(globalSpinner)
    process.stdout.write('\r\u001b[K')

    const sortedResults = allResults.sort((a, b) => {
      if (a.latency === Infinity && b.latency === Infinity) {
        return a.name.localeCompare(b.name)
      }
      if (a.latency === Infinity) return 1
      if (b.latency === Infinity) return -1
      return a.latency - b.latency
    })

    console.log()
    console.log(chalk.yellow.bold(await t('ping.LATENCY_TEST_RESULTS')))
    console.log()

    const noUrlText = await t('codex.NO_URL')
    const failedText = await t('test.FAILED')
    // const bestRoutePrefix = await t('ping.BEST_ROUTE', '{0}')

    for (let index = 0; index < sortedResults.length; index++) {
      const result = sortedResults[index]
      const { color, text, status } = getLatencyColor(result.latency)

      // 显示 provider 名称和最佳路由信息
      let bestText
      if (result.latency === Infinity || result.latency === 'error') {
        bestText = failedText
      } else {
        const shortUrl = result.url ? formatUrl(result.url) : noUrlText
        bestText = `${shortUrl}`
      }

      // const bestRouteText = bestRoutePrefix.replace('{0}', bestText)
      console.log(chalk.cyan.bold(`[${result.name}]`))

      // 显示 URL 测试结果（使用缩进）
      let responseDisplay = ''
      const show = configData?.testResponse === void 0 ? true : !!configData.testResponse
      if (show) {
        const responseText = result.error || 'Success'
        const finalResponse = responseText.length > maxText ? responseText.slice(0, maxText) + '...' : responseText
        responseDisplay = ` [Response: ${finalResponse}]`
      }

      const urlFormatted = result.url ? formatUrl(result.url) : noUrlText
      const resultLine = `    1.[${urlFormatted}] ${color(status)} ${color.bold(text)}${responseDisplay}`

      console.log(resultLine)

      // 在每个 provider 后添加空行（除了最后一个）
      if (index < sortedResults.length - 1) {
        console.log()
      }
    }

    console.log()

    const successResults = sortedResults.filter((r) => r.success)
    const totalUrls = sortedResults.length
    const successUrls = successResults.length

    console.log(chalk.green.bold(await t('codex.LATENCY_TEST_COMPLETE', successUrls, totalUrls)))

    // if (successResults.length > 0) {
    //   console.log()
    //   console.log(chalk.green.bold(await t('codex.FASTEST_PROVIDER')))
    //   const fastest = successResults[0]
    //   console.log(`  ${chalk.cyan(fastest.name)} ${chalk.green.bold(fastest.latency + 'ms')}`)
    // }

    console.log()

    return sortedResults
  } catch (error) {
    console.error(chalk.red(await t('codex.PING_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = codexPingCommand
