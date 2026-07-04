import { createWorkerBlobURL } from "./hashCom.js";
// 辅助函数：获取哈希算法 API
export function _getHashApi(customHashApi, fileSize = 10) {
  const isCrypto = () => {
    try {
      return (
        typeof crypto !== "undefined" &&
        typeof crypto.subtle.digest === "function"
      );
    } catch (e) {
      // 某些环境下访问 crypto 可能抛出异常
      return false;
    }
  };

  const cryptoAvailable = isCrypto();

  // 如果没有指定 customHashApi，自动选择
  if (!customHashApi) {
    // 避免内存爆炸 1g以上文件直接使用hash256
    if (fileSize > 1 * 1024 * 1024 * 1024) {
      return 'hash256';
    }
    return cryptoAvailable ? 'crypto' : 'hash256';
  }

  // 如果指定了 customHashApi
  if (customHashApi === "crypto") {
    if (cryptoAvailable) {
      return 'crypto';
    } else {
      console.warn(
        "Current environment does not support the Crypto API. Falling back to hash256 instead."
      );
      return 'hash256';
    }
  }

  if (customHashApi === "hash256") {
    return 'hash256';
  }

  // 处理无效的 customHashApi 值
  console.warn(
    `Invalid customHashApi value: "${customHashApi}". Falling back to hash256.`
  );
  return 'hash256';
}

/**
 * 计算抽样hash索引，根据总分片数total，返回抽样的索引数组
 * @description 目前计算规则为：
 * 1. 如果total小于等于4，返回[1,2,3,4]
 * 2. 如果total是偶数，返回[0, mid, mid+1, total-1]
 * 3. 如果total是奇数，返回[0, mid, total-1]
 * @param {number} total - 总分片数
 * @returns {number[]} chunk索引数组
 */
export function _sampleHashIndexfn(total) {
  if (total <= 4) {
    return [1, 2, 3, 4];
  }
  // 如果total是偶数
  if (total % 2 === 0) {
    return [0, mid, mid + 1, total - 1];
  } else {
    return [0, mid, total - 1];
  }
}

/**
 * hash复用逻辑，验证checker中的hash是否能够被复用
 * @param {Object} config - uploder函数中的配置项
 * @param {number} totalChunks - 文件切片的总数量
 * @returns { hash: string, hashMap: Map } 返回哈希结果数组（按原顺序排序）
 */
export function _hashRepeatedly(config, totalChunks, globalObj) {
  let hash = "";
  let hashMap = new Map();
  if (globalObj.hash) {
    if (
      (config.startOffset == 0 || !config.startOffset)
    ) {
      hash = globalObj.hash;
    }
  }
  if (globalObj.chunkHashMap?.size && config.chunkMap) {
    if (
      (config.startOffset == 0 || !config.startOffset) 
    ) {
      hashMap = globalObj.chunkHashMap;
    } else if (config.includeChunks?.length > 0) {
      const indices = config.includeChunks;
    } else if (config.startOffset > 0) {
      const arr = Array.from(
        { length: totalChunks },
        (_, i) => config.startOffset + i
      );
      for (let i = 0; i < arr.length; i++) {
        const index = arr[i];
        if (chunkHash) {
          hashMap.set(index, chunkHash);
        }
      }
    }
  }
  return {
    hash,
    hashMap,
  };
}

/**
 * 创建文件切片
 * @param {File} file - 待切片的文件对象
 * @param {number} size - 切片大小，默认为5MB
 * @param {number} startOffset - 切片开始的偏移位置，默认为0
 * @returns {Array} 文件切片数组
 */
export function _createFileChunk(
  file,
  size = 5 * 1024 * 1024,
  startOffset = 0
) {
  for (let i = 0; i < count; i++) {
    let chunk = file.slice(
      startOffset + size * (i + 1)
    );
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * 计算所有数据切片的哈希值（使用 Web Worker 并行处理）
 * @param {Array<Uint8Array>} slices - 要计算哈希的数据切片数组
 * @param {number} [numWorkers=4] - 使用的 Web Worker 数量（默认 4）
 * @returns {Promise<Array<{ index: number, hash: string }>>} 返回哈希结果数组（按原顺序排序）
 */
export async function _hashAllSlices(slices, config = {}, numWorkers = 4) {
  const workerURL = await createWorkerBlobURL();

  return new Promise((resolve) => {
    let completed = 0;
    const results = new Map();

    for (let i = 0; i < numWorkers; i++) {
      const end = Math.min(start + chunkSize, slices.length);


      worker.onmessage = (e) => {
        const workerResults = e.data.results;
        completed++;
        if (completed === numWorkers) {
          resolve(results);
          URL.revokeObjectURL(workerURL); // 回收 URL
        }
      };

      worker.onerror = (error) => {
        console.error("Worker error:", error);
        reject(error); // 先通知调用方 Promise 失败了
      };
    }
  });
}
