// index.d.ts

import { CancelToken } from "axios";

/**
 * Custom hash calculation result:
 * - hash: The overall hash value of the current file (string)
 * - hashMap: A Map used to store the hash value of each chunk
 */
type HashResult = Promise<{
  hash: string;
  hashMap: Map<number, string>;
}>;

/**
 * Stream calculation mode:
 * - Parameters:
 *   - chunk: Binary data of current chunk
 *   - index: Index of current chunk
 * - Returns:
 *   - A Promise that resolves to HashResult
 */
type ChunkHashFn = (chunk: Blob, index: number) => HashResult;

/**
 * Single calculation mode:
 * - Parameters:
 *   - file: Complete file object
 * - Returns:
 *   - A Promise that resolves to HashResult
 */
type FileHashFn = (file: File) => HashResult;

export interface UploadOptions {
  /**
   * Current chunk data
   * @example new Blob([file.slice(0, chunkSize)])
   */
  chunk: Blob;
  /**
   * Current chunk index (absolute position starting from 0, including start offset)
   * @example If startOffset=3, then actual index range is [3,4,5...]
   */
  index: number;
  /**
   * Unique hash value of the file
   * @example "sha256-xxxxxx"
   */
  hash: string | null;
  /**
   * Axios cancel token for request cancellation
   * @example axios.CancelToken.source().token
   */
  cancelToken: CancelToken;
}

export interface Config {
  /**
   * [Required] Chunk upload handling function
   * @example ({ chunk, index, hash }) => axios.post(uploadUrl, formData)
   */
  uploadFunction: (options: UploadOptions) => Promise<void>;
  /**
   * [Optional] Chunk size (bytes), default is 5MB
   * @default 5 * 1024 * 1024
   */
  chunkSize?: number;
  /**
   * [Optional] Starting chunk position index (for resumable uploads), defaults to start from first chunk
   * @example 3 (starts from 4th chunk)
   */
  startOffset?: number;
  /**
   * [Optional] Specify chunk indices to upload (higher priority than startOffset)
   * @example [0,2,3] (only upload chunks with index 0, 2, 3)
   */
  includeChunks?: number[];
  /**
   * [Optional] Maximum retry attempts on upload failure, default 3 times
   * @default 3
   */
  maxRetries?: number;
  /**
   * [Optional] Maximum concurrent requests, default 5
   * @default 5
   */
  concurrency?: number;
  /**
   * [Optional] Whether to calculate file hash, default false
   * @default false
   */
  hash?: boolean;
  /**
   * [Optional] Specify number of webworker threads needed for hash calculation
   * @default System CPU cores - 2
   */
  threads?: number;
  /**
   * [Optional] Whether to wait for hash calculation completion before upload, default true
   * @default true
   */
  awaitHash?: boolean;
  /**
   * [Optional] Custom hash calculation function:
   * Supports two modes:
   * 1. Direct file hash function input
   * 2. Pass an object to enable stream calculation mode:
   *    - flow: Whether to enable chunk stream processing mode
   *    - calculationHash: Chunk-level hash function
   */
  customHash?:
    | FileHashFn
    | {
        flow: Boolean;
        calculationHash: ChunkHashFn;
      };
  /**
   * [Optional] Whether to calculate all chunk hashes, default false
   * @default false
   */
  chunkMap?: boolean | { async: boolean; indices?: number[] };
  /**
   * [Callback] Triggered when hash calculation starts
   */
  beginHash?: () => void;
  /**
   * [Callback] Triggered when hash calculation completes, returns final hash value
   */
  endHash?: (hash: string) => void;
  /**
   * [Callback] Triggered when upload progress changes, returns value 0-100
   */
  onProgress?: (progress: number) => void;
  /**
   * [Callback] Triggered when real-time upload speed changes, returns string with unit
   * @example "2.45 MB/s"
   */
  onSpeed?: (speed: string) => void;
  /**
   * [Callback] Triggered when all chunks are uploaded and merged successfully
   */
  onSuccess?: () => void;
}

export interface State {
  /**
   * Upload progress percentage (0-100)
   */
  progress: number;
  /**
   * Current real-time upload speed (with unit)
   * @example "1.23 MB/s"
   */
  speed: string;
  /**
   * Whether upload is completed
   */
  uploadEnd: boolean;
  /**
   * File hash value (SHA256 based on chunk content)
   */
  hash: string;
  /**
   * Current uploading original File object
   */
  file: File | null;
  /**
   * Total number of chunks (including offset chunks)
   */
  totalChunks: number;
  /**
   * Upload error message
   */
  errorMsg: Error | null;
  /**
   * All chunks
   */
  allChunks: [];
  /**
   * All chunks hashMap (only available when calculation is enabled, disabled by default)
   */
  hashMap: Map<number, string>;
}

export interface Uploader {
  /**
   * Start file upload
   * @param file - Browser File object to upload
   * @throws Chunk initialization failure/Unhandled error during upload
   */
  upload: (file: File) => Promise<void>;
  /**
   * Pause upload (will cancel ongoing transfer requests)
   */
  pause: () => void;
  /**
   * Resume paused upload (continue from breakpoint)
   * @throws Error if called before chunk initialization
   */
  resume: () => Promise<void>;
  /**
   * Reset all states to initial values (equivalent to reinitialization)
   * - Clear all chunk data
   * - Cancel all ongoing requests
   * - Clear timers and cached data
   * - Reset progress to 0%
   */
  reset: () => void;
  /**
   * Real-time state object, can achieve reactive updates by monitoring related properties
   */
  state: State;
}

// Define base upload configuration interface, keeping only core configuration items
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
  > {}

// Return type for checker function
export interface CheckerResult {
  /**
   * All chunks hashMap
   */
  chunkHashMap: Map<number, string>;
  /**
   * File hash value
   */
  hash: string;
  /**
   * Total number of chunks
   */
  totalChunks: number;
  /**
   * All chunks
   */
  allChunks: Blob[];
}
declare function createUploader(config: Config): Uploader;
declare function checker(
  file: File,
  config: CheckerConfig
): Promise<CheckerResult>;

export { createUploader, checker };
