const chalk = require('chalk')
const { validateSetCommand } = require('../../utils/validator')
const { setSettingsPath, setApiConfigPath, getSettingsPath, getApiConfigPath } = require('../../utils/config')
const { fileExists } = require('../../utils/file')
const { t } = require('../../utils/i18n')

/**
 * 设置配置文件路径命令
 */
async function setCommand(options) {
  try {
    const { settings, api } = options
    // 如果没有提供任何参数，显示当前配置路径
    if (!settings && !api) {
      console.log(chalk.green(await t('prompts.CURRENT_CONFIG_PATHS')))

      try {
        const currentSettingsPath = await getSettingsPath()
        const currentApiPath = await getApiConfigPath()

        if (currentSettingsPath) {
          const settingsExists = await fileExists(currentSettingsPath)
          const statusIcon = settingsExists ? chalk.green('✓') : chalk.red('✗')
          console.log(`  settings.json: ${statusIcon} ${chalk.cyan(currentSettingsPath)}`)
          if (!settingsExists) {
            console.log(
              `    ${chalk.yellow((await t('prompts.WARNING')) + ': ' + (await t('prompts.FILE_NOT_EXISTS')))}`
            )
          }
        } else {
          console.log(`  settings.json: ${chalk.yellow(await t('prompts.NOT_SET'))}`)
        }

        if (currentApiPath) {
          const apiExists = await fileExists(currentApiPath)
          const statusIcon = apiExists ? chalk.green('✓') : chalk.red('✗')
          console.log(`  api: ${statusIcon} ${chalk.cyan(currentApiPath)}`)
          if (!apiExists) {
            console.log(
              `    ${chalk.yellow((await t('prompts.WARNING')) + ': ' + (await t('prompts.FILE_NOT_EXISTS')))}`
            )
          }
        } else {
          console.log(`  api: ${chalk.yellow(await t('prompts.NOT_SET'))}`)
        }

        console.log()
        console.log(await t('prompts.SET_PATHS_HELP'))
        console.log(`  ${chalk.cyan('ccapi set --settings <path>')} - ${await t('prompts.SET_SETTINGS_HELP')}`)
        console.log(`  ${chalk.cyan('ccapi set --api <path>')} - ${await t('prompts.SET_API_HELP')}`)
      } catch (error) {
        console.error(chalk.red((await t('errors.READ_CONFIG_FAILED')) + ':'), error.message)
      }
      return
    }

    // 验证命令参数
    const validation = await validateSetCommand(options)

    if (!validation.valid) {
      console.error(chalk.red((await t('errors.PARAM_ERROR')) + ':'), validation.error)
      return
    }

    const results = []

    // 设置settings.json路径
    if (settings) {
      // 检查文件是否存在
      if (!(await fileExists(settings))) {
        console.warn(
          chalk.yellow((await t('prompts.WARNING')) + ':'),
          await t('setPaths.SETTINGS_FILE_NOT_EXIST', settings)
        )
        console.log(await t('prompts.PATH_SAVED_ENSURE_EXISTS'))
      }

      await setSettingsPath(settings)
      results.push(`settings.json path: ${chalk.green(settings)}`)
    }

    // 设置api.json路径
    if (api) {
      // 检查文件是否存在
      if (!(await fileExists(api))) {
        console.warn(chalk.yellow((await t('prompts.WARNING')) + ':'), await t('setPaths.API_FILE_NOT_EXIST', api))
        console.log(await t('prompts.PATH_SAVED_ENSURE_EXISTS'))
      }

      await setApiConfigPath(api)
      results.push(`api path: ${chalk.green(api)}`)
    }

    // 显示结果
    console.log(chalk.blue(await t('success.CONFIG_SAVED')))
    results.forEach((result) => console.log(`  ${result}`))
  } catch (error) {
    console.error(chalk.red((await t('errors.SET_FAILED')) + ':'), error.message)
    process.exit(1)
  }
}

module.exports = setCommand
