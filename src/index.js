/**
 * @description:This is not the latest source code, so please do not use the files in the src directory directly!
 However, the files in the dist directory are compiled from the latest version and can be used directly! 
 We will gradually open-source the new source code, so we apologize!
 * @date: 2023-06-28 current src file version: 1.0.0
 * @date: 2023-7-07 current dist file version: 1.0.22
 * @author: Jam
 */
const axios = require('axios');
function createUploader(config) {
    let fileChunks = null;
    let currentHash = null;
    let currentChunkIndex = 0;
    let isPaused = false;
    let activeRequests = [];
    let cancelTokens = []; 
    let totalChunks = 0;
    let uploadedChunks = 0; 
    let canceledChunks = []; 
  let state = new Proxy(
    {
      progress: 0, // 进度
      speed: 0, // 上传速度
      uploadEnd: false, // 上传结束标志
      hash: "", // 文件总哈希值
      file: "", // 文件对象
      totalChunks: "", // 切片总数
      errorMsg: "", // 错误信息
      allChunks: [], // 所有切片数组
      hashMap: new Map(), // 哈希映射
    },
    {
      set(target, property, value) {
        if (property === "progress") {
          target[property] = value;
          return true;
        }
        if (property === "speed") {
          target[property] = value;
          return true;
        }
        if (property === "uploadEnd") {
          target[property] = true;
          return true;
        }
        if (property === "hash") {
          target[property] = value;
          return true;
        }
        if (property === "file") {
          target[property] = value;
          return true;
        }
        if (property === "totalChunks") {
          target[property] = value;
          return true;
        }
        if (property === "errorMsg") {
          target[property] = value;
          return true;
        }
        if (property === "allChunks") {
          target[property] = value;
          return true;
        }
        if (property === "hashMap") {
          target[property] = value;
          return true;
        }
        return false;
      },
    }
  );
    
    function createFileChunk(file, size = 1 * 1024 * 1024) {
      let chunks = [];
      let count = Math.ceil(file.size / size);
      for (let i = 0; i < count; i++) {
        let chunk = file.slice(size * i, size * (i + 1));
        chunks.push(chunk);
      }
      return chunks;
    }
    
    function calculateHash(fileChunks) {
     
      return new Promise((resolve) => {
        setTimeout(() => resolve("fake-hash-value"), 1000);
      });
    }
    
    function createChunkUploader(
      chunk,
      index,
      hash,
      retryCount = 0,
      maxRetries,
      cancelToken
    ) {
      return async function () {
        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("hash", hash);
        formData.append("index", index);
        const url = config.url || `http://localhost:3000/api/users`;
        try {
          await axios.post(url, formData, { cancelToken });
          uploadedChunks++;
          state.progress = (uploadedChunks / totalChunks) * 100;
        } catch (error) {
          if (axios.isCancel(error)) {
            canceledChunks.push({ chunk, index });
            return;
          }
          if (retryCount < maxRetries) {
            return createChunkUploader(
              chunk,
              index,
              hash,
              retryCount + 1,
              maxRetries,
              cancelToken
            )();
          }
        }
      };
    }
    async function uploadChunksWithConcurrencyControl(
      concurrency,
      maxRetries
    ) {
      const scheduleNext = async () => {
        if (isPaused || currentChunkIndex >= fileChunks.length) return;
        const chunk = fileChunks[currentChunkIndex];
        const cancelTokenSource = axios.CancelToken.source();
        cancelTokens.push(cancelTokenSource);
        const chunkUploader = createChunkUploader(
          chunk,
          currentChunkIndex,
          currentHash,
          0,
          maxRetries,
          cancelTokenSource.token
        );
        currentChunkIndex++;
        const chunkUploadPromise = chunkUploader().then(() => {
          activeRequests = activeRequests.filter(
            (p) => p !== chunkUploadPromise
          );
        });
        activeRequests.push(chunkUploadPromise);
        if (activeRequests.length < concurrency) {
          scheduleNext();
        }
      };
      while (
        activeRequests.length < concurrency &&
        currentChunkIndex < fileChunks.length
      ) {
        scheduleNext();
      }
      await Promise.all(activeRequests);
      if (canceledChunks.length > 0 && !isPaused) {
        const tempCanceledChunks = [...canceledChunks];
        canceledChunks = [];
        for (const { chunk, index } of tempCanceledChunks) {
          const cancelTokenSource = axios.CancelToken.source();
          cancelTokens.push(cancelTokenSource);
          const chunkUploader = createChunkUploader(
            chunk,
            index,
            currentHash,
            0,
            maxRetries,
            cancelTokenSource.token
          );
          const chunkUploadPromise = chunkUploader().then(() => {
            activeRequests = activeRequests.filter(
              (p) => p !== chunkUploadPromise
            );
          });
          activeRequests.push(chunkUploadPromise);
          if (activeRequests.length < concurrency) {
            scheduleNext();
          }
        }
        await Promise.all(activeRequests);
      }
    }
   
    function pauseUpload() {
      isPaused = true;
      cancelTokens = [];
    }
    async function resumeUpload() {
      if (!fileChunks) {
      }
      if (!isPaused) return;
      isPaused = false;
      await uploadChunksWithConcurrencyControl(
        config.concurrency || 5,
        config.maxRetries || 3
      );
    }
    
    async function handleUpload(file) {
      if (currentChunkIndex === 0) {
      }
      await uploadChunksWithConcurrencyControl(
        config.concurrency || 5,
        config.maxRetries || 3
      ); 
    }
    /**
   * 重置所有上传数据
   */
  function reset() {
    isReset = true;
    // 取消所有进行中的请求
    cancelTokens.forEach((source) => source.cancel("Upload reset"));
    // 清空所有状态和计数器
    fileChunks = [];
    currentHash = null;
    currentChunkIndex = 0;
    isPaused = false;
    activeRequests = [];
    cancelTokens = [];
    totalChunks = 0;
    uploadedChunks = 0;
    canceledChunks = [];
    uploadedSize = 0;
    accumulatedPausedTime = 0;
    lastPauseTime = 0;
    globalObj = {};

    // 停止速度计算定时器
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    // 重置状态对象
    Object.keys(state).forEach((key) => {
      if (key === "progress") state[key] = 0;
      else if (key === "speed") state[key] = 0;
      else if (key === "uploadEnd") state[key] = false;
      else if (key === "hash") state[key] = "";
      else if (key === "file") state[key] = "";
      else if (key === "totalChunks") state[key] = "";
      else if (key === "errorMsg") state[key] = "";
      else if (key === "allChunks") state[key] = [];
      else if (key === "hashMap") state[key] = new Map();
    });
  }

  return {
    upload: handleUpload,
    pause: pauseUpload,
    resume: resumeUpload,
    reset,
    state,
  };
  }

  /**
 * 检查文件hash值
 * @param {File} file - 待检查的文件对象
 * @param {Object} config - 配置对象
 * @returns {Promise<{hash: string, chunks: number}>} Promise对象，包含文件哈希值和切片数量
 */
async function checker(file, config = {}) {
  let allChunks = [];
  let totalChunks = 0;
  let fileHash;
  let chunkHashMap = new Map();
  let cpuThreads = config.threads || cupNum;
  let optHash = [];
  let hashNumFlag = false;
  const startOffset = 0;
  globalObj = {};
  // (config.startOffset || 0) * (config.chunkSize || 5 * 1024 * 1024);
  // 创建文件切片
  allChunks = createFileChunk(
    file,
    config.chunkSize || 5 * 1024 * 1024,
    startOffset
  );
  totalChunks = allChunks.length;
  if (totalChunks === 0) {
    throw new Error(
      "The startOffset parameter is too large and the file slices array is empty."
    );
  }
  config.beginHash && config.beginHash();
  if (config.chunkMap?.indices?.length) {
    optHash = config.chunkMap?.indices.map((index) => allChunks[index]);
  } else {
    optHash = allChunks;
  }
  // 计算各个分片哈希值
  async function computeHash() {
    const thashMap = config.chunkMap && config.chunkMap?.async !== true;
    const yhashMap = config.chunkMap?.async;
    if (
      (yhashMap && config.awaitHash !== false) ||
      config.hash !== true ||
      (config.awaitHash == false && thashMap)
    ) {
      if (thashMap) {
        chunkHashMap = await hashAllSlices(optHash, config, cpuThreads);
      } else if (yhashMap) {
        hashAllSlices(optHash, config, cpuThreads).then((hashes) => {
          chunkHashMap = hashes;
        });
      }
    } else {
      hashNumFlag = true;
    }
  }
  await computeHash();
  config.endHash && config.endHash(fileHash);
  globalObj = {
    config,
    chunkHashMap: chunkHashMap,
    hash: fileHash,
    totalChunks,
    allChunks,
    chunkSize: config.chunkSize || 5 * 1024 * 1024,
  };
  return {
    chunkHashMap,
    hash: fileHash,
    totalChunks,
    allChunks,
  };
}

  // 修改导出方式
export { createUploader, checker };

// 为了兼容 CommonJS
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createUploader, checker };
}