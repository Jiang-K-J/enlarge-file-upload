async function computeFileHashDirect(file, progressCallback, chunkSize = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const shaObj = sha256.create(); // 支持增量 update()
    const reader = new FileReader();
    let offset = 0;

    reader.onerror = () => reject(reader.error);

    function readNext() {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    }

    readNext();
  });
}

export default computeFileHashDirect;