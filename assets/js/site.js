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

  (function () {
    var title = document.querySelector("[data-scatter]");
    if (!title || !window.matchMedia) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
            chars.push({ el: ch, x: 0, y: 0, s: 1, cx: 0, cy: 0, w: 0, h: 0 });
          });
          frag.appendChild(wd);
        });
        n.parentNode.replaceChild(frag, n);
      });
    })(title);
    if (!chars.length) return;

    var RADIUS = 250;   // px of influence around the pointer
    var PUSH   = 68;    // px a letter travels at the very centre
    var SCALE  = .52;   // extra size at the very centre, 1.52x
    var EASE   = .16;   // per-frame approach to the target

    var px = 0, py = 0, active = false, running = false, dirty = true, idle;
    var zone = title.closest(".hero") || title;
    var zoneRect = { left: 0, top: 0 };

    /* Pixel dust. A shoved letter sheds square motes, thrown along the push —
     * the company is named for pixel manipulation, so the debris is literal.
     * Canvas rather than DOM nodes: a hundred elements appearing and dying
     * every second would thrash layout, and these never need to be hit-tested.
     */
    // The office palette from the footer clocks, reused here so the hero and
    // the clocks speak the same four colours.
    var PALETTE = ["#ff2e88", "#3ddcff", "#ffc247", "#7cf03d"];
    var MAX_MOTES = 280;

    var canvas = document.createElement("canvas");
    canvas.className = "hero__dust";
    canvas.setAttribute("aria-hidden", "true");
    zone.appendChild(canvas);
    var ctx = canvas.getContext("2d");
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;    // squares stay square
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
        // 1–3 px is the base. Roughly a fifth come out oversized, up to 300%,
        // so the dust has grain instead of reading as uniform noise.
        s: Math.min(9, Math.round((1 + ((Math.random() * 3) | 0)) *
             (Math.random() < .22 ? 1.6 + Math.random() * 1.4 : 1))),
        life: 1,
        // Slow: a mote lives roughly one to two and a half seconds.
        fade: .007 + Math.random() * .009,
        col: PALETTE[(Math.random() * PALETTE.length) | 0]
      });
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
        ctx.globalAlpha = m.life;
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
        if (active && (tx || ty) && mag > 4 && Math.random() < Math.min(.6, mag / 42)) {
          shed(c.cx + c.x - zoneRect.left + (Math.random() - .5) * c.w,
               c.cy + c.y - zoneRect.top  + (Math.random() - .5) * c.h,
               c.x, c.y);
        }
      }

      drawDust();

      if (moving || active || motes.length) requestAnimationFrame(frame);
      else running = false;
    }

    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }

    zone.addEventListener("mousemove", function (e) {
      if (dirty) measure();
      px = e.clientX; py = e.clientY;
      active = true;
      clearTimeout(idle);
      // The letters go home when the pointer stops, not when it leaves.
      idle = setTimeout(function () { active = false; start(); }, 150);
      start();
    });
    zone.addEventListener("mouseleave", function () {
      active = false; clearTimeout(idle); start();
    });

    addEventListener("resize", function () { dirty = true; sizeCanvas(); });
    addEventListener("scroll", function () { dirty = true; }, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { dirty = true; });
    }
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

  /* ---- Year stamp -------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
