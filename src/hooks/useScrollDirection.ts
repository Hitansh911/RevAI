import { useState, useEffect } from 'react';

export function useScrollDirection(threshold = 50) {
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      
      if (Math.abs(currentScrollY - lastScrollY) < 10 && currentScrollY > 0) {
        ticking = false;
        return;
      }

      setIsScrollingDown(currentScrollY > lastScrollY);
      setScrollY(currentScrollY);
      lastScrollY = currentScrollY > 0 ? currentScrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    
    // Set initial scroll
    setScrollY(window.scrollY);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHidden = isScrollingDown && scrollY > threshold;

  return { isScrollingDown, scrollY, isHidden };
}
