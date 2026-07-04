/**
 * computeFileHashWorker.js
 * 使用 Web Worker 进行文件并行的 Hash 计算
 * 
 * 设计模仿 computeFileHashDirect.js，但在 Worker 中使用 FileReaderSync 实现非阻塞计算
 * 多文件上传时，可同时创建多个 Worker 实例并行计算各自文件的哈希
 */

import shaSource from "../libs/sha256";
import { _getHashApi } from "./helpers.js";

/**
 * 在 Web Worker 中计算文件哈希
 * @param {File} file - 待计算哈希的文件对象
 * @param {Object} options - 配置选项
 * @param {number} [options.chunkSize=5*1024*1024] - 分片大小（默认 5MB）
 * @param {string} [options.customHashApi] - 哈希算法：'crypto' 使用 Web Crypto API，'hash256' 使用自定义 sha256
 * @param {Function} [options.callback] - 进度回调函数，与 computeFileHashDirect 保持一致
 * @returns {Object} 返回包含 promise 和 cancel 方法的对象
 */
function computeFileHashWorker(file, options = {}) {
  if (!file) throw new Error('computeFileHashWorker file is required');

  const { chunkSize = 5 * 1024 * 1024, callback = null, customHashApi = null } = options;

  let worker = null;
  let workerUrl = null;
  let isCancelled = false;

  // 清理函数
  const cleanup = () => {
      worker.terminate();
      worker = null;
  };

  // 取消函数
  const cancel = () => {
    isCancelled = true;
    cleanup();
  };

  // 将 _getHashApi 函数源码转换为字符串，嵌入 Worker 脚本（与 hashCom.js 保持一致）
  const getHashApiSource = _getHashApi.toString();

  const promise = new Promise((resolve, reject) => {
    // Worker 脚本内容 - 支持 customHashApi 配置
    // 将本地 sha256 源码和 _getHashApi 函数嵌入 Worker 脚本中
    const workerScript = `
      // 嵌入本地 sha256 库源码

        try {
          const hashFlag = _getHashApi(customHashApi, file.size);
          const fileSize = file.size;
          let offset = 0;
          
          // 在 Worker 中使用 FileReaderSync（仅 Worker 环境可用）
          const reader = new FileReaderSync();

          if (hashFlag === 'crypto') {
            // 使用 Web Crypto API - 需要收集所有数据后一次性计算
            const allChunksData = [];
            
            while (offset < fileSize) {
              const slice = file.slice(offset, offset + chunkSize);
              const buffer = reader.readAsArrayBuffer(slice);
              const data = new Uint8Array(buffer);
              allChunksData.push(data);
              offset += data.length;
              
              self.postMessage({
                type: 'progress',
                percentage: ((offset / fileSize) * 100).toFixed(2)
              });
            }
            
            // 合并所有数据
            const totalLength = allChunksData.reduce((sum, arr) => sum + arr.length, 0);
            const combined = new Uint8Array(totalLength);
            
            // 使用 crypto.subtle.digest 计算哈希
            
            self.postMessage({ type: 'result', hash });
            
          } else {
            // 使用自定义 sha256 库 - 支持增量 update
            const shaObj = sha256.create();

            while (offset < fileSize) {
              const slice = file.slice(offset, offset + chunkSize);
              const data = new Uint8Array(buffer);
              
              shaObj.update(data);
              offset += data.length;

            const hash = shaObj.hex();
            self.postMessage({ type: 'result', hash });
          }

        } catch (error) {
          self.postMessage({ 
            type: 'error', 
            error: error.message || String(error) 
          });
        }
      };
    `;

    // 创建 Blob URL 并启动 Worker
    const blob = new Blob([workerScript], { type: "application/javascript" });
    workerUrl = URL.createObjectURL(blob);
    worker = new Worker(workerUrl);

    // 监听 Worker 消息
    worker.onmessage = (e) => {
      if (isCancelled) return;

    };

    // Worker 错误处理 - 与 computeFileHashDirect 的 reader.onerror 对应
    worker.onerror = (e) => {
      if (isCancelled) return;
      cleanup();
      reject(e);
    };

    // 发送任务到 Worker，包含 customHashApi 配置
    worker.postMessage({ file, chunkSize, customHashApi });
  });

  // 返回包含 promise 和 cancel 的对象
  return {
    promise,
    cancel
  };
}

export default computeFileHashWorker;
