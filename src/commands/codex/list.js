const chalk = require('chalk')
const { getCodexProviders, getCurrentProvider, getCurrentModel } = require('../../utils/codex-config')
const { t } = require('../../utils/i18n')

const maxText = 30

async function codexListCommand() {
  try {
    const providers = await getCodexProviders()
    const currentProvider = await getCurrentProvider()
    const currentModel = await getCurrentModel()

    if (!providers || Object.keys(providers).length === 0) {
      console.log(chalk.yellow(await t('codex.NO_PROVIDERS')))
      return
    }

    console.log(chalk.green.bold(await t('codex.AVAILABLE_PROVIDERS')))
    console.log()

    for (const [name, config] of Object.entries(providers)) {
      const isCurrent = name === currentProvider
      const prefix = isCurrent ? chalk.green.bold('*') : '  '
      const nameDisplay = isCurrent ? chalk.green.bold(`[${name}]`) : chalk.cyan(`[${name}]`)

      console.log(`${prefix}${nameDisplay}`)

      if (config.name) {
        console.log(`    ${await t('codex.NAME')}: ${chalk.cyan(config.name)}`)
      }

      if (config.base_url) {
        console.log(`    ${await t('codex.URL')}: ${chalk.cyan(config.base_url)}`)
      }

      if (config.api_key) {
        const maskedKey = config.api_key.length > maxText ? config.api_key.slice(0, maxText) + '...' : config.api_key
        console.log(`    ${await t('codex.KEY')}: ${chalk.cyan(maskedKey)}`)
      }

      if (config.models && config.models.length > 0) {
        console.log(`    ${await t('codex.MODELS')}:`)
        config.models.forEach((model, index) => {
          const isCurrentModel = isCurrent && model === currentModel
          const prefix = isCurrentModel ? '    * - ' : '      - '
          const modelDisplay = isCurrentModel ? chalk.green.bold(model) : chalk.cyan(model)
          const text = `${prefix}${index + 1}: ${modelDisplay}`
          console.log(isCurrentModel ? chalk.green.bold(text) : text)
        })
      }

      console.log()
    }

    if (currentProvider) {
      console.log(chalk.green.bold(await t('codex.CURRENT_PROVIDER', currentProvider)))
    } else {
      console.log(chalk.yellow(await t('codex.NO_CURRENT_PROVIDER')))
    }
  } catch (error) {
    console.error(chalk.red(await t('codex.LIST_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = codexListCommand
