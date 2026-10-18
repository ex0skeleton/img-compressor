# Image Wiz

Private static batch image compression with a dark glass interface and Sonic Arcade sounds.

## Start locally

Open this folder in VS Code. Use Live Server → Go Live, or run:

    python -m http.server 5500

Visit http://localhost:5500. No npm install or build required.

## Project structure

    Image-Wiz/
      index.html
      css/styles.css
      js/app.js
      js/compressor.js
      js/zip.js
      js/sounds.js
      assets/favicon.svg
      README.md
      .nojekyll
      .gitignore

app.js handles queue, validation, progress, cancellation, previews and downloads.
compressor.js handles encoding, measured quality search, resizing and original-file fallback.
zip.js creates standard ZIPs with CRC-32 and UTF-8 filenames, with no dependencies.
sounds.js reuses the supplied Sonic Arcade synthesizer.

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

## Sounds

Button clicks use Toggle On; errors use Validation Error; completion uses Achievement Unlocked.
The mute switch persists locally. Web Audio starts after user interaction; browser audio rules may suppress sounds without affecting compression.

## Push to GitHub

1. Extract the ZIP and open the Image-Wiz folder itself in VS Code.
2. Open Terminal → New Terminal, then run:

       git init
       git add .
       git commit -m "Build Image Wiz batch compressor"
       git branch -M main

3. Create an empty GitHub repository called Image-Wiz. Leave README, license and gitignore unchecked.
4. Replace YOUR-USERNAME below and run:

       git remote add origin https://github.com/YOUR-USERNAME/Image-Wiz.git
       git push -u origin main

5. GitHub → Settings → Pages → Deploy from a branch → main → / (root) → Save.
6. The site will be at https://YOUR-USERNAME.github.io/Image-Wiz/ when deployment finishes.

Future updates:

    git add .
    git commit -m "Describe your change"
    git push

Before sharing publicly, add your actual deployment URL as og:url and a canonical link in index.html. Add an absolute og:image URL to your own social-preview image if desired. Relative asset paths already work on GitHub Pages.

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

## Premium UI and editor update

The interface now uses the supplied Premium Dark Orange reference palette and its locally bundled Poppins and Inter font files. Orange action buttons have white text. The dot background remains fixed while scrolling. Decorative hero, feature and footer sections have been removed.

After adding images, the drop area is hidden and Add more images appears beside Clear all. Click a thumbnail for the in-page editor. Desktop settings remain alongside the canvas. On narrow screens, controls stack below the canvas.

Live result re-encodes the selected image after a short debounce. Older preview jobs are cancelled when settings change, selection changes or batch processing starts. Global settings invalidate previous outputs; run Compress images to apply them to the entire batch. Crop is stored separately for each image. Crop changes invalidate only that image.

Output resolution offers original dimensions, 1200 × 1200, 1920 × 1080, 1080 × 1920 and custom width/height. Fill produces the exact requested dimensions with center cropping. Fit inside preserves proportions within those dimensions. Stretch uses exact dimensions and changes proportions. Size targets can reduce the final dimensions.

Crop mode displays the original. Drag a rectangle using a mouse or touch, or use the X/Y/width/height pixel fields. Apply crop commits the selection and updates the live result. Reset crop restores the full source. There are no movable Photoshop-style edge handles; drag a new rectangle to change the selection.

The circular question mark opens useful instructions and limitations. Completion messages say your files are ready to download. The original completion sound is retained.

Additional encoder checks passed exact 1200 × 1200 output, proportional fit, stretching, pixel-accurate cropping, invalid crop rejection and output dimension safety. Full browser interaction and visual testing remain unverified in this environment.
