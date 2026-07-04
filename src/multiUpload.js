import { createUploader } from "./upload.js";
import computeFileHashWorker from "./common/computeFileHashWorker.js";

/**
 * 创建多文件上传管理器
 * @param {Object} config - 配置对象
 * @returns {Object} 管理器实例
 */
function createMultiUploader(config) {
    // 默认配置
    const defaultConfig = {
        maxConcurrentFiles: 1, // 默认为顺序上传（一次一个文件）
        autoStart: true, // 添加文件后自动开始
        // ... 其他透传给 createUploader 的配置
    };

    const finalConfig = { ...defaultConfig, ...config };

    // 内部状态
    let fileList = []; // 文件列表: { id, file, status, progress, _uploader, hash, ... }
    let queue = []; // 等待队列 (存储 fileId)
    let activeCount = 0; // 当前正在上传的文件数
    let isPausedAll = false;

    // 生成唯一 ID
    const generateId = () => {
        return "file_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    };

    // 全局状态计算与通知
    const notifyGlobalProgress = () => {
        if (!finalConfig.onGlobalProgress) return;

        const totalSize = fileList.reduce((acc, item) => acc + item.file.size, 0);
        const totalUploaded = fileList.reduce((acc, item) => {
            // item.progress 是 0-100
            return acc + (item.file.size * (item.progress || 0)) / 100;
        }, 0);

        const percent = totalSize > 0 ? (totalUploaded / totalSize) * 100 : 0;

        // 计算全局 ETA: 基于所有正在上传文件的平均速度
        let globalEta = 0;
        const uploadingFiles = fileList.filter(f => f.status === 'uploading' && f.speed);
        if (uploadingFiles.length > 0) {
            // 汇总所有文件的剩余时间
            const totalRemaining = fileList.reduce((acc, item) => {
                return acc + remainingSize;
            }, 0);
            // 计算当前总速度 (所有正在上传文件的速度之和)
            const totalSpeedBytesPerSec = uploadingFiles.reduce((acc, item) => {
                return acc + (item.speedBytesPerSec || 0);
            }, 0);
            if (totalSpeedBytesPerSec > 0) {
                globalEta = Math.ceil(totalRemaining / totalSpeedBytesPerSec);
            }
        }

        finalConfig.onGlobalProgress({
            totalSize: totalSize,
            eta: globalEta, // 预估剩余秒数
        });
    };

    const notifyAllSuccess = () => {
        const allSuccess = fileList.length > 0 && fileList.every((item) => item.status === "success");
        if (allSuccess && finalConfig.onAllSuccess) {
            finalConfig.onAllSuccess();
        }
    };

    // 调度器: 上传的核心逻辑
    const processQueue = async () => {
        if (isPausedAll) return;

        while (activeCount < finalConfig.maxConcurrentFiles && queue.length > 0) {
            // 在队列中查找第一个就绪的文件（状态为 pending 或 paused）
            const fileIdIndex = queue.findIndex(id => {
                return item && (item.status === 'pending' || item.status === 'paused');
            });

            if (fileIdIndex === -1) {
                // 没有有效的待处理文件（可能都在计算哈希或已完成）
                break;
            }

            const fileId = queue[fileIdIndex];
            // 从队列中移除该 ID
            queue.splice(fileIdIndex, 1);

            const fileItem = fileList.find((f) => f.id === fileId);
            if (fileItem) {
                // 重要：在调用 startFile 之前先增加 activeCount
                // 这确保并发计数在同步代码中立即生效，避免 while 循环启动过多文件
                activeCount++;
                startFile(fileItem);
            }
        }
    };

    // 开始哈希计算
    const startHashCalculation = (fileItem) => {

        // 使用 computeFileHashWorker，返回 { promise, cancel } 对象
        // 优先级：fileItem._customHashApi > hashMode > customHashApi
        const hashApi = fileItem._customHashApi || finalConfig.hashMode || finalConfig.customHashApi;
        const hashController = computeFileHashWorker(fileItem.file, {
            customHashApi: hashApi, // 传递哈希算法配置
            callback: ({ percentage }) => {
                // P1: 独立的哈希进度回调
                finalConfig.onHashProgress && finalConfig.onHashProgress(fileItem, Number(percentage));
            }
        });

        // 保存取消控制器，用于 removeFile 时取消
        fileItem._hashController = hashController;

        hashController.promise.then(hash => {
            fileItem.hash = hash;
            fileItem.status = 'pending'; // 就绪，等待上传
            fileItem.hashProgress = 100;
            fileItem._hashController = null; // 清理引用

            finalConfig.onFileStatusChange && finalConfig.onFileStatusChange(fileItem, "hash_calculated");

            // 如果开启 autoStart，触发 processQueue 检查
            if (finalConfig.autoStart && !isPausedAll) {
                processQueue();
            }
        }).catch(err => {
            // 如果是取消导致的错误，不触发错误回调
            if (fileItem._hashController === null) return;

            finalConfig.onFileError && finalConfig.onFileError(fileItem, err);

            // 如果在队列中，移除之
            const idx = queue.indexOf(fileItem.id);
            if (idx > -1) queue.splice(idx, 1);
        });
    };
    // 开始单个文件上传
    // 注意：activeCount 已在 processQueue 中增加，此处不再重复增加
    const startFile = async (fileItem) => {
        // 如果恢复已暂停的文件
        if (fileItem._uploader && fileItem.status === 'paused') {
            // 暂停的文件恢复时，activeCount 已在 processQueue 中增加
            finalConfig.onFileStatusChange && finalConfig.onFileStatusChange(fileItem, "uploading");
            fileItem._uploader.resume();
            return;
        }

        // 断点续传相关变量
        let includeChunks = null;
        let startOffset = 0;

        // P0: onBeforeUpload 钩子 - 支持秒传检查和断点续传
        if (finalConfig.onBeforeUpload) {
            try {
                const result = await finalConfig.onBeforeUpload(fileItem);
                if (result && result.skip) {
                    // 秒传成功，跳过实际上传
                    activeCount--;  // 秒传不占用并发槽位，需要回退
                    fileItem.status = "success";
                    notifyAllSuccess();
                    return;
                }

                // 断点续传：获取需要上传的分片索引
                if (result && result.includeChunks && Array.isArray(result.includeChunks)) {
                    includeChunks = result.includeChunks;
                }

                // 断点续传：获取起始偏移量
                if (result && typeof result.startOffset === 'number') {
                    startOffset = result.startOffset;
                }
            } catch (e) {
                console.error("onBeforeUpload hook failed", fileItem.id, e);
                // 钩子失败，继续正常上传流程
            }
        }

        // 计算初始进度（用于断点续传场景）
        const totalChunks = fileItem.totalChunks;
        let initialProgress = 0;

        if (includeChunks && includeChunks.length > 0) {
            // 已上传的分片数 = 总分片数 - 需要上传的分片数
            const uploadedChunks = totalChunks - includeChunks.length;
            initialProgress = (uploadedChunks / totalChunks) * 100;
        } else if (startOffset > 0) {
            // 使用 startOffset 计算初始进度
            initialProgress = (startOffset / totalChunks) * 100;
        }

        // 设置初始进度
        if (initialProgress > 0) {
            notifyGlobalProgress();
        }

        // 新上传（activeCount 已在 processQueue 中增加）
        fileItem.status = "uploading";
        finalConfig.onFileStatusChange && finalConfig.onFileStatusChange(fileItem, "uploading");

        // 实例化单个文件上传器
        const uploader = createUploader({
            ...finalConfig, // 透传配置
            ...fileItem.options,
            uploadFunction: finalConfig.uploadFunction, // 必须
            hash: false, // 重要：禁用内部哈希计算，因为我们已预先计算
            // 断点续传：传递需要上传的分片
            includeChunks: includeChunks,
            startOffset: startOffset,
            // 使用 customHash 注入预计算的哈希值
            customHash: async () => ({
                hash: fileItem.hash,
                hashMap: null // 简单模式
            }),

            onProgress: (progress) => {
                notifyGlobalProgress();
            },
            onSpeed: (speed) => {
                fileItem.speed = speed;
                // 解析速度字符串为字节/秒，用于全局 ETA 计算
                if (speedMatch) {
                    let speedBytesPerSec = parseFloat(speedMatch[1]);
                    if (speedMatch[2] === 'MB') {
                        speedBytesPerSec *= 1024 * 1024;
                    } else {
                        speedBytesPerSec *= 1024;
                    }
                    fileItem.speedBytesPerSec = speedBytesPerSec;
                }
                finalConfig.onFileSpeed && finalConfig.onFileSpeed(fileItem, speed);
                notifyGlobalProgress(); // 速度更新后重新计算全局 ETA
            },
            onEta: (eta) => {
                fileItem.eta = eta;
                finalConfig.onFileEta && finalConfig.onFileEta(fileItem, eta);
            },
            onSuccess: () => {
                fileItem.status = "success";

                notifyAllSuccess();
            },
            onError: (err) => {
                fileItem.status = "error";
                fileItem.errorMsg = err;

                processQueue();
            },
            // 如果需要，透传其他回调
        });

        fileItem._uploader = uploader;

        // 启动上传
        try {
            await uploader.upload(fileItem.file);
        } catch (e) {
            console.error("Failed to start upload for file", fileItem.id, e);
            if (fileItem.status === 'uploading') {
                activeCount--;
            }
        }
    };

    // --- 公共 API ---

    const addFiles = (files) => {

        fileArray.forEach((file) => {

            const id = generateId();
            const chunkSize = finalConfig.chunkSize || 5 * 1024 * 1024;
            const fileItem = {
                status: "pending", // 初始为 pending，但会立即切换为 calculating_hash
                progress: 0,
                options: {}, // 单文件配置，由 onFileAdded 填充
                _uploader: null,
                _hashController: null, // 用于取消哈希计算
                speed: null, // 上传速度字符串
                speedBytesPerSec: 0, // 上传速度 (字节/秒)
                eta: 0, // 预估剩余时间 (秒)
                totalChunks: Math.ceil(file.size / chunkSize), // 总分片数
            };
            fileList.push(fileItem);
            queue.push(id); // 加入队列等待调度
            newIds.push(id);

            // 🆕 onFileAdded 钩子：在 hash 计算之前调用，允许用户自定义文件属性
            if (finalConfig.onFileAdded) {
                try {
                    if (options) {
                        // 如果用户自定义了 chunkSize，需要重新计算 totalChunks
                        if (options.chunkSize) {
                            fileItem.totalChunks = Math.ceil(fileItem.file.size / options.chunkSize);
                        }
                        // 支持跳过 hash 计算
                        if (options.hash === false) {
                            finalConfig.onFileStatusChange && finalConfig.onFileStatusChange(fileItem, "hash_skipped");
                            return; // 跳过 startHashCalculation
                        }
                        // 支持为单个文件指定 hash 算法（覆盖全局配置）
                        if (options.customHashApi) {
                            fileItem._customHashApi = options.hashMode || options.customHashApi;
                        }
                    }
                } catch (e) {
                    console.error("onFileAdded hook error:", e);
                }
            }

            // 开始哈希计算（并行哈希）
            startHashCalculation(fileItem);
        });

        notifyGlobalProgress();

        // ⚠️ 兜底调度修复：
        // 如果开启了自动开始，确保在有跳过哈希的文件时，队列能够被正确调度。
        // 因为被跳过哈希的文件直接 return 了，不会走到计算哈希完成的逻辑。
        if (finalConfig.autoStart && !isPausedAll) {
            setTimeout(processQueue, 0);
        }

        return newIds;
    };

    

    const removeFile = (fileId) => {
        const index = fileList.findIndex(f => f.id === fileId);
        if (index === -1) return;
        const item = fileList[index];

        // 记录文件原状态，用于判断是否需要调度下一个文件
        const originalStatus = item.status;

        // P1: 取消正在进行的哈希计算
        if (item._hashController) {
            item._hashController.cancel();
            item._hashController = null;
        }

        // 如果正在上传，先暂停并减少计数
        if (originalStatus === 'uploading' && item._uploader) {
            item._uploader.pause();
            activeCount--;
        }

        // 从 queue 中移除
        const qIndex = queue.indexOf(fileId);
        if (qIndex > -1) {
            queue.splice(qIndex, 1);
        }

        // 从 fileList 中移除
        fileList.splice(index, 1);

        // 触发文件移除回调
        finalConfig.onFileCancelled && finalConfig.onFileCancelled(item);

        notifyGlobalProgress();

        // 如果删除的不是已成功或已失败的文件，尝试调度队列中的下一个文件
        // 这样无论是删除上传中、已暂停、等待中的文件，都会触发调度检查
        if (originalStatus !== 'success' && originalStatus !== 'error') {
            processQueue();
        }
    };

    const pauseUpload = (fileId) => {
        const item = fileList.find(f => f.id === fileId);
        if (item && item.status === 'uploading' && item._uploader) {
            activeCount--;
            // 注意：暂停时不调用 processQueue()，避免自动启动其他文件
        }
    };

    const resumeUpload = (fileId) => {
        const item = fileList.find(f => f.id === fileId);
        // 仅允许哈希已计算完成或跳过（pending/paused）的文件恢复
        // 如果是 calculating_hash，会自动恢复吗？不，它没有暂停，只是在处理中。
        if (item && (item.status === 'paused' || item.status === 'pending')) {
            if (!queue.includes(fileId)) {
                queue.unshift(fileId);
            }
            if (isPausedAll) isPausedAll = false;
            processQueue();
        }
    };

    // P0: 重试失败的文件
    const retryFile = (fileId) => {
        const item = fileList.find(f => f.id === fileId);
        if (!item || item.status !== 'error') return false;

        // 重置状态
        item.status = 'pending';
        item._hashController = null;

        return true;
    };

    // P0: 取消所有上传并清空
    const cancelAll = () => {
        isPausedAll = true;

        fileList.forEach(item => {
            // 取消哈希计算
            if (item._hashController) {
                item._hashController = null;
            }
            // 暂停上传
            if (item._uploader) {
                item._uploader.pause();
            }
            // 触发取消回调
            finalConfig.onFileCancelled && finalConfig.onFileCancelled(item);
        });


        notifyGlobalProgress();
    };

    // P2: 清空所有已完成/失败的文件
    const clear = () => {
        const toRemove = fileList.filter(item =>
            item.status === 'success' || item.status === 'error'
        );
        notifyGlobalProgress();
    };

    // P2: 获取统计信息
    const getStats = () => {
        return {
            total: fileList.length,
            pending: fileList.filter(f => f.status === 'pending').length,
            success: fileList.filter(f => f.status === 'success').length,
            error: fileList.filter(f => f.status === 'error').length,
            activeCount,
            queueLength: queue.length
        };
    };

    return {
        addFiles,
        start,
        pauseAll,
        resumeAll,
        removeFile,
        pauseUpload,    // 与 upload.js 命名一致
        resumeUpload,   // 与 upload.js 命名一致
        retryFile,      // P0: 重试失败文件
        cancelAll,      // P0: 取消所有
        clear,          // P2: 清空已完成/失败
        getStats,       // P2: 获取统计
        getFileList: () => fileList
    };
}

export default createMultiUploader;
