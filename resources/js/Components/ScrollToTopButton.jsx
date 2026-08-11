import { useState, useEffect } from 'react';
import { LuChevronUp } from 'react-icons/lu';

export default function ScrollToTopButton({ containerRef, threshold = 300 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const onScroll = () => setVisible(el.scrollTop > threshold);
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [containerRef, threshold]);

  const scrollToTop = () => {
    containerRef?.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed bottom-10 right-5 z-50 flex h-10 w-10 border border-darkgreen/10 items-center justify-center rounded-full bg-[#289800]/70 backdrop-blur-[2px] shadow-md text-white transition-all duration-300 hover:bg-[#289800] ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <LuChevronUp className="h-7 w-7" />
    </button>
  );
}