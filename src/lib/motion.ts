import { AccessibilityInfo } from 'react-native';

let reduce = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then(v => (reduce = v))
  .catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', v => (reduce = v));

/** Duration to use for an animation, 0 when the user asked for reduced motion. */
export const dur = (ms: number) => (reduce ? 0 : ms);
