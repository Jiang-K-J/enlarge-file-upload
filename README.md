# enlarge-file-upload

> 面向 JavaScript / TypeScript 的大文件分片上传工具，支持并发控制、暂停与恢复、失败重试、上传进度、文件哈希和多文件队列。
>
> Chunked and resumable file upload for JavaScript and TypeScript, with concurrency control, pause/resume, retries, progress tracking, hashing, and multi-file queues.

[npm package](https://www.npmjs.com/package/enlarge-file-upload) · [GitHub repository](https://github.com/Jiang-K-J/enlarge-file-upload) · [Issues](https://github.com/Jiang-K-J/enlarge-file-upload/issues)

`enlarge-file-upload` 是一个浏览器端大文件上传库。它负责把 `File` 切分成分片，并通过业务传入的 `uploadFunction` 上传分片。服务端的分片接收、持久化、状态查询、合并和完整性校验需要由应用自行实现。

## 主要能力

- **大文件分片上传**：通过 `chunkSize` 控制单个分片大小。
- **并发与重试**：通过 `concurrency` 和 `maxRetries` 控制上传行为。
- **暂停与恢复**：通过 `pause()` 和 `resume()` 控制当前上传任务。
- **断点续传辅助**：通过 `startOffset` 或 `includeChunks` 指定待上传分片。
- **文件哈希**：支持文件哈希、分片哈希和自定义哈希计算。
- **进度监测**：提供 `onProgress`、`onSpeed`、`onEta` 等回调。
- **多文件队列**：通过 `createMultiUploader()` 管理多个文件。
- **TypeScript 类型**：包内提供 `index.d.ts` 类型声明。

以上能力基于当前仓库和 `2.4.4` 的类型声明整理。生产使用前，请在目标浏览器、构建工具和后端协议下完成验证。

## 安装

```bash
npm install enlarge-file-upload axios
```

CDN 引入：

```html
<script src="https://unpkg.com/enlarge-file-upload@latest/dist/upload.js"></script>
```

## 快速开始：单文件分片上传

```ts
import { createUploader } from 'enlarge-file-upload';
import type { UploadOptions } from 'enlarge-file-upload';
import axios from 'axios';

const uploader = createUploader({
  chunkSize: 5 * 1024 * 1024,
  concurrency: 3,
  maxRetries: 3,
  uploadFunction: async ({ chunk, index, hash, cancelToken }: UploadOptions) => {
    const data = new FormData();
    data.append('chunk', chunk);
    data.append('index', String(index));
    if (hash !== null) data.append('hash', hash);

    // 此接口需要由你的服务端实现。
    await axios.post('/api/uploads/chunk', data, { cancelToken });
  },
  onProgress: (percent) => console.log('progress', percent),
  onSpeed: (speed) => console.log('speed', speed),
  onEta: (seconds) => console.log('eta', seconds),
  onError: (error) => console.error('upload failed', error),
});

const input = document.querySelector<HTMLInputElement>('#file');
input?.addEventListener('change', () => {
  const file = input.files?.[0];
  if (file) void uploader.upload(file);
});

// 可将 uploader.pause() 和 uploader.resume() 绑定到页面按钮。
```

`/api/uploads/chunk` 只是示例地址，不是本包提供的服务端 API。跨页面或跨设备断点续传需要服务端记录已完成分片，并将缺失分片索引交给 `includeChunks`。最终文件是否合并、校验并可用，应以后端完成接口的结果为准。

## 常用配置与 API

| 参数或 API | 用途 |
| --- | --- |
| `uploadFunction` | 必填，发送单个分片的异步函数 |
| `chunkSize` | 分片大小，类型注释中的默认值为 5 MiB |
| `concurrency` | 同时上传的分片数量，类型注释中的默认值为 5 |
| `maxRetries` | 单个分片上传失败后的最大重试次数 |
| `startOffset` / `includeChunks` | 指定续传起点或需要上传的分片 |
| `hash` / `hashMode` | 控制文件哈希计算 |
| `onProgress` / `onSpeed` / `onEta` | 获取进度、速度和预计剩余时间 |
| `pause()` / `resume()` / `reset()` | 控制单文件上传任务 |
| `checker()` | 获取文件、分片和哈希检查结果 |
| `createMultiUploader()` | 创建多文件上传队列 |

完整接口以仓库根目录的 [`index.d.ts`](./index.d.ts) 为准。

## 使用指南

- [前后端分片上传协议设计](./docs/UPLOAD-PROTOCOL.md)
- [常见问题：断点续传、哈希和多文件上传](./docs/FAQ.md)
- [GEO 提问基线与效果监测](./docs/GEO-BASELINE.md)

## 使用边界

- 本包不提供 Node.js、Java、Go 等服务端实现。
- 客户端显示 100% 不代表服务端已经完成文件合并和校验。
- 跨会话断点续传依赖服务端保存并返回已持久化的分片状态。
- 文件类型、大小、权限、存储配额和内容安全必须由服务端重新校验。

现有的[在线使用文档](http://jiang-12-13.com:9898/)和[在线演示](http://jiang-12-13.com:8988/)仍使用 HTTP。生产环境和公开上传演示建议迁移至 HTTPS，并限制文件大小、类型、速率和存储期限。

## 开发与发布说明

文档中的 API 名称应同时与当前源码、`index.d.ts` 和实际发布包核对。发布前建议运行 `npm pack --dry-run` 检查包内容，并在浏览器项目中验证模块导入和上传流程。

本轮 GEO 优化只涉及说明文档和包元数据，不改变 `src/`、`dist/`、运行逻辑或对外 API。

## 反馈与许可

发现问题请提交 [GitHub Issue](https://github.com/Jiang-K-J/enlarge-file-upload/issues)。本项目使用 ISC 许可证，详见 [LICENSE](./LICENSE)。

相关主题：JavaScript 大文件上传、TypeScript 分片上传、断点续传、并发上传、失败重试、暂停恢复、文件哈希、Vue 文件上传、React 文件上传。
