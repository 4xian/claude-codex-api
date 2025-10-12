const chalk = require('chalk')
const os = require('os')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const {
  getCodexProviders,
  updateCodexProvider,
  updateAuthJson,
  getDefaultCodexAuthPath,
  saveCurrentEnvKey,
  getCurrentEnvKey
} = require('../../utils/codex-config')
const { t } = require('../../utils/i18n')

const execAsync = promisify(exec)

async function clearCodexEnvVar(envKey) {
  const platform = os.platform()

  try {
    if (platform === 'win32') {
      const command = `reg delete "HKCU\\Environment" /v "${envKey}" /f`
      await execAsync(command).catch(() => {})
    } else {
      const homeDir = os.homedir()
      const shell = process.env.SHELL || '/bin/bash'

      const configFiles = [
        path.join(homeDir, '.zshrc'),
        path.join(homeDir, '.bashrc'),
        path.join(homeDir, '.bash_profile')
      ]

      let configPath = configFiles[0]
      if (shell.includes('zsh')) {
        configPath = configFiles[0]
      } else {
        const fs = require('fs-extra')
        for (const file of configFiles) {
          if (await fs.pathExists(file)) {
            configPath = file
            break
          }
        }
      }

      const fs = require('fs-extra')
      if (await fs.pathExists(configPath)) {
        let content = await fs.readFile(configPath, 'utf8')

        const marker = `# CCAPI Codex Environment Variable`
        const regex = new RegExp(`${marker}\\nexport ${envKey}=.*\\n`, 'g')

        if (content.match(regex)) {
          content = content.replace(regex, '')
          await fs.writeFile(configPath, content)
        }
      }
    }

    return true
  } catch (error) {
    return false
  }
}

async function setCodexEnvVar(envKey, apiKey) {
  const platform = os.platform()

  try {
    if (platform === 'win32') {
      const command = `setx "${envKey}" "${apiKey}"`
      await execAsync(command)
    } else {
      const homeDir = os.homedir()
      const shell = process.env.SHELL || '/bin/bash'

      const configFiles = [
        path.join(homeDir, '.zshrc'),
        path.join(homeDir, '.bashrc'),
        path.join(homeDir, '.bash_profile')
      ]

      let configPath = configFiles[0]
      if (shell.includes('zsh')) {
        configPath = configFiles[0]
      } else {
        const fs = require('fs-extra')
        for (const file of configFiles) {
          if (await fs.pathExists(file)) {
            configPath = file
            break
          }
        }
      }

      const fs = require('fs-extra')
      let content = ''
      if (await fs.pathExists(configPath)) {
        content = await fs.readFile(configPath, 'utf8')
      }

      const marker = `# CCAPI Codex Environment Variable`
      const envLine = `export ${envKey}="${apiKey}"`

      const regex = new RegExp(`${marker}\\nexport ${envKey}=.*\\n`, 'g')
      if (content.match(regex)) {
        content = content.replace(regex, `${marker}\n${envLine}\n`)
      } else {
        content = content.trim() + `\n\n${marker}\n${envLine}\n`
      }

      await fs.writeFile(configPath, content)
    }

    return true
  } catch (error) {
    console.error(chalk.red(await t('codex.ENV_SET_FAILED')), error.message)
    return false
  }
}

async function codexUseCommand(providerName, options = {}) {
  try {
    if (!providerName) {
      console.error(chalk.red(await t('codex.PROVIDER_NAME_REQUIRED')))
      process.exit(1)
    }

    const providers = await getCodexProviders()

    if (!providers[providerName]) {
      console.error(chalk.red(await t('codex.PROVIDER_NOT_FOUND', providerName)))
      console.log(chalk.green(await t('codex.AVAILABLE_PROVIDERS_LIST')), Object.keys(providers).join(', '))
      return
    }

    const provider = providers[providerName]
    let apiKey = provider.api_key
    const envKey = provider.env_key || 'OPENAI_API_KEY'

    if (!apiKey) {
      console.error(chalk.red(await t('codex.API_KEY_MISSING', providerName)))
      process.exit(1)
    }

    const keyIndex = options.key ? parseInt(options.key) : null
    if (keyIndex !== null && Array.isArray(apiKey)) {
      if (keyIndex < 1 || keyIndex > apiKey.length) {
        console.error(chalk.red(await t('codex.KEY_INDEX_OUT_OF_RANGE', keyIndex, apiKey.length)))
        process.exit(1)
      }
      apiKey = apiKey[keyIndex - 1]
    } else if (Array.isArray(apiKey)) {
      apiKey = apiKey[0]
    }

    const previousEnvKey = await getCurrentEnvKey()
    if (previousEnvKey && previousEnvKey !== envKey) {
      await clearCodexEnvVar(previousEnvKey)
    }

    const modelIndex = options.model ? parseInt(options.model) : null
    await updateCodexProvider(providerName, modelIndex)

    await updateAuthJson(apiKey)

    const envSuccess = await setCodexEnvVar(envKey, apiKey)

    if (envSuccess) {
      await saveCurrentEnvKey(envKey)
    }

    console.log()
    console.log(
      chalk.green.bold(await t('codex.SWITCH_CONFIG_SUCCESS')) + chalk.yellow.bold(await t('codex.RESTART_TERMINAL'))
    )
    if (envSuccess) {
      console.log(chalk.cyan(await t('codex.ENV_VAR_SET', envKey)))
    } else {
      console.log(chalk.yellow(await t('codex.ENV_VAR_SET_FAILED')))
    }
    console.log()
    console.log(chalk.green.bold(await t('codex.CURRENT_CONFIG_DETAILS')))
    console.log(await t('codex.NAME_LABEL', chalk.cyan(providerName)))
    console.log(await t('codex.URL_LABEL', chalk.cyan(provider.base_url)))

    if (modelIndex && provider.model && provider.model[modelIndex - 1]) {
      console.log(await t('codex.MODEL_LABEL', chalk.cyan(provider.model[modelIndex - 1])))
    }
    console.log(await t('codex.ENV_KEY_LABEL', chalk.cyan(envKey)))
    const maskedKey = apiKey.length > 30 ? apiKey.slice(0, 30) + '...' : apiKey
    console.log(await t('codex.KEY_LABEL', chalk.cyan(maskedKey)))

    console.log()
    console.log(chalk.cyan(await t('codex.AUTH_JSON_UPDATED', getDefaultCodexAuthPath())))
    console.log()
  } catch (error) {
    console.error(chalk.red(await t('codex.USE_FAILED')), error.message)
    process.exit(1)
  }
}

module.exports = codexUseCommand
