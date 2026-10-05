// Keep the reader self-contained. Source artwork is preserved verbatim;
// only the launch icons are resized, without changing the lettering.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets/branding');
const dataURL = (type, bytes) => `data:image/${type};base64,${bytes.toString('base64')}`;

async function main() {
  const source = path.join(assets, 'icon-source.jpg');
  const icons = {};
  for (const size of [32, 180, 192, 512]) {
    const bytes = await sharp(source).resize(size, size).png().toBuffer();
    fs.writeFileSync(path.join(assets, `icon-${size}.png`), bytes);
    icons[size] = dataURL('png', bytes);
  }
  // Extra margin keeps the complete emblem within Android's circular safe zone.
  const inset = await sharp(source).resize(410, 410).png().toBuffer();
  const maskable = await sharp({create:{width:512,height:512,channels:3,background:'#080e18'}})
    .composite([{input:inset,left:51,top:51}]).png().toBuffer();
  fs.writeFileSync(path.join(assets, 'icon-maskable-512.png'), maskable);
  const head = `<!-- EWAM_BRANDING_HEAD_START -->
  <link rel="icon" type="image/png" sizes="32x32" href="${icons[32]}" />
  <link rel="apple-touch-icon" sizes="180x180" href="${icons[180]}" />
  <!-- EWAM_BRANDING_HEAD_END -->`;
  const portrait = dataURL('jpeg', fs.readFileSync(path.join(assets, 'entrance-portrait.jpg')));
  const landscape = dataURL('jpeg', fs.readFileSync(path.join(assets, 'entrance-landscape.jpg')));
  const entrance = `<!-- EWAM_BRANDING_ENTRANCE_START -->
      <picture class="ewam-entrance-art" aria-hidden="true">
        <source media="(orientation: landscape)" srcset="${landscape}" />
        <img src="${portrait}" alt="" width="720" height="1280" decoding="sync" fetchpriority="high" draggable="false" />
      </picture>
      <span class="yk-enter-hint" data-i18n="loaderHint">Tap or press Enter</span>
      <!-- EWAM_BRANDING_ENTRANCE_END -->`;
  const manifest = `/* EWAM_BRANDING_MANIFEST_START */
    const manifest = {name:"Ewam Collection",short_name:"Ewam Collection",id:base,start_url:base,scope:base,display:"standalone",background_color:"#080e18",theme_color:"#080e18",icons:${JSON.stringify([
      {src:icons[192],sizes:'192x192',type:'image/png',purpose:'any'},
      {src:icons[512],sizes:'512x512',type:'image/png',purpose:'any'},
      {src:dataURL('png',maskable),sizes:'512x512',type:'image/png',purpose:'maskable'}
    ])}};
    /* EWAM_BRANDING_MANIFEST_END */`;
  const targets = process.argv.slice(2);
  for (const file of targets.length ? targets : [path.join(root, 'index.html')]) {
    let html = fs.readFileSync(file, 'utf8');
    for (const [pattern, replacement] of [
      [/<!-- EWAM_BRANDING_HEAD_START -->[\s\S]*?<!-- EWAM_BRANDING_HEAD_END -->/, head],
      [/<!-- EWAM_BRANDING_ENTRANCE_START -->[\s\S]*?<!-- EWAM_BRANDING_ENTRANCE_END -->/, entrance],
      [/\/\* EWAM_BRANDING_MANIFEST_START \*\/[\s\S]*?\/\* EWAM_BRANDING_MANIFEST_END \*\//, manifest]
    ]) {
      if (!pattern.test(html)) throw new Error(`Missing branding marker in ${file}`);
      html = html.replace(pattern, () => replacement);
    }
    fs.writeFileSync(file, html);
    console.log(`Embedded Ewam artwork in ${file}`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
