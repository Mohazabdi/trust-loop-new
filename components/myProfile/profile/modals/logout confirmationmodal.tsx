// components/profile/modals/logout-confirmationmodal.tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/lib/constants/colors';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const { width } = Dimensions.get('window');

export const ConfirmationModal = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  const getTypeColor = () => {
    switch (type) {
      case 'danger': return Colors.primary.red;
      case 'warning': return Colors.primary.yellow;
      case 'info': return Colors.primary.blue;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${getTypeColor()}15` }]}>
              <AlertTriangle size={28} color={getTypeColor()} />
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <X size={20} color={Colors.neutral.gray700} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: getTypeColor() }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    width: Math.min(width - Spacing.xl * 2, 400),
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    ...Shadows.level3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray100,
  },
  content: {
    padding: Spacing.xl,
  },
  title: {
    ...Typography.heading2,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.bodyLarge,
    color: Colors.neutral.gray700,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.neutral.gray100,
    borderWidth: 1,
    borderColor: Colors.neutral.gray300,
  },
  confirmButton: {
    ...Shadows.level1,
  },
  buttonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  cancelButtonText: {
    color: Colors.neutral.gray700,
  },
  confirmButtonText: {
    color: Colors.neutral.white,
  },
});