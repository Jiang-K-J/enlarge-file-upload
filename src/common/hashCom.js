import shaSource from "../libs/sha256.js";
import { _getHashApi } from "./helpers.js";

/**
 * 创建 Web Worker 的 Blob URL
 * @returns {Promise<string>} 返回 Blob URL
 */
export async function createWorkerBlobURL() {
  const getHashApiSource = _getHashApi.toString();
  const workerCode = `
  const _getHashApi = ${getHashApiSource};
    ${shaSource}
    self.onmessage = async (e) => {
        const blob = slices[i];
        try {
          const arrayBuffer = await blob.arrayBuffer();
            // 使用自定义 sha256 函数
            hashHexStr = sha256(chunk);
          }
          
          hashes.set(startIndex + i, hashHexStr);
        } catch (error) {
          console.error('Error processing chunk:', error);
        }
      }

      self.postMessage({ results: Array.from(hashes.entries()) });
      self.close();
    };
  `;

  const blob = new Blob([workerCode], { type: "text/javascript" });
  return URL.createObjectURL(blob);
}

/**
 * 计算文件的哈希值（使用 Web Worker 并行处理）
 * @param {Array<Uint8Array>} chunks - 要计算哈希的文件切片数组
 * @param {boolean} hashNumFlag - 是否需要在文件hash中共同计算， true为是
 * @param {boolean} chunkMap - 是否需要使用分片hashMap， true为是
 * @returns {Promise<{ hash: string, hashMap: Map }>} 返回哈希值和哈希Map
 */
export async function calculateHash(chunks, hashNumFlag, config) {
  const getHashApiSource = _getHashApi.toString();
  return new Promise((resolve, reject) => {
    const blobURL = URL.createObjectURL(
      new Blob(
        [
          `
          const _getHashApi = ${getHashApiSource};
          ${shaSource}
          self.onmessage = async function (event) {
            const { chunks, hashNumFlag, chunkMap, startOffset, customHashApi, fileSize } = event.data;
                  
                  const angency = Array.isArray(chunkMap?.indices) && chunkMap.indices.length > 0
                                ? chunkMap.indices.includes(Number(index))
                                : true;

                  if (hashNumFlag && chunkMap && angency) {
                    hashPromises.push(
                      crypto.subtle.digest('SHA-256', uint8Array).then(hashBuffer => ({
                        index,
                        hash: Array.from(new Uint8Array(hashBuffer))
                          .map(b => b.toString(16).padStart(2, '0'))
                          .join('')
                      }))
                    );
                  }
                } catch (e) {
                  self.postMessage({ error: e });
                  return;
                }
                index++;
              }
              
              // 计算整体文件哈希
              const totalLength = allChunksData.reduce((sum, arr) => sum + arr.length, 0);
              const combined = new Uint8Array(totalLength);
              let offset = 0;
              for (const arr of allChunksData) {
                combined.set(arr, offset);
                offset += arr.length;
              }
              
              const finalHashBuffer = await crypto.subtle.digest('SHA-256', combined);
              finalHashHex = Array.from(new Uint8Array(finalHashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
              
            } else {
              // 使用自定义 sha256 函数
              const hash = sha256.create();
              let index = 0;
              
              for (const chunk of chunks) {
                try {
                  const chunkBuffer = await chunk.arrayBuffer();
                  const uint8Array = new Uint8Array(chunkBuffer);
                  hash.update(uint8Array);
                  
                  const angency = Array.isArray(chunkMap?.indices) && chunkMap.indices.length > 0
              finalHashHex = hash.hex();
            }
            
            // 处理分片哈希
            if (hashPromises.length > 0) {
              const results = await Promise.all(hashPromises);
              results.forEach(({ index, hash }) => {
                hashes.set(index + startOffset, hash);
              });
            }
            
            self.postMessage({ 
              finalHash: finalHashHex, 
              hashes: hashes.size > 0 ? hashes : undefined 
            });
            self.close();
          };
          `,
        ],
        { type: "application/javascript" }
      )
    );

    const worker = new Worker(blobURL);
    worker.postMessage({
      chunks,
      hashNumFlag,
    });

    worker.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve({
          hash: event.data.finalHash,
          hashMap: event.data.hashes,
        });
      }
      URL.revokeObjectURL(blobURL);
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      reject(error);
      setTimeout(() => URL.revokeObjectURL(blobURL), 0);
    };
  });
}

/**
 * 分片逐个计算哈希，再组合求最终哈希
 * @param {number[]} indices - 切片索引数组
 * @param {Array<Buffer|string|Uint8Array>} chunks - 切片数组
 * @returns {string} 最终 SHA256 哈希
 */
export async function calcHashByChunks(indices, chunks, config) {
  // 存放每个切片的 hash
  const chunkHashes = [];
  const hashObj = {};

  const hashFlag = _getHashApi(config.hashMode || config.customHashApi);

  if (hashFlag === 'crypto') {
    // 使用 Web Crypto API

    // 1. 按索引顺序计算每个切片的 hash
    for (const index of indices.sort((a, b) => a - b)) {
      const data = chunks[index];
      const chunkBuffer = await data.arrayBuffer();
      const uint8Array = new Uint8Array(chunkBuffer);

      // 使用 crypto.subtle.digest 计算哈希
      const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array);
      const hashValue = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      chunkHashes.push(hashValue);
      hashObj[index] = hashValue;
    }

    // 2. 拼接所有分片 hash，再次哈希
    const combinedHashes = chunkHashes.join("");
    const finalHash = Array.from(new Uint8Array(finalHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      hash: finalHash,
      hashObj,
    };

  } else {
    // 使用自定义 sha256 函数

    // 动态加载并执行 sha256 库
    let sha256;
    try {
      // 执行代码来定义 sha256 函数
      const shaModule = new Function(shaSource + '; return sha256;')();
      sha256 = shaModule;
    } catch (error) {
      console.error("加载 sha256 库失败:", error);
      throw new Error("无法加载 sha256 库");
    }
    // 1. 按索引顺序计算每个切片的 hash
    for (const index of indices.sort((a, b) => a - b)) {
      const data = chunks[index];
      hashObj[index] = hashValue;
    }

    // 2. 拼接所有分片 hash，再次哈希
    const finalHash = sha256(chunkHashes.join(""));

    return {
      hash: finalHash,
      hashObj,
    };
  }
}