// Wraps any icon and overlays a red badge dot or count bubble.

import React from "react";
import { View, Text } from "react-native";

type Props = {
    count: number;
    children: React.ReactNode;
};

export function NotificationBadge({ count, children }: Props) {
    return (
        <View style={{ position: "relative" }}>
            {children}
            {count > 0 && (
                <View
                    style={{
                        position: "absolute",
                        top: -5,
                        right: -6,
                        backgroundColor: "#ef4444",
                        borderRadius: 10,
                        minWidth: 18,
                        height: 18,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 4,
                        borderWidth: 1.5,
                        borderColor: "#fff",
                    }}
                >
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: "700",
                            lineHeight: 12,
                        }}
                    >
                        {count > 99 ? "99+" : count}
                    </Text>
                </View>
            )}
        </View>
    );
}