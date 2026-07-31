import { SCREEN_WIDTH } from "@gorhom/bottom-sheet";
import { StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

export const GroupIndexStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      borderRadius: 16,
    },
    searchbar: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.surface,
      marginBottom: 12,
    },
    searchinput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.text,
    },
    searchicon: {
      marginLeft: 8,
    },
    groupheader: {
      paddingVertical: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    header: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "bold",
    },

    /* ---- My Groups Cards ---- */
    mygroupscontainer: {
      marginBottom: 8,
    },
    groupCardGradient: {
      borderRadius: 16,
      padding: 14,
      marginVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
    },
    groupicon: {
      marginRight: 12,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    groupinfo: {
      flex: 1,
      paddingRight: 10,
    },
    chatsBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: theme.primary,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    chatsBadgeText: {
      fontSize: 11,
      fontWeight: "bold",
      color: "#fff",
    },

    /* ---- Add group button ---- */
    addgroup: {
      marginVertical: 12,
    },
    addButtonGradient: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    /* ---- Invite cards ---- */
    invitesection: {
      marginBottom: 16,
    },
    inviteCardGradient: {
      width: 200,
      borderRadius: 16,
      padding: 12,
      marginRight: 16,
      overflow: "hidden",
    },
    inviteIcon: {
      height: 80,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.15)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    inviteinfo: {
      marginBottom: 8,
    },
    inviteactions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 8,
    },

    /* ---- Discover cards ---- */
    discoverCardGradient: {
      width: SCREEN_WIDTH * 0.65,
      borderRadius: 16,
      padding: 12,
      marginRight: 16,
      overflow: "hidden",
    },
    discoveractions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
    },
    actionButton: {
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    viewButton: {
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    viewButtonText: {
      fontSize: 12,
      fontWeight: "500",
      color: "#fff",
    },
  });