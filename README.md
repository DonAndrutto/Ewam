# Ewam
A digital edition of Ewam Collection of Liturgies, used at Gangteng monastery and its branches, Pema Lingpa Lineage, under the patronage of Gangteng Tulku Rinpoche

The supplied Ewam artwork is embedded in the HTML, so icons and the entrance work
when opening the file directly. The entrance uses the original portrait or landscape
composition, with a brief reveal. Tap, click, Enter, or Space proceeds immediately;
reduced-motion preferences show the finished artwork without animation.

Original JPEGs and resized browser, Apple, and app icons live in `assets/branding/`.
Run `node scripts/generate-branding.cjs` with `sharp` available to regenerate the
embedded assets after changing the source artwork. Lettering and original compositions
are preserved; the Android maskable icon has extra margin around the emblem.

The page icon between **+** and **Fullscreen** switches between scrolling and page turning. Pages use native text columns without animation, keep whole lines, and reflow in portrait or landscape. Turn pages with the arrows, left/right edge taps, arrow keys, Page Up/Down, or Space / Shift+Space. Text resizing retains your place; index links and search open the corresponding page. The mode preference is saved locally.

Fullscreen hides the header and bottom controls except its exit icon. Edge taps and keyboard page turns remain available. The up arrow returns to the current title's beginning; repeated taps step backward through titles.

To run browser regression checks, install the development dependencies with `npm install`, install Chromium with `npx playwright install chromium`, and run `npm test`. Set `EWAM_BROWSER_PATH` to a Chrome executable to use an installed browser instead. The checks cover rendered line boundaries in both volumes, portrait and landscape, large text, toolbar alignment, navigation, fullscreen, and the saved mode. Screenshots are written to `test-results/`.
