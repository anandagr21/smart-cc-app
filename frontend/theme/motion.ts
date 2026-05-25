import { FadeInUp, FadeInDown, FadeOut, ZoomIn, StretchInY } from 'react-native-reanimated';
import { tokens } from './tokens';

export const motion = {
  // Entrances - Calm and weighted
  fadeUp: FadeInUp.springify().damping(tokens.spring.calm.damping).stiffness(tokens.spring.calm.stiffness).mass(tokens.spring.calm.mass),
  fadeDown: FadeInDown.springify().damping(tokens.spring.calm.damping).stiffness(tokens.spring.calm.stiffness).mass(tokens.spring.calm.mass),
  
  // Exits
  fadeOut: FadeOut.duration(tokens.duration.fast),
  
  // Custom helpers
  springConfig: tokens.spring.weighted
};
