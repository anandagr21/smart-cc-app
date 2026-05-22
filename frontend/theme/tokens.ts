export const tokens = {
  layout: {
    screenPadding: 24,
    sectionGap: 32,
    itemGap: 16,
    elementGap: 8,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  radius: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },
  elevation: {
    // 0: Background Canvas (no shadow)
    
    // 1: Rows, lightweight containers (subtle diffusion)
    level1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    
    // 2: Cards, primary surfaces
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 5,
    },
    
    // 3: Modal sheets, overlays
    level3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 32,
      elevation: 10,
    },
    
    // 4: Floating dock, highly detached elements
    level4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25,
      shadowRadius: 40,
      elevation: 15,
    },
    
    // Ambient glowing elements (strictly semantic now)
    glow: {
      shadowColor: '#10B981', // Success semantic by default
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    }
  },
  duration: {
    fast: 200,
    normal: 400,
    slow: 600,
  },
  spring: {
    // Replaced bouncy physics with calm, weighted, intentional motion
    weighted: {
      damping: 25,
      stiffness: 100,
      mass: 1.2,
    },
    calm: {
      damping: 20,
      stiffness: 90,
      mass: 1,
    },
    snappy: { // Only for tiny micro-interactions like button scales
      damping: 25,
      stiffness: 150,
      mass: 1,
    }
  }
};
