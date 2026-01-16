import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

interface StickyScrollStackProps {
  children: React.ReactNode[];
  onCardIndex?: (index: number) => void;
  cardHeight?: number;
  gap?: number;
  enabled?: boolean;
  headerHeight?: number;
  firstCardHeight?: number;
}

const { width } = Dimensions.get('window');

const StickyScrollStack: React.FC<StickyScrollStackProps> = ({
  children,
  onCardIndex,
  cardHeight = 300,
  gap = 20,
  enabled = true,
  headerHeight = 70,
  firstCardHeight = 380,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollOffset(offsetY);
    
    // Calculate which card is currently in the "stack zone"
    // Cards enter stacking zone after firstCardHeight
    const stackZoneStart = firstCardHeight;
    const cardsInStack = Math.floor((offsetY - stackZoneStart) / (cardHeight + gap));
    const currentCardIndex = Math.max(0, Math.min(cardsInStack, children.length - 2));
    
    if (currentCardIndex !== currentIndex) {
      setCurrentIndex(currentCardIndex);
      onCardIndex?.(currentCardIndex + 2); // +2 because index 0 is header, 1 is first card
    }
  };

  return (
    <View style={styles.container}>
      {/* Main ScrollView with all cards laid out naturally */}
      <ScrollView
        ref={scrollViewRef}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={enabled}
        contentContainerStyle={{
          paddingBottom: 200,
        }}
        style={styles.scrollView}
      >
        {/* Header - scrolls with content */}
        <View style={[styles.sectionHeader]}>
          {children[0]}
        </View>

        {/* First Card - scrolls naturally */}
        <View style={[styles.firstCard]}>
          {children[1]}
        </View>

        {/* Remaining cards - scroll naturally, will stack as they scroll up */}
        {children.slice(2).map((child, idx) => (
          <View key={idx + 2} style={[styles.cardContainer, { height: cardHeight, marginBottom: gap }]}>
            {child}
          </View>
        ))}
      </ScrollView>

      {/* Sticky Header - locked at top after scrolling past initial header */}
      {scrollOffset > 0 && (
        <View style={[styles.stickyHeader, { height: headerHeight }]}>
          {children[0]}
        </View>
      )}

      {/* Stacking cards overlay - appears as you scroll */}
      {scrollOffset > firstCardHeight && (
        <View style={styles.stackingOverlay}>
          {children.slice(2).map((child, idx) => {
            // Calculate if this card should be visible in the stack
            const cardScrollStart = (idx) * (cardHeight + gap);
            const cardScrollEnd = cardScrollStart + (cardHeight + gap);
            const relativeScroll = Math.max(0, scrollOffset - firstCardHeight - cardScrollStart);
            
            // Only show top 3 cards in stack
            if (idx >= 3) return null;
            
            // Calculate position in stack
            let topOffset = headerHeight + 20 + (idx * 12); // Each card offsets slightly
            let cardOpacity = 1;
            let cardScale = 1;
            
            // Card animates as it enters the stack zone
            if (relativeScroll < cardHeight + gap) {
              const progress = Math.min(1, relativeScroll / (cardHeight + gap));
              // Cards slide up and fade as they stack
              topOffset = headerHeight + 20 + (idx * 12) - (progress * 15);
              cardOpacity = 1 - (progress * 0.2); // Slight fade
              cardScale = 1 - (progress * 0.02);
            }
            
            return (
              <View
                key={`stack-${idx}`}
                style={{
                  position: 'absolute',
                  top: topOffset,
                  left: 16,
                  right: 16,
                  width: width - 32,
                  height: cardHeight,
                  zIndex: 50 - idx,
                  opacity: cardOpacity,
                  transform: [{ scale: cardScale }],
                }}
              >
                {child}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F4F8F3',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: '#F4F8F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  firstCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardContainer: {
    marginHorizontal: 16,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#F4F8F3',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  stackingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    pointerEvents: 'none',
  },
});

export default StickyScrollStack;
