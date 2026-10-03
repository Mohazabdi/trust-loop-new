// components/myWallet/transfer/TransferResultModal.tsx
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { TransferResultModalStyles } from "@/styles/wallet_styles/transfer_result_modal.styles";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Coffee,
  CreditCard,
  Download,
  Home,
  Mail,
  ShoppingBag,
  Tag,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface TransferResultModalProps {
  isOpen: boolean;
  type: "success" | "error";
  onClose: () => void;
  transactionData?: {
    amount: number;
    recipient: string;
    date: string;
    reference: string;
    sourceAccount: string;
  };
  errorMessage?: string;
  onRetry?: () => void;
}

// Mock tags with icons
const MOCK_TAGS = [
  { id: "business", name: "Business", icon: Briefcase, color: "#3B82F6" },
  { id: "personal", name: "Personal", icon: User, color: "#10B981" },
  { id: "family", name: "Family", icon: Users, color: "#8B5CF6" },
  { id: "shopping", name: "Shopping", icon: ShoppingBag, color: "#F59E0B" },
  { id: "dining", name: "Dining", icon: Coffee, color: "#EF4444" },
  { id: "housing", name: "Housing", icon: Home, color: "#06B6D4" },
];

const DEFAULT_TAG = {
  id: "personal",
  name: "Personal",
  icon: User,
  color: "#10B981",
};

export default function TransferResultModal({
  isOpen,
  type,
  onClose,
  transactionData,
  errorMessage,
  onRetry,
}: TransferResultModalProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => TransferResultModalStyles(theme), [theme]);
  const [selectedTag, setSelectedTag] = useState<(typeof MOCK_TAGS)[0] | null>(
    DEFAULT_TAG,
  );
  const [showTagOptions, setShowTagOptions] = useState(false);

  const handleDownloadReceipt = () => {
    console.log("Download receipt");
  };

  const handleEmailReceipt = () => {
    console.log("Email receipt");
  };

  const handleSelectTag = (tag: (typeof MOCK_TAGS)[0]) => {
    setSelectedTag(tag);
    setShowTagOptions(false);
  };

  const handleClearTag = () => {
    setSelectedTag(null);
  };

  const formattedAmount = transactionData?.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const renderSuccessContent = () => (
    <>
      <View style={styles.iconContainer}>
        <CheckCircle size={48} color={theme.success} />
      </View>

      <Text style={styles.message}>
        Your transfer of {formattedAmount} KES has been completed.
      </Text>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <CreditCard size={16} color={theme.textSecondary} />
          <Text style={styles.detailLabel}>From</Text>
          <Text style={styles.detailValue}>
            {transactionData?.sourceAccount}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <User size={16} color={theme.textSecondary} />
          <Text style={styles.detailLabel}>To</Text>
          <Text style={styles.detailValue}>{transactionData?.recipient}</Text>
        </View>
        <View style={styles.detailRow}>
          <Calendar size={16} color={theme.textSecondary} />
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{transactionData?.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reference</Text>
          <Text style={styles.detailValue}>{transactionData?.reference}</Text>
        </View>
      </View>

      {/* Redesigned Tag Section */}
      <View style={styles.tagSection}>
        <View style={styles.tagSectionHeader}>
          <Tag size={18} color={theme.textSecondary} />
          <Text style={styles.tagSectionTitle}>
            How would you like to tag this transaction?
          </Text>
        </View>

        {!showTagOptions && (
          <View style={styles.selectedTagWrapper}>
            {selectedTag ? (
              <View style={styles.selectedTagDisplay}>
                <View style={styles.selectedTagInfo}>
                  <View
                    style={[
                      styles.tagIconContainer,
                      { backgroundColor: selectedTag.color + "15" },
                    ]}
                  >
                    {selectedTag.icon && (
                      <selectedTag.icon size={18} color={selectedTag.color} />
                    )}
                  </View>
                  <Text style={styles.selectedTagName}>{selectedTag.name}</Text>
                </View>
                <View style={styles.selectedTagActions}>
                  <TouchableOpacity
                    style={styles.tagActionButton}
                    onPress={() => setShowTagOptions(true)}
                  >
                    <Text style={styles.tagActionText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tagActionButton}
                    onPress={handleClearTag}
                  >
                    <X size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addTagPrompt}
                onPress={() => setShowTagOptions(true)}
              >
                <Tag size={18} color={theme.textSecondary} />
                <Text style={styles.addTagPromptText}>
                  Add a tag to categorize this transfer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showTagOptions && (
          <View style={styles.tagOptionsWrapper}>
            <Text style={styles.tagOptionsTitle}>Select a category</Text>
            <View style={styles.tagOptionsGrid}>
              {MOCK_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagOptionCard,
                    selectedTag?.id === tag.id && styles.tagOptionCardSelected,
                  ]}
                  onPress={() => handleSelectTag(tag)}
                >
                  <View
                    style={[
                      styles.tagOptionIcon,
                      { backgroundColor: tag.color + "15" },
                    ]}
                  >
                    {tag.icon && <tag.icon size={20} color={tag.color} />}
                  </View>
                  <Text
                    style={[
                      styles.tagOptionName,
                      selectedTag?.id === tag.id &&
                        styles.tagOptionNameSelected,
                    ]}
                  >
                    {tag.name}
                  </Text>
                  {selectedTag?.id === tag.id && (
                    <View style={styles.tagOptionCheck}>
                      <CheckCircle size={14} color={theme.success} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.tagOptionsCancel}
              onPress={() => setShowTagOptions(false)}
            >
              <Text style={styles.tagOptionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.downloadButton]}
          onPress={handleDownloadReceipt}
        >
          <Download size={18} color={theme.text} />
          <Text style={styles.actionButtonText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.emailButton]}
          onPress={handleEmailReceipt}
        >
          <Mail size={18} color={theme.text} />
          <Text style={styles.actionButtonText}>Email</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={onClose}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </>
  );

  const renderErrorContent = () => (
    <>
      <View style={styles.iconContainer}>
        <XCircle size={48} color={theme.error} />
      </View>

      <Text style={styles.message}>{errorMessage}</Text>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={() => {
            onClose();
            onRetry?.();
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {type === "success" ? "Transfer Successful" : "Transfer Failed"}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {type === "success" ? renderSuccessContent() : renderErrorContent()}
        </View>
      </View>
    </Modal>
  );
}
