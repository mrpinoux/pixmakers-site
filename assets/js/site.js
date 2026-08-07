/* ==========================================================================
   PIXMAKERS FACTORY — site.js
   Contact form, office clocks, mobile nav, video lightbox. No build step.
   ========================================================================== */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---- Bilingual plumbing -------------------------------------------------- *
   * Static copy lives in the page twice and the CSS picks. Anything this file
   * builds has no markup to hide, so it asks T() instead, and re-asks whenever
   * the language changes.
   * -------------------------------------------------------------------------- */

  /* Une valeur, deux libelles. La donnee reste en anglais — c'est ce que
     portent les tuiles et ce sur quoi le filtre compare — et seule
     l'etiquette du menu change de langue. Ce qui n'est pas ici s'affiche
     tel quel : les noms de villes et la plupart des genres se disent
     pareil dans les deux langues. */
  var FR_LABEL = {
    "Music video": "Clip",
    "Commercial": "Publicité",
    "Trailer": "Bande-annonce",
    "Documentary": "Documentaire",
    "Behind the scenes": "Coulisses",
    "Short": "Court métrage",
    "Interview": "Interview",
    "Reel": "Reel",
    "Live": "Live",
    "Motion": "Motion",
    "Fashion": "Mode",
    "French rap": "Rap français",
    "French pop": "Variété française",
    "House old-school": "House old-school",
    "Afro house": "Afro house"
  };

  var LANG = "en";
  var langHooks = [];
  function T(en, fr) { return LANG === "fr" ? fr : en; }
  function L(v) { return LANG === "fr" && FR_LABEL[v] ? FR_LABEL[v] : v; }
  function onLang(fn) { langHooks.push(fn); fn(); }

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

  /* Une vidéo ouverte a sa propre adresse : #v=youtube:xxxx. Elle se partage,
     elle se met en signet, et le bouton Retour du navigateur referme la
     lightbox au lieu de quitter la page. */
  var lbSpec = null;
  var lbPushed = false;   // avons-nous empilé une entrée, ou héritons-nous de l'adresse ?

  function openLightbox(url, spec, quiet) {
    if (!lb) buildLightbox();
    lastFocus = document.activeElement;
    lbSpec = spec || null;
    if (spec && !quiet && history.pushState) {
      history.pushState({ lb: spec }, "", "#v=" + spec);
      lbPushed = true;
    }
    lb.setAttribute("aria-label", "Video player");
    /* Un lecteur distant met une seconde ou deux à répondre, et pendant ce
       temps la page est un rectangle noir sans rien dedans — on ne sait pas
       si ça charge ou si c'est cassé. Une grille de pixels occupe l'attente,
       et l'iframe la recouvre en arrivant : pas de disparition à orchestrer,
       elle est simplement dessous. */
    /* Le motif est tiré à chaque ouverture plutôt que figé dans la feuille :
       seize retards mélangés, donc deux chargements ne clignotent jamais
       pareil. C'est ce qui le fait lire comme une image qui se compose et
       non comme une animation qui repasse. */
    var order = [];
    for (var i = 0; i < 16; i++) order.push(i * 0.09);
    for (var j = order.length - 1; j > 0; j--) {
      var k = (Math.random() * (j + 1)) | 0;
      var tmp = order[j]; order[j] = order[k]; order[k] = tmp;
    }
    var cells = order.map(function (d) {
      return '<i style="animation-delay:' + d.toFixed(2) + 's"></i>';
    }).join("");

    lbFrame.innerHTML =
      '<div class="lb__load" aria-hidden="true">' + cells + "</div>" +
      '<iframe src="' + url + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';

    var frame = lbFrame.querySelector("iframe");
    frame.addEventListener("load", function () {
      var l = lbFrame.querySelector(".lb__load");
      if (l) l.remove();
    });

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

    // One ceiling on the width, carrying both limits: 175% of the file's real
    // size, and whatever width still lets it fit the height available at its
    // own ratio. Doing it here rather than with a max-height is the point —
    // an explicit width plus a height clamp squashes the picture instead of
    // scaling it. Hidden until measured, so nothing renders at the wrong size.
    var img = lbFrame.querySelector("img");
    img.style.visibility = "hidden";
    function sizeShot() {
      if (img.naturalWidth) {
        var room = innerHeight - Math.min(160, Math.max(96, innerWidth * .16));
        var byHeight = room * (img.naturalWidth / img.naturalHeight);
        img.style.setProperty("--shot-cap",
          Math.round(Math.min(img.naturalWidth * 1.75, byHeight)) + "px");
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

  function closeLightbox(quiet) {
    if (!lb || !lb.classList.contains("is-on")) return;
    lb.classList.remove("is-on", "lb--photo");
    lbFrame.innerHTML = "";          // stops playback
    shotAt = -1;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();

    /* Si l'entrée était à nous, on la rend : le Retour du navigateur retrouve
       la page telle qu'elle était. Mais quand on arrive *directement* sur
       l'adresse d'une vidéo, l'entrée précédente n'est pas à nous — c'est le
       site d'où vient le visiteur, ou rien. Revenir en arrière le ferait
       sortir du site en fermant une lightbox. On se contente alors d'effacer
       l'ancre. */
    if (lbSpec && !quiet) {
      if (lbPushed) history.back();
      else if (history.replaceState) {
        history.replaceState({}, "", location.pathname + location.search);
      }
    }
    lbSpec = null;
    lbPushed = false;
  }

  /* Retour / suivant du navigateur : l'état fait foi. */
  addEventListener("popstate", function (e) {
    var spec = e.state && e.state.lb ? e.state.lb : fromHash();
    if (spec) {
      var url = embedUrl(spec);
      if (url) { closeLightbox(true); openLightbox(url, spec, true); lbPushed = true; }
    } else {
      closeLightbox(true);
    }
  });

  function fromHash() {
    var m = /^#v=(.+)$/.exec(location.hash || "");
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* Arrivée directe sur une adresse de vidéo : on l'ouvre, sans empiler une
     entrée d'historique de plus — celle du navigateur est déjà la bonne. */
  addEventListener("DOMContentLoaded", function () {
    var spec = fromHash();
    if (!spec) return;
    var url = embedUrl(spec);
    if (!url) return;
    if (history.replaceState) history.replaceState({ lb: spec }, "", location.href);
    openLightbox(url, spec, true);
  });

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
    var spec = trigger.getAttribute("data-video");
    var url = embedUrl(spec);
    if (!url) return;                // no id yet — let the link behave normally
    e.preventDefault();
    openLightbox(url, spec);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeLightbox(); return; }
    if (shotAt < 0) return;          // arrows only mean something in a gallery
    if (e.key === "ArrowLeft")  { e.preventDefault(); stepPhoto(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); stepPhoto(1); }
  });

  /* ---- Language switch ----------------------------------------------------- *
   * The whole site exists in English and in French. Every translated fragment
   * is in the page twice, marked data-l, and the root attribute decides which
   * one shows — the CSS does the hiding, so the page is already correct before
   * this runs. English is what the server sends; the switch only remembers a
   * different preference.
   * -------------------------------------------------------------------------- */

  /* Les étiquettes des vignettes portent la valeur anglaise dans la page —
     c'est ce que lit le filtre, et c'est ce qui s'affiche sans JavaScript.
     Ici on ne change que le mot montré. */
  onLang(function () {
    document.querySelectorAll(".work__tags [data-tag]").forEach(function (el) {
      var tile = el.closest(".work");
      var v = tile && tile.getAttribute("data-" + el.getAttribute("data-tag"));
      if (v) el.textContent = L(v);
    });
  });

  (function wireLang() {
    var root = document.documentElement;
    var nav = document.querySelector(".nav");
    if (!nav) return;

    var box = document.createElement("div");
    box.className = "langsw";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Language");
    box.innerHTML =
      '<button type="button" data-pl="en" lang="en">EN</button>' +
      '<button type="button" data-pl="fr" lang="fr">FR</button>';
    nav.appendChild(box);

    /* Posts carried their own switch before the site had one. The placeholder
       stays in the markup; it just has nothing left to do. */
    var old = document.querySelector("[data-postlang]");
    if (old && old.parentNode) old.parentNode.removeChild(old);

    function set(lang, remember) {
      if (lang !== "fr") lang = "en";
      LANG = lang;
      root.setAttribute("data-lang", lang);
      root.setAttribute("lang", lang);

      /* Les textes portes par un attribut ne peuvent pas exister en double
         dans la page : on les remplace. */
      document.querySelectorAll("[data-ph-fr]").forEach(function (el) {
        el.placeholder = lang === "fr"
          ? el.getAttribute("data-ph-fr")
          : el.getAttribute("data-ph-en") || el.placeholder;
      });
      langHooks.forEach(function (fn) { fn(); });
      box.querySelectorAll("[data-pl]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-pl") === lang));
      });
      if (remember) { try { localStorage.setItem("pxm-lang", lang); } catch (e) {} }
    }

    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pl]");
      if (b) set(b.getAttribute("data-pl"), true);
    });

    var saved = null;
    try { saved = localStorage.getItem("pxm-lang") || localStorage.getItem("pxm-post-lang"); }
    catch (e) {}
    set(saved || "en", false);
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

    // Display headings throw coarser debris than section heads — at that size
    // the fine grain reads as dirt on the screen.
    var GRAIN  = k > .7 ? 2 : 1;
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
    function shed(x, y, dx, dy, own) {
      if (motes.length >= MAX_MOTES) return;
      motes.push({
        x: x, y: y,
        vx: dx * .09 + (Math.random() - .5) * .5,
        vy: dy * .09 + (Math.random() - .5) * .5,
        // Two bands, stated absolutely rather than as a multiplier — a 1px
        // grain tripled is still 3px, which is why the split has to be on the
        // final size. Three in four land in the coarse band.
        s: GRAIN * (Math.random() < .75
             ? 3 + ((Math.random() * 7) | 0)      // 3–9 px, the coarse band
             : 1 + ((Math.random() * 3) | 0)),    // 1–3 px, the fine grain
        // Lifetimes spread wide and multiplicatively, plus a random hold at
        // full opacity before the decay starts. A narrow additive range made
        // a burst of motes wink out together; this staggers them.
        // Shorter lived: they mark the passage and go, rather than hanging
        // about in the frame.
        life: 1 + Math.random() * .5,
        fade: .022 * (.5 + Math.random() * 2),
        // Mostly the colour of the letter it came off — white type throws
        // white, the accent word throws accent — with the office palette
        // salted through the rest so it does not go monochrome.
        col: (own && Math.random() < .6) ? own
                                         : PALETTE[(Math.random() * PALETTE.length) | 0]
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
        /* Le titre porte ses deux langues : celle qu'on n'affiche pas est en
           display:none et mesure zéro, donc son centre tombait sur (0,0) du
           canvas. Trente-sept lettres françaises invisibles crachaient toutes
           leur poussière depuis le coin haut-gauche du hero — un geyser que
           rien ne justifiait. On les met de côté ; elles reviendront à la
           bascule, quand elles auront une boîte. */
        c.off = !r.width || !r.height;
        if (c.off) return;
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
        if (c.off) continue;              // lettre de l'autre langue, sans boîte
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

        // A third of what it was: at this grain size a handful reads as debris,
        // a crowd reads as static.
        if (stirring && (tx || ty) && mag > 4 && Math.random() < Math.min(.16, mag / 150)) {
          var ang = Math.random() * Math.PI * 2;
          var rad = Math.sqrt(Math.random()) * ERODE_R;
          shed(px - zoneRect.left + Math.cos(ang) * rad,
               py - zoneRect.top  + Math.sin(ang) * rad,
               c.x, c.y, c.col);
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

    /* Changer de langue échange un titre contre un autre : les lettres
       changent de place, et surtout de contenu — les glyphes que le canvas
       dessine sont mis en cache par measure(). Marquer `dirty` ne suffit
       pas : la boucle se gare dès que tout est immobile, donc personne ne
       vient relire. Il faut la réveiller, une fois la nouvelle mise en page
       arrêtée — deux frames, parce que le premier repaint suit le changement
       d'attribut et le second la reprise du flux. */
    onLang(function () {
      /* Pas de requestAnimationFrame ici : un onglet en arrière-plan n'en
         reçoit pas, et le titre resterait mesuré dans l'autre langue jusqu'au
         retour de l'utilisateur. Un minuteur part dans tous les cas. Trois
         passes — maintenant, après le recalcul de mise en page, puis une fois
         les polices posées — parce que la hauteur du bloc change en deux
         temps et qu'une seule mesure attrape la mauvaise. */
      var sync = function () { dirty = true; sizeCanvas(); measure(); start(); };
      sync();
      setTimeout(sync, 0);
      setTimeout(sync, 250);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { dirty = true; });
    }
  }

  if (window.matchMedia &&
      matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("[data-scatter]").forEach(initScatter);

  /* ---- Le titre du hero tient dans sa colonne ------------------------------ *
   * Le corps venait d'un clamp en vw, qui ne sait rien de la longueur des
   * mots : à 1350px « COLLECTIVE » débordait et perdait son E, « DIRECTORS »
   * son S. Un mot amputé ne se lit pas comme un choix, il se lit comme une
   * page cassée. On mesure le mot le plus large et on réduit juste assez.
   * Le français a des mots plus longs — RÉALISATEURS — donc ça se recalcule
   * à chaque bascule.
   * -------------------------------------------------------------------------- */

  (function fitHero() {
    var t = document.querySelector(".hero__title");
    if (!t) return;

    function fit() {
      t.style.fontSize = "";                 // repartir de la valeur du CSS
      var words = t.querySelectorAll(".wd");
      if (!words.length) return;
      var avail = t.clientWidth;
      var max = 0;
      words.forEach(function (wd) {
        var r = wd.getBoundingClientRect();
        if (r.width > max) max = r.width;
      });
      if (!max || max <= avail) return;
      var cur = parseFloat(getComputedStyle(t).fontSize);
      t.style.fontSize = Math.floor(cur * (avail / max)) + "px";
    }

    fit();
    addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    onLang(function () { setTimeout(fit, 0); });
  })();
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

    var BRAND = ".brand";
    var ROWS  = ".cast__row";
    /* Plus aucune vignette ici : elles ont toutes la tache pixelisée, qui se
       suffit. Il ne reste que les lignes de la liste des réalisateurs, où le
       remplissage balaie de gauche à droite et où les pixels le devancent. */
    var TILES = "";
    if (!document.querySelector(ROWS) && !document.querySelector(BRAND)) return;

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
    var brandOn = false;
    var brandX = null;      // où le curseur se trouve sur le mot

    // Matches the CSS easing on both shapes, so the pixels ride the same curve
    // the accent does rather than drifting out of step with it.
    function ease(t) { return 1 - Math.pow(1 - t, 3); }

    function add(x, y, vx, vy, col, calm) {
      if (motes.length >= MAX) return;
      motes.push({
        x: x, y: y,
        vx: vx + (Math.random() - .5) * .8,
        vy: vy + (Math.random() - .5) * .8,
        // Chunky rather than confetti: fewer, bigger, gone quicker.
        s: 5 + ((Math.random() * 8) | 0),
        // The hold is the delay: a mote sits at full strength for a spell
        // before it starts to fade, so the wave frays instead of vanishing.
        life: 1 + Math.random() * .35,
        fade: .034 * (.5 + Math.random() * 1.8),
        col: col || PALETTE[(Math.random() * PALETTE.length) | 0],
        calm: !!calm
      });
    }

    /* Les couleurs viennent de la vignette elle-même : ce ne sont pas des
       confettis posés dessus, ce sont des morceaux d'elle. Une image servie
       par YouTube salit le canvas et interdit la lecture — on retombe alors
       sur l'accent, ce qui reste juste plutôt que de ne rien faire. */
    var swatchCache = new WeakMap();

    function swatches(el) {
      if (swatchCache.has(el)) return swatchCache.get(el);
      var out = null;
      var img = el.querySelector("img");
      if (img && img.complete && img.naturalWidth) {
        try {
          var n = 8;
          var oc = document.createElement("canvas");
          oc.width = oc.height = n;
          var ox = oc.getContext("2d", { willReadFrequently: true });
          ox.drawImage(img, 0, 0, n, n);
          var d = ox.getImageData(0, 0, n, n).data;
          out = [];
          for (var i = 0; i < n * n; i++) {
            var o = i * 4;
            out.push("rgb(" + d[o] + "," + d[o + 1] + "," + d[o + 2] + ")");
          }
        } catch (e) { out = null; }     // image distante : canvas sali
      }
      swatchCache.set(el, out);
      return out;
    }

    /* Une colonne qui décroche, pas des flocons. Les pixels d'une même
       colonne partent ensemble, empilés, à la même vitesse : ils descendent
       en bloc et se lisent comme une bande d'image qui glisse. Des vitesses
       individuelles donnaient de la neige — chacun son rythme, chacun sa
       trajectoire, c'est-à-dire de la météo. */
    function fallColumn(x, y, col, slow, hole) {
      var s = 6;
      var run = 3 + ((Math.random() * 4) | 0);          // 3 à 6 pixels de haut
      var vy = (slow ? .8 : 2.2) + Math.random() * (slow ? .5 : 1.4);
      var life = 1 + Math.random() * .25;
      var fade = .034 * (.7 + Math.random() * .8);
      var cc = col || PALETTE[(Math.random() * PALETTE.length) | 0];
      var bx = Math.round(x / s) * s;
      var by = Math.round(y / s) * s;
      for (var i = 0; i < run; i++) {
        if (motes.length >= MAX) return;
        motes.push({
          x: bx, y: by - i * s,
          vx: 0, vy: vy,          // même vitesse : la colonne reste soudée
          s: s,
          life: life, fade: fade,
          col: cc,
          calm: false,
          rigid: true,            // ni gravité ni frottement, sinon elle s'étire
          hole: hole              // la vignette d'origine, où l'on ne peint pas
        });
      }
    }

    /* Une goutte du logo. Tous les carrés partent du même point — le bas des
       lettres — et c'est le retard qui les espace, pas leur position. Les
       poser déjà écartés faisait apparaître le deuxième et le troisième d'un
       coup dans le vide, sans qu'on les ait vus quitter le mot. */
    function drip(x, y) {
      var s = 6;
      var n = 1 + ((Math.random() * 3) | 0);           // un à trois carrés
      var vy = .7 + Math.random() * .5;
      var cc = PALETTE[(Math.random() * PALETTE.length) | 0];
      var bx = Math.round(x / s) * s;
      var by = Math.round(y / s) * s;
      for (var i = 0; i < n; i++) {
        if (motes.length >= MAX) return;
        motes.push({
          x: bx, y: by,
          vx: 0, vy: vy,
          s: s,
          life: 1 + Math.random() * .3,
          fade: .03 * (.7 + Math.random() * .7),
          col: cc,
          calm: false,
          rigid: true,
          // le temps qu'il faut au précédent pour dégager d'une cellule et
          // demie : assez pour qu'on les distingue, assez peu pour que la
          // colonne se lise comme une colonne
          wait: Math.round(i * (s * 1.5) / vy)
        });
      }
    }

    function tick(now) {
      // --- fronts: the moving edges that are currently throwing pixels ------
      for (var f = fronts.length - 1; f >= 0; f--) {
        var fr = fronts[f];
        var t = (now - fr.t0) / fr.dur;
        if (t >= 1) { fronts.splice(f, 1); continue; }
        var p = ease(t);
        var r = fr.r;

        if (fr.kind === "brand") {
          /* Une fuite, pas une bouffée : tant que le curseur reste sur le
             logo, la marque continue de lâcher des pixels. */
          if (!brandOn) { fronts.splice(f, 1); continue; }
          fr.t0 = now;                       // elle ne s'épuise pas d'elle-même
          /* Des gouttes, pas une averse. Six pixels par image tombant chacun
             de son côté faisaient une pluie continue ; le mot lâche maintenant
             une goutte de temps en temps — quelques pixels soudés, calés sur
             un pas fixe, qui descendent ensemble. La grille se lit parce que
             les départs sont alignés et rares, pas parce qu'ils sont nombreux. */
          /* Ça coule de là où on pointe, pas de tout le mot — comme la tache
             sur une vignette ou la brosse sur un portrait. Sans repère de
             curseur (au tout premier instant), on ne lâche rien plutôt que
             d'arroser au hasard. */
          if (brandX === null) continue;
          if (Math.random() < .8) continue;         // une image sur cinq environ
          /* Un pas de 7 pour des carrés de 6 : ils se frôlent sans se
             toucher, donc on lit une trame et pas une suite de bâtons. */
          var PITCH = 7;
          var REACH = 30;                           // largeur de la zone qui goutte
          var x = brandX + (Math.random() - .5) * 2 * REACH;
          x = Math.max(r.left, Math.min(r.right - PITCH, x));
          drip(Math.round((x - r.left) / PITCH) * PITCH + r.left, r.bottom);
          continue;
        }

        if (fr.kind === "row") {
          // The fill's leading edge, sweeping left to right either way: it
          // grows from the left going in, and collapses to the right coming
          // out. Pixels are shoved ahead of it.
          var ex = fr.out ? r.left + r.width * p : r.left + r.width * p;
          // Only on the way out, and only in the fill's own colour. Arriving,
          // the row already has the wipe to carry it; pixels there were noise
          // on top of a gesture that did not need them.
          if (Math.random() < .45) continue;
          add(ex + (Math.random() - .5) * 10,
              r.top + Math.random() * r.height,
              2.6 + Math.random() * 3.4, (Math.random() - .5) * 1.6, PALETTE[0]);
        } else {
          /* Une chute en grille, pas une gerbe. Les colonnes sont calées sur
             un pas fixe et les pixels descendent droit : rien ne part de
             côté, rien n'explose. Ils se détachent du haut de la tuile et
             tombent, comme une image qui perd ses lignes. */
          var STEP = 12;
          var cols = Math.max(2, Math.round(r.width / STEP));
          var gap  = r.width / cols;
          // La couleur du départ : l'accent seul en sortie, la palette à
          // l'arrivée — inchangé, seule la trajectoire change.
          var tc = fr.out ? PALETTE[0] : null;
          /* Une colonne à la fois, et pas à chaque image : peu de départs,
             mais chacun se voit. */
          if (Math.random() < .55) continue;
          var col = (Math.random() * cols) | 0;
          var sw = fr.sw;
          var cc2 = tc || (sw ? sw[(Math.random() * sw.length) | 0] : null);
          fallColumn(r.left + col * gap,
                     r.top + r.height * (.25 + Math.random() * .7),
                     cc2, fr.out, fr.hole);
        }
      }

      // --- the pixels themselves -------------------------------------------
      cx.clearRect(0, 0, innerWidth, innerHeight);
      for (var k = motes.length - 1; k >= 0; k--) {
        var m = motes[k];
        // Pas encore parti : il attend son tour au bas des lettres, sans
        // bouger et sans se peindre.
        if (m.wait > 0) { m.wait--; continue; }
        m.x += m.vx; m.y += m.vy;
        if (m.rigid) {
          // Rien à faire : la colonne descend à vitesse constante et reste
          // solidaire. Ajouter de la gravité l'étirerait, et une colonne qui
          // s'étire redevient une averse.
        } else if (m.calm) {
          // Settling, not scattering: no gravity and heavy damping, so these
          // pile up in the band they were thrown into and stay there.
          m.vx *= .86; m.vy *= .86;
        } else {
          m.vy += .012;
          m.vx *= .99;
        }
        m.life -= m.fade;
        if (m.life <= 0) { motes.splice(k, 1); continue; }
        /* Rien ne se peint sur la vignette d'où ça vient : elle a déjà son
           décalage rose, et des pixels par-dessus la surchargeaient. Ils
           n'apparaissent qu'en sortant d'elle — donc sur les voisines. */
        var h = m.hole;
        if (h && m.x + m.s > h.left && m.x < h.right &&
                 m.y + m.s > h.top  && m.y < h.bottom) continue;
        cx.globalAlpha = m.life > 1 ? 1 : m.life;   // the hold, then the fade
        cx.fillStyle = m.col;
        cx.fillRect(m.x | 0, m.y | 0, m.s, m.s);
      }
      cx.globalAlpha = 1;

      if (motes.length || fronts.length) requestAnimationFrame(tick);
      else running = false;
    }

    function launch(el, kind, out) {
      /* La boîte qui porte l'ombre rose, et elle n'est pas la même des deux
         côtés — le CSS décale `.work` en entier mais seulement `.card__media`
         d'une carte. La poussière doit sortir de ce qui bouge, sinon elle
         part d'un bord qui n'a pas bougé. */
      var box = el.classList.contains("card")
        ? (el.querySelector(".card__media") || el)
        : el;
      var rect = box.getBoundingClientRect();
      fronts.push({
        kind: kind,
        out: out,                         // which way the shape is going
        r: rect,
        sw: kind === "tile" ? swatches(el) : null,
        hole: kind === "tile" ? rect : null,
        t0: performance.now(),
        dur: kind === "row" ? 420 : kind === "brand" ? 1e9 : 190
      });
      if (!running) { running = true; requestAnimationFrame(tick); }
    }

    function wire(sel, kind) {
      document.querySelectorAll(sel).forEach(function (el) {
        // Rows only throw on the way out.
        if (kind !== "row") {
          el.addEventListener("mouseenter", function () { launch(el, kind, false); });
        }
        el.addEventListener("mouseleave", function () { launch(el, kind, true); });
      });
    }
    wire(ROWS, "row");
    if (TILES) wire(TILES, "tile");

    /* Le logo, lui, ne lance pas un front qui s'éteint : il en garde un vivant
       tant qu'on est dessus. C'est la marque qui fabrique les pixels — autant
       que ça se voie. */
    document.querySelectorAll(BRAND).forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        if (brandOn) return;
        brandOn = true;
        launch(el, "brand", false);
      });
      el.addEventListener("mousemove", function (e) { brandX = e.clientX; });
      el.addEventListener("mouseleave", function () {
        brandOn = false;
        brandX = null;
      });
    });
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
   * The portrait arrives mosaicked and the pointer rubs it away. The erasure
   * accumulates: wherever you have already been stays clear, so the picture
   * comes out of the mosaic as you explore it and a second pass over the same
   * spot deepens what the first one started. Nothing is stored — every visit
   * to the page starts fully covered again.
   *
   * Two layers. The veil is only ever erased into, never redrawn, which is why
   * this costs almost nothing; the falling pixels need their own canvas above
   * it, or they would smear permanent trails across the one below.
   * -------------------------------------------------------------------------- */

  (function () {
    if (!window.matchMedia) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* Le même geste sur deux échelles. Un portrait fait 466px de large et
       garde ce qu'on a dégagé ; une vignette en fait 400 dans une grille de
       soixante-neuf — elle se rhabille en partant, sinon la page finit en
       damier à moitié gratté. Les cellules et la brosse suivent la taille :
       une brosse de 96px sur une vignette la découvrirait d'un seul passage. */
    function mosaic(box, o) {
      var BLOCK = o.block;
      var BRUSH = o.brush;
      var img = box.querySelector("img");
      if (!img) return;

      function layer(cls) {
        var c = document.createElement("canvas");
        c.className = cls;
        c.setAttribute("aria-hidden", "true");
        box.appendChild(c);
        return c;
      }
      var cv = layer("px-veil"), cx = cv.getContext("2d");
      var fc = layer("px-fall"), fx = fc.getContext("2d");
      var off = document.createElement("canvas"), ox = off.getContext("2d");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      var w = 0, h = 0, lw = 0, lh = 0;
      var noise = null, mdata = null, ready = false;
      // How much veil each cell still has: 1 untouched, 0 rubbed through.
      var remain = null;
      var falling = [], running = false;

      function build() {
        var b = cv.getBoundingClientRect();
        w = b.width; h = b.height;
        if (!w || !img.naturalWidth) return;

        [cv, fc].forEach(function (c) {
          c.width = Math.max(1, Math.round(w * dpr));
          c.height = Math.max(1, Math.round(h * dpr));
        });
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        fx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx.imageSmoothingEnabled = false;   // the upscale is the whole point
        fx.imageSmoothingEnabled = false;

        lw = Math.max(2, Math.round(w / BLOCK));
        lh = Math.max(2, Math.round(h / BLOCK));
        off.width = lw; off.height = lh;
        ox.imageSmoothingEnabled = true;    // clean on the way down

        // object-fit: cover, matched — otherwise the mosaic sits out of
        // register with the photograph underneath it.
        var ir = img.naturalWidth / img.naturalHeight, br = w / h;
        var sw = ir > br ? img.naturalHeight * br : img.naturalWidth;
        var sh = ir > br ? img.naturalHeight : img.naturalWidth / br;
        ox.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2,
                     sw, sh, 0, 0, lw, lh);

        mdata = ox.getImageData(0, 0, lw, lh).data;

        // One fixed value per cell. Rolled per frame the rim would boil; rolled
        // once, every cell has its own steady appetite.
        noise = new Float32Array(lw * lh);
        for (var n = 0; n < noise.length; n++) noise[n] = Math.random();
        remain = new Float32Array(lw * lh).fill(1);

        cx.clearRect(0, 0, w, h);
        cx.drawImage(off, 0, 0, w, h);
        ready = true;
      }

      if (img.complete && img.naturalWidth) build();
      else img.addEventListener("load", build, { once: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
      addEventListener("resize", build);   // a resize restarts the picture covered

      function fall() {
        fx.clearRect(0, 0, w, h);
        for (var i = falling.length - 1; i >= 0; i--) {
          var f = falling[i];
          f.y += f.vy;
          f.vy += .22;
          f.life -= .014;
          if (f.life <= 0 || f.y > h) { falling.splice(i, 1); continue; }
          fx.globalAlpha = f.life > 1 ? 1 : f.life;
          fx.fillStyle = f.col;
          fx.fillRect(f.x | 0, f.y | 0, f.s, f.s);
        }
        fx.globalAlpha = 1;
        if (falling.length) requestAnimationFrame(fall);
        else running = false;
      }

      box.addEventListener("mousemove", function (e) {
        if (!ready) return;
        var b = cv.getBoundingClientRect();
        var mx = e.clientX - b.left, my = e.clientY - b.top;
        var cw = w / lw, chh = h / lh;

        // Rub, a cell at a time, so the cleared edge is built from the same
        // blocks as the mosaic and comes out chewed rather than compass-drawn.
        // Partial alpha, so passing again over the same place clears it further.
        var i0 = Math.max(0, ((mx - BRUSH) / cw) | 0);
        var i1 = Math.min(lw - 1, ((mx + BRUSH) / cw) | 0);
        var j0 = Math.max(0, ((my - BRUSH) / chh) | 0);
        var j1 = Math.min(lh - 1, ((my + BRUSH) / chh) | 0);
        cx.globalCompositeOperation = "destination-out";
        cx.fillStyle = "#000";
        for (var j = j0; j <= j1; j++) {
          for (var i = i0; i <= i1; i++) {
            var dx = (i + .5) * cw - mx, dy = (j + .5) * chh - my;
            var d = Math.sqrt(dx * dx + dy * dy);
            var nz = noise[j * lw + i];
            var edge = BRUSH * (.55 + .5 * nz);
            if (d > edge) continue;
            var al = (1 - d / edge) * (.18 + .3 * nz);
            if (al < .02) continue;              // not worth a draw call
            cx.globalAlpha = al;
            cx.fillRect(i * cw, j * chh, cw + .5, chh + .5);
            // Mirror the compositing so we know, without reading the canvas
            // back, how much of each cell is left.
            remain[j * lw + i] *= (1 - al);
          }
        }
        cx.globalAlpha = 1;
        cx.globalCompositeOperation = "source-over";

        // A cell or two comes away with it, from the rim where the mosaic is
        // still breaking up, and drops straight down.
        if (mdata && falling.length < 70) {
          for (var k = 0; k < 2; k++) {
            if (Math.random() > .30) continue;   // a third fewer than before
            var ang = Math.random() * Math.PI * 2;
            var rad = BRUSH * (.5 + Math.random() * .5);
            var ci = ((mx + Math.cos(ang) * rad) / cw) | 0;
            var cj = ((my + Math.sin(ang) * rad) / chh) | 0;
            if (ci < 0 || cj < 0 || ci >= lw || cj >= lh) continue;
            // Nothing falls out of a patch already rubbed clear — there is no
            // mosaic left there to come away.
            if (remain[cj * lw + ci] < .45) continue;
            var o = (cj * lw + ci) * 4;
            falling.push({
              x: ci * cw, y: cj * chh,
              vy: .4 + Math.random() * 1.1,
              s: Math.max(3, Math.round(cw)),
              life: 1 + Math.random() * .6,
              col: "rgb(" + mdata[o] + "," + mdata[o + 1] + "," + mdata[o + 2] + ")"
            });
          }
          if (falling.length && !running) { running = true; requestAnimationFrame(fall); }
        }
      });

    }

    document.querySelectorAll(".profile__portrait").forEach(function (box) {
      mosaic(box, { block: 13, brush: 96 });
    });

    /* Les vignettes, elles, arrivent nettes et le restent. Au survol, une
       tache pixelisée se peint sous le curseur — l'inverse du portrait, où
       l'on enlève un voile — et elle s'efface derrière lui, donc c'est bien
       une zone qui suit la souris et non une couverture qui s'accumule. Les
       pixels qui en tombent sont échantillonnés dans l'image, aux couleurs
       de l'endroit exact où ils se détachent. */
    document.querySelectorAll(".work__media, .card__media").forEach(function (media) {
      var img = media.querySelector("img");
      if (!img) return;

      var BLOCK = 9;     // côté d'une cellule, en px écran
      var BRUSH = 44;    // rayon de la tache
      var FADE  = .07;   // ce qu'elle perd par image

      var cv, cx, off, ox, noise, mdata;
      var w = 0, h = 0, lw = 0, lh = 0, dpr = Math.min(devicePixelRatio || 1, 2);
      var ready = false, live = false, inside = false;
      var falling = [];

      function build() {
        var b = media.getBoundingClientRect();
        if (!b.width || !img.naturalWidth) return false;
        if (ready && Math.abs(b.width - w) < 1) return true;

        w = b.width; h = b.height;
        if (!cv) {
          cv = document.createElement("canvas");
          cv.className = "px-patch";
          cv.setAttribute("aria-hidden", "true");
          media.appendChild(cv);
          cx = cv.getContext("2d");
          off = document.createElement("canvas");
          ox = off.getContext("2d", { willReadFrequently: true });
        }
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        cv.style.width = w + "px"; cv.style.height = h + "px";
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx.imageSmoothingEnabled = false;

        // Une version basse définition : c'est elle qu'on agrandit, cellule
        // par cellule, plutôt que de flouter l'image à la volée.
        lw = Math.max(1, Math.round(w / BLOCK));
        lh = Math.max(1, Math.round(h / BLOCK));
        off.width = lw; off.height = lh;
        ox.imageSmoothingEnabled = false;
        ox.drawImage(img, 0, 0, lw, lh);
        try { mdata = ox.getImageData(0, 0, lw, lh).data; }
        catch (e) { mdata = null; }        // image d'un autre domaine

        // Un grain fixe par cellule : tiré à chaque image, le bord bouillonne.
        noise = new Float32Array(lw * lh);
        for (var n = 0; n < noise.length; n++) noise[n] = Math.random();
        ready = true;
        return true;
      }

      function frame() {
        // La tache s'efface d'elle-même : sans ça, promener le curseur
        // finirait par pixeliser toute la vignette.
        cx.globalCompositeOperation = "destination-out";
        cx.fillStyle = "rgba(0,0,0," + FADE + ")";
        cx.fillRect(0, 0, w, h);
        cx.globalCompositeOperation = "source-over";

        for (var i = falling.length - 1; i >= 0; i--) {
          var f = falling[i];
          f.y += f.vy;
          f.vy += .16;
          f.life -= .022;
          if (f.life <= 0 || f.y > h) { falling.splice(i, 1); continue; }
          cx.globalAlpha = f.life > 1 ? 1 : f.life;
          cx.fillStyle = f.col;
          cx.fillRect(f.x | 0, f.y | 0, f.s, f.s);
        }
        cx.globalAlpha = 1;

        if (inside || falling.length) requestAnimationFrame(frame);
        else { live = false; cx.clearRect(0, 0, w, h); }
      }

      media.addEventListener("mouseenter", function () { inside = true; });
      media.addEventListener("mouseleave", function () { inside = false; });

      media.addEventListener("mousemove", function (e) {
        if (!build()) return;
        var b = media.getBoundingClientRect();
        var mx = e.clientX - b.left, my = e.clientY - b.top;
        var cw = w / lw, ch = h / lh;

        var i0 = Math.max(0, ((mx - BRUSH) / cw) | 0);
        var i1 = Math.min(lw - 1, ((mx + BRUSH) / cw) | 0);
        var j0 = Math.max(0, ((my - BRUSH) / ch) | 0);
        var j1 = Math.min(lh - 1, ((my + BRUSH) / ch) | 0);

        for (var j = j0; j <= j1; j++) {
          for (var i = i0; i <= i1; i++) {
            var dx = (i + .5) * cw - mx, dy = (j + .5) * ch - my;
            var d = Math.sqrt(dx * dx + dy * dy);
            var nz = noise[j * lw + i];
            // Le bord est mangé par le grain : un disque net ferait compas.
            var edge = BRUSH * (.55 + .5 * nz);
            if (d > edge) continue;
            var al = Math.min(1, (1 - d / edge) * (.55 + .5 * nz));
            if (al < .04) continue;
            cx.globalAlpha = al;
            cx.drawImage(off, i, j, 1, 1, i * cw, j * ch, cw + .5, ch + .5);
          }
        }
        cx.globalAlpha = 1;

        // Une cellule ou deux se détachent du pourtour et tombent, dans la
        // couleur qu'elles avaient là où elles étaient.
        if (mdata && falling.length < 40) {
          for (var k = 0; k < 2; k++) {
            if (Math.random() > .34) continue;
            var ang = Math.random() * Math.PI * 2;
            var rad = BRUSH * (.45 + Math.random() * .55);
            var ci = ((mx + Math.cos(ang) * rad) / cw) | 0;
            var cj = ((my + Math.sin(ang) * rad) / ch) | 0;
            if (ci < 0 || cj < 0 || ci >= lw || cj >= lh) continue;
            var o = (cj * lw + ci) * 4;
            falling.push({
              x: ci * cw, y: cj * ch,
              vy: .3 + Math.random() * .9,
              s: Math.max(3, Math.round(cw)),
              life: 1 + Math.random() * .5,
              col: "rgb(" + mdata[o] + "," + mdata[o + 1] + "," + mdata[o + 2] + ")"
            });
          }
        }

        if (!live) { live = true; requestAnimationFrame(frame); }
      });

      addEventListener("resize", function () { ready = false; });
    });
  })();

  /* ---- Images resolve out of a mosaic -------------------------------------- *
   * A picture arrives coarse and steps down to itself — 24px cells, then 12, 6,
   * 3, then gone. Framed media only, where the container already reserves the
   * space, so nothing moves while it happens.
   *
   * The veil is drawn from the image itself, so there is no second file to
   * fetch and nothing to keep in sync. It only runs for pictures that are on
   * screen when they land: one that loaded far below the fold has nothing to
   * reveal by the time you reach it, and the canvas is thrown away after.
   * -------------------------------------------------------------------------- */

  (function () {
    if (!window.matchMedia || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var STEPS = [24, 12, 6, 3];
    var HOLD  = 90;     // ms per step
    var SEL   = ".work__media > img, .card__media > img, .shot > img, .mosaic figure > img";

    function resolve(img) {
      var host = img.parentElement;
      if (!host || img.dataset.pxDone) return;
      img.dataset.pxDone = "1";

      var b = img.getBoundingClientRect();
      if (!b.width || !b.height || !img.naturalWidth) return;

      var cv = document.createElement("canvas");
      cv.className = "px-load";
      cv.setAttribute("aria-hidden", "true");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width  = Math.max(1, Math.round(b.width * dpr));
      cv.height = Math.max(1, Math.round(b.height * dpr));
      var cx = cv.getContext("2d");
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.imageSmoothingEnabled = false;

      var off = document.createElement("canvas"), ox = off.getContext("2d");
      // object-fit: cover, matched, or the mosaic sits out of register with
      // the photograph it is standing in for.
      var ir = img.naturalWidth / img.naturalHeight, br = b.width / b.height;
      var sw = ir > br ? img.naturalHeight * br : img.naturalWidth;
      var sh = ir > br ? img.naturalHeight : img.naturalWidth / br;
      var sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;

      function paint(block) {
        var lw = Math.max(2, Math.round(b.width / block));
        var lh = Math.max(2, Math.round(b.height / block));
        off.width = lw; off.height = lh;
        ox.imageSmoothingEnabled = true;
        ox.drawImage(img, sx, sy, sw, sh, 0, 0, lw, lh);
        cx.clearRect(0, 0, b.width, b.height);
        cx.drawImage(off, 0, 0, b.width, b.height);
      }

      paint(STEPS[0]);
      // The veil is absolutely positioned, so its host has to be the
      // containing block. A figure in the article mosaic is not positioned,
      // and the canvas escaped to the section — filling the viewport.
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.appendChild(cv);

      var i = 0;
      (function step() {
        i++;
        if (i >= STEPS.length) {
          cv.style.transition = "opacity .18s var(--ease, ease)";
          cv.style.opacity = "0";
          setTimeout(function () { cv.remove(); }, 220);
          return;
        }
        paint(STEPS[i]);
        setTimeout(step, HOLD);
      })();
      setTimeout(function () {}, 0);
    }

    var io = window.IntersectionObserver && new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.complete && e.target.naturalWidth) resolve(e.target);
        else e.target.addEventListener("load", function () { resolve(e.target); }, { once: true });
      });
    }, { rootMargin: "0px" });

    document.querySelectorAll(SEL).forEach(function (img) {
      if (io) io.observe(img);
    });
  })();

  /* ---- Section numerals become stacks of pixels ---------------------------- *
   * 01, 02, 03 counted out in squares instead of set in digits — the index is
   * the one place the site can say what it is made of without a caption. The
   * digits stay in the markup for anyone listening rather than looking.
   * -------------------------------------------------------------------------- */

  document.querySelectorAll(".shead > .num").forEach(function (el) {
    var txt = (el.textContent || "").trim();
    var n = parseInt(txt, 10);
    /* Une plage garde ses chiffres. Le garde-fou ne tenait que par le nombre
       lu en tête : « 01 — 110 » commence par 1, passait donc pour une section
       et se retrouvait réduit à quatre pixels — alors que c'est un compte de
       photos, la seule chose que ce libellé ait à dire. */
    if (/\d\s*[—–-]\s*\d/.test(txt)) return;
    if (n > 12) return;
    if (!n) {
      /* Les pages sans numéro portaient un pictogramme — ↯ pour Backstage,
         ✆ pour Contact. Un glyphe de police au milieu d'un site qui parle de
         pixels détonnait. On lui fabrique son propre amas, tiré de ses
         caractères : toujours le même pour un signe donné, différent d'un
         signe à l'autre. */
      if (!txt) return;
      n = 0;
      for (var c = 0; c < txt.length; c++) n = (n * 31 + txt.charCodeAt(c)) >>> 0;
      n = 1 + (n % 4);                     // même densité que les sections
                                           // numérotées : 4 à 7 cellules
    }
    el.classList.add("numstack");
    el.setAttribute("aria-label", String(n));
    // A small cluster rather than a column: n cells lit inside a 3x4 grid,
    // each in one of three tints of the accent. Deterministic — the same
    // section always draws the same glyph — but shaped like a pixel doodle
    // rather than a bar chart.
    var CELLS = 12, seed = n * 2654435761;
    var pick = [];
    for (var i = 0; i < CELLS; i++) {
      seed = (seed ^ (seed << 13)) >>> 0;
      seed = (seed ^ (seed >>> 17)) >>> 0;
      pick.push({ i: i, r: seed % 1000 });
    }
    pick.sort(function (a, b) { return a.r - b.r; });
    var lit = {};
    pick.slice(0, Math.min(CELLS, n + 3)).forEach(function (c, k) {
      lit[c.i] = k % 3;                    // three shades, cycled
    });

    var out = '<span class="vh">' + el.textContent.trim() + "</span>";
    for (var j = 0; j < CELLS; j++) {
      out += j in lit ? '<i data-s="' + lit[j] + '"></i>' : "<i></i>";
    }
    el.innerHTML = out;
  });

  /* ---- Enquiry tabs --------------------------------------------------------- *
   * One form, four ways in. The chosen tab sets the subject line the message
   * arrives under and rewrites the message prompt, so each kind of enquiry is
   * asked for what it actually needs. Without JS the first tab is already
   * marked selected and the hidden subject already carries its value, so the
   * form is unchanged rather than broken.
   * -------------------------------------------------------------------------- */

  (function () {
    var tabs = document.querySelectorAll(".ctabs [role='tab']");
    var form = document.getElementById("contactForm");
    if (!tabs.length || !form) return;
    var subject = form.querySelector('[name="subject"]');
    var msg = form.querySelector('[name="message"]');

    var extra = form.querySelector(".cf-extra");

    // What each enquiry actually needs asked. A submission has no budget and a
    // quote has no showreel, so the fields follow the tab rather than sitting
    // there greyed out.
    /* What each enquiry actually needs asked. A submission has no budget and a
       quote has no showreel, so the fields follow the tab rather than sitting
       there greyed out. Every label and option carries its French beside it —
       these are built, so there is no markup for the CSS to hide. */
    function F(en, fr) { return [en, fr]; }
    var FIELDS = {
      "Production enquiry": [
        ["timing", F("When", "Quand"), [F("As soon as possible", "Dès que possible"),
          F("Within a month", "Dans le mois"), F("This quarter", "Ce trimestre"),
          F("Just planning ahead", "Simple anticipation")]],
        ["scale", F("Scale", "Ampleur"), [F("One shoot, one day", "Un tournage, un jour"),
          F("A few days", "Quelques jours"), F("A full production", "Une production complète"),
          F("A campaign, several pieces", "Une campagne, plusieurs films")]],
        ["kind", F("What", "Quoi"), [F("Music video", "Clip"), F("Fashion film", "Film de mode"),
          F("Commercial", "Publicité"), F("Live / event", "Live / événement"),
          F("Something else", "Autre chose")]],
        ["where", F("Where", "Où"), [F("Los Angeles", "Los Angeles"), F("Paris", "Paris"),
          F("Elsewhere in the US", "Ailleurs aux États-Unis"),
          F("Elsewhere in Europe", "Ailleurs en Europe"), F("Further afield", "Plus loin")]]
      ],
      "Quote request": [
        ["timing", F("Needed by", "Pour quand"), [F("This week", "Cette semaine"),
          F("This month", "Ce mois-ci"), F("This quarter", "Ce trimestre"),
          F("No fixed date", "Pas de date fixée")]],
        ["scale", F("Scale", "Ampleur"), [F("One shoot, one day", "Un tournage, un jour"),
          F("A few days", "Quelques jours"), F("A full production", "Une production complète"),
          F("A campaign, several pieces", "Une campagne, plusieurs films")]],
        ["budget", F("Budget", "Budget"), [F("Under 10k", "Moins de 10k"), F("10 – 30k", "10 – 30k"),
          F("30 – 80k", "30 – 80k"), F("80k and up", "80k et plus"),
          F("Rather discuss it", "Préfère en parler")]],
        ["stage", F("Stage", "Avancement"), [F("Just an idea", "Une idée"),
          F("Treatment written", "Note d’intention écrite"), F("Script locked", "Scénario validé"),
          F("Ready to shoot", "Prêt à tourner")]]
      ],
      "Artist submission": [
        ["craft", F("You are", "Vous êtes"), [F("Director", "Réalisateur"), F("DP", "Chef opérateur"),
          F("Editor", "Monteur"), F("Animator / 3D", "Animateur / 3D"), F("Musician", "Musicien"),
          F("Something else", "Autre chose")]],
        ["based", F("Based in", "Basé à"), [F("Los Angeles", "Los Angeles"), F("Paris", "Paris"),
          F("Elsewhere in the US", "Ailleurs aux États-Unis"),
          F("Elsewhere in Europe", "Ailleurs en Europe"), F("Further afield", "Plus loin")]],
        ["years", F("Doing it", "Depuis"), [F("Just starting", "Les débuts"),
          F("A few years", "Quelques années"), F("Five years or more", "Cinq ans ou plus"),
          F("A long time", "Longtemps")]]
      ],
      "Something else": []
    };

    function render(topic) {
      if (!extra) return;
      extra.innerHTML = (FIELDS[topic] || []).map(function (f) {
        var label = T(f[1][0], f[1][1]);
        return '<label class="vh" for="cf-' + f[0] + '">' + label + "</label>" +
               '<select id="cf-' + f[0] + '" name="' + f[0] + '">' +
               '<option value="">' + label + T(" — pick one", " — au choix") + "</option>" +
               f[2].map(function (o) { return "<option>" + T(o[0], o[1]) + "</option>"; }).join("") +
               "</select>";
      }).join("");
    }

    function current() {
      var on = document.querySelector(".ctabs [aria-selected='true']");
      return on || tabs[0];
    }
    function prompt(tab) {
      return T(tab.getAttribute("data-prompt") || "Your message",
               tab.getAttribute("data-prompt-fr") || "Votre message");
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
        var topic = tab.getAttribute("data-topic") || "";
        if (subject) subject.value = topic;
        if (msg) msg.placeholder = prompt(tab);
        render(topic);
      });
    });

    /* Changer de langue refait les champs du sujet en cours, sans rien perdre
       de ce qui est déjà tapé ailleurs. */
    onLang(function () {
      var tab = current();
      if (msg) msg.placeholder = prompt(tab);
      render(tab.getAttribute("data-topic") || (subject ? subject.value : ""));
    });

  })();

  /* ---- Post photographs join the lightbox ---------------------------------- *
   * The pictures in an article body were the only framed images on the site
   * you could not open. Wrapping them here rather than in the markup keeps
   * both posts as plain <figure><img>, and puts them in the same set as the
   * contact sheet below, so one walk covers the whole post.
   * -------------------------------------------------------------------------- */

  document.querySelectorAll(".mosaic figure > img").forEach(function (img) {
    var src = img.getAttribute("src");
    if (!src || img.closest("[data-shot]")) return;
    var a = document.createElement("a");
    a.className = "shot-inline";
    a.href = src;
    a.setAttribute("data-shot", "");
    var cap = img.closest("figure").querySelector("figcaption");
    if (cap) a.setAttribute("data-caption", cap.textContent.trim());
    img.parentNode.insertBefore(a, img);
    a.appendChild(img);
  });

  /* ---- Filtering a work grid ------------------------------------------------ *
   * Built only where a grid is long enough to need it. Search reads the title
   * and the client; the category and artist lists are built from the values
   * actually on the tiles, so a grid never offers a filter that would return
   * nothing. The artist comes straight off the client line already in the
   * markup — no second source to keep in step.
   *
   * Dates are never shown — the work stays undated on the page — but they are
   * carried on the tiles so the grid can be ordered by them. Anything with no
   * date on record sinks to the bottom either way rather than being hidden:
   * roughly half the archive predates any note of when it was made.
   * -------------------------------------------------------------------------- */

  document.querySelectorAll(".sheet").forEach(function (sheet) {
    var tiles = [].slice.call(sheet.querySelectorAll(".work"));
    if (tiles.length < 8) return;

    function values(attr) {
      var seen = {};
      tiles.forEach(function (t) {
        var v = t.getAttribute(attr);
        if (v) seen[v] = 1;
      });
      return Object.keys(seen).sort();
    }
    var cats   = values("data-cat");
    var styles = values("data-style");
    var locs   = values("data-loc");

    /* Une ligne de crédit porte souvent plusieurs noms — « Prost / 4thsex »,
       « Loko & Chris Taylor », « Loko ft. BR Crew ». Comparer la ligne entière
       fabriquait une entrée par combinaison, et chercher 4thsex ne sortait que
       le film où il est seul. On découpe, donc chaque artiste existe une fois
       et un film partagé répond aux deux. */
    function artistsOf(t) {
      var c = t.querySelector(".work__client");
      if (!c) return [];
      return c.textContent.split(/\s*(?:\/|&|,|feat\.|ft\.)\s*/i)
              .map(function (x) { return x.trim(); })
              .filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    }
    var artists = (function () {
      var seen = {};
      tiles.forEach(function (t) { artistsOf(t).forEach(function (a) { seen[a] = 1; }); });
      return Object.keys(seen).sort(function (a, b) {
        return a.localeCompare(b, undefined, { sensitivity: "base" });
      });
    })();

    function options(list, label) {
      return '<option value="">' + label + "</option>" +
             list.map(function (v) {
               return '<option value="' + v + '">' + v + "</option>";
             }).join("");
    }

    var bar = document.createElement("div");
    bar.className = "wfilter";
    bar.innerHTML =
      '<input type="search" class="wfilter__q" aria-label="Search work">' +
      (cats.length > 1 ? '<select class="wfilter__cat" aria-label="Category">' + options(cats, "") + "</select>" : "") +
      (styles.length > 1 ? '<select class="wfilter__style" aria-label="Musical style">' + options(styles, "") + "</select>" : "") +
      (locs.length > 1 ? '<select class="wfilter__loc" aria-label="Location">' + options(locs, "") + "</select>" : "") +
      (artists.length > 1 ? '<select class="wfilter__artist" aria-label="Artist">' + options(artists, "") + "</select>" : "") +
      '<button type="button" class="wfilter__sort" data-dir="desc"></button>' +
      '<p class="wfilter__count meta" aria-live="polite"></p>' +
      '<button type="button" class="wfilter__clear" hidden ' +
      'aria-label="Clear the filters" title="Clear the filters">×</button>';
    sheet.parentNode.insertBefore(bar, sheet);

    var q = bar.querySelector(".wfilter__q");
    var cat = bar.querySelector(".wfilter__cat");
    var sty = bar.querySelector(".wfilter__style");
    var loc = bar.querySelector(".wfilter__loc");
    var art = bar.querySelector(".wfilter__artist");
    var sort = bar.querySelector(".wfilter__sort");
    var count = bar.querySelector(".wfilter__count");
    var clear = bar.querySelector(".wfilter__clear");

    /* Les libellés se refont à chaque changement de langue ; les valeurs des
       options, elles, sont des données et ne se traduisent pas. */
    onLang(function () {
      q.placeholder = T("Search a title or a client", "Chercher un titre ou un artiste");
      if (cat) cat.options[0].text = T("All categories", "Toutes catégories");
      if (sty) sty.options[0].text = T("All styles", "Tous styles");
      if (loc) loc.options[0].text = T("All locations", "Tous lieux");
      if (art) art.options[0].text = T("All artists", "Tous artistes");
      sort.textContent = sort.getAttribute("data-dir") === "asc"
        ? T("Oldest first", "Plus anciens d’abord")
        : T("Newest first", "Plus récents d’abord");
      clear.setAttribute("aria-label", T("Clear the filters", "Effacer les filtres"));
      clear.title = T("Clear the filters", "Effacer les filtres");

      /* Seule l'etiquette bouge : la valeur reste celle de la tuile, donc
         changer de langue ne perd pas le filtre en cours. */
      [cat, sty, loc].forEach(function (sel) {
        if (!sel) return;
        var keep = sel.value;
        var rest = [].slice.call(sel.options, 1);
        rest.forEach(function (o) { o.text = L(o.value); });
        /* Retrie sur ce qui est lu, pas sur la valeur : en français, un menu
           classé selon les mots anglais met « Variété française » avant
           « Rap français », ce qui n'a l'air de rien mais se remarque. */
        rest.sort(function (a, b) {
          return a.text.localeCompare(b.text, LANG, { sensitivity: "base" });
        }).forEach(function (o) { sel.appendChild(o); });
        sel.value = keep;
      });
      apply();
    });

    function text(t) {
      var a = t.querySelector(".work__title"), b = t.querySelector(".work__client");
      return ((a ? a.textContent : "") + " " + (b ? b.textContent : "")).toLowerCase();
    }

    function apply() {
      var term = (q.value || "").trim().toLowerCase();
      var c = cat ? cat.value : "", a = art ? art.value : "";
      var st = sty ? sty.value : "", lo = loc ? loc.value : "";
      var shown = 0;
      tiles.forEach(function (t) {
        var ok = (!term || text(t).indexOf(term) > -1) &&
                 (!c || t.getAttribute("data-cat") === c) &&
                 (!st || t.getAttribute("data-style") === st) &&
                 (!lo || t.getAttribute("data-loc") === lo) &&
                 (!a || artistsOf(t).indexOf(a) > -1);
        t.hidden = !ok;
        if (ok) shown++;
      });

      var dir = sort.getAttribute("data-dir") === "asc" ? 1 : -1;
      tiles.slice().sort(function (a, b) {
        var ya = a.getAttribute("data-year"), yb = b.getAttribute("data-year");
        if (!ya && !yb) return 0;
        if (!ya) return 1;              // undated sinks, whichever way round
        if (!yb) return -1;
        return (ya - yb) * dir;
      }).forEach(function (t) { sheet.appendChild(t); });

      count.textContent = shown === tiles.length
        ? tiles.length + T(" pieces", " films")
        : shown + T(" of ", " sur ") + tiles.length;

      /* Nothing to undo, nothing to show. The button only appears once a
         filter is actually narrowing the grid. */
      clear.hidden = !(term || c || st || lo || a);
    }

    q.addEventListener("input", apply);
    if (cat) cat.addEventListener("change", apply);
    if (sty) sty.addEventListener("change", apply);
    if (loc) loc.addEventListener("change", apply);
    if (art) art.addEventListener("change", apply);
    /* Clears the filters, not the sort: the sort has its own label saying
       what it is doing, and silently flipping it back would be a surprise. */
    clear.addEventListener("click", function () {
      q.value = "";
      [cat, sty, loc, art].forEach(function (el) { if (el) el.value = ""; });
      apply();
      q.focus();
    });

    sort.addEventListener("click", function () {
      var asc = sort.getAttribute("data-dir") === "asc";
      sort.setAttribute("data-dir", asc ? "desc" : "asc");
      sort.textContent = asc
        ? T("Newest first", "Plus récents d’abord")
        : T("Oldest first", "Plus anciens d’abord");
      apply();
    });
    apply();
  });

  /* ---- Year stamp -------------------------------------------------------- */

  /* The empty value matters: `<span data-year>` is the footer marker asking to
     be filled, while `data-year="2016"` on a work tile is data for the sort.
     Selecting on [data-year] alone matches both and empties every dated tile
     onto the floor. */
  document.querySelectorAll('[data-year=""]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
