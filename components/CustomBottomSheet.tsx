import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { forwardRef, useCallback, useMemo } from "react";
import { View, Text } from "react-native";

interface CustomBottomSheetProps {
  title?: string;
  children: React.ReactNode;
  snapPoints?: string[];
}

const CustomBottomSheet = forwardRef<BottomSheet, CustomBottomSheetProps>(
  ({ title, children, snapPoints }, ref) => {
    const { theme } = useGlobalStorage();

    const defaultSnapPoints = useMemo(() => ["60%", "90%"], []);
    const finalSnapPoints = snapPoints || defaultSnapPoints;

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}                          // starts closed
        snapPoints={finalSnapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          borderRadius: 16,
          backgroundColor: theme.surface,
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 10, paddingBottom: 40 }}>
          {title && (
            <Text
              style={{
                color: theme.textSecondary,
                fontWeight: "bold",
                fontSize: 20,
                paddingVertical: 5,
                textAlign: "center",
              }}
            >
              {title}
            </Text>
          )}
          {children}
        </View>
      </BottomSheet>
    );
  }
);

export default CustomBottomSheet;