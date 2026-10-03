// Tracks a "last seen" timestamp per badge key using AsyncStorage.
// Call markAsSeen() when the user opens the panel.
// unreadCount is everything newer than the last seen time.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export function useNotificationBadge(
    key: string,                          // unique key e.g. "badge_messages" or "badge_requests_<groupId>"
    items: Array<{ created_at: string }>  // the list to count against
) {
    const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
    const [ready, setReady] = useState(false);

    // Load persisted timestamp on mount
    useEffect(() => {
        AsyncStorage.getItem(key).then((val) => {
            setLastSeenAt(val ? parseInt(val, 10) : 0);
            setReady(true);
        });
    }, [key]);

    // Count items newer than lastSeenAt
    const unreadCount = ready
        ? items.filter((item) => {
              const t = new Date(item.created_at).getTime();
              return t > (lastSeenAt ?? 0);
          }).length
        : 0;

    // Call this when the user opens the panel
    const markAsSeen = useCallback(() => {
        const now = Date.now();
        setLastSeenAt(now);
        AsyncStorage.setItem(key, String(now));
    }, [key]);

    return { unreadCount, markAsSeen };
}