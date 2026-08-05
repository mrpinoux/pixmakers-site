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

  /* ---- Video lightbox ------------------------------------------------------ *
   * Clips play on the site, on black, instead of sending anyone to YouTube.
   * Markup: data-video="youtube:dQw4w9WgXcQ" or "vimeo:123456789" on the tile
   * link. The href stays as the fallback for no-JS and middle-click.
   * -------------------------------------------------------------------------- */

  var lb, lbFrame, lastFocus;

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
    lb.setAttribute("aria-label", "Video player");
    lb.innerHTML =
      '<button class="lb__close" type="button" aria-label="Close"></button>' +
      '<div class="lb__frame"></div>';
    lbFrame = lb.querySelector(".lb__frame");
    document.body.appendChild(lb);

    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.closest(".lb__close")) closeLightbox();
    });
  }

  function openLightbox(url) {
    if (!lb) buildLightbox();
    lastFocus = document.activeElement;
    lbFrame.innerHTML =
      '<iframe src="' + url + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    lb.classList.add("is-on");
    document.body.style.overflow = "hidden";
    lb.querySelector(".lb__close").focus();
  }

  function closeLightbox() {
    if (!lb || !lb.classList.contains("is-on")) return;
    lb.classList.remove("is-on");
    lbFrame.innerHTML = "";          // stops playback
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-video]");
    if (!trigger) return;
    var url = embedUrl(trigger.getAttribute("data-video"));
    if (!url) return;                // no id yet — let the link behave normally
    e.preventDefault();
    openLightbox(url);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
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

  var CLOCKS = [
    { city: "Los Angeles", tz: "America/Los_Angeles" },
    { city: "Paris",       tz: "Europe/Paris" }
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
        return '<div class="clock">' + clockFace() +
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

  /* ---- Year stamp -------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
