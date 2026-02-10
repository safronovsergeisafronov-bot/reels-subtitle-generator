import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false
  );
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(TABLET_QUERY).matches : false
  );

  useEffect(() => {
    const mobileMedia = window.matchMedia(MOBILE_QUERY);
    const tabletMedia = window.matchMedia(TABLET_QUERY);

    const onMobileChange = (e) => setIsMobile(e.matches);
    const onTabletChange = (e) => setIsTablet(e.matches);

    mobileMedia.addEventListener('change', onMobileChange);
    tabletMedia.addEventListener('change', onTabletChange);

    return () => {
      mobileMedia.removeEventListener('change', onMobileChange);
      tabletMedia.removeEventListener('change', onTabletChange);
    };
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
}
