const { Command } = require('commander')
const chalk = require('chalk')
const packageJson = require('../package.json')
const { checkUpdateQuietly } = require('./utils/version-checker')
const { readConfig } = require('./utils/config')
const { t } = require('./utils/i18n')

// 导入命令处理模块
const versionCommand = require('./commands/version')
const setCommand = require('./commands/claude/set')
const listCommand = require('./commands/claude/list')
const useCommand = require('./commands/claude/use')
const testCommand = require('./commands/claude/test')
const autoCommand = require('./commands/claude/auto')
const pingCommand = require('./commands/claude/ping')
const updateCommand = require('./commands/update')
const envCommand = require('./commands/claude/env')
const clearCommand = require('./commands/claude/clear')
const langCommand = require('./commands/lang')

const codexSetCommand = require('./commands/codex/set')
const codexListCommand = require('./commands/codex/list')
const codexUseCommand = require('./commands/codex/use')
const codexPingCommand = require('./commands/codex/ping')
const codexTestCommand = require('./commands/codex/test')
const codexAutoCommand = require('./commands/codex/auto')

const program = new Command()

async function checkVersionInBackground() {
  try {
    const configData = await readConfig()
    const update = configData.update !== void 0 ? configData.update : true
    if (process.argv.includes('update') || !update) {
      return
    }
    const versionInfo = await checkUpdateQuietly()
    if (versionInfo.needsUpdate) {
      console.log(
        chalk.yellow(await t('prompts.NEW_VERSION_AVAILABLE', versionInfo.latestVersion, chalk.bold('`ccapi update`')))
      )
    }
  } catch (error) {}
}

// 异步初始化程序和命令
async function initializeProgram() {
  // 设置基本信息
  program
    .name('ccapi')
    .description(await t('cli.description'))
    .version(packageJson.version)

  // 版本命令
  program.option('-v, --version', await t('cli.version')).action(async () => {
    await versionCommand()
    await checkVersionInBackground()
  })

  // 设置命令
  program
    .command('set')
    .description(await t('commands.set.description'))
    .option('--settings <path>', await t('commands.set.settingsOption'))
    .option('--api <path>', await t('commands.set.apiOption'))
    .action(async (options) => {
      await setCommand(options)
      await checkVersionInBackground()
    })

  // 列举命令 (支持 ls 和 list 两个命令)
  program
    .command('ls')
    .alias('list')
    .description(await t('commands.list.description'))
    .action(async () => {
      await listCommand()
      await checkVersionInBackground()
    })

  // 使用命令
  program
    .command('use <name>')
    .description(await t('commands.use.description'))
    .option('-u, --url <index>', await t('commands.use.urlOption'))
    .option('-k, --key <index>', await t('commands.use.keyOption'))
    .option('-t, --token <index>', await t('commands.use.tokenOption'))
    .option('-m, --model <index>', await t('commands.use.modelOption'))
    .option('-f, --fast <index>', await t('commands.use.fastOption'))
    .action(async (name, options) => {
      await useCommand(name, options)
      await checkVersionInBackground()
    })

  // ping 命令
  program
    .command('ping [name]')
    .description(await t('commands.ping.description'))
    .action(async (name) => {
      await pingCommand(name)
      await checkVersionInBackground()
    })

  // 测试命令
  program
    .command('test [name]')
    .description(await t('commands.test.description'))
    .option('-t, --token <index>', await t('commands.test.tokenOption'))
    .option('-k, --key <index>', await t('commands.test.keyOption'))
    .option('-c, --cli', await t('commands.test.cliOption'))
    .action(async (name, options) => {
      const keyIndex = options.key ? parseInt(options.key) - 1 : 0
      const tokenIndex = options.token ? parseInt(options.token) - 1 : 0
      const useCli = options.cli || false
      await testCommand(name, keyIndex, tokenIndex, useCli)
      await checkVersionInBackground()
    })

  // 自动选择命令
  program
    .command('auto [name]')
    .description(await t('commands.auto.description'))
    .option('-p, --ping', await t('commands.auto.pingOption'))
    .option('-t, --test', await t('commands.auto.testOption'))
    .action(async (name, options) => {
      await autoCommand(name, options)
      await checkVersionInBackground()
    })

  // update 命令
  program
    .command('update')
    .description(await t('commands.update.description'))
    .action(() => {
      updateCommand()
    })

  // env 命令
  program
    .command('env [name]')
    .description(await t('commands.env.description'))
    .option('-u, --url <index>', await t('commands.env.urlOption'))
    .option('-k, --key <index>', await t('commands.env.keyOption'))
    .option('-t, --token <index>', await t('commands.env.tokenOption'))
    .option('-m, --model <index>', await t('commands.env.modelOption'))
    .option('-f, --fast <index>', await t('commands.env.fastOption'))
    .action(async (name, options) => {
      await envCommand(name, options)
      await checkVersionInBackground()
    })

  // clear 命令
  program
    .command('clear')
    .description(await t('commands.clear.description'))
    .action(async () => {
      await clearCommand()
      await checkVersionInBackground()
    })

  // lang 命令
  program
    .command('lang [language]')
    .description(await t('commands.lang.description'))
    .action(async (language) => {
      await langCommand(language)
    })

  // Codex 命令组 - 使用子命令方式
  const codexCmd = program
    .command('codex')
    .alias('cx')
    .description(await t('commands.codex.description'))

  codexCmd
    .command('set [path]')
    .description(await t('commands.codex.set.description'))
    .action(async (path) => {
      await codexSetCommand(path)
      await checkVersionInBackground()
    })

  codexCmd
    .command('ls')
    .alias('list')
    .description(await t('commands.codex.list.description'))
    .action(async () => {
      await codexListCommand()
      await checkVersionInBackground()
    })

  codexCmd
    .command('use <name>')
    .description(await t('commands.codex.use.description'))
    .option('-m, --model <index>', await t('commands.codex.use.modelOption'))
    .option('-k, --key <index>', await t('commands.codex.use.keyOption'))
    .action(async (name, options) => {
      await codexUseCommand(name, options)
      await checkVersionInBackground()
    })

  codexCmd
    .command('ping')
    .description(await t('commands.codex.ping.description'))
    .action(async () => {
      await codexPingCommand()
      await checkVersionInBackground()
    })

  codexCmd
    .command('test [name]')
    .description(await t('commands.codex.test.description'))
    .action(async (name) => {
      await codexTestCommand(name)
      await checkVersionInBackground()
    })

  codexCmd
    .command('auto [name]')
    .description(await t('commands.codex.auto.description'))
    .option('-p, --ping', await t('commands.codex.auto.pingOption'))
    .option('-t, --test', await t('commands.codex.auto.testOption'))
    .action(async (name, options) => {
      await codexAutoCommand(name, options)
      await checkVersionInBackground()
    })

  return program
}

// 全局错误处理
process.on('uncaughtException', async (error) => {
  console.error(chalk.red(await t('errors.PROGRAM_ERROR') + ':'), error.message)
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack)
  }
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  console.error(chalk.red(await t('errors.UNHANDLED_PROMISE') + ':'), reason)
  if (process.env.NODE_ENV === 'development') {
    console.error('Promise:', promise)
  }
  process.exit(1)
})

// 主函数 - 异步初始化并运行程序
async function main() {
  try {
    const program = await initializeProgram()
    
    // 解析命令行参数
    program.parse(process.argv)
    
    // 如果没有提供任何参数，显示帮助信息
    if (!process.argv.slice(2).length) {
      program.outputHelp()
    }
  } catch (error) {
    console.error(chalk.red('Program initialization failed:'), error.message)
    process.exit(1)
  }
}

// 运行主函数
main()