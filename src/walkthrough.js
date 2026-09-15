// Walkthrough — presentation slides. Captions are the only on-screen text.
// STEPS is the single source of truth for slides, frames, and the transcript.

export const STEPS = [
  {
    caption: 'Two problems. One answer.',
    image: '/walkthrough/01.png',
    from: '#/map',
  },
  {
    caption: 'A household earns $2,115 a year.',
    image: '/walkthrough/02.png',
    from: '#/dashboard',
  },
  {
    caption: 'Without a data centre: $1,215.',
    image: '/walkthrough/03.png',
    from: '#/dashboard',
  },
  {
    caption: 'Stack more programmes. Earn more.',
    image: '/walkthrough/04.png',
    from: '#/programs',
  },
  {
    caption: '255 households, each scored.',
    image: '/walkthrough/05.png',
    from: '#/customers',
  },
  {
    caption: 'Why this one? Every measure checked.',
    image: '/walkthrough/06.png',
    from: '#/customers',
  },
  {
    caption: 'What pays for it. What comes next.',
    image: '/walkthrough/07.png',
    from: '#/customers',
  },
  {
    caption: 'And exactly what to buy.',
    image: '/walkthrough/08.png',
    from: '#/customers',
  },
  {
    caption: 'Built from permits, imagery, meter data.',
    image: '/walkthrough/09.png',
    from: '#/permits',
  },
  {
    caption: 'Now do it anywhere.',
    image: '/walkthrough/10.png',
    from: '#/communities',
  },
];

export function renderWalkthrough(root) {
  let i = 0;
  document.body.classList.add('wt-mode');

  root.innerHTML = `
    <div class="wt" id="wt" tabindex="0" role="presentation">
      <div class="wt__caption" id="wt-caption"></div>
      <div class="wt__frame">
        <img class="wt__img" id="wt-img" alt="" />
      </div>
      <div class="wt__bar">
        <div class="wt__dots" id="wt-dots"></div>
        <button type="button" class="btn wt__next" id="wt-next">Next ›</button>
      </div>
    </div>
  `;

  const caption = root.querySelector('#wt-caption');
  const img = root.querySelector('#wt-img');
  const dots = root.querySelector('#wt-dots');
  const nextBtn = root.querySelector('#wt-next');
  const stage = root.querySelector('#wt');

  dots.innerHTML = STEPS.map((_, n) => `<button type="button" class="wt__dot" data-i="${n}" aria-label="Slide ${n + 1}"></button>`).join('');

  function paint() {
    const step = STEPS[i];
    caption.textContent = step.caption;
    img.src = step.image;
    img.onerror = () => {
      img.style.display = 'none';
    };
    img.onload = () => {
      img.style.display = '';
    };
    dots.querySelectorAll('.wt__dot').forEach((d, n) => d.classList.toggle('is-on', n === i));
    nextBtn.textContent = i === STEPS.length - 1 ? 'Done' : 'Next ›';
  }

  function go(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n));
    paint();
  }

  function next() {
    if (i >= STEPS.length - 1) {
      window.location.hash = '#/dashboard';
      return;
    }
    go(i + 1);
  }

  function prev() {
    go(i - 1);
  }

  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      window.location.hash = '#/dashboard';
    }
  }

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    next();
  });
  dots.addEventListener('click', (e) => {
    const btn = e.target.closest('.wt__dot');
    if (!btn) return;
    e.stopPropagation();
    go(+btn.dataset.i);
  });
  stage.addEventListener('click', (e) => {
    if (e.target.closest('.wt__next') || e.target.closest('.wt__dot')) return;
    next();
  });
  window.addEventListener('keydown', onKey);
  stage.focus();
  paint();

  return () => {
    document.body.classList.remove('wt-mode');
    window.removeEventListener('keydown', onKey);
  };
}
