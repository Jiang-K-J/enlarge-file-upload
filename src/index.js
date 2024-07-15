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
      { progress: 0 },
      {
        set(target, property, value) {
          if (property === "progress") {
            const progressElement = document.getElementById("progress");
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
    return {
      upload: handleUpload,
      pause: pauseUpload,
      resume: resumeUpload,
      state,
    };
  }
  module.exports = createUploader