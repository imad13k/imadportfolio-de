/* de.imadportfolio.dev: animations and interactions (no dependencies) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Year
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // Split headline into words (keeps <em> styling)
  $$('[data-split]').forEach(el => {
    let i = 0;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part;
            s.style.transitionDelay = (0.15 + i++ * 0.07) + 's';
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(el);
  });

  // Page load sequence
  requestAnimationFrame(() => {
    document.body.classList.add('loaded');
    $$('[data-split]').forEach(el => el.classList.add('go'));
    $$('.in-load').forEach((el, k) => { el.style.transitionDelay = (0.5 + k * 0.12) + 's'; });
  });

  // Word rotator (last word duplicates the first for a seamless loop)
  const rot = $('.rot');
  if (rot && !reduce) {
    const words = $$('b', rot); let idx = 0;
    const fit = () => { rot.style.width = words[idx].offsetWidth + 'px'; };
    document.fonts && document.fonts.ready.then(fit); fit();
    addEventListener('resize', fit);
    setInterval(() => {
      idx++;
      words.forEach(b => b.style.transform = `translateY(${-idx * 100}%)`);
      fit();
      if (idx === words.length - 1) {
        setTimeout(() => { rot.classList.add('snap'); idx = 0; words.forEach(b => b.style.transform = ''); void rot.offsetHeight; rot.classList.remove('snap'); }, 850);
      }
    }, 2200);
  }

  // Header: background after scroll, hide on scroll down
  const hdr = $('#hdr'); let lastY = scrollY;
  const onScroll = () => {
    const yy = scrollY;
    hdr.classList.toggle('scrolled', yy > 20);
    hdr.classList.toggle('hide', yy > 400 && yy > lastY + 4);
    if (yy < lastY - 4) hdr.classList.remove('hide');
    lastY = yy;
    stepsProgress();
  };
  addEventListener('scroll', onScroll, { passive: true });

  // Reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
  $$('.rv').forEach((el, k) => { el.style.transitionDelay = ((k % 3) * 0.08) + 's'; io.observe(el); });

  // Hero windows: mouse parallax
  const stack = $('.stack');
  if (stack && fine && !reduce) {
    const wins = $$('.win', stack);
    addEventListener('pointermove', e => {
      const cx = e.clientX / innerWidth - 0.5, cy = e.clientY / innerHeight - 0.5;
      wins.forEach(w => { const d = +w.dataset.depth || 20; w.style.setProperty('--tx', (cx * d) + 'px'); w.style.setProperty('--ty', (cy * d) + 'px'); });
    }, { passive: true });
  }

  // Magnetic buttons
  if (fine && !reduce) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.18) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.3) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  // Card spotlight
  $$('.spot').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--x', (e.clientX - r.left) + 'px');
    c.style.setProperty('--y', (e.clientY - r.top) + 'px');
  }));

  // Projects: before/after toggle, tilt, scroll distance
  $$('[data-proj]').forEach(p => {
    const toggle = $('.toggle', p), frame = $('.frame', p), img = $('.after img', p);
    toggle.dataset.state = 'after';
    toggle.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.view;
      $$('button', toggle).forEach(x => x.setAttribute('aria-pressed', x === b));
      toggle.dataset.state = v; frame.dataset.state = v;
    });
    const setScroll = () => {
      const sh = frame.querySelector('.screen').clientHeight, ih = img.clientHeight;
      if (ih > sh) frame.style.setProperty('--scroll', `-${ih - sh}px`);
    };
    img.complete ? setScroll() : img.addEventListener('load', setScroll);
    addEventListener('resize', setScroll);
    if (fine && !reduce) {
      frame.addEventListener('pointermove', e => {
        const r = frame.getBoundingClientRect();
        frame.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 6) + 'deg');
        frame.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - 0.5) * 4) + 'deg');
      });
      frame.addEventListener('pointerleave', () => { frame.style.setProperty('--ry', '0deg'); frame.style.setProperty('--rx', '0deg'); });
    }
  });

  // Touch devices: auto-scroll screenshots while visible, and show "before" once
  if (!fine && !reduce) {
    const io2 = new IntersectionObserver(es => es.forEach(e => {
      e.target.classList.toggle('auto', e.isIntersecting);
    }), { threshold: 0.6 });
    $$('.frame').forEach(f => io2.observe(f));
  }

  // Process line fills with scroll
  const steps = $('#steps'), fill = $('#stepsFill');
  function stepsProgress() {
    if (!steps || !fill) return;
    const r = steps.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.1)));
    const vertical = innerWidth <= 900;
    fill.style.width = vertical ? '100%' : (t * 100) + '%';
    fill.style.height = vertical ? (t * 100) + '%' : '100%';
    $$('li', steps).forEach((li, k, all) => li.classList.toggle('lit', t >= k / (all.length - 1) - 0.02 || (k === 0 && t > 0)));
  }
  stepsProgress();

  // Counters
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = +el.dataset.to, t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / 1200); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    reduce ? (el.textContent = to) : requestAnimationFrame(tick);
    cio.unobserve(el);
  }), { threshold: 0.6 });
  $$('.count').forEach(el => cio.observe(el));
})();
