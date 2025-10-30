async function computeFileHashDirect(file, progressCallback, chunkSize = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const shaObj = sha256.create(); // 支持增量 update()
    const reader = new FileReader();
    let offset = 0;

    reader.onerror = () => reject(reader.error);
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      shaObj.update(data); // 增量计算
      offset += data.length;
      // 调用进度回调函数
      if (progressCallback) {
        progressCallback((offset / file.size) * 100);
      }

      if (offset < file.size) {
        readNext();
      } else {
        resolve(shaObj.hex());
      }
    };

    function readNext() {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    }

    readNext();
  });
}

export default computeFileHashDirect;