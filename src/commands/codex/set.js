const chalk = require('chalk')
const path = require('path')
const { setCodexConfigPath, getCodexConfigPath } = require('../../utils/codex-config')
const { fileExists } = require('../../utils/file')
const { t } = require('../../utils/i18n')

async function codexSetCommand(configPath) {
  try {
    if (!configPath) {
      console.log(chalk.green(await t('codex.CURRENT_CONFIG_PATH')))

      try {
        const currentPath = await getCodexConfigPath()

        if (currentPath) {
          const configExists = await fileExists(currentPath)
          const statusIcon = configExists ? chalk.green('✓') : chalk.red('✗')
          console.log(`  Codex config: ${statusIcon} ${chalk.cyan(currentPath)}`)

          if (!configExists) {
            console.log(`    ${chalk.yellow((await t('prompts.WARNING')) + ': ' + (await t('prompts.FILE_NOT_EXISTS')))}`)
          }
        } else {
          console.log(`  Codex config: ${chalk.yellow(await t('prompts.NOT_SET'))}`)
        }

        console.log()
        console.log(await t('codex.SET_PATH_HELP'))
        console.log(`  ${chalk.cyan('ccapi cx set <path>')} - ${await t('codex.SET_PATH_USAGE')}`)
      } catch (error) {
        console.error(chalk.red((await t('errors.READ_CONFIG_FAILED')) + ':'), error.message)
      }
      return
    }

    const absolutePath = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath)

    if (!(await fileExists(absolutePath))) {
      console.log(
        chalk.yellow((await t('prompts.WARNING')) + ':'),
        await t('codex.FILE_NOT_EXIST', absolutePath)
      )
      console.log(await t('prompts.PATH_SAVED_ENSURE_EXISTS'))
      console.log()
    }

    await setCodexConfigPath(absolutePath)

    console.log(chalk.blue(await t('codex.CONFIG_PATH_SET')))
    console.log(`  Codex config path: ${chalk.green(absolutePath)}`)
  } catch (error) {
    console.error(chalk.red(await t('codex.SET_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = codexSetCommand
