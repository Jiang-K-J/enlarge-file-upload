// index.d.ts

import { CancelToken, AxiosInstance } from "axios";

/**
 * 自定义哈希计算的返回结果：
 * - hash: 当前文件整体hash值（字符串）
 * - hashMap: 一个 Map，用于存储每个分片的哈希值
 */
type HashResult = Promise<{
  hash: string;
  hashMap: Map<number, string>;
}>;

/**
 * 流式计算模式：
 * - 参数：
 *   - chunk: 当前分片的二进制数据
 *   - index: 当前分片的索引
 * - 返回：
 *   - 一个 Promise，解析为 HashResult
 */
type ChunkHashFn = (chunk: Blob, index: number) => HashResult;

/**
 * 单次计算模式：
 * - 参数：
 *   - file: 完整文件对象
 * - 返回：
 *   - 一个 Promise，解析为 HashResult
 */
type FileHashFn = (file: File) => HashResult;

/**
 * 日志条目接口
 */
export interface LogEntry {
  /**
   * 日志时间戳 (ISO 8601格式)
   */
  timestamp: string;
  /**
   * 会话ID，用于关联同一次上传的所有日志
   */
  sessionId: string;
  /**
   * 日志级别
   */
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  /**
   * 日志消息
   */
  message: string;
  /**
   * 日志元数据
   */
  metadata?: Record<string, any>;
}

export interface UploadOptions {
  /**
   * 当前分片数据
   * @example new Blob([file.slice(0, chunkSize)])
   */
  chunk: Blob;
  /**
   * 当前分片索引（从0开始计数的绝对位置，包含起始偏移量）
   * @example 如果设定 startOffset=3，则实际索引范围是 [3,4,5...]
   */
  index: number;
  /**
   * 文件的唯一哈希值
   * @example "sha256-xxxxxx"
   */
  hash: string | null;
  /**
   * 文件状态
   */
  fileState: {
    file: File;
    hash: string;
    allChunks: Blob[];
    hashMap: Map<number, string>;
    totalChunks: number;
  };
  /**
   * 用于取消请求的 axios 取消令牌
   * @example axios.CancelToken.source().token
   */
  cancelToken: CancelToken;
}

export interface Config {
  /**
   * 【必需】分片上传处理函数
   * @example ({ chunk, index, hash }) => axios.post(uploadUrl, formData)
   */
  uploadFunction: (options: UploadOptions) => Promise<void>;
  /**
   * 【可选】分片大小（字节），默认为 5MB
   * @default 5 * 1024 * 1024
   */
  chunkSize?: number;
  /**
   * 【可选】起始分片位置索引（用于断点续传），默认从第一个分片开始
   * @example 3 (从第4个分片开始)
   */
  startOffset?: number;
  /**
   * 【可选】指定要上传的分片索引数组（优先级高于 startOffset）
   * @example [0,2,3] (仅上传索引为0、2、3的分片)
   */
  includeChunks?: number[];
  /**
   * 【可选】上传失败时的最大重试次数，默认 3 次
   * @default 3
   */
  maxRetries?: number;
  /**
   * 【可选】最大并发请求数，默认 5
   * @default 5
   */
  concurrency?: number;
  /**
   * 【可选】是否计算文件哈希，默认 true 计算hash值
   * @default true
   */
  hash?: boolean;
  /**
   * 【可选】指定计算hash所需要的webworker线程数
   * @default 系统CPU核心数 - 2
   */
  threads?: number;
  /**
   * 【可选】自定义 axios 实例，用于上传文件时的 HTTP 请求
   */
  axiosInstance?: AxiosInstance;
  /**
   * 【可选】是否等待哈希计算完成再上传，默认 true
   * @default true
   */
  awaitHash?: boolean;
  /**
   * 【可选】哈希计算模式，默认自动选择
   * - 'crypto': 使用 Web Crypto API（性能更好，但大文件可能内存不足）
   * - 'sha256': 使用自定义 sha256 实现（更稳定，支持超大文件）
   * @default 自动选择：1GB以下文件使用 crypto，1GB以上使用 sha256
   */
  hashMode?: "crypto" | "sha256";
  /**
   * @deprecated 请使用 hashMode 代替，此属性将在未来版本移除
   */
  customHashApi?: "crypto" | "sha256";
  /**
   * 可选】自定义计算哈希函数：
   * 支持两种模式：
   * 1. 直接传入整体文件的哈希函数
   * 2. 传入一个对象，启用 流式计算 模式：
   *    - flow: 是否启用分片流式处理（chunk）模式
   *    - calculationHash: 分片级哈希函数
   */
  customHash?:
  | FileHashFn
  | {
    flow: Boolean;
    calculationHash: ChunkHashFn;
  };
  /**
   * 【可选】是否计算所有切片hash，默认 false
   * @default false
   */
  chunkMap?: boolean | { async: boolean; indices?: number[] };
  /**
   * 【回调】开始计算哈希时触发
   */
  beginHash?: () => void;
  /**
   * 【回调】哈希计算完成后触发，返回最终哈希值
   */
  endHash?: (hash: string) => void;
  /**
   * 【回调】上传进度变化时触发，返回 0-100 的数值
   */
  onProgress?: (progress: number) => void;
  /**
   * 【回调】实时上传速度变化时触发，返回带有单位的字符串
   * @example "2.45 MB/s"
   */
  onSpeed?: (speed: string) => void;
  /**
   * 【回调】预估剩余时间变化时触发，返回剩余秒数
   * @example 120 (表示还剩约2分钟)
   */
  onEta?: (eta: number) => void;
  /**
   * 【回调】全部分片上传完成且合并成功时触发
   */
  onSuccess?: () => void;
  /**
   * 【回调】上传失败时触发，返回错误信息
   */
  onError?: (error: any) => void;
  /**
   * 【可选】是否启用日志记录功能
   * @default false
   */
  enableLogging?: boolean;
  /**
   * 【可选】日志级别，控制输出的最低日志级别
   * @default 'INFO'
   */
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  /**
   * 【可选】是否将日志输出到浏览器控制台
   * @default true
   */
  consoleOutput?: boolean;
  /**
   * 【回调】日志记录时触发，可用于自定义日志处理（如发送到服务端）
   * @example (log) => { console.log(log); sendToServer(log); }
   */
  onLog?: (log: LogEntry) => void;
}

export interface State {
  /**
   * 上传进度百分比 (0-100)
   */
  progress: number;
  /**
   * 当前实时上传速度（包含单位）
   * @example "1.23 MB/s"
   */
  speed: string;
  /**
   * 是否已完成上传
   */
  uploadEnd: boolean;
  /**
   * 预估剩余时间（秒）
   * @example 120 表示还剩约2分钟
   */
  eta: number;
  /**
   * 文件哈希值（基于分片内容的 SHA256）
   */
  hash: string;
  /**
   * 当前上传的原始 File 对象
   */
  file: File | null;
  /**
   * 总分片数（包含偏移量分片）
   */
  totalChunks: number;
  /**
   * 上传错误信息
   */
  errorMsg: Error | null;
  /**
   * 所有切片
   */
  allChunks: [];
  /**
   * 所有切片hashMap（需要开启计算才有，默认不开启）
   */
  hashMap: Map<number, string>;
}

export interface Uploader {
  /**
   * 启动文件上传
   * @param file - 要上传的浏览器 File 对象
   * @throws 分片初始化失败/上传过程中出现未处理错误
   */
  upload: (file: File) => Promise<void>;
  /**
   * 暂停上传（会取消正在传输的请求）
   */
  pause: () => void;
  /**
   * 恢复暂停的上传（从断点继续）
   * @throws 未初始化分片时调用会报错
   */
  resume: () => Promise<void>;
  /**
   * 重置所有状态到初始值（相当于重新初始化）
   * - 清理所有分片数据
   * - 取消所有进行中的请求
   * - 清理定时器和缓存数据
   * - 重置进度到 0%
   */
  reset: () => void;
  /**
   * 实时状态对象，可通过监听相关属性实现响应式更新
   */
  state: State;
}

// 定义基础上传配置接口，只保留核心配置项
export interface CheckerConfig
  extends Omit<
    Config,
    | "startOffset"
    | "concurrency"
    | "maxRetries"
    | "includeChunks"
    | "onProgress"
    | "onSpeed"
    | "onSuccess"
    | "uploadFunction"
    | "customHash"
    | "axiosInstance"
  > {
  /**
   * 【可选】是否开启抽样hash计算，默认 false
   * @default false
   */
  sampleHash?: boolean | ((totalChunks: number) => number[]);
}

// checker 函数的返回类型
export interface CheckerResult {
  /**
   * 所有切片hashMap
   */
  chunkHashMap: Map<number, string>;
  /**
   * 文件哈希值
   */
  hash: string;
  /**
   * 总分片数
   */
  totalChunks: number;
  /**
   * 抽样hash数据
   */
  sampleHash: {
    /**
     * 抽样hash值
     */
    hash: string;
    /**
     * key为抽样hash索引，value为单片抽样hash值
     */
    hashObj: Record<number, string>;
  };
  /**
   * 所有切片
   */
  allChunks: Blob[];
}
declare function createUploader(config: Config): Uploader;
declare function checker(
  file: File,
  config: CheckerConfig
): Promise<CheckerResult>;
declare namespace utils {
  /**
   * @description
   * 使用单线程（主线程）以增量方式读取文件并计算 SHA256 哈希值。
   * 适用于中大型文件场景，逻辑简单且稳定。
   *
   * @param file - 要计算哈希的文件对象
   *
   * @param options - 可选配置项
   * @param options.chunkSize - 每次读取的文件分片大小（默认 5MB）
   * @param options.callback - 进度回调函数，回调参数包含当前百分比
   *
   * @callback options.callback
   * @param options.callback.params - 回调参数对象
   * @param options.callback.params.percentage - 当前进度百分比（字符串，如 "25.18"）
   *
   * @returns 返回 Promise，resolve 为最终 SHA256 哈希字符串
   */
  function computeFileHashDirect(
    file: File,
    options?: {
      chunkSize?: number;
      callback?: (params: { percentage: string }) => void;
    }
  ): Promise<string>;

  /**
   * @description
   * 使用多线程（Web Workers）并行读取文件分片，并在主线程按顺序计算文件的 SHA256 哈希值。
   * 适用于超大文件场景，加速读取阶段的性能。
   *
   * @param file - 要计算哈希值的文件对象
   *
   * @param options - 可选配置项
   * @param options.chunkSize - 每个文件分片的大小（默认 5MB）
   * @param options.workerCount - 启动的 Web Worker 数量，默认根据 CPU 核心数决定
   * @param options.callback - 回调函数，可用于获取进度信息
   *
   * @callback options.callback
   * @param options.callback.params - 回调参数对象
   * @param options.callback.params.currentWorker - 当前已完成读取的 worker 数量
   * @param options.callback.params.totalWorker - worker 总数
   * @param options.callback.params.percentage - 当前进度百分比（字符串形式，如 "25.00"）
   * @param options.callback.params.stage - 当前阶段："reading"（正在读取）或 "hashing"（正在计算哈希）
   *
   * @returns 返回 Promise，resolve 为最终的 SHA256 哈希字符串
   */
  function computeFileHashParallel(
    file: File,
    options?: {
      chunkSize?: number;
      workerCount?: number;
      callback?: (params: {
        currentWorker: number;
        totalWorker: number;
        percentage: string;
        stage: "reading" | "hashing";
      }) => void;
    }
  ): Promise<string>;
}

// ==================== Multi-Uploader Types ====================

/**
 * 多文件上传器文件项
 */
export interface MultiUploadFileItem {
  /** 唯一标识符 */
  id: string;
  /** 原始文件对象 */
  file: File;
  /** 文件状态 */
  status: 'pending' | 'calculating_hash' | 'uploading' | 'paused' | 'success' | 'error';
  /** 上传进度 (0-100) */
  progress: number;
  /** 哈希计算进度 (0-100) */
  hashProgress: number;
  /** 文件哈希值 */
  hash: string | null;
  /** 总分片数 */
  totalChunks: number;
  /** 上传速度字符串 */
  speed?: string | null;
  /** 上传速度 (字节/秒) */
  speedBytesPerSec?: number;
  /** 预估剩余时间 (秒) */
  eta?: number;
  /** 错误信息 */
  errorMsg?: string | Error | null;
}

/**
 * 多文件上传器统计信息
 */
export interface MultiUploadStats {
  /** 总文件数 */
  total: number;
  /** 等待中 */
  pending: number;
  /** 正在计算哈希 */
  calculating: number;
  /** 正在上传 */
  uploading: number;
  /** 已暂停 */
  paused: number;
  /** 上传成功 */
  success: number;
  /** 上传失败 */
  error: number;
  /** 当前活跃上传数 */
  activeCount: number;
  /** 队列长度 */
  queueLength: number;
}

/**
 * onBeforeUpload 钩子返回值
 */
export interface BeforeUploadResult {
  /** 设为 true 跳过实际上传（用于秒传） */
  skip?: boolean;
  /** 断点续传：需要上传的分片索引数组（从0开始） */
  includeChunks?: number[];
  /** 断点续传：起始分片偏移量（从第几个分片开始上传） */
  startOffset?: number;
}

/**
 * 多文件上传器配置
 */
export interface MultiUploadConfig extends Omit<Config, 'onProgress' | 'onSuccess'> {
  /**
   * 【可选】最大并发文件数，默认 1（顺序上传）
   * @default 1
   */
  maxConcurrentFiles?: number;
  /**
   * 【可选】添加文件后自动开始上传，默认 true
   * @default true
   */
  autoStart?: boolean;
  /**
   * 【回调】文件添加时触发（hash 计算之前），可配置单文件配置覆盖全局配置
   */
  onFileAdded?: (fileItem: MultiUploadFileItem) => Config | void;
  /**
   * 【回调】上传前钩子，可用于秒传检查
   * 返回 { skip: true } 跳过实际上传
   */
  onBeforeUpload?: (fileItem: MultiUploadFileItem) => Promise<BeforeUploadResult | void>;
  /**
   * 【回调】单个文件进度变化
   */
  onFileProgress?: (fileItem: MultiUploadFileItem, progress: number) => void;
  /**
   * 【回调】单个文件状态变化
   */
  onFileStatusChange?: (fileItem: MultiUploadFileItem, status: string) => void;
  /**
   * 【回调】单个文件上传成功
   */
  onFileSuccess?: (fileItem: MultiUploadFileItem) => void;
  /**
   * 【回调】单个文件上传失败
   */
  onFileError?: (fileItem: MultiUploadFileItem, error: Error | string) => void;
  /**
   * 【回调】单个文件开始上传
   */
  onFileStart?: (fileItem: MultiUploadFileItem) => void;
  /**
   * 【P1 回调】单个文件哈希计算进度
   */
  onHashProgress?: (fileItem: MultiUploadFileItem, percentage: number) => void;
  /**
   * 【回调】文件被取消/移除
   */
  onFileCancelled?: (fileItem: MultiUploadFileItem) => void;
  /**
   * 【回调】全局进度变化
   */
  onGlobalProgress?: (info: {
    percent: number;
    totalUploadedSize: number;
    totalSize: number;
    /** 预估剩余时间（秒） */
    eta: number;
  }) => void;
  /**
   * 【回调】单个文件速度变化
   */
  onFileSpeed?: (fileItem: MultiUploadFileItem, speed: string) => void;
  /**
   * 【回调】单个文件预估剩余时间变化
   */
  onFileEta?: (fileItem: MultiUploadFileItem, eta: number) => void;
  /**
   * 【回调】所有文件上传成功
   */
  onAllSuccess?: () => void;
}

/**
 * 多文件上传器实例
 */
export interface MultiUploader {
  /**
   * 添加文件到上传队列
   * @param files - 单个文件或文件数组
   * @returns 添加的文件 ID 数组
   */
  addFiles: (files: File | File[]) => string[];
  /**
   * 开始上传（用于 autoStart: false 时手动触发）
   */
  start: () => void;
  /**
   * 暂停所有上传
   */
  pauseAll: () => void;
  /**
   * 恢复所有已暂停的上传
   */
  resumeAll: () => void;
  /**
   * 移除指定文件
   * @param fileId - 文件 ID
   */
  removeFile: (fileId: string) => void;
  /**
   * 暂停指定文件上传（与 upload.js 的 pauseUpload 命名一致）
   * @param fileId - 文件 ID
   */
  pauseUpload: (fileId: string) => void;
  /**
   * 恢复指定文件上传（与 upload.js 的 resumeUpload 命名一致）
   * @param fileId - 文件 ID
   */
  resumeUpload: (fileId: string) => void;
  /**
   * 【P0】重试失败的文件
   * @param fileId - 文件 ID
   * @returns 是否成功加入重试队列
   */
  retryFile: (fileId: string) => boolean;
  /**
   * 【P0】取消所有上传并清空文件列表
   */
  cancelAll: () => void;
  /**
   * 【P2】清空所有已完成和失败的文件
   */
  clear: () => void;
  /**
   * 【P2】获取上传统计信息
   */
  getStats: () => MultiUploadStats;
  /**
   * 获取当前文件列表
   */
  getFileList: () => MultiUploadFileItem[];
}

declare function createMultiUploader(config: MultiUploadConfig): MultiUploader;

export { createUploader, checker, utils, createMultiUploader };
