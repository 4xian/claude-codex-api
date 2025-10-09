const https = require('https')
const http = require('http')
const { URL } = require('url')

/**
 * SSE (Server-Sent Events) 客户端工具类
 * 使用 Node.js https/http 模块处理 SSE 流请求
 */
class SSEClient {
  /**
   * 发送 SSE 请求并解析事件
   * @param {string} url - 请求 URL
   * @param {Object} options - 请求选项
   * @param {Object} options.body - 请求体
   * @param {Object} options.headers - 请求头
   * @param {number} options.timeout - 超时时间（毫秒）
   * @param {Function} options.onEvent - 实时事件回调 (event) => void
   * @returns {Promise<{events: Array, statusCode: number, headers: Object}>}
   */
  static async request(url, options = {}) {
    const { body, headers = {}, timeout = 30000, onEvent = null } = options

    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http

    return new Promise((resolve, reject) => {
      const events = []
      let buffer = ''
      let currentEvent = null

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...headers
        },
        timeout
      }

      const req = client.request(url, requestOptions, (res) => {
        // 检查响应状态
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let errorBody = ''
          res.on('data', (chunk) => (errorBody += chunk))
          res.on('end', () => {
            try {
              const errorJson = JSON.parse(errorBody)
              reject(new Error(errorJson.error?.message || `HTTP ${res.statusCode}: ${errorBody}`))
            } catch (e) {
              reject(new Error(`HTTP ${res.statusCode}: ${errorBody}`))
            }
          })
          return
        }

        // 实时处理流数据
        res.on('data', (chunk) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()

            if (trimmedLine.startsWith('event:')) {
              if (currentEvent) {
                events.push(currentEvent)
                if (onEvent) onEvent(currentEvent)
              }
              currentEvent = {
                event: trimmedLine.slice(6).trim(),
                data: null
              }
            } else if (trimmedLine.startsWith('data:')) {
              if (currentEvent) {
                try {
                  const jsonData = trimmedLine.slice(5).trim()
                  currentEvent.data = jsonData === '[DONE]' ? '[DONE]' : JSON.parse(jsonData)
                } catch (e) {
                  currentEvent.data = trimmedLine.slice(5).trim()
                }
              }
            } else if (trimmedLine === '' && currentEvent) {
              events.push(currentEvent)
              if (onEvent) onEvent(currentEvent)
              currentEvent = null
            }
          }
        })

        res.on('end', () => {
          if (currentEvent) {
            events.push(currentEvent)
            if (onEvent) onEvent(currentEvent)
          }
          resolve({ events, statusCode: res.statusCode, headers: res.headers })
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body))
      }
      req.end()
    })
  }

  /**
   * 从事件数组中提取输出文本内容
   * @param {Array} events - 事件数组
   * @returns {string} 拼接的文本内容
   */
  static extractOutputText(events) {
    let text = ''
    for (const evt of events) {
      if (evt.data && evt.data.type === 'response.output_text.delta' && evt.data.delta) {
        text += evt.data.delta
      }
      if (evt.data && evt.data.type === 'response.output_text.done' && evt.data.text) {
        text = evt.data.text
        break
      }
    }
    return text
  }

  /**
   * 统计事件类型
   * @param {Array} events - 事件数组
   * @returns {Object} 事件类型统计
   */
  static countEventTypes(events) {
    return events.reduce((acc, evt) => {
      const type = evt.data?.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
  }
}

module.exports = SSEClient
