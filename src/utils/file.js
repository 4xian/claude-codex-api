const fs = require('fs-extra')
const path = require('path')
const { readConfigFile: readFile, writeConfigFile: writeFile } = require('./config-reader')
const { ERROR_MESSAGES } = require('../utils/constants')

/**
 * 读取配置文件
 */
async function readConfigFile(filePath) {
  return await readFile(filePath)
}

/**
 * 写入配置文件
 */
async function writeConfigFile(filePath, data) {
  return await writeFile(filePath, data)
}

/**
 * 备份文件
 */
async function backupFile(filePath) {
  try {
    const backupPath = `${filePath}.backup`
    await fs.copy(filePath, backupPath)
    return backupPath
  } catch (error) {
    throw new Error(`${'settings file backup failed'}: ${error.message}`)
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath) {
  return await fs.pathExists(filePath)
}

/**
 * 验证路径格式
 */
function validatePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return false
  }

  // 检查是否为绝对路径
  if (!path.isAbsolute(filePath)) {
    return false
  }

  // 检查文件扩展名
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.json'
}

module.exports = {
  readConfigFile,
  writeConfigFile,
  backupFile,
  fileExists,
  validatePath
}
