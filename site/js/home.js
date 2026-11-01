const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function initParallax() {
  if (reduceMotion || !canHover) return;
  const layers = Array.from(document.querySelectorAll('[data-depth]'));
  if (!layers.length) return;

  let pointerX = 0;
  let pointerY = 0;
  let scheduled = false;

  const update = () => {
    scheduled = false;
    layers.forEach((layer) => {
      const depth = Number(layer.dataset.depth || 0);
      layer.style.translate = `${(-pointerX * depth * 34).toFixed(1)}px ${(-pointerY * depth * 22).toFixed(1)}px`;
    });
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );

  window.addEventListener(
    'pointerleave',
    () => {
      pointerX = 0;
      pointerY = 0;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
}

initParallax();
