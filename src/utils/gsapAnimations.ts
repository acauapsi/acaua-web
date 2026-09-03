import { gsap } from 'gsap';

export const gsapAnimations = {
  // Staggered entrance for cards without any jumping/hopping (pure smooth fade)
  animateStaggerEntrance: (selector: string | Element[], delay: number = 0.03) => {
    return gsap.fromTo(
      selector,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.25,
        stagger: delay,
        ease: 'power1.out',
      }
    );
  },

  // Page view transition when changing tabs (pure smooth fade, no jumping)
  animatePageTransition: (element: Element | null) => {
    if (!element) return;
    return gsap.fromTo(
      element,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.2,
        ease: 'power1.out',
      }
    );
  },

  // Chart bar height growth animation
  animateBarChart: (selector: string | Element[]) => {
    return gsap.fromTo(
      selector,
      { scaleY: 0, transformOrigin: 'bottom center' },
      {
        scaleY: 1,
        duration: 0.5,
        stagger: 0.04,
        ease: 'power2.out',
      }
    );
  },

  // Number counter animation (Tween numerical object properties)
  animateNumber: (
    target: { value: number },
    endValue: number,
    onUpdateCallback: () => void,
    duration: number = 0.8
  ) => {
    return gsap.to(target, {
      value: endValue,
      duration: duration,
      ease: 'power2.out',
      onUpdate: onUpdateCallback,
    });
  },
};
