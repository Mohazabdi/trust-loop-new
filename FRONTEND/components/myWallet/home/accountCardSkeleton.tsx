// components/AccountCardSkeleton.tsx
import { useEffect, useRef } from "react";
import { Animated, Dimensions, ScrollView, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CARD_MARGIN_RIGHT = 15;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN_RIGHT;

function ShimmerBlock({ style }: { style: any }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[style, { opacity, backgroundColor: "rgba(255,255,255,0.15)" }]}
    />
  );
}

function SingleCardSkeleton() {
  return (
    <View
      style={{
        width: CARD_WIDTH,
        marginRight: CARD_MARGIN_RIGHT,
        borderRadius: 22,
        backgroundColor: "#1a1a1a", // dark card background — adjust to your theme
        padding: 10,
        gap: 9,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      {/* ── Card Header ── */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Status dot + text */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              overflow: "hidden",
            }}
          >
            <ShimmerBlock style={{ width: 30, height: 30, borderRadius: 15 }} />
          </View>
          <ShimmerBlock
            style={{
              width: 50,
              height: 10,
              borderRadius: 5,
            }}
          />
        </View>

        {/* Three dots */}
        <ShimmerBlock
          style={{
            width: 24,
            height: 17,
            borderRadius: 4,
          }}
        />
      </View>

      {/* ── Card Body ── */}
      <View style={{ gap: 12 }}>
        {/* Icon + name + number */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* Icon circle */}
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <ShimmerBlock style={{ width: 52, height: 52, borderRadius: 18 }} />
          </View>

          {/* Name + number */}
          <View style={{ gap: 6 }}>
            <ShimmerBlock
              style={{
                width: 120,
                height: 15,
                borderRadius: 7,
              }}
            />
            <ShimmerBlock
              style={{
                width: 90,
                height: 12,
                borderRadius: 6,
              }}
            />
          </View>
        </View>

        {/* Balance */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ShimmerBlock
            style={{
              width: 40,
              height: 15,
              borderRadius: 7,
            }}
          />
          <ShimmerBlock
            style={{
              width: 100,
              height: 17,
              borderRadius: 8,
            }}
          />
        </View>
      </View>

      {/* ── Card Footer ── */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Account type badge */}
        <ShimmerBlock
          style={{
            width: 70,
            height: 22,
            borderRadius: 16,
          }}
        />
        {/* Arrow icon */}
        <ShimmerBlock
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

export function AccountCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ScrollView
      horizontal={true}
      style={{ paddingVertical: 10, backgroundColor: "transparent" }}
      contentContainerStyle={{ paddingHorizontal: 10 }}
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum={true}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false} // skeleton doesn't need to scroll
    >
      {Array.from({ length: count }).map((_, i) => (
        <SingleCardSkeleton key={i} />
      ))}
    </ScrollView>
  );
}
