# 在 Vue 3 中使用 enlarge-file-upload

`enlarge-file-upload` 不依赖 Vue 组件 API。推荐在组件的 `setup` 生命周期中只创建一个上传器实例，通过回调把进度、速度和错误写入 Vue 的响应式状态。

## 安装

```bash
npm install enlarge-file-upload axios
```

## Composition API 示例

```vue
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import axios from 'axios';
import { createUploader } from 'enlarge-file-upload';
import type { UploadOptions } from 'enlarge-file-upload';

const progress = ref(0);
const speed = ref('');
const errorMessage = ref('');

const uploader = createUploader({
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
  onProgress: (value) => {
    progress.value = value;
  },
  onSpeed: (value) => {
    speed.value = value;
  },
  onError: (error) => {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  },
});

function selectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void uploader.upload(file);
}

function pauseUpload() {
  uploader.pause();
}

function resumeUpload() {
  void uploader.resume();
}

onBeforeUnmount(() => {
  uploader.reset();
});
</script>

<template>
  <input type="file" @change="selectFile" />
  <button type="button" @click="pauseUpload">暂停</button>
  <button type="button" @click="resumeUpload">继续</button>
  <p>进度：{{ progress.toFixed(2) }}%</p>
  <p v-if="speed">速度：{{ speed }}</p>
  <p v-if="errorMessage">错误：{{ errorMessage }}</p>
</template>
```

## 接入注意事项

- 不要在响应式更新或模板渲染时反复调用 `createUploader()`。
- 组件卸载时调用 `reset()`，取消仍在进行的请求并清理状态。
- 客户端进度达到 100% 后，仍应调用业务后端的完成接口进行分片合并和完整性校验。
- 跨页面断点续传需要先查询服务端已保存的分片，再使用 `includeChunks` 指定缺失分片。
- 文件大小、类型、权限和内容安全必须由服务端重新校验。
