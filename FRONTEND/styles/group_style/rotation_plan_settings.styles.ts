import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const RotationPlanSettingsStyles = (theme: AppTheme) =>
  StyleSheet.create({
   container:{
            //maxHeight:SCREEN_HEIGHT*0.8,
            flex: 1,
            padding:10,
            gap:10
        
        },
  headingText:{
                    fontWeight:"bold",
                    fontSize:12
                },
 progressTrackerContainer:{
                        maxHeight:200,
                        
                        borderBottomWidth:1,
                        borderColor:theme.border,
                        flexDirection:"row",
                        flexWrap:"wrap",
                        gap:10,
                        overflowY:"scroll",
                        padding:10,
                    },
contributionMediumContainer:{
                gap:10,
                borderBottomWidth:1,
                borderColor:theme.border,
                padding:10
            },
 myPlanFinancesContainer: {
                    gap:10,
                    borderBottomWidth:1,
                    borderTopWidth:1,
                    borderColor:theme.border,
                    padding:10
                },   
   financeItems:{
                    flexDirection:"row",
                    justifyContent:"space-between"
                },
    financeItemLabel:{
                    fontSize:13,
                    color:theme.textSecondary,
                    fontWeight:"bold"
                },
          financeItemsText: {
                    fontWeight:"bold",
                    fontSize:14
                }, 
     financeItemsBalance:{
                    flexDirection:"row",
                    justifyContent:"space-between",
                    alignItems:"center",
                    paddingLeft:10
                },
 financeBalanceAction:{
                    justifyContent:"center",
                    alignItems:"center",
                    padding:10,
                    backgroundColor:theme.secondary,
                    borderRadius:16,

                },

financeBalanceActionText:{
                        fontWeight:"bold",
                        fontSize:12,
                        color:theme.surface
                    },
rotationActionsContainer:{
                gap:10,
                padding:10
            },
rotationActionsHeading:{
                    fontSize:14,
                    fontWeight:"bold"
                },
rotationActionsModifiers:{
                    flexDirection:"row",
                    gap:10,
                    justifyContent:"space-between"
                },
actionModifierButton:{ 
                    padding:10,
                    justifyContent:"center",
                    alignItems:"center",
                    flexDirection:"row",
                    backgroundColor:theme.secondary,
                    borderRadius:16,
                    gap:5
                 },
actionModifierButtonText:{
                        fontWeight:"bold",
                        color:theme.surface,
                        fontSize:13
                    },
actionReportButton:{ 
                    padding:10,
                    justifyContent:"center",
                    alignItems:"center",
                    flexDirection:"row",
                    backgroundColor:theme.secondary,
                    borderRadius:16,
                    gap:10
                },
    tabScrollContainer: {
      padding: 2,
      gap: 5,
      justifyContent: "space-between",
      alignItems: "center",
    },
tabButtonContainer: {
      padding: 8,
      borderWidth: 1,
      borderRadius: 16,
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderColor: theme.border,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      justifyContent: "space-between",
      gap: 5,
      alignItems: "center",
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: "600",
      // marginRight: 8,
      color: theme.textSecondary,
    },
    tabRenderContainer: {
    //   flex: 1,
    maxHeight:SCREEN_HEIGHT*0.8,
      borderColor: theme.border,
      borderTopWidth: 1,
      paddingBottom: 20,
      
    },
    infoTabContainer: {
  gap: 12,
  paddingVertical: 10,
},
infoLabel: {
  fontWeight: '600',
  fontSize: 14,
  color: theme.text,
  marginBottom: 4,
},
infoInput: {
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 8,
  padding: 10,
  backgroundColor: theme.background,
  color: theme.text,
},
intervalPickerContainer: {
  marginTop: 4,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 8,
  padding: 8,
  gap: 4,
},
intervalOption: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 6,
},
intervalOptionSelected: {
  backgroundColor: theme.primary,
},
radioGroup: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 4,
},
radioButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
radioOuter: {
  height: 20,
  width: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: theme.border,
  justifyContent: 'center',
  alignItems: 'center',
},
radioOuterSelected: {
  borderColor: theme.primary,
},
radioInner: {
  height: 10,
  width: 10,
  borderRadius: 5,
  backgroundColor: theme.primary,
},
radioLabel: {
  fontSize: 14,
  color: theme.text,
},
saveButton: {
  backgroundColor: theme.primary,
  padding: 14,
  borderRadius: 10,
  alignItems: 'center',
  marginTop: 10,
},
saveButtonText: {
  color: theme.surface,
  fontWeight: 'bold',
  fontSize: 16,
},
});
