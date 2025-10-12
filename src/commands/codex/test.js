const chalk = require('chalk')
const { getCodexProviders } = require('../../utils/codex-config')
const { readConfig } = require('../../utils/config')
const SSEClient = require('../../utils/sse-client')
const { t } = require('../../utils/i18n')
const { instructions } = require('./instructions')

let configData
const maxText = 50
const maxKeyText = 30

/**
 * 对 API Key 进行脱敏处理（与 list.js 保持一致）
 */
function maskApiKey(key) {
  if (!key) return '***'
  return key.length > maxKeyText ? key.slice(0, maxKeyText) + '...' : key
}

async function getConfigData() {
  if (!configData) {
    configData = await readConfig()
  }
  return configData
}

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

async function testCodexProvider(name, config, model, attempt = 1) {
  const cfg = await getConfigData()
  const timeout = cfg?.testTimeout || 30000
  const startTime = Date.now()

  const testModel = attempt === 1 ? 'gpt-5' : 'gpt-5-codex'

  try {
    const requestBody = {
      model: testModel,
      instructions,
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Please respond with "Success" in your reply.'
            }
          ]
        }
      ],
      reasoning: {
        effort: 'low',
        summary: 'auto'
      },
      store: false,
      stream: true,
      include: ['reasoning.encrypted_content']
    }

    const result = await SSEClient.request(`${config.base_url}/responses`, {
      body: requestBody,
      headers: {
        'User-Agent': 'codex_cli_rs/0.39.0 (Mac OS 15.4.1; arm64) Apple_Terminal/455.1',
        'Connection': 'keep-alive',
        'Accept': 'text/event-stream',
        'Accept-Encoding': 'gzip, deflate, br',
        'authorization': `Bearer ${config.api_key}`,
        'openai-beta': 'responses=experimental',
        'originator': 'codex_cli_rs'
      },
      timeout
    })
    const latency = Date.now() - startTime
    const responseText = SSEClient.extractOutputText(result.events)

    return {
      success: true,
      latency,
      response:
        responseText.length > maxText ? responseText.slice(0, maxText) + '...' : responseText.replace(/\n/g, '').trim(),
      error: null,
      model: testModel,
      attempt
    }
  } catch (error) {
    return {
      success: false,
      latency: 'error',
      error: error.message.replace(/\n/g, '').trim(),
      response: null,
      model: testModel,
      attempt
    }
  }
}

async function testSingleProvider(name, config) {
  if (!config.base_url) {
    return [{
      name,
      url: null,
      success: false,
      latency: 'error',
      error: await t('codex.NO_URL'),
      model: null,
      response: null,
      keyIndex: null
    }]
  }

  if (!config.api_key) {
    return [{
      name,
      url: config.base_url,
      success: false,
      latency: 'error',
      error: await t('codex.API_KEY_MISSING'),
      model: null,
      response: null,
      keyIndex: null
    }]
  }

  const currentModel = config.models && config.models.length > 0 ? config.models[0] : 'gpt-5'
  const apiKeys = Array.isArray(config.api_key) ? config.api_key : [config.api_key]
  
  const keyResults = []
  
  for (let i = 0; i < apiKeys.length; i++) {
    const testConfig = { ...config, api_key: apiKeys[i] }
    let result = await testCodexProvider(name, testConfig, currentModel, 1)

    if (!result.success) {
      result = await testCodexProvider(name, testConfig, currentModel, 2)
    }
    
    keyResults.push({
      name,
      url: config.base_url,
      keyIndex: apiKeys.length > 1 ? i + 1 : null,
      apiKey: apiKeys[i],
      ...result
    })
  }
  
  return keyResults
}

async function displayTestResults(sortedResults) {
  console.log()
  console.log(chalk.yellow.bold(await t('test.TEST_RESULTS_TITLE')))
  console.log()

  const translations = {
    valid: await t('test.VALID'),
    invalid: await t('test.INVALID')
  }

  const cfg = await getConfigData()
  const noUrlText = await t('codex.NO_URL')

  const groupedResults = {}
  sortedResults.forEach((result) => {
    if (!groupedResults[result.name]) {
      groupedResults[result.name] = []
    }
    groupedResults[result.name].push(result)
  })

  for (const [providerName, results] of Object.entries(groupedResults)) {
    console.log(chalk.cyan.bold(`[${providerName}]`))

    results.forEach((result, index) => {
      const status =
        result.success && result.latency !== 'error'
          ? `✅ ${chalk.green.bold(translations.valid)}`
          : `❌ ${chalk.red.bold(translations.invalid)}`
      const { color } = getLatencyColor(result.latency)
      const latencyText = result.latency === 'error' ? 'error' : `${result.latency}ms`
      const responseText = result.response
        ? result.response.length > maxText
          ? result.response.slice(0, maxText) + '...'
          : result.response
        : result.error || 'Success'

      const show = cfg?.testResponse === void 0 ? true : !!cfg.testResponse
      const responseDisplay = show ? ` [Response: ${responseText}]` : ''

      const maskedKey = maskApiKey(result.apiKey)
      
      console.log(`    ${index + 1}.[${maskedKey}] ${status}(${color.bold(latencyText)})${responseDisplay}`)
    })
    
    console.log()
  }
}

async function codexTestCommand(providerName = null) {
  try {
    const providers = await getCodexProviders()

    if (!providers || Object.keys(providers).length === 0) {
      console.log(chalk.yellow(await t('codex.NO_PROVIDERS')))
      return
    }

    let providersToTest = {}

    if (providerName) {
      if (!providers[providerName]) {
        console.error(chalk.red(await t('common.PARAMETER_ERROR')), await t('codex.PROVIDER_NOT_FOUND', providerName))
        console.log(chalk.green(await t('codex.AVAILABLE_PROVIDERS_LIST')), Object.keys(providers).join(', '))
        return
      }
      providersToTest[providerName] = providers[providerName]
    } else {
      providersToTest = providers
    }

    const totalProviders = Object.keys(providersToTest).length
    console.log(chalk.green.bold(await t('codex.TESTING_VALIDITY_COUNT', totalProviders)))

    const globalSpinner = showSpinner()

    const testPromises = Object.entries(providersToTest).map(async ([name, config]) => {
      return await testSingleProvider(name, config)
    })

    const allResults = (await Promise.all(testPromises)).flat()

    clearInterval(globalSpinner)
    process.stdout.write('\r\u001b[K')

    const sortedResults = allResults.sort((a, b) => {
      if (a.latency === Infinity && b.latency === Infinity) {
        return a.name.localeCompare(b.name)
      }
      if (a.latency === Infinity || a.latency === 'error') return 1
      if (b.latency === Infinity || b.latency === 'error') return -1
      return a.latency - b.latency
    })

    await displayTestResults(sortedResults)

    const successResults = sortedResults.filter((r) => r.success)
    const totalUrls = sortedResults.length
    const successUrls = successResults.length

    console.log(chalk.green.bold(await t('codex.VALIDITY_TEST_COMPLETE', successUrls, totalUrls)))
    return sortedResults
  } catch (error) {
    console.error(chalk.red(await t('codex.TEST_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = codexTestCommand
