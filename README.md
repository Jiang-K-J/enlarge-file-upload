# File Upload Tool
**如果你是中文母语者，请前往https://www.npmjs.com/package/enlarge-file-upload?activeTab=readme 有着更合适的文档**
**Please download the latest version of the library first**
This is a toolkit for uploading large files, providing a series of functions to support features such as pause, resume, upload progress, and built-in error retransmission strategies. It supports resume broken downloads, retransmission, retries, and more (this library relies on the axios library for uploads, so do not use it if your project does not support axios).

## Install

```sh
npm install enlarge-file-upload
```

## Parameter Introduction

```js
/**
 * Parameter description
 * @param {Number} chunkSize? Size of each file chunk, default is 5MB
 * @param {Number} concurrency? Number of concurrent uploads, default is 5
 * @param {Number} maxRetries? Number of retry attempts on failure, default is 3
 * @param {Number} startOffset? Offset for resuming uploads, default is 0
 * @param {Array} includeChunks? Indexes of chunks to be uploaded, default is all chunks
 * If both startOffset and includeChunks parameters are present and startOffset is not 0, startOffset will take precedence
 * @param {Boolean} hash? Whether to enable hash calculation, default is true
 * @param {Boolean} awaitHash? Whether to wait for the hash value, default is true (only effective when hash is true)
 * If the awaitHash parameter is true, it is recommended to disable it for large files to avoid blocking the main thread
 * @param {Function} uploadFunction Function for uploading, required parameter
 * @param {Function} onProgress? Callback function for upload progress, optional
 * @param {Function} onSpeed? Callback function for upload speed, optional
 * @param {Function} onSuccess? Callback function after successful upload, optional
 * @param {Function} beginHash? Callback function for starting hash calculation, optional (only called once before upload, and only when hash is true)
 * @param {Function} endHash? Callback function after hash calculation is complete, optional (only called once before upload, and only when hash is true)
 */
// Parameter example
const config = {
  chunkSize: 5 * 1024 * 1024,
  concurrency: 5,
  maxRetries: 3,
  startOffset: 0,
  includeChunks,
  hash: false,
  awaitHash: false,
  uploadFunction,
  onProgress,
  onSuccess,
  onSpeed,
  beginHash,
  endHash
};

/**
 * fileUploadTool method returns an object containing methods for upload, pause, resume, etc.
 * upload Upload method
 * pause Pause method
 * resume Resume method
 * state State object containing upload progress, hash value, upload speed, etc.
 */
// Method call
const { upload, pause, resume, state } = fileUploadTool(config);
```

## Examples

### Usage Example in Native JS

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>File Upload</title>
  </head>
  <script src="https://cdn.jsdelivr.net/npm/enlarge-file-upload/dist/upload.min.js"></script>
  <!-- Include Axios library for sending HTTP requests -->
  <script src="https://cdn.bootcdn.net/ajax/libs/axios/1.5.0/axios.js"></script>

  <body>
    <input type="file" id="fileInput" />
    <button id="pauseButton">Pause Upload</button>
    <button id="resumeButton">Resume Upload</button>
    <div id="progress">Upload Progress: 0%</div>
    <div id="speed">Upload Speed: 0 MB/s</div>
    <script>
      // Define the upload function
      async function uploadFunction({ chunk, index, hash, cancelToken }) {
        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("hash", hash);
        formData.append("index", index);
        await axios.post("http://localhost:3000/api/users", formData, {
          cancelToken,
        });
      }

      // Usage example
      const config = {
        chunkSize: 5 * 1024 * 1024, // 5MB
        concurrency: 5,
        maxRetries: 3,
        // startOffset: 6, // Start upload from chunk index 6
        // includeChunks:[1,6], // Only upload chunks with index 1 and 6, effective only if startOffset is 0 or empty
        uploadFunction,
        onProgress: (progress) => {
          document.getElementById(
            "progress"
          ).innerText = `Upload Progress: ${state.progress.toFixed(2)}%`;
        },
        onSuccess: () => {
          console.log("Upload complete");
        },
        onSpeed: (speed) => {
          document.getElementById("speed").innerText = `Upload Speed: ${speed}`;
        },
      };

      const { upload, pause, resume, state } = createUploader(config);
      const fileInput = document.getElementById("fileInput");
      fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        upload(file);
      });
      // Pause upload
      document.getElementById("pauseButton").addEventListener("click", () => {
        pause();
      });
      // Resume upload
      document.getElementById("resumeButton").addEventListener("click", () => {
        resume();
      });
    </script>
  </body>
</html>

```

### Usage Example in React

**In React, it is necessary to use useMemo to avoid recreating the uploader object when the component re-renders.**

```tsx
import React, { useState, useMemo } from "react";
import createUploader from "enlarge-file-upload";
import axios from "axios";

const FileUpload = () => {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState("0 MB/s");

  // Define the upload function
  async function uploadFunction({ chunk, index, hash, cancelToken }) {
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("hash", hash);
    formData.append("index", index);
    await axios.post("http://localhost:3000/api/users", formData, {
      cancelToken,
    });
  }

  const uploaderConfig = useMemo(
    () => ({
      chunkSize: 5 * 1024 * 1024, // 5MB
      concurrency: 5,
      maxRetries: 3,
      // startOffset: 6, // Start upload from chunk index 6
      // includeChunks:[1,6], // Only upload chunks with index 1 and 6, effective only if startOffset is 0 or empty
      uploadFunction,
      onProgress: (progress) => {
        setProgress(progress);
      },
      onSuccess: () => {
        console.log("Upload complete");
      },
      onSpeed: (speed) => {
        setSpeed(speed);
      },
    }),
    []
  );

  const uploader = useMemo(
    () => createUploader(uploaderConfig),
    [uploaderConfig]
  );

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    uploader?.upload(file);
  };

  const handlePause = () => {
    uploader?.pause();
  };

  const handleResume = () => {
    uploader?.resume();
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handlePause}>Pause Upload</button>
      <button onClick={handleResume}>Resume Upload</button>
      <div>Upload Progress: {progress.toFixed(2)}%</div>
      <div>Upload Speed: {speed}</div>
    </div>
  );
};

export default FileUpload;

```

### Wrapping as React Hooks

**A simple wrapping. For special requirements, you can modify this hooks accordingly**

```tsx
import { useState, useMemo, useCallback } from "react";
import createUploader from "enlarge-file-upload";
import axios from "axios";

const useFileUploader = () => {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState("0 MB/s");

  const uploadFunction = useCallback(
    async ({ chunk, index, hash, cancelToken }) => {
      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("hash", hash);
      formData.append("index", index);
      await axios.post("http://localhost:3000/api/users", formData, {
        cancelToken,
      });
    },
    []
  );

  const uploaderConfig = useMemo(
    () => ({
      chunkSize: 5 * 1024 * 1024, // 5MB
      concurrency: 5,
      maxRetries: 3,
      // startOffset: 6, // Start upload from chunk index 6
      // includeChunks:[1,6], // Only upload chunks with index 1 and 6, effective only if startOffset is 0 or empty
      uploadFunction,
      onProgress: (progress) => {
        setProgress(progress);
      },
      onSuccess: () => {
        console.log("Upload complete");
      },
      onSpeed: (speed) => {
        setSpeed(speed);
      },
    }),
    [uploadFunction]
  );

  const uploader = useMemo(
    () => createUploader(uploaderConfig),
    [uploaderConfig]
  );

  const uploadFile = useCallback(
    (file) => {
      uploader?.upload(file);
    },
    [uploader]
  );

  const pauseUpload = useCallback(() => {
    uploader?.pause();
  }, [uploader]);

  const resumeUpload = useCallback(() => {
    uploader?.resume();
  }, [uploader]);

  return {
    progress,
    speed,
    uploadFile,
    pauseUpload,
    resumeUpload,
  };
};

export default useFileUploader;

```

#### Example Using the Wrapped Hooks

```tsx
import React from "react";
import useFileUploader from "./useFileUploader.tsx";

const FileUpload = () => {
  const { progress, speed, uploadFile, pauseUpload, resumeUpload } =
    useFileUploader();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    uploadFile(file);
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={pauseUpload}>Pause Upload</button>
      <button onClick={resumeUpload}>Resume Upload</button>
      <div>Upload Progress: {progress.toFixed(2)}%</div>
      <div>Upload Speed: {speed}</div>
    </div>
  );
};

export default FileUpload;

```

## Suggestions

If you have better suggestions or need new features supported for this toolkit, please open an issue or add me on QQ: 1844119859.
