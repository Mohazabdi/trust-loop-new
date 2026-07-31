import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
//import { SCREEN_HEIGHT } from '@gorhom/bottom-sheet';
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
export const LoginPageStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: "#ebebeb",
      flex: 1,
    },
    mainContent: {
      justifyContent: "center",
      alignItems: "center",
      padding: 10,
      gap: 10,
    },
    appLogoContainer: {
      padding: 10,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 20,
      height: 90,
      width: 90,
      backgroundColor: "#212520",
      //backgroundColor: "#17690c",
    },
    logoText: {
      color: "#fff",
      fontSize: 50,
      fontWeight: "bold",
    },
    platformNameText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "bold",
    },
    greetingsContainer: {
      justifyContent: "center",
      alignItems: "center",
      // padding: 10,
      gap: 10,
    },
    greetingsText: {
      color: "#3d3737",
      fontSize: 20,
      fontWeight: "bold",
    },
    welcomeText: {
      color: "#3d3737",
      fontSize: 16,
      fontWeight: "bold",
    },
    loginPromptText: {
      color: "#3d3737",
      fontSize: 12,
      fontWeight: "bold",
    },
    formContainer: {
      justifyContent: "flex-start",
      // alignItems: "",
      padding: 10,
      gap: 10,
    },
    fieldLabel: {
      paddingLeft: 20,
      color: "#3d3737",
      fontSize: 12,
      fontWeight: "bold",
    },
    fieldInput: {
      color: "#000000",
      padding: 15,
      fontSize: 13,
      fontWeight: "bold",
      borderRadius: 20,
      // borderWidth: 1,
      backgroundColor: "#fff",
      width: SCREEN_WIDTH * 0.7,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      padding: 10,
      gap: 10,
      borderRadius: 17,
    },
    primaryButton: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#17690c",
      minWidth: "70%",
      padding: 15,
      borderRadius: 17,
    },
    primaryButtonText: {
      display: "flex",
      padding: 0,
      color: "#fff",
      fontSize: 14,
      fontWeight: "bold",
    },
    loginPreliminariesContainer: {
      padding: 5,
      justifyContent: "center",
      alignItems: "center",
    },
    forgotPasswordText: {
      fontSize: 15,
      fontWeight: "bold",
      color: "#17690c",
      textDecorationLine: "underline",
    },
    createAccountContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 15,
    },
    newToTrustLoopText: { fontSize: 15, color: "#4a4a4a" },
    createAccountText: {
      fontSize: 15,
      fontWeight: "bold",
      color: "#212520",
      textDecorationLine: "underline",
    },
  });
