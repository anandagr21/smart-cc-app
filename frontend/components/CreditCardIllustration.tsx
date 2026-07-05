import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

// ── Card Configuration ───────────────────────────────────────────────────────

export interface CardConfig {
  gradientId: string;
  colors: [string, string];
  cardNumber: string;
  cardholder: string;
  expiry: string;
  network: string;
  networkColor: string;
}

export const CARD_CONFIGS: CardConfig[] = [
  {
    gradientId: 'cardGradL',
    colors: ['#4F36FF', '#7C5CFC'],
    cardNumber: '4532 •••• •••• 8192',
    cardholder: 'VISA SIGNATURE',
    expiry: '09/28',
    network: 'VISA',
    networkColor: '#FFFFFF',
  },
  {
    gradientId: 'cardGradM',
    colors: ['#1E293B', '#334155'],
    cardNumber: '5412 •••• •••• 3451',
    cardholder: 'WORLD ELITE',
    expiry: '12/27',
    network: 'MC',
    networkColor: '#F59E0B',
  },
  {
    gradientId: 'cardGradR',
    colors: ['#EA580C', '#F59E0B'],
    cardNumber: '3782 •••• •••• 9210',
    cardholder: 'PLATINUM',
    expiry: '03/29',
    network: 'AMEX',
    networkColor: '#FFFFFF',
  },
];

// ── Card Network Logo ─────────────────────────────────────────────────────────

const NetworkLogo = React.memo(
  ({
    network,
    color,
    size = 32,
  }: {
    network: string;
    color: string;
    size?: number;
  }) => {
    if (network === 'VISA') {
      return (
        <Svg width={size * 2.2} height={size * 0.7} viewBox="0 0 50 16">
          <SvgText
            x="0"
            y="13"
            fill={color}
            fontSize="13"
            fontWeight="900"
            fontFamily="System"
            letterSpacing="2"
          >
            VISA
          </SvgText>
        </Svg>
      );
    }
    if (network === 'MC') {
      return (
        <Svg width={size * 1.1} height={size} viewBox="0 0 24 24">
          <Circle cx="9" cy="12" r="7" fill="#EB001B" opacity="0.9" />
          <Circle cx="15" cy="12" r="7" fill="#F79E1B" opacity="0.8" />
        </Svg>
      );
    }
    // AMEX
    return (
      <Svg width={size * 1.6} height={size * 0.65} viewBox="0 0 50 20">
        <SvgText
          x="0"
          y="15"
          fill={color}
          fontSize="14"
          fontWeight="900"
          fontFamily="System"
          letterSpacing="1"
        >
          AMEX
        </SvgText>
      </Svg>
    );
  },
);

// ── Single Animated Card ──────────────────────────────────────────────────────

export const AnimatedCard = React.memo(
  ({
    config,
    index,
    reduceMotion,
  }: {
    config: CardConfig;
    index: number;
    reduceMotion: boolean;
  }) => {
    const translateY = useSharedValue(reduceMotion ? 0 : 60);
    const opacity = useSharedValue(0);
    const rotate = useSharedValue(
      reduceMotion ? 0 : index === 0 ? -6 : index === 2 ? 6 : 0,
    );

    useEffect(() => {
      const delay = 300 + index * 140;
      if (reduceMotion) {
        opacity.value = withDelay(delay, withTiming(1, { duration: 250 }));
      } else {
        translateY.value = withDelay(
          delay,
          withSpring(0, { damping: 16, stiffness: 90 }),
        );
        opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
        rotate.value = withDelay(
          delay,
          withSpring(index === 0 ? -5 : index === 2 ? 5 : 0, {
            damping: 16,
            stiffness: 90,
          }),
        );
      }
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
      ],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        style={[
          styles.cardWrap,
          animatedStyle,
          { zIndex: 3 - index },
        ]}
      >
        <Svg
          width={styles.cardWrap.width}
          height={styles.cardWrap.height}
          viewBox="0 0 280 168"
        >
          <Defs>
            <SvgLinearGradient
              id={config.gradientId}
              x1="0"
              y1="0"
              x2="280"
              y2="168"
            >
              <Stop offset="0" stopColor={config.colors[0]} stopOpacity="1" />
              <Stop offset="1" stopColor={config.colors[1]} stopOpacity="1" />
            </SvgLinearGradient>
            {/* Metallic sheen overlay */}
            <SvgLinearGradient
              id={`sheen-${index}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
              <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity="0.04" />
              <Stop offset="0.6" stopColor="#000000" stopOpacity="0.02" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0.12" />
            </SvgLinearGradient>
          </Defs>

          {/* Card body */}
          <Rect
            x="0"
            y="0"
            width="280"
            height="168"
            rx="16"
            fill={`url(#${config.gradientId})`}
          />
          {/* Metallic sheen */}
          <Rect
            x="0"
            y="0"
            width="280"
            height="168"
            rx="16"
            fill={`url(#sheen-${index})`}
          />

          {/* Inner border for depth */}
          <Rect
            x="2"
            y="2"
            width="276"
            height="164"
            rx="14"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.12"
            strokeWidth="0.5"
          />

          {/* EMV chip */}
          <Rect
            x="24"
            y="56"
            width="36"
            height="28"
            rx="5"
            fill="#FFD700"
            opacity="0.7"
          />
          <Rect
            x="28"
            y="60"
            width="8"
            height="8"
            rx="1"
            fill="#DAA520"
            opacity="0.5"
          />
          <Rect
            x="40"
            y="60"
            width="8"
            height="8"
            rx="1"
            fill="#DAA520"
            opacity="0.5"
          />
          <Rect
            x="28"
            y="72"
            width="8"
            height="8"
            rx="1"
            fill="#DAA520"
            opacity="0.5"
          />
          <Rect
            x="40"
            y="72"
            width="8"
            height="8"
            rx="1"
            fill="#DAA520"
            opacity="0.5"
          />

          {/* Contactless symbol */}
          <Svg width="18" height="18" x="66" y="61" viewBox="0 0 24 24">
            <Path
              d="M6 12a6 6 0 0 1 6-6M10 12a2 2 0 0 1 2-2M14 12a2 2 0 0 0-2-2M4 12a8 8 0 0 1 8-8"
              stroke="#FFFFFF"
              strokeOpacity="0.5"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </Svg>

          {/* Card number */}
          <SvgText
            x="24"
            y="124"
            fill="#FFFFFF"
            fillOpacity="0.9"
            fontSize="18"
            fontWeight="600"
            fontFamily="System"
            letterSpacing="2"
          >
            {config.cardNumber}
          </SvgText>

          {/* Cardholder name */}
          <SvgText
            x="24"
            y="148"
            fill="#FFFFFF"
            fillOpacity="0.6"
            fontSize="9"
            fontWeight="600"
            fontFamily="System"
            letterSpacing="3"
          >
            {config.cardholder}
          </SvgText>

          {/* Expiry */}
          <SvgText
            x="156"
            y="148"
            fill="#FFFFFF"
            fillOpacity="0.6"
            fontSize="9"
            fontWeight="600"
            fontFamily="System"
            letterSpacing="1"
          >
            VALID THRU {config.expiry}
          </SvgText>

          {/* Network logo */}
          <G x="220" y="128">
            <NetworkLogo
              network={config.network}
              color={config.networkColor}
              size={24}
            />
          </G>
        </Svg>
      </Animated.View>
    );
  },
);

// ── Card Stack Container ──────────────────────────────────────────────────────

export const CardStack = ({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) => (
  <>
    {CARD_CONFIGS.map((card, i) => (
      <AnimatedCard
        key={card.gradientId}
        config={card}
        index={i}
        reduceMotion={reduceMotion}
      />
    ))}
  </>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardWrap: {
    position: 'absolute',
    width: 280,
    height: 168,
    // Shadow for card depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
});
