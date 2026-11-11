# Aniko's website

The site for [Aniko](https://github.com/v0-0x/Aniko): what it does, where to download it, and where to send feedback.

It's plain HTML, CSS and JavaScript. There is nothing to build and nothing to install.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: the pitch, the app drawn in CSS, the theme picker, questions |
| `features.html` | Every feature, by area |
| `download.html` | Downloads for each system, the first steps, recent releases |
| `feedback.html` | The feedback form and the list of what people have asked for |
| `404.html` | Shown for addresses that don't exist |
| `assets/site.css` | All the styles, in Aniko 3.0's Glass look. The colours are Aniko's own eight themes |
| `assets/site.js` | Themes, the phone menu, downloads, feedback, and the small motions (the app's banner moving on, the light under the pointer) |
| `assets/fx.js` | The background: drifting sparks, a shooting one now and then, and each holiday's animation |
| `assets/icons.svg` | The icons and the Aniko wordmark |

The header and footer are repeated in each page, so a change to one goes in all five.

## Putting it online

Any static host works. On Cloudflare Pages: connect this repository, leave the build command empty and set the output folder to `/`. On GitHub Pages: Settings › Pages, deploy from the branch's root.

To look at it on your own computer:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening the files directly (`file://`) won't show the icons.

## How the live parts work

- **Downloads and releases** come from GitHub's public API for `v0-0x/Aniko`. The newest release that isn't a pre-release is "stable"; the switch on the download page shows the newest beta instead. If GitHub can't be reached, the buttons link to the releases page.
- **Feedback** has no server. The form opens a new GitHub issue with the text filled in, titled `[Problem]`, `[Idea]` or `[Like]`. "Copy as text" is there for people without a GitHub account.
- **What people have asked for** lists the repository's open issues, most thumbs up first.

The site sets no cookies and loads nothing from anywhere else. The chosen theme is remembered in the browser.

## The background

Behind the page, three soft lights in the theme's colour drift slowly (CSS only), and `assets/fx.js` draws sparks shaped like the one in the logo on a canvas. Picking a holiday on the home page plays its animation too: fireworks, hearts, petals, fireflies, bats or snow. It pauses while the tab is hidden, stands still for visitors whose system asks for less motion, and the switch in the footer turns it off.

## Things to change

At the top of `assets/site.js`:

- `REPO`: the repository that releases and feedback come from.
- `DISCORD_URL`: paste an invite link to show a "Post in Discord" button on the feedback page.

The link preview image (`assets/og.png`) is given as a relative address. Once the site has a domain, put the full address in each page's `og:image` so every app shows it.

## Credits

Inter is by The Inter Project Authors, under the SIL Open Font License (`assets/fonts/OFL.txt`). The shows in the pictures are made up.
