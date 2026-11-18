// components/myWallet/PinEntryModal.tsx
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { PinEntryModalStyles } from "@/styles/wallet_styles/pin_entry_modal.styles";
import { Delete, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface PinEntryModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  amount: number;
  onSubmit: (pin: string) => void; // <--- Emits PIN to parent
}

export default function PinEntryModal({ isOpen, setIsOpen, amount, onSubmit }: PinEntryModalProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => PinEntryModalStyles(theme), [theme]);
  const [pin, setPin] = useState("");

  const handleKeyPress = (value: string) => {
    if (pin.length < 4) {
      const newPin = pin + value;
      setPin(newPin);
      if (newPin.length === 4) {
        // Send the PIN up to deposit.tsx!
        onSubmit(newPin);
        setPin(""); // Clear for next time
      }
    }
  };

  const handleDelete = () => setPin((prev) => prev.slice(0, -1));

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
      <View style={styles.container}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Enter PIN</Text>
            <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Enter your 4-digit PIN to authorize this deposit</Text>

          {/* PIN Dots */}
          <View style={styles.pinContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={[styles.pinDot, index < pin.length && styles.pinDotFilled]} />
            ))}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["", "0", "delete"]].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key) => {
                  if (key === "") return <View key="empty" style={styles.keypadButton} />;
                  if (key === "delete") return (
                    <TouchableOpacity key="delete" style={styles.keypadButton} onPress={handleDelete}>
                      <Delete size={24} color={theme.text} />
                    </TouchableOpacity>
                  );
                  return (
                    <TouchableOpacity key={key} style={styles.keypadButton} onPress={() => handleKeyPress(key)}>
                      <Text style={styles.keypadButtonText}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}