// components/myWallet/transfer/PinEntryModal.tsx
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { PinEntryModalStyles } from "@/styles/wallet_styles/pin_entry_modal.styles";
import { Delete, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import TransferResultModal from "./TransactionResultModal";
import ProcessingModal from "./processingTransaction";

interface PinEntryModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  amount: number;
  handleSend: () => void;
  // onRetry: () => void;
  //   onSuccess: () => void;
  //   onFailure: (reason: string) => void;
}

const CORRECT_PIN = "1234";
interface PinResultType {
  pinResult: "success" | "error";
  failReason?: string;
}
export default function PinEntryModal({
  isOpen,
  setIsOpen,
  // onRetry,
  amount,
  handleSend,
  //   onSuccess,
  //   onFailure,
}: PinEntryModalProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => PinEntryModalStyles(theme), [theme]);
  const [pin, setPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [pinResult, setPinResult] = useState<PinResultType>({
    pinResult: "error",
    failReason: "Something Went Wrong Try Again Later",
  });

  const handleKeyPress = (value: string) => {
    if (pin.length < 4) {
      const newPin = pin + value;
      setPin(newPin);
      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const validatePin = (enteredPin: string) => {
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);

      if (enteredPin === CORRECT_PIN) {
        setPin("");
        setPinResult({ pinResult: "success" });
        //setIsResultOpen(true);
        handleSend();
        setIsOpen(false);
      } else {
        setPin("");
        setPinResult({
          pinResult: "error",
          failReason: "Incorrect PIN. Please try again.",
        });
        setIsResultOpen(true);
        setIsOpen(false);
      }
    }, 3000); // 2 second processing time
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[styles.pinDot, index < pin.length && styles.pinDotFilled]}
          />
        ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", "delete"],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => {
              if (key === "") {
                return <View key="empty" style={styles.keypadButton} />;
              }
              if (key === "delete") {
                return (
                  <TouchableOpacity
                    key="delete"
                    style={styles.keypadButton}
                    onPress={handleDelete}
                  >
                    <Delete size={24} color={theme.text} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.keypadButton}
                  onPress={() => handleKeyPress(key)}
                >
                  <Text style={styles.keypadButtonText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };
  const handleRetry = () => {
    setIsResultOpen(false);
    setIsOpen(true);
  };
  const handleResultClose = () => {
    setIsResultOpen(false);
  };
  const transactionData = {
    amount: amount,
    recipient: "Alvin Indiazi",
    date: "21 Mar 2025",
    reference: "TRF-20250321-001",
    sourceAccount: "Personal Account (ACC_212623_00001b)",
  };
  // if (!isOpen) {
  //   return null;
  // } else {
  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.container}>
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Enter PIN</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <X size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              Enter your 4-digit PIN to authorize this transfer
            </Text>

            {renderPinDots()}
            {renderKeypad()}

            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot PIN?</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TransferResultModal
          isOpen={isResultOpen}
          type={pinResult.pinResult}
          onClose={() => setIsResultOpen(false)}
          errorMessage={pinResult.failReason}
          onRetry={() => {
            setIsResultOpen(false);
            setIsOpen(false);
          }}
        />
      </Modal>
      <ProcessingModal isOpen={isProcessing} />
      <TransferResultModal
        isOpen={isResultOpen}
        type={pinResult.pinResult}
        onClose={handleResultClose}
        transactionData={transactionData}
        errorMessage={pinResult.failReason}
        onRetry={handleRetry}
      />
    </>
  );
}
