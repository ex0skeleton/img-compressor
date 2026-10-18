# Image Wiz

Private static batch image compression with a dark glass interface and Sonic Arcade sounds.


## How compression works

- High Quality (92%) is the default, with Balanced, Smallest file and custom settings.
- Auto chooses JPEG for JPEG sources and WebP for PNG/WebP sources, preserving transparency.
- Without a target, dimensions stay intact unless you choose a maximum long edge.
- Targets are strictly under 1 MB, 500 KB, 200 KB, 100 KB or custom KB/MB. Decimal units: 1 MB = 1,000,000 bytes. A target is a maximum, not padding.
- With a target, quality is adjusted first, then dimensions if needed. Selected quality is the upper bound. Actual output quality and dimensions appear on each result.
- PNG ignores quality and uses resizing for size targets. Lossless PNG encoding does not mean resizing is lossless.
- JPEG fills transparency with white.
- If the original is smaller than a same-format, same-dimension result and meets the target, the original is retained byte for byte.
- Explicit format conversion can create larger files; the result labels show this.
- Re-encoding removes EXIF/GPS and may alter color profiles. Unchanged originals retain metadata. This is not a guaranteed metadata scrubber.
- Still JPEG/PNG/WebP only. Animated PNG/WebP are rejected. No GIF, SVG, HEIC, AVIF or RAW support.
- Limits: 50 files, 30 MB each, 150 MB per input batch, 24 megapixels and 12,000 px per side. Processing is sequential. Browser decoding still consumes memory; use smaller batches on phones.
- Stop batch stops between encoding operations and preserves completed downloads.
- ZIP uses STORE mode because images are already compressed.
- Current Chrome, Edge, Firefox and Safari are intended browsers. Unsupported encoders produce a visible error.
- No external dependencies, fonts, tracking, CDN requests or image uploads.


## Release checks

- Batch photos and transparent PNGs; test default, JPEG, WebP and PNG.
- Test 100 KB and custom targets; successful files must be strictly below the target.
- Check full-size output quality, preview and JPEG white background.
- Check original fallback with an already optimized file.
- Extract a ZIP with duplicate basenames and confirm unique entries.
- Reject corrupt images, animation, unsupported files and invalid custom values.
- Stop a running batch; completed files remain downloadable.
- Check mobile layout, keyboard navigation, mute and achievement notification.

## Hosting and privacy

Static hosting only: no backend or secrets. Filenames are rendered as text, never HTML. File signatures and decoding are checked as well as filename extensions.

## Validation performed

JavaScript syntax, DOM control IDs and local asset paths passed checks.
Direct encoder checks passed strict 100 KB targets for JPEG, WebP and PNG, plus original fallback, invalid-signature rejection and cancellation.
Generated ZIPs passed extraction, CRC and Unicode filename checks.
These encoder checks used a canvas adapter, not a browser. A browser runtime could not be installed in the build environment, so visual/mobile and full browser interaction checks remain to be performed using the release checklist above.
