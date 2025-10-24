const { spawn } = require('cross-spawn')
const chalk = require('chalk')
const packageJson = require('../../package.json')
const { t } = require('../utils/i18n')

/**
 * 执行npm update命令
 * @param {string} packageName - 包名
 * @returns {Promise<boolean>} 更新是否成功
 */
function executeNpmUpdate(packageName) {
  return new Promise(async (resolve, reject) => {
    console.log(chalk.blue.bold(await t('update.UPDATING_PACKAGE', packageName)))

    const npmProcess = spawn('npm', ['install', '-g', packageName], {
      stdio: ['inherit', 'pipe', 'pipe']
    })

    let stderr = ''

    npmProcess.on('close', async (code) => {
      if (code === 0) {
        resolve(true)
      } else {
        reject(new Error(await t('update.NPM_UPDATE_FAILED', stderr)))
      }
    })

    npmProcess.on('error', async (error) => {
      if (error.code === 'ENOENT') {
        console.log(chalk.yellow(await t('update.NPM_NOT_FOUND')))
      }

      reject(error)
    })
  })
}

/**
 * 更新命令处理函数
 */
async function updateCommand() {
  try {
    await executeNpmUpdate(packageJson.name)

    console.log()
    console.log(chalk.green.bold(await t('update.UPDATE_COMPLETE')))

    // 显示最新版本的更新日志
    await showLatestUpdateLogs()
  } catch (error) {
    console.log()
    console.log(chalk.red.bold(await t('update.UPDATE_FAILED')))
    console.log()
    console.log(chalk.cyan(await t('update.MANUAL_UPDATE_CMD', packageJson.name)))

    process.exit(1)
  }
}

/**
 * 显示最新版本的更新内容
 */
async function showLatestUpdateLogs() {
  const updateLogs = packageJson.updateLogs || []

  if (updateLogs.length === 0) {
    return
  }

  console.log()
  console.log(chalk.cyan.bold(await t('update.CHANGELOG_TITLE')))
  updateLogs.forEach((log) => {
    console.log(`   ${log}`)
  })
}

module.exports = updateCommand
