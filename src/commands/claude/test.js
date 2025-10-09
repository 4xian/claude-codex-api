const chalk = require('chalk')
const { validateConfig } = require('../../utils/config')
const { readConfigFile } = require('../../utils/file')
const { validateApiConfig } = require('../../utils/validator')
const { readConfig } = require('../../utils/config')
const spawn = require('cross-spawn')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { t } = require('../../utils/i18n')

let configData
let testTempDirs = []
const maxText = 100

/**
 * 创建测试用的临时settings文件供claude cli使用
 */
function createTestSettingsFile(url, key, token, model) {
  const tmpDir = os.tmpdir()
  const randomSuffix = Math.random().toString(36).substring(2, 15)
  const settingsPath = path.join(tmpDir, `ccapi-test-${randomSuffix}.json`)

  testTempDirs.push(settingsPath)

  const testSettings = {
    cleanupPeriodDays: 1,
    env: {
      ANTHROPIC_BASE_URL: url,
      ANTHROPIC_MODEL: model
    },
    includeCoAuthoredBy: false,
    permissions: {
      allow: [],
      deny: []
    },
    hooks: {},
    mcpServers: {}
  }

  if (key) {
    testSettings.env.ANTHROPIC_API_KEY = key
  }
  if (token) {
    testSettings.env.ANTHROPIC_AUTH_TOKEN = token
  }

  // 创建空的MCP配置文件
  const mcpConfigPath = path.join(path.dirname(settingsPath), `ccapi-mcp-${randomSuffix}.json`)
  const emptyMcpConfig = {
    mcpServers: {}
  }
  fs.writeFileSync(mcpConfigPath, JSON.stringify(emptyMcpConfig, null, 2))
  testTempDirs.push(mcpConfigPath)

  fs.writeFileSync(settingsPath, JSON.stringify(testSettings, null, 2))

  return { settingsPath, mcpConfigPath }
}

/**
 * 清理测试临时settings文件
 */
async function cleanupTestTempFiles() {
  if (testTempDirs.length === 0) return

  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 清理临时settings文件
  testTempDirs.forEach((tempFile) => {
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile)
      } catch (error) {
        // console.warn(chalk.yellow(`警告: 无法删除临时文件 ${tempFile}: ${error.message}`))
      }
    }
  })

  testTempDirs = []
}

/**
 * 延迟分级颜色
 */
const LATENCY_COLORS = {
  EXCELLENT: { color: chalk.green, threshold: 300 },
  GOOD: { color: chalk.yellow, threshold: 800 },
  POOR: { color: chalk.red, threshold: Infinity }
}

async function getConfigData() {
  configData = await readConfig()
}
getConfigData()

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
 * 显示加载动画的简单实现
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
 * 使用cross-spawn执行进程并处理超时
 */
function spawnWithTimeout(command, args, options, timeout, input = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options)
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      reject({ signal: 'SIGTERM', message: 'timeout', code: 'ETIMEDOUT' })
    }, timeout)

    if (input && child.stdin) {
      child.stdin.write(input)
      child.stdin.end()
    } else if (child.stdin) {
      child.stdin.end()
    }

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })
    }

    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) return
      resolve({ stdout, stderr, code })
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      if (!timedOut) {
        reject(error)
      }
    })
  })
}

/**
 * 使用curl命令流式请求测试单个API配置的有效性
 */
async function testApiLatencyWithCurl(url, key, token, model = 'claude-3-5-haiku-20241022') {
  let latency
  let startTime = Date.now()

  const testMessage =
    'Please reply with only one word "Success", no thinking is allowed, and no use of any mcp services, tools or hooks is allowed.'

  const timeout = configData.testTimeout || 30000

  const isClaudeModel = model && model.toLowerCase().includes('claude')
  const firstTestModel = isClaudeModel ? 'claude-3-5-haiku-20241022' : model
  const shouldRetry = isClaudeModel && model !== 'claude-3-5-haiku-20241022'

  // 执行单次测试的内部函数
  async function performSingleTest(testModel, attempt = 1) {
    try {
      const requestBody = {
        model: testModel,
        max_tokens: 521,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '<system-reminder></system-reminder>'
              },
              {
                type: 'text',
                text: testMessage
              }
            ]
          }
        ],
        temperature: 1,
        stream: true,
        system: [
          {
            type: 'text',
            text: "You are Claude Code, Anthropic's official CLI for Claude.",
            cache_control: {
              type: 'ephemeral'
            }
          },
          {
            type: 'text',
            text: '\nYou are an interactive CLI tool that helps users with software engineering tasks.'
          }
        ],
        tools: [],
        metadata: {
          user_id:
            'user_035f3800f7f80f30fc50b1d72140745cacdd6aae25242833a7ec520b1936a4bc_account__session_18097d37-792a-46e3-b097-4532d7721202'
        }
      }

      const requestBodyString = JSON.stringify(requestBody)

      const curlArgs = [
        '-k',
        '-i',
        '--raw',
        '-s',
        '-X',
        'POST',
        '-H',
        `host: ${new URL(url).host}`,
        '-H',
        'Accept: application/json',
        '-H',
        'X-Stainless-Retry-Count: 0',
        '-H',
        'X-Stainless-Lang: js',
        '-H',
        'X-Stainless-Package-Version: 0.60.0',
        '-H',
        'X-Stainless-Runtime: node',
        '-H',
        'X-Stainless-Runtime-Version: v22.17.0',
        '-H',
        'anthropic-dangerous-direct-browser-access: true',
        '-H',
        'anthropic-version: 2023-06-01',
        '-H',
        `x-api-key: ${key || token}`,
        '-H',
        `Authorization: Bearer ${key || token}`,
        '-H',
        'x-app: cli',
        '-H',
        'User-Agent: claude-cli/1.0.113 (external, cli)',
        '-H',
        'content-type: application/json',
        '-H',
        'anthropic-beta: claude-code-20250219,fine-grained-tool-streaming-2025-05-14',
        '-H',
        'x-stainless-helper-method: stream',
        '-H',
        'accept-language: *',
        '-H',
        'sec-fetch-mode: cors',
        '-H',
        `content-length: ${Buffer.byteLength(requestBodyString, 'utf8')}`,
        '-d',
        requestBodyString,
        `${url}/v1/messages?beta=true`
      ]

      const testStartTime = Date.now()

      const result = await spawnWithTimeout(
        'curl',
        curlArgs,
        {
          stdio: ['pipe', 'pipe', 'pipe']
        },
        timeout
      )

      const testLatency = Date.now() - testStartTime

      // 处理curl原始响应（包含HTTP头部）
      let responseText = ''
      const fullResponse = result.stdout

      // 分离HTTP头部和响应体
      const headerBodySplit = fullResponse.split('\r\n\r\n')
      let httpHeaders = ''
      let responseBody = ''

      if (headerBodySplit.length < 2) {
        const lineSplit = fullResponse.split('\n\n')
        if (lineSplit.length < 2) {
          throw new Error('Invalid HTTP response format')
        }
        httpHeaders = lineSplit[0]
        responseBody = lineSplit.slice(1).join('\n\n')
      } else {
        httpHeaders = headerBodySplit[0]
        responseBody = headerBodySplit.slice(1).join('\r\n\r\n')
      }

      // console.log('httpHeaders', httpHeaders)
      // console.log('responseBody', responseBody)

      // 检查HTTP状态码
      const statusMatch = httpHeaders.match(/HTTP\/[12](?:\.\d)?\s+(\d{3})\s*(.*)/)
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0
      const statusText = statusMatch ? statusMatch[2].trim() : 'Unknown'

      if (statusCode < 200 || statusCode >= 300) {
        let errorMessage = `HTTP ${statusCode} ${statusText}`

        // 尝试从响应体中提取更详细的错误信息
        try {
          const errorJson = JSON.parse(responseBody.trim())
          if (errorJson.error && errorJson.error.message) {
            errorMessage = errorJson.error.message
          }
        } catch (e) {
          const cleanBody = responseBody.replace(/<[^>]*>/g, '').trim()
          if (cleanBody && cleanBody.length < 200) {
            errorMessage = cleanBody
          }
        }

        throw new Error(errorMessage)
      }

      // 检查响应是否为text/event-stream
      const isEventStream = httpHeaders.toLowerCase().includes('content-type: text/event-stream')

      if (!isEventStream) {
        // 非SSE响应，尝试解析为JSON
        try {
          const jsonResponse = JSON.parse(responseBody.trim())

          if (jsonResponse.error) {
            throw new Error(jsonResponse.error.message || 'API Error')
          }
          // 如果是成功的JSON响应，提取内容
          if (jsonResponse.content && Array.isArray(jsonResponse.content)) {
            responseText = jsonResponse.content.map((c) => c.text).join('')
          }
        } catch (parseError) {
          const errorIndex = responseBody.indexOf('error')
          if (errorIndex !== -1) {
            const errorPart = responseBody.substring(errorIndex).replace(/\n/g, '').trim()
            throw new Error(errorPart)
          } else {
            throw new Error(responseBody.replace(/\n/g, '').trim() || 'Invalid response format')
          }
        }
      } else {
        // SSE响应处理
        const lines = responseBody.split('\n')

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          // 跳过事件行，只处理数据行
          if (trimmedLine.startsWith('event:')) continue

          // 处理SSE数据行
          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonData = trimmedLine.slice(6)
              if (jsonData === '[DONE]') break

              const eventData = JSON.parse(jsonData)

              // 处理文本增量事件
              if (eventData.type === 'content_block_delta' && eventData.delta?.type === 'text_delta') {
                responseText += eventData.delta.text
              }

              // 处理错误事件
              if (eventData.type === 'error') {
                throw new Error(eventData.error?.message || 'API Error')
              }
            } catch (jsonError) {
              if (jsonError.message.includes('API Error')) {
                throw jsonError
              }
              // 忽略JSON解析错误，继续处理
              continue
            }
          }
        }
      }

      // 检查curl命令执行结果
      if (result.code !== 0) {
        throw new Error(`Failed with code ${result.code}: ${result.stderr}`)
      }

      // 返回结果
      // if (!responseText.trim()) {
      //   throw new Error('No valid response received')
      // }

      return {
        success: true,
        latency: testLatency,
        response:
          responseText.length > maxText
            ? responseText.slice(0, maxText) + '...'
            : responseText.replace(/\n/g, '').trim(),
        error: null,
        model: testModel,
        attempt
      }
    } catch (error) {
      // console.log(`Attempt ${attempt} failed:`, error.message)

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

  try {
    startTime = Date.now()

    // 第一次测试
    let result = await performSingleTest(firstTestModel, 1)

    // 如果第一次成功，直接返回
    if (result.success) {
      return {
        ...result
      }
    }

    // 如果第一次失败且需要重试
    if (shouldRetry) {
      result = await performSingleTest(model, 2)
      return {
        ...result
      }
    }
    return {
      ...result
    }
  } catch (error) {
    let message = await t('test.REQUEST_FAILED')

    if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
      message = await t('test.TIMEOUT')
      latency = 'error'
    } else if (error.message) {
      message = error.message
      latency = 'error'
    } else {
      message = 'Failed'
      latency = 'error'
    }

    return {
      success: false,
      latency,
      error: message,
      response: null
    }
  }
}

/**
 * 使用claude cli测试单个API配置的有效性
 */
async function testApiLatency(url, key, token, model = 'claude-3-5-haiku-20241022') {
  let latency
  let startTime = Date.now()

  try {
    // 创建测试专用的临时settings文件和MCP配置文件
    const { settingsPath: tempSettingsPath, mcpConfigPath } = createTestSettingsFile(url, key, token, model)

    // 创建临时工作目录用于claude cli执行
    const tmpDir = os.tmpdir()
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const tempWorkDir = path.join(tmpDir, `ccapi-test-${randomSuffix}`)

    if (!fs.existsSync(tempWorkDir)) {
      fs.mkdirSync(tempWorkDir, { recursive: true })
    }
    testTempDirs.push(tempWorkDir)

    const testPrompt =
      'Please reply with only one word "Success", no thinking is allowed, and no use of any mcp services, tools or hooks is allowed.'

    const claudeArgs = [
      '-p',
      '--model',
      model,
      '--max-turns',
      '2',
      '--dangerously-skip-permissions',
      '--settings',
      tempSettingsPath,
      '--mcp-config',
      mcpConfigPath
    ]

    const timeout = configData.testTimeout || 100000
    const spawnOptions = {
      cwd: tempWorkDir,
      stdio: ['pipe', 'pipe', 'pipe']
    }

    startTime = Date.now()
    const result = await spawnWithTimeout('claude', claudeArgs, spawnOptions, timeout - 1000, testPrompt)
    // console.log('result', result)

    const endTime = Date.now()
    latency = endTime - startTime
    // console.log('latency', latency)

    // 解析响应
    let responseText = result.stdout.trim().replace(/\n/g, '')
    const success = responseText && !responseText.toLowerCase().includes('error')

    return {
      success,
      latency,
      response: responseText.length > maxText ? responseText.slice(0, maxText) + '...' : responseText || 'Success',
      error: null
    }
  } catch (error) {
    // 处理错误
    // console.log('error', error)

    let success = false
    let message = await t('test.REQUEST_FAILED')

    // 处理超时错误
    if (
      error.signal === 'SIGTERM' ||
      error.code === 'ETIMEDOUT' ||
      (error.message && error.message.includes('timeout'))
    ) {
      message = await t('test.TIMEOUT')
      latency = 'error'
    } else if (error.stdout || error.stderr) {
      message = error.stdout?.trim() || error.stderr?.trim()
      latency = 'error'
    } else if (error.message) {
      message = error.message
      latency = 'error'
    } else {
      message = 'Failed'
      latency = 'error'
    }

    return {
      success,
      latency,
      error: message,
      response: null
    }
  }
}

/**
 * 格式化URL，确保对齐
 */
function formatUrl(url, maxLength = maxText) {
  if (url.length > maxLength) {
    return url.slice(0, maxLength - 3) + '...'
  }
  // return url.padEnd(maxLength);
  return url
}

/**
 * 测试单个URL
 */
async function testSingleUrl(configName, url, config, keyIndex = 0, tokenIndex = 0, urlIndex = 0, useCli = false) {
  const keys = Array.isArray(config.key) ? config.key : config.key ? [config.key] : []
  const tokens = Array.isArray(config.token) ? config.token : config.token ? [config.token] : []

  // 获取认证信息，优先使用key
  const authItems = keys.length > 0 ? keys : tokens

  if (authItems.length === 0) {
    return {
      url,
      success: false,
      latency: 'error',
      error: await t('test.MISSING_AUTH'),
      configName,
      index: urlIndex
    }
  }

  // 选择指定的key或token
  const selectedAuthIndex = keyIndex || tokenIndex || 0
  const selectedAuth = authItems[Math.min(selectedAuthIndex, authItems.length - 1)]
  const model = Array.isArray(config.model) ? config.model[0] : config.model || 'claude-3-5-haiku-20241022'

  try {
    let result
    if (useCli) {
      // 使用CLI方式测试
      result = await testApiLatency(
        url,
        keys.length > 0 ? selectedAuth : null,
        tokens.length > 0 ? selectedAuth : null,
        model
      )
    } else {
      // 使用API方式测试（默认）
      result = await testApiLatencyWithCurl(
        url,
        keys.length > 0 ? selectedAuth : null,
        tokens.length > 0 ? selectedAuth : null,
        model
      )
    }
    return { url, ...result, configName, index: urlIndex }
  } catch (error) {
    return {
      url,
      success: false,
      latency: 'error',
      error: error.message,
      configName,
      index: urlIndex
    }
  }
}

/**
 * 对测试结果进行排序和分组 (按配置分组，配置内按原始顺序)
 */
function sortTestResults(allResults) {
  // 对每个配置的results内部保持原始顺序（按index排序）
  const sortedResults = allResults.map((configResult) => {
    const sortedConfigResults = configResult.results.sort((a, b) => {
      // 按原始配置文件中的顺序排序（使用index字段）
      if (a.index !== undefined && b.index !== undefined) {
        return a.index - b.index
      }

      // 如果没有index字段，保持原顺序（不排序）
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

    // 调试信息
    // console.log(`比较 ${a.configName}(${bestLatencyA}ms) vs ${b.configName}(${bestLatencyB}ms)`);

    // 如果都有成功的结果，按最佳延迟排序
    if (bestLatencyA !== Infinity && bestLatencyB !== Infinity) {
      return bestLatencyA - bestLatencyB
    }

    // 有成功结果的排在前面
    if (bestLatencyA !== Infinity && bestLatencyB === Infinity) return -1
    if (bestLatencyA === Infinity && bestLatencyB !== Infinity) return 1

    return a.configName.localeCompare(b.configName)
  })

  return finalSorted
}

/**
 * 获取配置结果中的最佳延迟和对应地址
 */
function getBestLatencyInfo(results) {
  // 首先尝试从成功的结果中获取
  // const successResults = results.filter(r => r.success === true);

  // 如果有成功的结果，从中获取最佳延迟
  // if (successResults.length > 0) {
  //   const validResults = successResults
  //     .map(r => ({ ...r, latency: typeof r.latency === 'number' ? r.latency : Infinity }))
  //     .filter(r => r.latency !== Infinity);

  //   if (validResults.length > 0) {
  //     const bestResult = validResults.reduce((best, current) =>
  //       current.latency < best.latency ? current : best
  //     );
  //     return { latency: bestResult.latency, url: bestResult.url };
  //   }
  // }

  // 如果没有标记为成功的结果，尝试从所有有数字延迟的结果中获取
  const numericResults = results
    .filter((r) => typeof r.latency === 'number' && r.latency > 0 && r.latency !== Infinity)
    .sort((a, b) => a.latency - b.latency)

  if (numericResults.length > 0) {
    return { latency: numericResults[0].latency, url: numericResults[0].url }
  }

  return { latency: Infinity, url: null }
}

/**
 * 获取配置结果中的最佳延迟
 */
function getBestLatency(results) {
  const info = getBestLatencyInfo(results)
  return info.latency
}

/**
 * 简化显示测试结果
 */
async function displaySimpleResults(sortedResults) {
  console.log()
  console.log(chalk.yellow.bold(await t('test.TEST_RESULTS_TITLE')))
  console.log()

  const translations = {
    valid: await t('test.VALID'),
    invalid: await t('test.INVALID')
  }

  for (const [configIndex, configResult] of sortedResults.entries()) {
    // 获取并显示配置的最佳延迟和地址
    const bestInfo = getBestLatencyInfo(configResult.results)

    let bestText
    if (bestInfo.latency === Infinity) {
      bestText = await t('common.NONE')
    } else {
      const shortUrl = formatUrl(bestInfo.url)
      bestText = `${shortUrl}`
    }
    console.log(
      chalk.cyan.bold(`[${configResult.configName}]`) + chalk.cyan.bold(`(${await t('test.BEST_ROUTE')}: ${bestText})`)
    )

    configResult.results.forEach((result, index) => {
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

      const show = configData.testResponse === void 0 ? true : !!configData.testResponse
      const responseDisplay = show ? ` [Response: ${responseText}]` : ''

      console.log(`    ${index + 1}.[${result.url}] ${status}(${color.bold(latencyText)})${responseDisplay}`)
      console.log()
    })
  }
}

/**
 * 并行测试所有API配置的主函数 - 按URL维度并发控制
 */
async function testCommand(configName = null, keyIndex = 0, tokenIndex = 0, useCli = false) {
  const { cleanupAllTempProjects } = require('../../utils/cleanup')
  try {
    const config = await validateConfig()

    // 读取API配置文件
    const apiConfig = await readConfigFile(config.apiConfigPath)
    if (!validateApiConfig(apiConfig)) {
      console.error(chalk.red(await t('common.PARAMETER_ERROR')), await t('test.CONFIG_FORMAT_ERROR'))
      return
    }

    let configsToTest = {}

    if (configName) {
      // 测试指定配置
      if (!apiConfig[configName]) {
        console.error(chalk.red(await t('common.PARAMETER_ERROR')), await t('test.CONFIG_NOT_EXIST', configName))
        console.log(chalk.green(await t('common.AVAILABLE_CONFIGS')), Object.keys(apiConfig).join(', '))
        return
      }
      configsToTest[configName] = apiConfig[configName]
    } else {
      configsToTest = apiConfig
    }

    const urlTasks = []
    let urlIndex = 0

    Object.entries(configsToTest).forEach(([name, configData]) => {
      const urls = Array.isArray(configData.url) ? configData.url : [configData.url]
      urls.forEach((url) => {
        urlTasks.push({
          configName: name,
          url,
          config: configData,
          keyIndex,
          tokenIndex,
          urlIndex: urlIndex++,
          useCli
        })
      })
    })

    console.log(chalk.green.bold(await t('test.TESTING_CONFIGS', urlTasks.length)))

    const globalSpinner = showSpinner()

    // 优化并发控制：确保达到最大并发限制
    const chunkSize = Math.max(1, configData.testConcurrency || 3) // 确保至少为1
    const allResults = []

    // 如果任务数量少于并发数，直接并发执行所有任务
    if (!useCli) {
      // 使用curl方式，支持并发
      const allPromises = urlTasks.map((task) =>
        testSingleUrl(
          task.configName,
          task.url,
          task.config,
          task.keyIndex,
          task.tokenIndex,
          task.urlIndex,
          task.useCli
        )
      )
      const results = await Promise.all(allPromises)
      allResults.push(...results)
    } else {
      // 使用CLI方式，分片处理大量任务
      for (let i = 0; i < urlTasks.length; i += chunkSize) {
        const chunk = urlTasks.slice(i, i + chunkSize)
        const chunkPromises = chunk.map((task) =>
          testSingleUrl(
            task.configName,
            task.url,
            task.config,
            task.keyIndex,
            task.tokenIndex,
            task.urlIndex,
            task.useCli
          )
        )

        const chunkResults = await Promise.all(chunkPromises)
        allResults.push(...chunkResults)

        const completed = Math.min(i + chunkSize, urlTasks.length)
        if (completed < urlTasks.length) {
          process.stdout.write(`\r\u001b[K${await t('test.PROGRESS_COMPLETED', completed, urlTasks.length)} `)
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }
    }

    clearInterval(globalSpinner)
    process.stdout.write('\r\u001b[K')

    const groupedResults = {}
    allResults.forEach((result) => {
      if (!groupedResults[result.configName]) {
        groupedResults[result.configName] = {
          configName: result.configName,
          results: []
        }
      }
      groupedResults[result.configName].results.push(result)
    })

    const sortedResults = sortTestResults(Object.values(groupedResults))
    await displaySimpleResults(sortedResults)

    console.log(chalk.green.bold(await t('test.TEST_COMPLETE')))

    await cleanupTestTempFiles()
    setTimeout(() => {
      cleanupAllTempProjects()
    }, 2000)

    return allResults
  } catch (error) {
    await cleanupTestTempFiles()
    cleanupAllTempProjects()
    console.error(chalk.red(await t('test.TEST_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = testCommand
