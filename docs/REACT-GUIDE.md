# 在 React 中使用 enlarge-file-upload

在 React 中应保持上传器实例稳定，避免组件每次渲染都创建新的上传任务。可以用 `useRef` 保存实例，并通过回调更新组件状态。

## 安装

```bash
npm install enlarge-file-upload axios
```

## Hook 组件示例

```tsx
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { createUploader } from 'enlarge-file-upload';
import type { UploadOptions, Uploader } from 'enlarge-file-upload';

export function LargeFileUpload() {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const uploaderRef = useRef<Uploader | null>(null);

  if (uploaderRef.current === null) {
    uploaderRef.current = createUploader({
      chunkSize: 5 * 1024 * 1024,
      concurrency: 3,
      maxRetries: 3,
      uploadFunction: async ({ chunk, index, hash, cancelToken }: UploadOptions) => {
        const data = new FormData();
        data.append('chunk', chunk);
        data.append('index', String(index));
        if (hash !== null) data.append('hash', hash);

        // 该接口由业务后端实现。
        await axios.post('/api/uploads/chunk', data, { cancelToken });
      },
      onProgress: setProgress,
      onSpeed: setSpeed,
      onError: (error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      },
    });
  }

  useEffect(() => {
    const uploader = uploaderRef.current;
    return () => uploader?.reset();
  }, []);

  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploaderRef.current?.upload(file);
  }

  return (
    <section>
      <input type="file" onChange={selectFile} />
      <button type="button" onClick={() => uploaderRef.current?.pause()}>
        暂停
      </button>
      <button type="button" onClick={() => void uploaderRef.current?.resume()}>
        继续
      </button>
      <p>进度：{progress.toFixed(2)}%</p>
      {speed && <p>速度：{speed}</p>}
      {errorMessage && <p>错误：{errorMessage}</p>}
    </section>
  );
}
```

## 接入注意事项

- 上传器实例应保存在 `useRef` 中，不要在每次渲染时创建新实例。
- 组件卸载时调用 `reset()`，取消请求并清理上传状态。
- React 状态只用于展示客户端进度，最终文件状态以后端完成接口为准。
- 跨刷新或跨设备恢复上传时，需要先查询服务端状态，再通过 `includeChunks` 补传缺失分片。
- 如果开发环境启用了 Strict Mode，应确认组件挂载和清理流程不会启动重复任务。
