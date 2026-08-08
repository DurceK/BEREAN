import { useWindowDimensions } from 'react-native';

const TABLET_MIN_WIDTH = 768;

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;

  return {
    width,
    height,
    isTablet,
    isPhone: !isTablet,
    isLandscape: width > height,
  };
}
