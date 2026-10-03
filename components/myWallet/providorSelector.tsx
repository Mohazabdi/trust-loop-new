import { ProviderFilters } from "@/hooks/useProviders";
import { PROVIDOR_TYPE_UICONFIG_MAP } from "@/lib/configurations/financeMaps.config";
import { ProviderType } from "@/lib/types/account_layer.types";
import { Provider } from "@/lib/types/providers";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { TrustLoopProvidorsStyles } from "@/styles/wallet_styles/trust_loop_providors.styles";
import { getProviderImage } from "@/utils/getProviderImage";
import {
    BottomSheetBackdrop,
    BottomSheetFlatList,
    BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { ArrowBigDownDash } from "lucide-react-native";
import React, { useCallback, useMemo, useRef } from "react";
import { Image, Keyboard, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
interface ProvidorSelectorProps {
  providers: Provider[] | [];
  selectedProvidor: Provider | undefined;
  setSelectedProvidor: (providor: Provider | undefined) => void;
  providorFilter: ProviderFilters;
}
export function ProvidorSelector({
  selectedProvidor,
  setSelectedProvidor,
  providorFilter,
  providers,
}: ProvidorSelectorProps) {
  const { theme } = useGlobalStorage();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => TrustLoopProvidorsStyles(theme), [theme]);

  const snapPoints = useMemo(() => ["50%", "90%"], []);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  () => {
    console.log(providers);
  };
  const filterNames = Array.from(providorFilter.provider_types || [])
    .map((type) => type.replace("_", " "))
    .join(" & ");
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
    Keyboard.dismiss();
  }, []);
  const handleSelect = useCallback(
    (providor: Provider) => {
      const isSame = providor.id === selectedProvidor?.id;
      setSelectedProvidor(isSame ? undefined : providor);
      bottomSheetModalRef.current?.dismiss();
    },
    [selectedProvidor?.id, setSelectedProvidor],
  );
  const renderProvidorItem = useCallback(
    ({ item }: { item: Provider }) => {
      const providorConfig =
        PROVIDOR_TYPE_UICONFIG_MAP[item.provider_type as ProviderType] ??
        PROVIDOR_TYPE_UICONFIG_MAP.internal;
      const isSelected = item.id === selectedProvidor?.id;
      const Icon = providorConfig.icon;
      const imageSource = getProviderImage(item.provider_photo_url);
      return (
        <TouchableOpacity
          onPress={() => handleSelect(item)}
          style={[
            styles.recipientCardContainer,
            isSelected && { borderColor: theme.success },
          ]}
        >
          <View style={styles.recipientDpContainer}>
            {imageSource ? (
              <Image
                source={imageSource}
                style={styles.recipientDp}
                resizeMode="cover"
                alt={item.provider_name[0]}
              />
            ) : (
              <View style={styles.iconFallBack}>
                <Icon size={24} color={theme.text} />
              </View>
            )}
          </View>
          <View style={styles.recipientDetailsContainer}>
            <Text style={styles.recipientNameText}>{item.provider_name}</Text>
            <Text style={styles.recipientAccountIdText}>
              {item.provider_type}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme, selectedProvidor, styles, handleSelect],
  );
  const renderItemSeparator = useCallback(
    () => <View style={{ height: 10 }} />,
    [],
  );
  const renderEmptyComponent = useCallback(
    () => (
      <View
        style={{ padding: 20, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: theme.text, opacity: 0.6 }}>
          No providers found for this category.
        </Text>
      </View>
    ),
    [theme],
  );
  const imageSource = getProviderImage(selectedProvidor?.provider_photo_url);
  const providorConfig =
    PROVIDOR_TYPE_UICONFIG_MAP[
      selectedProvidor?.provider_type as ProviderType
    ] ?? PROVIDOR_TYPE_UICONFIG_MAP.internal;
  const SelectedIcon = providorConfig.icon;
  return (
    <View>
      {selectedProvidor ? (
        <TouchableOpacity
          onPress={handlePresentModalPress}
          style={[
            styles.recipientCardContainer,
            {
              borderColor: theme.success,
              borderWidth: 1,
              backgroundColor: theme.surface,
            },
          ]}
        >
          <View style={styles.recipientDpContainer}>
            {selectedProvidor ? (
              <Image
                source={imageSource}
                style={styles.recipientDp}
                alt={selectedProvidor.provider_name[0]}
              />
            ) : (
              <View style={styles.iconFallBack}>
                {SelectedIcon && <SelectedIcon size={24} color={theme.text} />}
              </View>
            )}
          </View>

          <View style={styles.recipientDetailsContainer}>
            <Text style={styles.recipientNameText}>
              {selectedProvidor.provider_name}
            </Text>
            <Text style={styles.recipientAccountIdText}>
              {selectedProvidor.provider_type.replace("_", " ")}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              padding: 10,
              gap: 10,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                color: theme.textSecondary,
                marginLeft: "auto",
              }}
            >
              Change
            </Text>
            <ArrowBigDownDash size={25} color={theme.text} />
          </View>
        </TouchableOpacity>
      ) : (
        /* EMPTY STATE: Dashed Placeholder */
        <TouchableOpacity
          onPress={handlePresentModalPress}
          style={{
            padding: 24,
            borderWidth: 2,
            borderRadius: 12,
            borderColor: theme.border || "#ccc",
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.surface + "50", // slight transparency
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "500" }}>
            Tap to select a {filterNames ? `a ${filterNames}` : "Provider"}
          </Text>
        </TouchableOpacity>
      )}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={snapPoints}
        index={0}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ backgroundColor: theme.surface }}
      >
        <BottomSheetFlatList
          data={providers}
          keyExtractor={(item) => item.id}
          renderItem={renderProvidorItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          ItemSeparatorComponent={renderItemSeparator}
          windowSize={5}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 16,
          }}
          style={{ flex: 1 }}
          removeClippedSubviews={true}
          ListEmptyComponent={renderEmptyComponent}
        />
      </BottomSheetModal>
    </View>
  );
}
