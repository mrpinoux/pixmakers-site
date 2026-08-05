# Pixmakers Factory — website

Static site. Plain HTML, CSS and JavaScript. No build step, no dependencies,
no framework. Edit a file, refresh the browser. English only.

## Run it locally

```bash
python -m http.server 4173
```

Then open <http://localhost:4173>. (Opening the `.html` files directly with
`file://` also works — every internal path is relative.)

## Pages

| File | Page | Videos |
| --- | --- | --- |
| `index.html` | Home | 6 |
| `directors.html` | Directors index | — |
| `director-mr-pinoux.html` | Mr. Pinoux | 37 |
| `director-ariles-de-tizi.html` | Arilès De Tizi | 0 |
| `director-chris-cuseo.html` | Chris Cuseo | 3 |
| `director-lordface.html` | LordFace | 6 |
| `backstage.html` | Backstage index | — |
| `backstage-fabric-london.html` | Post: Fabric London | — |
| `backstage-elle-bts.html` | Post: Elle — BTS | — |
| `contact.html` | Contact | — |

Each page is fully self-contained: header, content, footer. There are no
includes, so a change to the nav or footer has to be repeated across the ten
files. That is the trade for having zero build tooling.

**Running order.** The work grids follow the same order as the current site,
newest first. It is manual — the `01`, `02` numerals are written into the
markup, so inserting a project means renumbering the ones after it.

## Design

The look is a film press kit / contact sheet.

- **Colour** — near-black `#0b0b0b` and paper `#f2f2f0`, with a single accent.
  The chassis is monochrome on purpose so the work supplies all the colour.
- **Type** — Archivo (variable, pushed to the expanded width axis) for display,
  Space Mono for credits, nav and metadata.
- **Interaction** — thumbnails sit desaturated and snap to full colour on
  hover; rows and buttons invert to an accent fill.

### Accent switcher

Four accents ship, switchable from the swatches in the masthead: **pink**
(default), **red**, **blue**, **acid yellow**. The choice is remembered in
`localStorage`, and `?accent=blue` forces one for a shared link.

To change or add one, edit two places:

```css
/* assets/css/site.css */
html[data-accent="pink"] { --accent: #ff2e88; --accent-ink: #cf005f; }
```

```js
/* assets/js/site.js */
var ACCENTS = [ { id: "pink", swatch: "#ff2e88", label: "Pink" }, … ];
```

`--accent` is the fill and large-type colour; `--accent-ink` is a darker cut
for small text on the paper background. `--on-accent` is the text colour used
*on top of* an accent fill — it flips to near-black for acid yellow, which is
far too light to carry white text.

To lock the site to one colour, delete the `ACCENTS` entries you don't want.
With a single entry the swatch row disappears on its own.

## The contact form

`contact.html` posts to [Web3Forms](https://web3forms.com), which keeps the
site fully static. **It is wired and tested** — a live submission was
delivered on setup.

It uses the **same access key as mr-pinoux.com and roofboy.com**. The key sits
in `assets/js/site.js` and is public by design: it only permits posting to the
one address it is bound to, and it already ships in the other two sites'
client-side JavaScript.

```js
var WEB3FORMS_KEY = "c5da04d4-…";
```

**Where the mail lands.** That key delivers to **mr.pinoux@gmail.com** — not to
pixmakers.factory@gmail.com, which is the address shown in the footer and on
the contact page. Submissions are prefixed `[PIXMAKERS]` so they filter apart
from the other sites' `[GUESTBOOK]` and `[BOOKING]`.

To send them to the Pixmakers inbox instead, create a second key at
<https://app.web3forms.com/forms/> with that destination and swap it in. One
line, no other change.

The hidden `website` field is a honeypot. People never see it; bots fill it in
and the submission is dropped silently.

## Adding a project

Work tiles are plain static markup. Copy an existing `<a class="work">` block
inside any `<div class="sheet">` and change four things: the `href`, the
`data-video`, the two image URLs, and the title/client text.

```html
<a class="work" href="https://www.youtube.com/watch?v=VIDEOID"
   target="_blank" rel="noopener">
  <span class="work__media" data-video="youtube:VIDEOID">
    <img src="https://i.ytimg.com/vi/VIDEOID/maxresdefault.jpg"
         data-fallback="https://i.ytimg.com/vi/VIDEOID/hqdefault.jpg"
         alt="" loading="lazy" width="1280" height="720">
  </span>
  <span class="work__line">
    <span class="num">01</span>
    <span class="work__title">Project title</span>
  </span>
  <span class="work__client">Artist / Format</span>
</a>
```

`data-video` opens the clip in a lightbox without leaving the page; it accepts
`youtube:ID` or `vimeo:123456789`. The `href` is the fallback for anyone
without JS. Drop `data-video` and the tile becomes a plain link.

### About the thumbnails

Nothing is downloaded — thumbnails come straight from YouTube's CDN, so a new
project needs no image files at all.

`maxresdefault.jpg` is the sharp 1280×720 version, but YouTube only generates
it for some uploads. When it is missing YouTube does **not** return a 404; it
serves a 120×90 grey placeholder with HTTP 200. `site.js` therefore checks the
decoded width and swaps to `data-fallback` (`hqdefault.jpg`, always present)
when the image comes back that small. Keep both URLs on every tile.

## Images

The work grids need no files. These are still referenced and will show a
diagonal-rule placeholder until you add them:

```
assets/img/favicon.svg                 the mark: three pixels of four
assets/img/favicon.ico                 16/32/48/64 in one file
assets/img/apple-touch-icon.png        180x180, iOS home screen
assets/img/icon-512.png                512x512, Android
assets/img/og.jpg                      1200x630 social card
assets/img/directors/mrpinoux.jpg      portraits, 4:5
assets/img/directors/ariles.jpg
assets/img/directors/cuseo.jpg
assets/img/directors/lordface.jpg
assets/img/backstage/fabric/01-08.jpg  post photos
assets/img/backstage/elle/01-09.jpg
```

The portraits appear twice: as the strip beside the Directors heading, and on
each director's own page.

`site.js` removes any framed image that fails to load, so a missing file shows
the placeholder rather than a broken-image icon. The site looks intentional
while it is still being filled in.

The hero runs on the diagonal-rule texture alone — no image. To use a still,
put an `<img>` inside `.hero__bg` in `index.html`.

## Backstage posts

`backstage.html` is a two-column card grid. Each card links to its own article
page. To add one: copy the commented `<a class="card">` block in
`backstage.html`, then duplicate `backstage-fabric-london.html` as the page it
points to. Photos go in `assets/img/backstage/<post-slug>/`.

The two existing posts were recovered from the current site, text and photos.
**Their copy is in French** — 2013 diary entries in the author's own voice —
while the rest of the site is English. Left as-is deliberately; say the word if
you want them translated.

## Office clocks

The footer carries live analog clocks, one per office. They are generated by
`site.js` from a single list:

```js
var CLOCKS = [
  { city: "Los Angeles", tz: "America/Los_Angeles" },
  { city: "Paris",       tz: "Europe/Paris" }
];
```

Add New York by adding `{ city: "New York", tz: "America/New_York" }`. Times
come from `Intl.DateTimeFormat` with an IANA zone, so daylight saving is
handled for you — there are no hardcoded offsets.

The second hand is the one accent-coloured moving element on the page, so it
follows the accent switcher. Under `prefers-reduced-motion` the second hand is
hidden and the clock updates every 30 seconds instead of every second.

## Going live (replacing the Google Site)

Same route as mr-pinoux.com and roofboy.com: Git → Cloudflare Pages. The one
extra step is that **pixmakers.com is not on Cloudflare yet** — it sits at OVH
and still points at Google.

Where it stands today:

| Record | Value | What it is |
| --- | --- | --- |
| Nameservers | `ns14.ovh.net`, `dns14.ovh.net` | DNS managed at OVH |
| `www` CNAME | `ghs.googlehosted.com` | Google Sites |
| apex `A` | `213.186.33.87` | OVH, redirecting to the Google Site |

### 1. Repo

This folder is not a Git repo yet.

```bash
git init && git add -A && git commit -m "Pixmakers Factory site"
```

Push it to GitHub, same as the other two.

### 2. Cloudflare Pages project

Pages → Create → Connect to Git → pick the repo. **No build command, no build
output directory** — it is plain static files, so leave both empty and set the
root to `/`. First deploy gives you `pixmakers.pages.dev`.

### 3. Check the preview URL properly

Every page, a video in the lightbox, the contact form, a post switched to FR,
and the site on a phone. Fix on the preview, not on the live domain.

### 4. Move pixmakers.com onto Cloudflare

Cloudflare → Add domain → `pixmakers.com`. It will scan the existing OVH
records and hand you two nameservers.

At **OVH → pixmakers.com → DNS servers**, replace `ns14.ovh.net` and
`dns14.ovh.net` with the Cloudflare pair. This takes anywhere from minutes to
a few hours to take effect.

Note this moves *all* DNS for the domain, including MX records. If any email
runs on pixmakers.com, confirm the MX entries came across in Cloudflare's scan
before you switch — that is the one thing that bites people here.

### 5. Release the domain from Google Sites

Google Sites → Publish → Manage → Custom domains → remove `pixmakers.com`.

Do this **before** pointing the domain at Pages. Leave it and Google keeps
serving a certificate for a domain it no longer answers for, which shows
visitors an HTTPS warning.

### 6. Attach the domain to Pages

Pages project → Custom domains → add `pixmakers.com` and `www.pixmakers.com`.
Cloudflare writes the records and issues the certificate itself. Delete the
leftover Google records: the `www` CNAME to `ghs.googlehosted.com` and the
apex `A` to `213.186.33.87`.

### 7. After launch

- Test an old link: `pixmakers.com/randomz/2016-fabric` must land on the Fabric
  post. That is what `_redirects` is for — Cloudflare Pages reads it as-is.
- Submit `https://pixmakers.com/sitemap.xml` in Google Search Console.
- Only then delete the Google Site.

### Old URLs kept alive

`_redirects` maps all ten with 301s, so existing links and search rankings
carry over instead of 404ing:

```
/home                     -> /
/directors                -> /directors.html
/directors/mr-pinoux      -> /director-mr-pinoux.html
/directors/ariles-de-tizi -> /director-ariles-de-tizi.html
/directors/chris-cuseo    -> /director-chris-cuseo.html
/directors/lordface       -> /director-lordface.html
/randomz                  -> /backstage.html
/randomz/2016-fabric      -> /backstage-fabric-london.html
/randomz/elle-bts         -> /backstage-elle-bts.html
/contact                  -> /contact.html
```

## Before you launch

- [x] Web3Forms key wired and tested — delivers to mr.pinoux@gmail.com
- [x] Backstage cues and captions reviewed
- [x] `pixmakers.factory@gmail.com` stays public
- [ ] Decide whether form mail should go to the Pixmakers inbox rather than the
      personal one (second Web3Forms key, one line to swap)

## Notes on content

- **All 46 videos** were taken from the current site's embeds. Titles were
  cleaned up from the raw upload names — "SETH GUEKO - PATATE 2 FORRAIN
  [official video by Pixmakers]" became **Patate 2 Forrain** / *Seth Gueko*.
  Worth a read-through; a few working titles were guesses (`Dayclub`,
  `Nightclub`, `Rdv10h` come from filenames like "DAYCLUB v3 bkup09 8bits
  dec2013").
- **Arilès De Tizi has no work section.** The current site lists no videos on
  his page. Rather than show an empty grid, the section is omitted — there is a
  comment in the file explaining how to add it back.
- **LordFace's bio.** The current live site shows Mr. Pinoux's biography on
  LordFace's page by mistake. This build uses LordFace's own text from the
  directors index instead. It is shorter than the others — worth expanding.
- **The email address** `pixmakers.factory@gmail.com` appears in the footer and
  on the contact page. The old site listed no email at all, so remove it if it
  is not meant to be public.
- **Phone numbers** are carried over verbatim from the current contact page.
