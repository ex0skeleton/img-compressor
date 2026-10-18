/* Compression engine. Sequential jobs bound peak decode/canvas memory.
   Target mode searches quality first, then dimensions, always measuring bytes. */
window.ImageCompressor = (() => {
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  async function inspect(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = (offset, count) => String.fromCharCode(...bytes.slice(offset, offset + count));
    let type;
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) type = 'image/jpeg';
    else if (text(1, 3) === 'PNG' && bytes[0] === 137) {
      type = 'image/png';
      const view = new DataView(bytes.buffer);
      for (let p = 8; p + 12 <= bytes.length;) {
        const length = view.getUint32(p);
        if (text(p + 4, 4) === 'acTL') throw Error('Animated PNG is not supported.');
        p += length + 12;
      }
    } else if (text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
      type = 'image/webp';
      const view = new DataView(bytes.buffer);
      for (let p = 12; p + 8 <= bytes.length;) {
        if (['ANIM', 'ANMF'].includes(text(p, 4))) throw Error('Animated WebP is not supported.');
        const length = view.getUint32(p + 4, true);
        p += 8 + length + (length % 2);
      }
    } else throw Error('Use a still JPEG, PNG or WebP image.');
    return type;
  }
  async function compress(file, options, cancelled) {
    const check = () => { if (cancelled()) throw Error('Cancelled'); };
    check();
    const type = await inspect(file);
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    try {
      const ow = bitmap.width, oh = bitmap.height;
      const crop = options.crop || {x: 0, y: 0, width: 1, height: 1};
      let sx = crop.x * ow, sy = crop.y * oh;
      let sw = crop.width * ow, sh = crop.height * oh;
      if (![sx, sy, sw, sh].every(Number.isFinite) || sw < 1 || sh < 1 ||
          sx < 0 || sy < 0 || sx + sw > ow + .01 || sy + sh > oh + .01) {
        throw Error('Invalid crop bounds.');
      }
      let width = Math.max(1, Math.round(sw)), height = Math.max(1, Math.round(sh));
      if (options.width && options.height) {
        width = options.width; height = options.height;
        if (options.fit === 'contain') {
          const ratio = Math.min(width / sw, height / sh);
          width = Math.max(1, Math.round(sw * ratio));
          height = Math.max(1, Math.round(sh * ratio));
        } else if (options.fit !== 'stretch') {
          const ratio = width / height;
          if (sw / sh > ratio) { const next = sh * ratio; sx += (sw - next) / 2; sw = next; }
          else { const next = sw / ratio; sy += (sh - next) / 2; sh = next; }
        }
      } else if (options.edge) {
        const scale = Math.min(1, options.edge / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
      let format = options.format;
      // PNG/WebP use WebP in auto mode, preserving alpha without scanning every pixel.
      if (format === 'auto') format = type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
      let quality = options.quality, result;
      const draw = () => {
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw Error('The browser could not allocate an image canvas. Try a smaller output resolution.');
        if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); }
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
      };
      const encode = async q => {
        check(); await pause();
        const blob = await new Promise(resolve => canvas.toBlob(resolve, format, q));
        if (!blob) throw Error('The browser could not encode this image at the requested resolution. Try a smaller output resolution.');
        if (blob.type !== format) throw Error('This browser cannot encode the selected output format.');
        check(); return blob;
      };
      draw(); result = await encode(quality);
      const budget = options.target ? Math.floor(options.target) - 1 : 0;
      if (budget) {
        for (let attempt = 0; result.size > budget && attempt < 24; attempt++) {
          if (format !== 'image/png') {
            const lowBlob = await encode(.1);
            if (lowBlob.size <= budget) {
              let low = .1, high = options.quality, best = lowBlob;
              for (let i = 0; i < 8; i++) {
                const mid = (low + high) / 2, blob = await encode(mid);
                if (blob.size <= budget) { low = mid; best = blob; } else high = mid;
              }
              result = best; quality = low; break;
            }
            result = lowBlob;
          }
          if (width === 1 && height === 1) break;
          // Repaint from the original for each resize to avoid cumulative degradation.
          const ratio = Math.min(.85, Math.max(.1, Math.sqrt(budget / result.size) * .9));
          width = Math.max(1, Math.floor(width * ratio));
          height = Math.max(1, Math.floor(height * ratio));
          draw(); quality = options.quality; result = await encode(quality);
        }
        if (result.size > budget) throw Error('Could not meet this size limit. Increase the target size.');
      }
      let unchanged = false;
      if (!options.crop && !options.width && width === ow && height === oh && type === format && file.size <= result.size && (!budget || file.size <= budget)) {
        result = file; unchanged = true;
      }
      return {blob: result, width, height, originalWidth: ow, originalHeight: oh, quality, unchanged, format};
    } finally { bitmap.close(); canvas.width = canvas.height = 1; }
  }
  return {compress};
})();
