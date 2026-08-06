/* ==========================================================================
   PIXMAKERS FACTORY — site.js
   Contact form, office clocks, mobile nav, video lightbox. No build step.
   ========================================================================== */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---- Mobile nav -------------------------------------------------------- */

  var bar = document.querySelector(".bar");
  var burger = document.querySelector(".burger");

  if (bar && burger) {
    burger.addEventListener("click", function () {
      var open = bar.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    bar.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        bar.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Lightbox ------------------------------------------------------------ *
   * One overlay, two payloads.
   *
   * Video — data-video="youtube:dQw4w9WgXcQ" or "vimeo:123456789" on the tile
   * link. Clips play on the site, on black, instead of sending anyone to
   * YouTube.
   *
   * Photo — data-shot on a link whose href is the full-size file. Every
   * [data-shot] on the page forms one set, so the arrows and the ← → keys walk
   * the whole gallery without reopening. The set is read at click time, not at
   * load, so nothing breaks if the markup is generated later.
   *
   * In both cases the href stays as the fallback for no-JS and middle-click.
   * -------------------------------------------------------------------------- */

  var lb, lbFrame, lastFocus;
  var shots = [], shotAt = -1;

  function embedUrl(spec) {
    var parts = String(spec).split(":");
    var host = parts[0], id = parts[1];
    if (!id) return null;
    if (host === "youtube") return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
    if (host === "vimeo")   return "https://player.vimeo.com/video/" + encodeURIComponent(id) + "?autoplay=1&title=0&byline=0&portrait=0";
    return null;
  }

  function buildLightbox() {
    lb = document.createElement("div");
    lb.className = "lb";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML =
      '<button class="lb__close" type="button" aria-label="Close"></button>' +
      '<button class="lb__nav lb__nav--prev" type="button" aria-label="Previous photo"></button>' +
      '<button class="lb__nav lb__nav--next" type="button" aria-label="Next photo"></button>' +
      '<div class="lb__frame"></div>' +
      '<p class="lb__count" aria-live="polite"></p>';
    lbFrame = lb.querySelector(".lb__frame");
    document.body.appendChild(lb);

    lb.addEventListener("click", function (e) {
      if (e.target.closest(".lb__nav--prev")) { stepPhoto(-1); return; }
      if (e.target.closest(".lb__nav--next")) { stepPhoto(1);  return; }
      // The frame spans the overlay in photo mode, so the black beside a
      // portrait shot is the frame, not .lb — it has to close too.
      if (e.target === lb || e.target === lbFrame || e.target.closest(".lb__close")) closeLightbox();
    });
  }

  function openLightbox(url) {
    if (!lb) buildLightbox();
    lastFocus = document.activeElement;
    lb.setAttribute("aria-label", "Video player");
    lbFrame.innerHTML =
      '<iframe src="' + url + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    lb.classList.add("is-on");
    document.body.style.overflow = "hidden";
    lb.querySelector(".lb__close").focus();
  }

  function openPhoto(i) {
    if (!lb) buildLightbox();
    if (!shots[i]) return;
    var first = shotAt < 0;
    if (first) lastFocus = document.activeElement;
    shotAt = i;

    var a = shots[i];
    var cap = a.getAttribute("data-caption") || "";
    lb.setAttribute("aria-label", "Photo viewer");
    lb.classList.add("lb--photo", "is-on");
    lbFrame.innerHTML =
      '<img src="' + a.getAttribute("href") + '" alt="' + cap.replace(/"/g, "&quot;") + '">';

    // The CSS wants a per-photo ceiling: 175% of the file's real width. Hidden
    // until it is known, so nothing renders at the wrong size for a frame —
    // the neighbours are already warm, so this is normally imperceptible.
    var img = lbFrame.querySelector("img");
    img.style.visibility = "hidden";
    function sizeShot() {
      if (img.naturalWidth) {
        img.style.setProperty("--shot-cap", Math.round(img.naturalWidth * 1.75) + "px");
      }
      img.style.visibility = "";
    }
    if (img.complete) sizeShot();
    else img.addEventListener("load", sizeShot, { once: true });

    lb.querySelector(".lb__count").textContent = (i + 1) + " / " + shots.length;
    document.body.style.overflow = "hidden";
    // Only on the way in — stealing focus on every step would fight the arrows.
    if (first) lb.querySelector(".lb__close").focus();

    // Warm the neighbours so stepping is instant.
    [i - 1, i + 1].forEach(function (j) {
      if (shots[j]) { var p = new Image(); p.src = shots[j].getAttribute("href"); }
    });
  }

  function stepPhoto(d) {
    if (shotAt < 0 || !shots.length) return;
    openPhoto((shotAt + d + shots.length) % shots.length);   // wraps both ways
  }

  function closeLightbox() {
    if (!lb || !lb.classList.contains("is-on")) return;
    lb.classList.remove("is-on", "lb--photo");
    lbFrame.innerHTML = "";          // stops playback
    shotAt = -1;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var shot = e.target.closest("[data-shot]");
    if (shot) {
      shots = [].slice.call(document.querySelectorAll("[data-shot]"));
      var i = shots.indexOf(shot);
      if (i < 0) return;             // not in the set — let the link behave normally
      e.preventDefault();
      openPhoto(i);
      return;
    }
    var trigger = e.target.closest("[data-video]");
    if (!trigger) return;
    var url = embedUrl(trigger.getAttribute("data-video"));
    if (!url) return;                // no id yet — let the link behave normally
    e.preventDefault();
    openLightbox(url);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeLightbox(); return; }
    if (shotAt < 0) return;          // arrows only mean something in a gallery
    if (e.key === "ArrowLeft")  { e.preventDefault(); stepPhoto(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); stepPhoto(1); }
  });

  /* ---- Post language switch ------------------------------------------------ *
   * Backstage posts are French originals with an English translation beside
   * them. Only the article body swaps; the rest of the page stays English.
   * -------------------------------------------------------------------------- */

  (function wirePostLang() {
    var art = document.querySelector(".mag[data-lang]");
    var box = document.querySelector("[data-postlang]");
    if (!art || !box) return;

    box.className = "postlang";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Article language");
    box.innerHTML =
      '<button type="button" data-pl="en">EN</button>' +
      '<button type="button" data-pl="fr">FR</button>';

    function set(lang) {
      if (lang !== "fr") lang = "en";
      art.setAttribute("data-lang", lang);
      box.querySelectorAll("[data-pl]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-pl") === lang));
      });
      try { localStorage.setItem("pxm-post-lang", lang); } catch (e) { /* ignore */ }
    }

    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pl]");
      if (b) set(b.getAttribute("data-pl"));
    });

    var saved;
    try { saved = localStorage.getItem("pxm-post-lang"); } catch (e) { /* ignore */ }
    set(saved || art.getAttribute("data-lang"));
  })();

  /* ---- Contact form -------------------------------------------------------- *
   * Posts to Web3Forms, so the site stays static — no backend, no PHP.
   *
   * Same access key as mr-pinoux.com and roofboy.com — all three deliver to
   * the same inbox. The key is public by design: it only allows posting to
   * the address it is bound to, and it already ships in the other two sites'
   * client-side JS.
   *
   * Submissions are prefixed [PIXMAKERS] so they can be filtered apart from
   * the other sites, which use [GUESTBOOK], [BOOKING] and their own subjects.
   * -------------------------------------------------------------------------- */

  var WEB3FORMS_KEY = "c5da04d4-3f52-4071-b9f4-6379e127cae7";

  function wireContactForm() {
    var form = document.querySelector("#contactForm");
    if (!form) return;

    var status = form.querySelector(".cf-status");
    var btn = form.querySelector(".cf-submit");

    /* Look fields up explicitly. `form.name` is NOT the field named "name" —
       HTMLFormElement has its own `name` IDL attribute, which shadows the
       named-control getter and returns a string, so `form.name.value` throws. */
    function field(n) { return form.querySelector('[name="' + n + '"]'); }

    function say(msg, kind) {
      status.textContent = msg;
      status.className = "cf-status" + (kind ? " " + kind : "");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = field("name").value.trim();
      var email = field("email").value.trim();
      var message = field("message").value.trim();

      if (field("website").value) return;  // honeypot filled -> bot, drop silently

      if (!message || (!name && !email)) {
        say("Please add a message and your name or email.", "err");
        return;
      }
      if (!WEB3FORMS_KEY) {
        say("Form not configured yet — email us directly.", "err");
        return;
      }

      btn.disabled = true;
      say("Sending…");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: "[PIXMAKERS] New message from pixmakers.com",
          from_name: "pixmakers.com",
          name: name || "(no name given)",
          email: email || "noreply@pixmakers.com",
          message: message
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success) {
            form.reset();
            say("Thanks — your message was sent.", "ok");
          } else {
            say("Something went wrong. Please try again.", "err");
          }
        })
        .catch(function () { say("Network error. Please try again.", "err"); })
        .then(function () { btn.disabled = false; });
    });
  }

  wireContactForm();

  /* ---- Office clocks ------------------------------------------------------ *
   * Analog SVG clocks in the footer, one per office. Add a city by adding a
   * row here — the markup is generated.
   * -------------------------------------------------------------------------- */

  // West to east. The label is free text; the tz must be an IANA zone name,
  // which is what keeps daylight saving right without a table to maintain.
  // tint colours the second hand and the centre cap, so each office reads at a
  // glance. Los Angeles keeps the site accent; the rest are the only places on
  // the site allowed a second colour.
  var CLOCKS = [
    { city: "Los Angeles", tz: "America/Los_Angeles", tint: "#ff2e88" },
    { city: "New York",    tz: "America/New_York",    tint: "#3ddcff" },
    { city: "Paris",       tz: "Europe/Paris",        tint: "#ffc247" },
    { city: "Bangkok",     tz: "Asia/Bangkok",        tint: "#7cf03d" }
  ];

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clockFace() {
    var ticks = "";
    for (var i = 0; i < 60; i++) {
      var maj = i % 5 === 0;
      ticks +=
        '<line class="clk-tick' + (maj ? " maj" : "") + '"' +
        ' x1="50" y1="' + (maj ? 5 : 7) + '" x2="50" y2="' + (maj ? 11 : 9) + '"' +
        ' transform="rotate(' + i * 6 + ' 50 50)"></line>';
    }
    return '<svg class="clk-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
             '<circle class="clk-ring" cx="50" cy="50" r="47"></circle>' + ticks +
             '<line class="clk-h hour" x1="50" y1="50" x2="50" y2="30"></line>' +
             '<line class="clk-h min"  x1="50" y1="50" x2="50" y2="20"></line>' +
             '<line class="clk-h sec"  x1="50" y1="56" x2="50" y2="17"></line>' +
             '<circle class="clk-cap" cx="50" cy="50" r="2.4"></circle>' +
           "</svg>";
  }

  // Wall-clock time in an IANA zone, independent of the visitor's own zone.
  function zoneTime(tz, now) {
    var parts = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour12: false,
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
    // "24" shows up at midnight in some engines; fold it back to 0.
    return { h: +parts.hour % 24, m: +parts.minute, s: +parts.second };
  }

  function buildClocks() {
    var hosts = document.querySelectorAll("[data-clocks]");
    if (!hosts.length) return;

    var faces = [];

    hosts.forEach(function (host) {
      host.className = "clocks";
      host.innerHTML = CLOCKS.map(function (c) {
        var tint = c.tint ? ' style="--tint:' + c.tint + '"' : "";
        return '<div class="clock"' + tint + ">" + clockFace() +
               '<span class="clk-city">' + c.city + "</span>" +
               '<span class="vh" data-clock-time></span></div>';
      }).join("");

      host.querySelectorAll(".clock").forEach(function (el, i) {
        faces.push({
          tz: CLOCKS[i].tz,
          city: CLOCKS[i].city,
          hour: el.querySelector(".hour"),
          min: el.querySelector(".min"),
          sec: el.querySelector(".sec"),
          text: el.querySelector("[data-clock-time]")
        });
      });
    });

    function turn(el, deg) {
      if (el) el.setAttribute("transform", "rotate(" + deg + " 50 50)");
    }

    function tick() {
      var now = new Date();
      faces.forEach(function (f) {
        var t = zoneTime(f.tz, now);
        turn(f.hour, (t.h % 12) * 30 + t.m * 0.5);
        turn(f.min, t.m * 6 + t.s * 0.1);
        turn(f.sec, t.s * 6);
        // Screen readers get the time as text; the SVG itself is aria-hidden.
        f.text.textContent = f.city + " " +
          String(t.h).padStart(2, "0") + ":" + String(t.m).padStart(2, "0");
      });
    }

    // Always draw once, so the hands are correct on first paint. Only the
    // repeating update idles while the tab is in the background.
    tick();
    setInterval(function () {
      if (!document.hidden) tick();
    }, reduceMotion ? 30000 : 1000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) tick();
    });
  }

  buildClocks();

  /* ---- Missing artwork ---------------------------------------------------- */
  /* Drop any framed image that fails to load so the container's diagonal-rule
     fallback shows instead of a broken-image icon. */

  function onMissing(img) {
    // YouTube only generates maxresdefault for some uploads; hqdefault always
    // exists. Try that once before giving up on the image entirely.
    var alt = img.getAttribute("data-fallback");
    if (alt) {
      img.removeAttribute("data-fallback");
      img.src = alt;
      return;
    }
    img.remove();
  }

  /* When maxresdefault does not exist, YouTube does not 404 — it returns a
     120x90 grey placeholder with HTTP 200. So a successful load is not proof
     of a real thumbnail; anything that small is treated as a miss. */
  function checkThumb(img) {
    if (img.naturalWidth > 0 && img.naturalWidth <= 120 &&
        img.getAttribute("data-fallback")) onMissing(img);
  }

  document.querySelectorAll(
    ".hero__bg > img, .work__media > img, .post__media > img, .profile__portrait > img"
  ).forEach(function (img) {
    if (img.complete) {
      if (img.naturalWidth === 0) onMissing(img);
      else checkThumb(img);
      return;
    }
    img.addEventListener("error", function () { onMissing(img); });
    img.addEventListener("load", function () { checkThumb(img); });
  });

  /* ---- Hero scatter -------------------------------------------------------- *
   * The pointer shoves the hero letters aside; they drift back the moment it
   * stops moving. Opt in with data-scatter on the heading.
   *
   * Each letter becomes its own inline-block and is moved by transform only,
   * so the heading's metrics never change and lines break where they always
   * did. The loop parks itself once everything is at rest, so an idle tab
   * costs nothing. Skipped for coarse pointers and for reduced-motion.
   * -------------------------------------------------------------------------- */

  function initScatter(title) {

    // Split to words first — a word is one unbreakable box — then to letters.
    var chars = [];
    (function split(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { split(n); return; }   // keep the <em> wrapper
        if (n.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var wd = document.createElement("span");
          wd.className = "wd";
          part.split("").forEach(function (c) {
            var ch = document.createElement("span");
            ch.className = "ch";
            ch.textContent = c;
            wd.appendChild(ch);
            chars.push({ el: ch, x: 0, y: 0, s: 1, cx: 0, cy: 0, w: 0, h: 0, col: "#fff", g: "" });
          });
          frag.appendChild(wd);
        });
        n.parentNode.replaceChild(frag, n);
      });
    })(title);
    if (!chars.length) return;

    // Whatever block the heading sits in becomes the canvas host. It has to be
    // positioned for the canvas to sit over it, and the canvas has to be
    // absolute so a grid or flex host does not treat it as an item.
    var zone = title.closest(".hero, .shead, .dintro, .profile, .mag") ||
               title.parentElement || title;
    zone.classList.add("scatter-host");
    var zoneRect = { left: 0, top: 0 };

    // The hero runs at about 150px per letter; everything else is smaller, so
    // scale the whole gesture by how big this heading actually is. Declared
    // before the constants that multiply by it — var hoists the name but not
    // the value, and 250 * undefined is NaN, which quietly kills every test
    // against the radius.
    var unit = parseFloat(getComputedStyle(title).fontSize) || 100;
    var k    = Math.max(.32, Math.min(1, unit / 150));

    var RADIUS = 250 * k;   // px of influence around the pointer
    var PUSH   = 68 * k;    // px a letter travels at the very centre
    var SCALE  = .52;       // extra size at the very centre, 1.52x
    var EASE   = .16;       // per-frame approach to the target

    // active  — the pointer is inside the host, so the letters stay displaced
    // stirring — it is also still moving, which is what sheds pixels
    var px = 0, py = 0, active = false, stirring = false;
    var running = false, dirty = true, idle;

    /* Pixel dust. A shoved letter sheds square motes, thrown along the push —
     * the company is named for pixel manipulation, so the debris is literal.
     * Canvas rather than DOM nodes: a hundred elements appearing and dying
     * every second would thrash layout, and these never need to be hit-tested.
     */
    // The office palette from the footer clocks, reused here so the hero and
    // the clocks speak the same four colours.
    var PALETTE = ["#ff2e88", "#3ddcff", "#ffc247", "#7cf03d"];
    var MAX_MOTES = 280;

    // Two surfaces over the same host: dust under the type, erosion over it.
    // Both are created here, before sizeCanvas() runs — it writes to both, and
    // a var declared further down is hoisted as undefined, which would throw
    // on the very first call and take the whole instance with it.
    var canvas = document.createElement("canvas");
    canvas.className = "hero__dust";
    canvas.setAttribute("aria-hidden", "true");
    zone.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    var erode = document.createElement("canvas");
    erode.className = "hero__erode";
    erode.setAttribute("aria-hidden", "true");
    zone.appendChild(erode);
    var ex = erode.getContext("2d");

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var motes = [];

    var cvW = 0, cvH = 0;
    // Measured on the canvas, never on .hero. inset:0 resolves against the
    // hero's padding box, and the hero carries a large padding-top — take the
    // hero's rect instead and every mote lands one padding down and to the
    // right of the letter that threw it.
    function sizeCanvas() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width  * dpr));
      var h = Math.max(1, Math.round(r.height * dpr));
      if (w === cvW && h === cvH) return;   // resizing clears the canvas
      cvW = canvas.width  = w;
      cvH = canvas.height = h;
      erode.width = w; erode.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ex.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;    // squares stay square
      ex.imageSmoothingEnabled  = false;    // and the erosion stays stepped
    }
    sizeCanvas();

    // Deliberately tight: the mote leaves along the push with only a little
    // scatter, and dies quickly. The dust should read as coming off that one
    // letter, not as weather across the whole hero.
    function shed(x, y, dx, dy) {
      if (motes.length >= MAX_MOTES) return;
      motes.push({
        x: x, y: y,
        vx: dx * .09 + (Math.random() - .5) * .5,
        vy: dy * .09 + (Math.random() - .5) * .5,
        // Two bands, stated absolutely rather than as a multiplier — a 1px
        // grain tripled is still 3px, which is why the split has to be on the
        // final size. Three in four land in the coarse band.
        s: Math.random() < .75
             ? 3 + ((Math.random() * 7) | 0)      // 3–9 px, the 300% band
             : 1 + ((Math.random() * 3) | 0),     // 1–3 px, the original grain
        // Lifetimes spread wide and multiplicatively, plus a random hold at
        // full opacity before the decay starts. A narrow additive range made
        // a burst of motes wink out together; this staggers them.
        life: 1 + Math.random() * .9,
        fade: .010 * (.4 + Math.random() * 2.4),
        col: PALETTE[(Math.random() * PALETTE.length) | 0]
      });
    }

    /* Erosion. Wherever the pointer passes over the type, that patch of it goes
     * low-res: a disc of the heading is redrawn from a tiny offscreen bitmap
     * blown back up with smoothing off, so the edges come out stepped rather
     * than blurred. The tile carries the hero's own backdrop as well as the
     * glyph, so it can cover the real letter underneath instead of sitting on
     * top of its smooth edges. Cached per glyph, size, block and colour.
     */
    var FAMILY = getComputedStyle(title).fontFamily;
    // The tile paints the backdrop as well as the glyph, so it has to be the
    // backdrop this heading actually sits on. Hardcoding the dark ink put a
    // black square around the letters on the paper sections.
    var BACK = (function () {
      var el = title;
      while (el && el !== document.documentElement) {
        var c = getComputedStyle(el).backgroundColor;
        if (c && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(c)) return c;
        el = el.parentElement;
      }
      return "#0b0b0b";
    })();
    var glyphs = {};

    function glyph(ch, w, h, block, col, fs) {
      var key = ch + "|" + w + "|" + h + "|" + block + "|" + col + "|" + fs;
      if (glyphs[key]) return glyphs[key];
      var lw = Math.max(2, Math.round(w / block));
      var lh = Math.max(2, Math.round(h / block));
      var g = document.createElement("canvas");
      g.width = lw; g.height = lh;
      var gx = g.getContext("2d");
      gx.fillStyle = BACK;
      gx.fillRect(0, 0, lw, lh);

      // The real font size, divided down by the block — deriving it from the
      // tile instead is what made the patch come out undersized.
      gx.font = "expanded 900 " + (fs / block) + "px " + FAMILY;
      // wdth 125 in the heading. The shorthand keyword is the closest canvas
      // gets to a variation axis; fontStretch lands it where supported.
      if ("fontStretch" in gx) gx.fontStretch = "expanded";

      // Sit the glyph on the same baseline the inline box gives it: half the
      // leading, then the ascent. Centring on the tile put it low, because a
      // line box is taller than the ink and the slack is not symmetrical.
      var m = gx.measureText("H");
      var asc  = m.fontBoundingBoxAscent  || fs / block * .8;
      var desc = m.fontBoundingBoxDescent || fs / block * .2;

      gx.fillStyle = col;
      gx.textAlign = "center";
      gx.textBaseline = "alphabetic";
      gx.fillText(ch, lw / 2, (lh - (asc + desc)) / 2 + asc);
      glyphs[key] = g;
      return g;
    }

    // Radius of the pixelated disc, in step with everything else.
    var ERODE_R = 78 * k;

    function drawErosion(list) {
      ex.clearRect(0, 0, erode.width / dpr, erode.height / dpr);
      if (!list.length) return;
      var cxp = px - zoneRect.left, cyp = py - zoneRect.top;
      ex.save();
      ex.beginPath();
      ex.arc(cxp, cyp, ERODE_R, 0, Math.PI * 2);
      ex.clip();
      for (var i = 0; i < list.length; i++) {
        var g = list[i];
        // Whole pixels. Drawn at fractional coordinates the blocks resample
        // slightly differently each frame, which is the other half of the
        // shimmer.
        ex.drawImage(glyph(g.ch, g.tw, g.th, g.b, g.col, g.fs),
                     Math.round(g.x), Math.round(g.y),
                     Math.round(g.w), Math.round(g.h));
      }
      ex.restore();

      // Soften the rim: keep what is already drawn, weighted by a radial ramp,
      // so the patch dissolves into the sharp type instead of ending on a hard
      // circular cut.
      ex.globalCompositeOperation = "destination-in";
      var ramp = ex.createRadialGradient(cxp, cyp, ERODE_R * .55, cxp, cyp, ERODE_R);
      ramp.addColorStop(0, "rgba(0,0,0,1)");
      ramp.addColorStop(1, "rgba(0,0,0,0)");
      ex.fillStyle = ramp;
      ex.fillRect(0, 0, erode.width / dpr, erode.height / dpr);
      ex.globalCompositeOperation = "source-over";
    }

    function drawDust() {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      for (var i = motes.length - 1; i >= 0; i--) {
        var m = motes[i];
        m.x += m.vx;
        m.y += m.vy;
        m.vy += .014;                              // a whisper of gravity
        m.vx *= .992;
        m.life -= m.fade;
        if (m.life <= 0) { motes.splice(i, 1); continue; }
        ctx.globalAlpha = m.life > 1 ? 1 : m.life;   // the hold, then the fade
        ctx.fillStyle = m.col;
        ctx.fillRect(m.x | 0, m.y | 0, m.s, m.s);  // integer px, no smearing
      }
      ctx.globalAlpha = 1;
    }

    // Resting centres. The live rect includes the current offset, so take it
    // back off — otherwise the anchors drift a little further every measure.
    function measure() {
      chars.forEach(function (c) {
        var r = c.el.getBoundingClientRect();
        c.cx = r.left + r.width / 2 - c.x;
        c.cy = r.top + r.height / 2 - c.y;
        c.w = r.width;
        c.h = r.height;
        var ecs = getComputedStyle(c.el);
        c.col = ecs.color;
        // Canvas draws the source text; text-transform is a CSS-only affair,
        // so the tile came out lowercase while the page showed capitals.
        c.g = ecs.textTransform === "uppercase" ? c.el.textContent.toUpperCase()
            : ecs.textTransform === "lowercase" ? c.el.textContent.toLowerCase()
            : c.el.textContent;
      });
      // Char centres are viewport-based; the canvas is not. Cache the offset
      // here rather than reading it every frame — and take it from the canvas,
      // which is the surface being drawn on, not from its parent.
      zoneRect = canvas.getBoundingClientRect();
      // And resize with it. Sized once at startup the backing store keeps the
      // pre-webfont dimensions while CSS stretches the element to the settled
      // ones — every coordinate then lands scaled, drifting further out the
      // further it is from the origin.
      sizeCanvas();
      dirty = false;
    }

    function frame() {
      var moving = false;
      var ghosts = [];
      for (var i = 0; i < chars.length; i++) {
        var c = chars[i], tx = 0, ty = 0, ts = 1;
        if (active) {
          var dx = c.cx - px, dy = c.cy - py;
          var d = Math.sqrt(dx * dx + dy * dy) || .001;
          if (d < RADIUS) {
            var k = 1 - d / RADIUS;
            k = k * k;                              // squared, so the falloff bites
            tx = dx / d * k * PUSH;
            ty = dy / d * k * PUSH;
            ts = 1 + k * SCALE;                     // and it swells as it goes
          }
        }
        c.x += (tx - c.x) * EASE;
        c.y += (ty - c.y) * EASE;
        c.s += (ts - c.s) * EASE;
        if (Math.abs(c.x) > .05 || Math.abs(c.y) > .05 || Math.abs(c.s - 1) > .002) moving = true;
        else { c.x = 0; c.y = 0; c.s = 1; }
        c.el.style.transform = (c.x || c.y || c.s !== 1)
          ? "translate(" + c.x.toFixed(2) + "px," + c.y.toFixed(2) + "px) scale(" + c.s.toFixed(3) + ")"
          : "";

        // Only letters genuinely under load shed, and the harder one is
        // shoved the more it gives off — so the dust marks where the pointer
        // is working rather than dusting the whole line evenly. The mote
        // starts somewhere inside that letter's own box, not at its centre.
        var mag = Math.abs(c.x) + Math.abs(c.y);

        // Anything the pointer disc touches is redrawn low-res, at its
        // current position and current size. The block coarsens as the letter
        // is driven further, so the patch degrades as it is worked.
        if (active) {
          var lw = c.w * c.s, lh = c.h * c.s;
          var lx = c.cx + c.x, ly = c.cy + c.y;
          if (Math.abs(lx - px) < ERODE_R + lw / 2 &&
              Math.abs(ly - py) < ERODE_R + lh / 2) {
            ghosts.push({
              ch: c.g || c.el.textContent,
              // The tile is built from the letter's resting box at its resting
              // size, and stretched to the live one by drawImage. Keying it to
              // the animated size instead regenerated it constantly, and each
              // new tile popped.
              fs: unit,
              x: lx - lw / 2 - zoneRect.left,
              y: ly - lh / 2 - zoneRect.top,
              w: lw, h: lh,
              tw: c.w, th: c.h,
              // Keyed to how close the pointer is, not to how far the letter
              // has been thrown: displacement oscillates while a letter eases
              // home, so the grid kept resizing under a motionless pointer.
              // Quantised to five steps on top of that.
              // Clamped at both ends: past the disc the expression goes
              // negative, and a block of zero divides the tile by nothing.
              b: 6 + 3 * Math.max(0, Math.min(4,
                   (4 - Math.hypot(lx - px, ly - py) / (ERODE_R / 3)) | 0)),
              col: c.col
            });
          }
        }

        if (stirring && (tx || ty) && mag > 4 && Math.random() < Math.min(.6, mag / 42)) {
          var ang = Math.random() * Math.PI * 2;
          var rad = Math.sqrt(Math.random()) * ERODE_R;
          shed(px - zoneRect.left + Math.cos(ang) * rad,
               py - zoneRect.top  + Math.sin(ang) * rad,
               c.x, c.y);
        }
      }

      drawErosion(ghosts);
      drawDust();

      if (moving || active || motes.length) requestAnimationFrame(frame);
      else running = false;
    }

    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }

    zone.addEventListener("mousemove", function (e) {
      if (dirty) measure();
      px = e.clientX; py = e.clientY;
      active = true;
      stirring = true;
      clearTimeout(idle);
      // Only the dust stops when the pointer stops. The letters hold their
      // displacement until it actually leaves the block.
      idle = setTimeout(function () { stirring = false; start(); }, 140);
      start();
    });
    zone.addEventListener("mouseleave", function () {
      active = false; stirring = false; clearTimeout(idle); start();
    });

    addEventListener("resize", function () { dirty = true; sizeCanvas(); });
    addEventListener("scroll", function () { dirty = true; }, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { dirty = true; });
    }
  }

  if (window.matchMedia &&
      matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("[data-scatter]").forEach(initScatter);
  }

  /* ---- Dust off the accent shape ------------------------------------------- *
   * Not a cursor toy. The pixels are thrown by the accent shape itself, so the
   * motion has a cause you can see:
   *
   *   Director rows — the fill wipes across, and its leading edge drags a wave
   *   of pixels along with it, in and out again. Each mote picks up its own
   *   delay and speed, so the wave has depth rather than moving as one line.
   *
   *   Work tiles — the tile jumps off-register and uncovers the accent block
   *   down and to the right. The pixels are what the tile displaces: they are
   *   thrown along the two revealed edges, away from the way the tile went.
   *
   * One fixed canvas for the document, since a mote has to be free to drift
   * past the edge of whatever threw it.
   * -------------------------------------------------------------------------- */

  (function () {
    if (!window.matchMedia) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var ROWS  = ".cast__row";
    var TILES = "a.work";
    if (!document.querySelector(ROWS) && !document.querySelector(TILES)) return;

    var PALETTE = ["#ff2e88", "#3ddcff", "#ffc247", "#7cf03d"];
    var MAX = 320;

    var cv = document.createElement("canvas");
    cv.className = "dust-layer";
    cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);
    var cx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = 0, ch = 0;

    function size() {
      var w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (w === cw && h === ch) return;
      cw = cv.width = w; ch = cv.height = h;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.imageSmoothingEnabled = false;
    }
    size();
    addEventListener("resize", size);

    var motes = [], fronts = [], running = false;

    // Matches the CSS easing on both shapes, so the pixels ride the same curve
    // the accent does rather than drifting out of step with it.
    function ease(t) { return 1 - Math.pow(1 - t, 3); }

    function add(x, y, vx, vy) {
      if (motes.length >= MAX) return;
      motes.push({
        x: x, y: y,
        vx: vx + (Math.random() - .5) * .8,
        vy: vy + (Math.random() - .5) * .8,
        s: Math.random() < .7 ? 2 + ((Math.random() * 5) | 0)
                              : 1 + ((Math.random() * 2) | 0),
        // The hold is the delay: a mote sits at full strength for a spell
        // before it starts to fade, so the wave frays instead of vanishing.
        life: 1 + Math.random() * .9,
        fade: .016 * (.4 + Math.random() * 2.4),
        col: PALETTE[(Math.random() * PALETTE.length) | 0]
      });
    }

    function tick(now) {
      // --- fronts: the moving edges that are currently throwing pixels ------
      for (var f = fronts.length - 1; f >= 0; f--) {
        var fr = fronts[f];
        var t = (now - fr.t0) / fr.dur;
        if (t >= 1) { fronts.splice(f, 1); continue; }
        var p = ease(t);
        var r = fr.r;

        if (fr.kind === "row") {
          // The fill's leading edge, sweeping left to right either way: it
          // grows from the left going in, and collapses to the right coming
          // out. Pixels are shoved ahead of it.
          var ex = fr.out ? r.left + r.width * p : r.left + r.width * p;
          for (var i = 0; i < 3; i++) {
            add(ex + (Math.random() - .5) * 10,
                r.top + Math.random() * r.height,
                1.6 + Math.random() * 2.2, (Math.random() - .5) * 1.2);
          }
        } else {
          // The tile steps up and left; the accent is uncovered along its
          // right and bottom edges, and the pixels go the other way.
          var d = fr.out ? -1 : 1;
          for (var j = 0; j < 2; j++) {
            add(r.right - 7 + Math.random() * 14,
                r.top + Math.random() * r.height,
                d * (1.1 + Math.random() * 1.6), d * (.3 + Math.random() * .7));
            add(r.left + Math.random() * r.width,
                r.bottom - 7 + Math.random() * 14,
                d * (.3 + Math.random() * .7), d * (1.1 + Math.random() * 1.6));
          }
        }
      }

      // --- the pixels themselves -------------------------------------------
      cx.clearRect(0, 0, innerWidth, innerHeight);
      for (var k = motes.length - 1; k >= 0; k--) {
        var m = motes[k];
        m.x += m.vx; m.y += m.vy;
        m.vy += .012;
        m.vx *= .99;
        m.life -= m.fade;
        if (m.life <= 0) { motes.splice(k, 1); continue; }
        cx.globalAlpha = m.life > 1 ? 1 : m.life;   // the hold, then the fade
        cx.fillStyle = m.col;
        cx.fillRect(m.x | 0, m.y | 0, m.s, m.s);
      }
      cx.globalAlpha = 1;

      if (motes.length || fronts.length) requestAnimationFrame(tick);
      else running = false;
    }

    function launch(el, kind, out) {
      fronts.push({
        kind: kind,
        out: out,                         // which way the shape is going
        r: el.getBoundingClientRect(),
        t0: performance.now(),
        dur: kind === "row" ? 420 : 190   // in step with the CSS transitions
      });
      if (!running) { running = true; requestAnimationFrame(tick); }
    }

    function wire(sel, kind) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.addEventListener("mouseenter", function () { launch(el, kind, false); });
        el.addEventListener("mouseleave", function () { launch(el, kind, true); });
      });
    }
    wire(ROWS, "row");
    wire(TILES, "tile");
  })();
  /* ---- Blur-up portraits --------------------------------------------------- *
   * The container carries --lqip, a 24px still of the photo. CSS paints it
   * blurred behind the <img>; this only handles the fade, and only when the
   * file has not already arrived — no point flashing a blur over a cached hit.
   * -------------------------------------------------------------------------- */

  document.querySelectorAll(".profile__portrait").forEach(function (box) {
    var img = box.querySelector("img");
    if (!img || !box.style.getPropertyValue("--lqip")) return;
    if (img.complete && img.naturalWidth > 0) return;

    box.classList.add("is-blur");
    img.addEventListener("load", function () {
      box.classList.remove("is-blur");
    }, { once: true });
    img.addEventListener("error", function () {
      // No photo, no business showing a blurred ghost of it — fall back to the
      // diagonal pattern the container already carries.
      box.style.removeProperty("--lqip");
      box.classList.remove("is-blur");
    }, { once: true });
  });

  /* ---- Mosaic veil on the portraits ---------------------------------------- *
   * The portrait sits mosaicked. The pointer opens a soft-edged disc in the
   * mosaic and the real photograph shows through it — the veil is what gets
   * erased, so the sharp image underneath is the untouched <img>, not a
   * redraw. The hole closes slowly when the pointer leaves; a little decay,
   * so the image resolves and dissolves rather than switching.
   * -------------------------------------------------------------------------- */

  (function () {
    if (!window.matchMedia) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var BLOCK = 13;    // px per mosaic cell at rest
    var HOLE  = 172;   // radius of the sharp patch

    /* Value noise, smoothly interpolated — Perlin's cheap cousin, and enough
     * for a field that drifts. No library, and it is deterministic, so the
     * same cell reads the same value on every frame at a given time. */
    function hash(x, y) {
      var n = (x | 0) * 374761393 + (y | 0) * 668265263;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    }
    function vnoise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hash(xi, yi),     b = hash(xi + 1, yi);
      var c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    }

    document.querySelectorAll(".profile__portrait").forEach(function (box) {
      var img = box.querySelector("img");
      if (!img) return;

      var cv = document.createElement("canvas");
      cv.className = "px-veil";
      cv.setAttribute("aria-hidden", "true");
      box.appendChild(cv);
      var cx = cv.getContext("2d");
      var off = document.createElement("canvas");
      var ox = off.getContext("2d");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      var w = 0, h = 0, r = 0, tr = 0, mx = 0, my = 0, running = false, ready = false;
      var lw = 0, lh = 0, noise = null;
      var visible = false, last = 0;

      function size() {
        var b = cv.getBoundingClientRect();
        var nw = Math.max(1, Math.round(b.width * dpr));
        var nh = Math.max(1, Math.round(b.height * dpr));
        if (nw === cv.width && nh === cv.height) return;
        cv.width = nw; cv.height = nh;
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx.imageSmoothingEnabled = false;   // the upscale is the whole point
        w = b.width; h = b.height;
      }

      // The <img> is object-fit: cover, so the canvas has to crop the same way
      // or the mosaic would sit out of register with the photo beneath it.
      function mosaic() {
        lw = Math.max(2, Math.round(w / BLOCK));
        lh = Math.max(2, Math.round(h / BLOCK));
        // A fixed value per cell. Rolled fresh every frame the edge would
        // boil; rolled once, the hole has a ragged but steady bite.
        noise = new Float32Array(lw * lh);
        for (var n = 0; n < noise.length; n++) noise[n] = Math.random();
        off.width = lw; off.height = lh;
        ox.imageSmoothingEnabled = true;    // clean on the way down
        var ir = img.naturalWidth / img.naturalHeight, br = w / h;
        var sw = ir > br ? img.naturalHeight * br : img.naturalWidth;
        var sh = ir > br ? img.naturalHeight : img.naturalWidth / br;
        ox.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2,
                     sw, sh, 0, 0, lw, lh);
        ready = true;
      }

      function frame(now) {
        // The idle field only needs to breathe, not to run at display rate.
        if (now - last < 55 && Math.abs(tr - r) < .5) {
          requestAnimationFrame(frame); return;
        }
        last = now;
        r += (tr - r) * (tr > r ? .2 : .07);   // opens briskly, closes slowly
        cx.clearRect(0, 0, w, h);
        cx.drawImage(off, 0, 0, w, h);

        // Idle drift. A slow noise field lifts scattered cells just enough for
        // the photograph to surface under them — the picture looks like it
        // wants to resolve, which is the invitation to come and rub at it.
        if (noise && r < HOLE * .9) {
          var t = now / 5200;
          var cwn = w / lw, chn = h / lh;
          cx.globalCompositeOperation = "destination-out";
          cx.fillStyle = "#000";
          for (var jj = 0; jj < lh; jj++) {
            for (var ii = 0; ii < lw; ii++) {
              var nv = vnoise(ii * .22 + t, jj * .22 - t * .6);
              if (nv < .68) continue;
              cx.globalAlpha = ((nv - .68) / .32) * .5 * (1 - r / HOLE);
              cx.fillRect(ii * cwn, jj * chn, cwn + .5, chn + .5);
            }
          }
          cx.globalAlpha = 1;
          cx.globalCompositeOperation = "source-over";
        }
        if (r > 1 && noise) {
          // Punch the hole a cell at a time, so its edge is made of the same
          // blocks as the mosaic and comes out chewed rather than compass-drawn.
          var cw = w / lw, chh = h / lh;
          var i0 = Math.max(0, ((mx - r) / cw) | 0), i1 = Math.min(lw - 1, ((mx + r) / cw) | 0);
          var j0 = Math.max(0, ((my - r) / chh) | 0), j1 = Math.min(lh - 1, ((my + r) / chh) | 0);
          cx.globalCompositeOperation = "destination-out";
          cx.fillStyle = "#000";
          for (var j = j0; j <= j1; j++) {
            for (var i = i0; i <= i1; i++) {
              var dx = (i + .5) * cw - mx, dy = (j + .5) * chh - my;
              var d = Math.sqrt(dx * dx + dy * dy);
              var nz = noise[j * lw + i];
              // Solid well inside; out at the rim each cell decides for itself
              // how far it reaches and how much of it goes.
              var edge = r * (.62 + .5 * nz);
              if (d > edge) continue;
              var k = d < r * .45 ? 1 : 1 - (d - r * .45) / (edge - r * .45 + .001);
              cx.globalAlpha = Math.max(0, Math.min(1, k * (.55 + .45 * nz)));
              cx.fillRect(i * cw, j * chh, cw + .5, chh + .5);
            }
          }
          cx.globalAlpha = 1;
          cx.globalCompositeOperation = "source-over";
        }
        if (Math.abs(tr - r) > .5 || visible) requestAnimationFrame(frame);
        else { r = tr; running = false; }
      }

      function start() { if (!running) { running = true; requestAnimationFrame(frame); } }

      function build() {
        size();
        if (!img.naturalWidth) return;
        mosaic();
        cx.clearRect(0, 0, w, h);
        cx.drawImage(off, 0, 0, w, h);
      }

      if (img.complete && img.naturalWidth) build();
      else img.addEventListener("load", build, { once: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
      addEventListener("resize", function () { build(); });

      box.addEventListener("mousemove", function (e) {
        if (!ready) return;
        var b = cv.getBoundingClientRect();
        mx = e.clientX - b.left; my = e.clientY - b.top;
        tr = HOLE;
        start();
      });
      box.addEventListener("mouseleave", function () { tr = 0; start(); });

      // The drift costs a frame every 55ms, so only pay it while the portrait
      // is actually on screen.
      if (window.IntersectionObserver) {
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting;
          if (visible) start();
        }, { rootMargin: "100px" }).observe(box);
      } else { visible = true; start(); }
    });
  })();

  /* ---- Year stamp -------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
