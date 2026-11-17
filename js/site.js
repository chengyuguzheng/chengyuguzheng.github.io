/* Shared behaviour for all three design options:
   language toggle, links, photo/video slots, booking form, strings, motion. */
(function () {
  'use strict';
  var SITE = window.SITE || {};
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  // Motion is skipped for visitors who ask for reduced motion (or with ?motion=off for testing)
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=off/.test(location.search);

  /* ---------- 1. Language toggle (EN / 中文) ---------- */
  var MESSAGES = {
    en: { sending: 'Sending…', sent: 'Thank you. Your request is on its way and I will reply soon.',
          failed: 'Something went wrong. Please email me directly instead.',
          mail: 'Your email app should now be open with the request ready to send.',
          missing: 'Please fill in your name, email and a short message.' },
    zh: { sending: '发送中…', sent: '谢谢！预约请求已发送，我会尽快回复。',
          failed: '发送失败，请直接发邮件联系我。',
          mail: '邮件应用已打开，请确认后发送。',
          missing: '请填写姓名、邮箱和留言。' }
  };
  var lang = 'en';
  try { lang = localStorage.getItem('lang') || lang; } catch (e) {}

  $$('[data-zh]').forEach(function (el) { el.dataset.en = el.innerHTML; });
  $$('[data-zh-placeholder]').forEach(function (el) { el.dataset.enPlaceholder = el.placeholder; });
  var titleEn = document.title;

  function setLang(next) {
    lang = next === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    $$('[data-zh]').forEach(function (el) {
      el.innerHTML = lang === 'zh' ? el.dataset.zh : el.dataset.en;
      if (el.hasAttribute('data-split')) splitChars(el);
    });
    $$('[data-zh-placeholder]').forEach(function (el) {
      el.placeholder = lang === 'zh' ? el.dataset.zhPlaceholder : el.dataset.enPlaceholder;
    });
    document.title = lang === 'zh' ? (SITE.titleZh || '古筝演奏家') : titleEn;
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }
  function splitChars(el) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    // Letters animate one by one, but each word stays together when the line wraps
    el.innerHTML = text.split(' ').map(function (word) {
      return '<span class="word" aria-hidden="true" style="display:inline-block;white-space:nowrap">' +
        word.split('').map(function (c) { return '<span class="ch">' + c + '</span>'; }).join('') + '</span>';
    }).join(' ');
  }
  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang); });
  });
  setLang(lang);

  /* ---------- 2. Email / Instagram / LinkedIn buttons ---------- */
  $$('[data-link]').forEach(function (a) {
    var kind = a.dataset.link;
    if (kind === 'email' && SITE.email) a.href = 'mailto:' + SITE.email;
    else if (SITE[kind]) a.href = SITE[kind];
  });
  $$('.year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- 3. Photo and video slots ----------
     A placeholder stays visible until the named file exists. */
  $$('[data-photo]').forEach(function (fig) {
    var img = new Image();
    img.alt = '';
    img.onload = function () { fig.classList.add('filled'); fig.insertBefore(img, fig.firstChild); };
    img.src = fig.dataset.photo;
  });
  $$('[data-video]').forEach(function (fig) {
    if (fig.dataset.embed) {
      var frame = document.createElement('iframe');
      frame.src = fig.dataset.embed;
      frame.allow = 'accelerometer; encrypted-media; picture-in-picture; fullscreen';
      frame.loading = 'lazy';
      frame.title = 'Performance video';
      fig.classList.add('filled');
      fig.insertBefore(frame, fig.firstChild);
      return;
    }
    var v = document.createElement('video');
    v.controls = true; v.preload = 'metadata'; v.playsInline = true;
    v.addEventListener('loadedmetadata', function () { fig.classList.add('filled'); fig.insertBefore(v, fig.firstChild); });
    v.src = fig.dataset.video;
  });

  /* ---------- 4. Booking form ---------- */
  var form = document.getElementById('booking-form');
  if (form) {
    var note = form.querySelector('.form-note');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var m = MESSAGES[lang];
      if (!form.checkValidity()) { note.textContent = m.missing; form.reportValidity(); return; }
      var data = new FormData(form);
      if (SITE.formspreeId) {
        note.textContent = m.sending;
        fetch('https://formspree.io/f/' + SITE.formspreeId, {
          method: 'POST', body: data, headers: { Accept: 'application/json' }
        }).then(function (r) {
          if (!r.ok) throw new Error('send failed');
          form.reset(); note.textContent = m.sent;
        }).catch(function () { note.textContent = m.failed; });
      } else {
        var body = ['Name: ' + data.get('name'), 'Email: ' + data.get('email'), 'Event: ' + data.get('event'),
          'Date: ' + (data.get('date') || '-'), 'Location: ' + (data.get('location') || '-'), '', data.get('message')].join('\n');
        window.location.href = 'mailto:' + (SITE.email || '') +
          '?subject=' + encodeURIComponent('Guzheng booking request from ' + data.get('name')) +
          '&body=' + encodeURIComponent(body);
        note.textContent = m.mail;
      }
    });
  }

  /* ---------- 5. Playable strings (21 strings, D pentatonic) ---------- */
  /* ---------- 5a. Sound switch: the whole site starts muted ---------- */
  var audio = null, soundOn = false;
  function setSound(on) {
    soundOn = !!on;
    if (soundOn) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!audio && AC) audio = new AC();
      if (audio && audio.state === 'suspended') audio.resume();
    }
    $$('video').forEach(function (v) { if (v.muted === soundOn) v.muted = !soundOn; });
    $$('.sound').forEach(function (b) { b.setAttribute('aria-pressed', String(soundOn)); });
  }
  $$('.sound').forEach(function (b) { b.addEventListener('click', function () { setSound(!soundOn); }); });
  // A visitor using a video's own volume control flips the site switch too
  document.addEventListener('volumechange', function (ev) {
    if (ev.target.tagName === 'VIDEO' && ev.target.muted === soundOn) setSound(!ev.target.muted);
  }, true);
  setSound(false);

  var stringsEl = document.querySelector('.strings');
  if (stringsEl) {
    var steps = [0, 2, 4, 7, 9], lastPlayed = 0;
    function freq(i) {                       // string 0 = highest, like the instrument
      var n = 20 - i;
      var midi = 38 + 12 * Math.floor(n / 5) + steps[n % 5];
      return 440 * Math.pow(2, (midi - 69) / 12);
    }
    function pluck(el, i) {
      el.classList.remove('plucked'); void el.offsetWidth; el.classList.add('plucked');
      if (!soundOn || !audio || audio.state !== 'running') return;
      var now = audio.currentTime;
      if (now - lastPlayed < 0.02) return;
      lastPlayed = now;
      var f = freq(i), gain = audio.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      gain.connect(audio.destination);
      [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(function (h) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = h[1];
        o.frequency.setValueAtTime(f * h[0] * 1.012, now);            // slight bend, like a pressed string
        o.frequency.exponentialRampToValueAtTime(f * h[0], now + 0.09);
        g.gain.value = h[2];
        o.connect(g); g.connect(gain);
        o.start(now); o.stop(now + 2.3);
      });
    }
    for (var i = 0; i < 21; i++) {
      (function (i) {
        var s = document.createElement('span');
        s.className = 'string';
        s.style.setProperty('--i', i);
        s.addEventListener('pointerenter', function () { pluck(s, i); });
        stringsEl.appendChild(s);
      })(i);
    }
    stringsEl.addEventListener('pointerdown', function (ev) {
      if (soundOn && audio && audio.state === 'suspended') audio.resume();
      var t = ev.target.closest('.string');
      if (t) setTimeout(function () { pluck(t, $$('.string', stringsEl).indexOf(t)); }, 30);
      stringsEl.classList.add('awake');
    });
    stringsEl.addEventListener('touchmove', function (ev) {      // sweep with a finger
      var p = ev.touches[0], t = document.elementFromPoint(p.clientX, p.clientY);
      if (t && t.classList.contains('string') && !t.classList.contains('plucked')) pluck(t, $$('.string', stringsEl).indexOf(t));
    }, { passive: true });
    stringsEl.addEventListener('animationend', function (ev) { ev.target.classList.remove('plucked'); });
  }

  /* ---------- 6. Motion (GSAP + ScrollTrigger + Lenis) ---------- */
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if (reduceMotion || !window.gsap) return;        // page is fully readable without motion
  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  if (window.Lenis) {
    var lenis = new window.Lenis({ duration: 1.25, anchors: true });
    if (window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // Hero entrance: ink bleeding in, title rising letter by letter
  var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.hero-art img', { opacity: 0, scale: 1.08, filter: 'blur(14px)', duration: 2.2, ease: 'power2.out' })
    .from('.hero .eyebrow', { opacity: 0, y: 16, duration: 0.9 }, 0.5)
    .from('.hero-title .ch', { opacity: 0, yPercent: 60, filter: 'blur(8px)', duration: 1.1, stagger: 0.05 }, 0.65)
    .from('.hero .lede, .hero .cta', { opacity: 0, y: 20, duration: 1, stagger: 0.15 }, 1.2)
    .from('.hero-verse', { opacity: 0, duration: 1.6 }, 1.4)
    .from('.nav', { opacity: 0, y: -14, duration: 0.9 }, 0.3);

  if (!window.ScrollTrigger) return;

  // Parallax: the painting drifts slower than the page
  gsap.to('.hero-art img', { yPercent: 9, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-copy', { yPercent: -12, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // Sections fade up as they enter
  gsap.set('[data-reveal]', { opacity: 0, y: 36 });
  window.ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12 }); }
  });

  // Strings draw themselves in
  gsap.from('.string', { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'power2.out', stagger: 0.03,
    scrollTrigger: { trigger: '.strings', start: 'top 90%', once: true } });
})();

/* Only one video plays at a time */
document.addEventListener('play', function (ev) {
  document.querySelectorAll('video').forEach(function (v) { if (v !== ev.target) v.pause(); });
}, true);
