const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const { readConfig, writeConfig } = require('./config')
const { readConfigFile, writeConfigFile } = require('./config-reader')
const { t } = require('./i18n')

function getDefaultCodexConfigPath() {
  const homeDir = os.homedir()
  return path.join(homeDir, '.codex', 'config.toml')
}

function getDefaultCodexAuthPath() {
  const homeDir = os.homedir()
  return path.join(homeDir, '.codex', 'auth.json')
}

async function getCodexConfigPath() {
  const config = await readConfig()
  return config.codexConfigPath || getDefaultCodexConfigPath()
}

async function setCodexConfigPath(configPath) {
  const config = await readConfig()
  config.codexConfigPath = configPath
  await writeConfig(config)
}

async function ensureCodexConfigExists() {
  const configPath = await getCodexConfigPath()

  if (!(await fs.pathExists(configPath))) {
    await fs.ensureDir(path.dirname(configPath))
  }

  return configPath
}

async function readCodexConfig() {
  const configPath = await ensureCodexConfigExists()

  if (!(await fs.pathExists(configPath))) {
    throw new Error(await t('codex.CONFIG_NOT_FOUND', configPath))
  }

  return await readConfigFile(configPath)
}

async function writeCodexConfig(data) {
  const configPath = await getCodexConfigPath()
  await writeConfigFile(configPath, data)
}

async function getCodexProviders() {
  const config = await readCodexConfig()
  return config.model_providers || {}
}

async function getCurrentProvider() {
  const config = await readCodexConfig()
  return config.model_provider || null
}

async function getCurrentModel() {
  const config = await readCodexConfig()
  return config.model || null
}

async function updateCodexProvider(providerName, modelIndex = null) {
  const config = await readCodexConfig()
  const providers = config.model_providers || {}

  if (!providers[providerName]) {
    throw new Error(await t('codex.PROVIDER_NOT_FOUND', providerName))
  }

  config.model_provider = providerName

  if (modelIndex !== null) {
    const provider = providers[providerName]
    const models = provider.models || []

    if (modelIndex < 1 || modelIndex > models.length) {
      throw new Error(await t('codex.MODEL_INDEX_OUT_OF_RANGE', modelIndex, models.length))
    }

    config.model = models[modelIndex - 1]
  }

  await writeCodexConfig(config)
  return config
}

async function ensureAuthJsonExists() {
  const authPath = getDefaultCodexAuthPath()

  if (!(await fs.pathExists(authPath))) {
    await fs.ensureDir(path.dirname(authPath))
    await fs.writeJson(authPath, {}, { spaces: 2 })
  }

  return authPath
}

async function updateAuthJson(apiKey) {
  const authPath = await ensureAuthJsonExists()
  const authData = await fs.readJson(authPath).catch(() => ({}))

  authData.OPENAI_API_KEY = apiKey

  await fs.writeJson(authPath, authData, { spaces: 2 })
}

async function saveCurrentEnvKey(envKey) {
  const config = await readConfig()
  config.codexCurrentEnvKey = envKey
  await writeConfig(config)
}

async function getCurrentEnvKey() {
  const config = await readConfig()
  return config.codexCurrentEnvKey || null
}

async function getCurrentKey() {
  const authPath = getDefaultCodexAuthPath()
  
  if (!(await fs.pathExists(authPath))) {
    return null
  }
  
  const authData = await fs.readJson(authPath).catch(() => ({}))
  return authData.OPENAI_API_KEY || null
}

module.exports = {
  getDefaultCodexConfigPath,
  getDefaultCodexAuthPath,
  getCodexConfigPath,
  setCodexConfigPath,
  ensureCodexConfigExists,
  readCodexConfig,
  writeCodexConfig,
  getCodexProviders,
  getCurrentProvider,
  getCurrentModel,
  getCurrentKey,
  updateCodexProvider,
  ensureAuthJsonExists,
  updateAuthJson,
  saveCurrentEnvKey,
  getCurrentEnvKey
}
