import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useOnboardingStore } from '../store/onboardingStore';
import { OnboardingSlide, SLIDES } from './OnboardingSlide';
import { tokens } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';



export const OnboardingModal: React.FC = () => {
  const colors = useThemeColors();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    }
  };

  const handleGetStarted = async () => {
    await completeOnboarding(selectedPersona ?? undefined);
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const handleSelectPersona = async (value: string) => {
    setSelectedPersona(value);
    // Auto-complete onboarding when persona is selected
    await completeOnboarding(value);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const isLastSlide = activeIndex === SLIDES.length - 1;
  const isPersonaSlide = activeIndex === SLIDES.length - 1;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.overlay, { backgroundColor: colors.background }]}
    >
      {/* Skip button */}
      <TouchableOpacity
        onPress={handleSkip}
        activeOpacity={0.7}
        style={[styles.skipBtn, { backgroundColor: colors.surface }]}
        accessibilityLabel="Skip onboarding"
        accessibilityRole="button"
      >
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>
          Skip
        </Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item, index }) => (
          <View style={{ width }}>
            <OnboardingSlide slide={item} index={index} onSelectPersona={handleSelectPersona} />
          </View>
        )}
      />

      {/* Footer: dots + CTA */}
      <View style={styles.footer}>
        {/* Dot indicators */}
        <View style={styles.dotRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? colors.primary : colors.border,
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaRow}>
          {isLastSlide ? (
            <Button
              label="Get Started"
              variant="primary"
              onPress={handleGetStarted}
              style={styles.cta}
            />
          ) : (
            <Button
              label="Next"
              variant="primary"
              onPress={handleNext}
              style={styles.cta}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: tokens.radius.full,
    ...tokens.elevation.level1,
  },
  skipText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 32,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaRow: {
    width: '100%',
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    maxWidth: 300,
  },
});
