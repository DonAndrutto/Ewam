# Ewam

One installable reader for the E and Wam volumes of liturgies used at Gangteng
Monastery and its branches in the Pema Lingpa lineage, and the Sangag Choling
Prayer Collection. Both use the same typography, themes and reading controls.

The Prayer Collection contains the prayer body from the corrected v3 edition
of the 2021 prayer book: 159 texts under 12 chapter headings. The front matter
and printed contents pages are omitted. Its complete Tibetan title appears
before the first prayer. Source characters, paragraph order and smaller
instruction runs are retained. Source files outside this repo are not modified.

## Reading

On the first visit, the original Ewam artwork leads to a choice of **E Wam**
or **Prayer Collection**. Returning readers open directly at their saved place.
The arrow beside the title and the collection buttons in the **Index** both
switch collections. E and Wam remain separate volumes within E Wam.
Each collection remembers its own source character and volume, so switching,
reopening, resizing and rotating can restore the reading position.

The page icon between **+** and **Fullscreen** switches between scrolling and
page turning. Pages use native columns, keep whole lines and reflow in portrait
or landscape. Turn pages with arrows, left/right edge taps, keyboard arrows,
Page Up/Down, or Space / Shift+Space. Index and search navigate to the right page.
In page mode, swipe left for the next page and right for the previous page.
Pinch inward to decrease the text size by 1, or spread two fingers to increase
it by 1, once per gesture in page mode, retaining the reading position.
All custom touch gesture handlers are removed in scroll mode to keep scrolling
native. Use the toolbar controls to resize text in scroll mode.
Search covers the active collection (both E and Wam when E Wam is selected).

Fullscreen hides the header and controls except its exit icon. Edge taps and
keyboard page turns remain available. The up arrow returns to the current
text's beginning; repeated taps step backward through texts.

## Install and offline use

Deploy the repository root through the existing GitHub Pages setup. There is no
framework build, backend, or second deployment. The web manifest uses relative
paths, so the app continues to work at `/Ewam/` and under a custom domain.
Use your browser's **Install app** or **Add to Home Screen** option.

The first connected visit automatically caches both collections, all fonts,
reader code, and branding. The Index reports when both collections are available
offline. Offline reopening and collection switching work after that download.
Browser settings or storage eviction can remove saved positions and offline files.

A new service worker downloads a complete version before installing. An open
reader keeps its current edition; close all app tabs/windows and reopen to
activate an update. Caches are isolated to this app's deployment scope.

## Files and maintenance

- `index.html`: existing layout and styles, responsive entrance and app shell.
- `app.js`: shared reader, page layout, navigation, index, search and help.
- `collections.js` / `collections.css`: collection picker and saved positions.
- `gestures.js`: shared swipe and pinch handling, ready for the other readers.
- `content/ewam.js`: original E/Wam data, lettering images and contents links.
- `content/prayers.js`: generated prayer data, source metadata and stable IDs.
- `assets/fonts/`: local versions of the original Google Fonts and OFL notices.
- `manifest.webmanifest` / `sw.js`: installation and versioned offline cache.

To regenerate the prayer collection from the corrected Word document:

```sh
python3 scripts/import-prayers.py /path/to/sangag-choling-choechey-2021-corrected-v3.docx
```

The importer verifies that every prayer character remains in source order.
The first chapter marks the body boundary; future front-matter support can be
added without changing the existing paragraph identifiers.

To refresh fonts (requires network access):

```sh
python3 scripts/vendor-fonts.py
```

The original branding JPEGs and resized icons live in `assets/branding/`.
Run `node scripts/generate-branding.cjs` with `sharp` available to regenerate
icons and update markup after changing the source artwork. Lettering and
compositions are preserved; the maskable icon leaves margin around the emblem.

After **any change to shipped files**, regenerate the offline cache version:

```sh
npm run build
```

This only updates `sw.js`; Pages serves the committed static files directly.

## Development and verification

```sh
npm install
npx playwright install chromium
npm run dev
npm test
```

The preview serves the app at `http://127.0.0.1:4173/Ewam/`. Set
`EWAM_BROWSER_PATH` to a Chrome executable to use an installed browser instead.
Checks cover E/Wam line boundaries and reader controls, both collection pickers,
independent scroll/page bookmarks, reloading, keyboard navigation, prayer search,
phone/landscape layouts, and offline reopening/switching under a project path.
Screenshots are written to `test-results/`.
