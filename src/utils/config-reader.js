const fs = require('fs-extra')
const path = require('path')
const JSON5 = require('json5').default
const yaml = require('js-yaml')
const { load: tomlLoad } = require('js-toml')
const TOML = require('@iarna/toml')
const { ERROR_MESSAGES } = require('../utils/constants')

/**
 * 支持的配置文件格式
 */
const SUPPORTED_FORMATS = {
  '.json': 'json', // 支持 JSON
  '.jsonc': 'json5', // 支持 JSONC
  '.json5': 'json5', // 支持 JSON5
  '.yaml': 'yaml', // 支持 YAML
  '.yml': 'yaml', // 支持 YML
  '.toml': 'toml' // 支持 TOML
}

/**
 * 根据文件扩展名获取格式类型
 */
function getConfigFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return SUPPORTED_FORMATS[ext] || null
}

/**
 * 读取配置文件（支持 JSON、JSON5、JSONC、YAML、TOML 格式）
 */
async function readConfigFile(filePath) {
  try {
    if (!(await fs.pathExists(filePath))) {
      throw new Error('File does not exist: ' + filePath)
    }

    let content = await fs.readFile(filePath, 'utf8')

    // 移除 UTF-8 BOM
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1)
    }

    const format = getConfigFormat(filePath)

    if (!format) {
      throw new Error('Unsupported configuration file format: ' + path.extname(filePath))
    }

    let parsed
    switch (format) {
      case 'json':
        parsed = JSON.parse(content)
        break
      case 'json5':
        parsed = JSON5.parse(content)
        break
      case 'yaml':
        parsed = yaml.load(content)
        break
      case 'toml':
        parsed = tomlLoad(content)
        break
      default:
        throw new Error('Unimplemented configuration file format: ' + format)
    }

    return parsed
  } catch (error) {
    if (error.name === 'JSONError' || error.message.includes('JSON')) {
      throw new Error(`${'JSON file format error'}: ${filePath} - ${error.message}`)
    }
    if (error.name === 'YAMLException') {
      throw new Error(`${'YAML file format error'}: ${filePath} - ${error.message}`)
    }
    if (error.name === 'TomlError' || error.message.includes('TOML')) {
      throw new Error(`${'TOML file format error'}: ${filePath} - ${error.message}`)
    }
    throw error
  }
}

/**
 * 写入配置文件（支持 JSON、JSON5、YAML、TOML 格式）
 */
async function writeConfigFile(filePath, data) {
  try {
    // 确保目录存在
    await fs.ensureDir(path.dirname(filePath))

    const format = getConfigFormat(filePath)
    let content

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2)
        break
      case 'json5':
        content = JSON5.stringify(data, null, 2)
        break
      case 'yaml':
        content = yaml.dump(data, {
          indent: 2,
          lineWidth: -1,
          noRefs: true
        })
        break
      case 'toml':
        content = TOML.stringify(data)
        break
      default:
        throw new Error('Unsupported configuration file format: ' + path.extname(filePath))
    }

    await fs.writeFile(filePath, content, 'utf8')
  } catch (error) {
    throw new Error('Failed to write file: ' + filePath + ' - ' + error.message)
  }
}

/**
 * 验证路径格式（现在支持多种配置文件格式）
 */
function validateConfigPath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return false
  }

  // 检查是否为绝对路径
  if (!path.isAbsolute(filePath)) {
    return false
  }

  // 检查文件扩展名
  const ext = path.extname(filePath).toLowerCase()
  return ext in SUPPORTED_FORMATS
}

/**
 * 扩展的路径验证（放宽限制）
 */
function validateApiConfigPath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return false
  }

  // 检查是否为绝对路径
  if (!path.isAbsolute(filePath)) {
    return false
  }

  // 检查文件扩展名 - 支持更多格式
  const ext = path.extname(filePath).toLowerCase()
  const allowedExtensions = Object.keys(SUPPORTED_FORMATS)

  return allowedExtensions.includes(ext)
}

module.exports = {
  readConfigFile,
  writeConfigFile,
  validateConfigPath,
  validateApiConfigPath,
  getConfigFormat,
  SUPPORTED_FORMATS
}
