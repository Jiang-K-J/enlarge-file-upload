# enlarge-file-upload

`enlarge-file-upload` is a browser-side large-file upload library for JavaScript and TypeScript. It splits a `File` into chunks and sends each chunk through an application-provided `uploadFunction`.

[中文说明](./README.md) · [npm package](https://www.npmjs.com/package/enlarge-file-upload) · [GitHub repository](https://github.com/Jiang-K-J/enlarge-file-upload) · [Issues](https://github.com/Jiang-K-J/enlarge-file-upload/issues)

## What it provides

- Configurable chunk size and concurrent chunk uploads
- Retry handling for failed chunk requests
- Pause, resume, and reset controls
- File and chunk hashing options
- Progress, speed, and estimated-time callbacks
- TypeScript declarations
- Selective chunk upload through `startOffset` and `includeChunks`

The package does not provide a backend server. Your application must implement chunk persistence, upload-status lookup, final file assembly, integrity verification, authorization, and resource limits.

## Installation

```bash
npm install enlarge-file-upload axios
```

## Basic usage

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

    // This endpoint must be implemented by your application.
    await axios.post('/api/uploads/chunk', data, { cancelToken });
  },
  onProgress: (percent) => console.log('progress', percent),
  onSpeed: (speed) => console.log('speed', speed),
  onEta: (seconds) => console.log('eta', seconds),
  onError: (error) => console.error('upload failed', error),
});

const file = document.querySelector<HTMLInputElement>('#file')?.files?.[0];
if (file) void uploader.upload(file);
```

An upload reaching 100% on the client does not mean that the server has assembled and verified the final file. Use an explicit server-side completion endpoint as the source of truth.

## Guides

- [Backend chunk-upload protocol](./docs/UPLOAD-PROTOCOL.md)
- [Frequently asked questions](./docs/FAQ.md)
- [Vue 3 integration](./docs/VUE3-GUIDE.md)
- [React integration](./docs/REACT-GUIDE.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

## Release note

Version `2.4.6` refines the online documentation and demo links without changing runtime behavior. The repository `dist/upload.js` is primarily a demo artifact; npm consumers should rely on the files in the installed package. Verify runtime exports and run `npm pack --dry-run` before every release.

## License

ISC. See [LICENSE](./LICENSE).
