import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Measured height of the floating capsule itself.
 * 44 (min tap target) + 6*2 (row padding vertical) + 2 (border) ≈ 58.
 */
export const TAB_BAR_HEIGHT = 58;

/** Wrapper top padding — space above the capsule for the drop shadow. */
export const TAB_BAR_TOP_CLEARANCE = 24;

/** Wrapper bottom padding — the offset below the capsule. */
export const TAB_BAR_BOTTOM_MARGIN = 8;

/**
 * Total bottom padding a scroll view needs so its content isn't
 * hidden behind the floating tab bar.
 *
 * Add this to your existing `contentContainerStyle.paddingBottom`:
 *
 *   const bottomInset = useTabBarBottomInset();
 *   <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + SPACING.xxl }]} />
 */
export function useTabBarBottomInset() {
  const insets = useSafeAreaInsets();
  const safe = Math.max(insets.bottom, 12);
  return (
    TAB_BAR_HEIGHT +
    TAB_BAR_TOP_CLEARANCE +
    TAB_BAR_BOTTOM_MARGIN +
    safe
  );
}