import { RotationPlanInvitees, useGetRotationPlanInvitees } from "@/hooks/useGetRotationPlanInvitees";
import { useSendRotationInvite } from "@/hooks/useSendRotationInvite";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";
import { GroupMemberSectionStyles } from "@/styles/group_style/group_members_section.styles";
import { ListOfMemberSectionStyles } from "@/styles/group_style/list_of_member_section.styles";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { CheckCircle, HelpCircle, Inbox, Search, Users, XCircle } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { toast } from "sonner-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ListOfMemberSelector(
{
  onClose,
}: {
  onClose: () => void;
})
{
  const { theme,setIsRotationInviteesSheetOpen } = useGlobalStorage();
  const{rotationPlanId}=useGroupStorage();
  const mutation = useSendRotationInvite();
  const {data:members ,refetch}=useGetRotationPlanInvitees(rotationPlanId);
  const styles = useMemo(() => ListOfMemberSectionStyles(theme), [theme]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedMembers,setSelectedMembers]=useState<RotationPlanInvitees[]>([]);
  const handleDonePress = async () => {
  if (selectedMembers.length === 0) {
    setIsRotationInviteesSheetOpen(false);
    setSelectedMembers([]);
    onClose();
    return;
  }
  
  await handleRotationInvite();
};
  
  const handleRotationInvite=async()=>{
    const memberIds=selectedMembers.map(m=>m.id); 
    try{
          const result=await mutation.mutateAsync(
        {
          group_member_ids:memberIds,
          rotation_plan_id:rotationPlanId
        }
       );
       onClose();
       setIsRotationInviteesSheetOpen(false);
       toast.success("All Invites sent successfully!");
       setSelectedMembers([]);

      }catch(e:any){
      toast.error(e.message || "Failed to send Invites. Please try again.");
      }
  }
  const handleSearch = (text: string) => {
    setSearchInput(text);
  };
  const toggleMember = (member: RotationPlanInvitees) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((m) => m.id === member.id);
      if (exists) {
        return prev.filter((m) => m.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };  

  return(
      <>
        <Text
                      style={{
                        color: theme.textSecondary,
                        fontWeight: "bold",
                        fontSize: 17,
                        paddingVertical: 5,
                        textAlign: "center",
                      }}
                    >
                      Select to Invite group Members to plan
                    </Text>
                    <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 10,
              gap: 10,
              borderWidth: 1,
              backgroundColor: theme.background,
              borderColor: theme.background,
              borderRadius: 30,
              shadowColor: theme.foreground,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Search size={16} color={theme.textSecondary} />
            <BottomSheetTextInput
              inputMode="text"
              value={searchInput}
              onChangeText={handleSearch}
              placeholder="Search for members"
              placeholderTextColor={theme.textSecondary}
              style={{ width: SCREEN_WIDTH * 0.7 }}
            />
          </View>
        <ScrollView style={styles.groupMembersContainer}
        contentContainerStyle={{gap:10}}
        >
          
          <View
          style={{
            flexDirection:"row",
            padding:10,
            justifyContent:"space-between",
            borderColor:theme.border,
            borderBottomWidth:1
          }}
          >
          <Text
          style={{
            fontSize:12,
            fontWeight:"bold",
            color:theme.textSecondary
          }}
          >Available Members ({(members?.length ?? 0)-selectedMembers.length})</Text>
              <Text
          style={{
            fontSize:12,
            fontWeight:"bold",
            color:theme.textSecondary
          }}
          >Selected Members ({selectedMembers.length})</Text>
          </View>

      {
      members && members.length > 0 ?(

        members?.map((member) => {
          const isSelected = selectedMembers.some((m) => m.id === member.id);
          return (
            <TouchableOpacity style={[styles.groupMember,{
              borderWidth:1,
              //borderColor:theme.border,
              borderColor: isSelected ? theme.success : theme.border,
            }]} key={member.id
            }
            onPress={() => toggleMember(member)}
            >
              <View style={styles.groupMemberAvatar}>
                <Users size={27} color={theme.text} />
              </View>
              <View style={styles.groupMemberDetails}>
                <Text
                  style={styles.groupMemberName}
                >{`${member.first_name} ${member.last_name}`}</Text>
              </View>
              {
                member.member_role &&(
              <View style={styles.memberRightItems}>
                <Text style={styles.memberType}>{`${member.member_role}`}</Text>
                {/* <Dot size={26} color={theme.success} /> */}
              </View>
                )
              }
            </TouchableOpacity>
          );
        })
      )
      :(
<TouchableOpacity
onPress={async()=>{
  const{data,error}=await refetch()
  {data && toast.success("Data is upto date")}
  {error && toast.error("Something went wrong could not refetch")}
}}
      style={{
        padding:10,
        borderRadius:16,
        borderColor:theme.border,
        borderStyle:'dashed',
        borderWidth:2,
        alignItems:"center",
        justifyContent:"center",
        gap:10
      }}
      >
        <Inbox size={30} color={theme.textSecondary}/>
        <Text 
        style={{
          color:theme.textSecondary,
          fontWeight:"bold",
          fontSize:14,
          textAlign:"center"

        }}
        >No Members Available for Invitation press to refetch</Text>
      </TouchableOpacity>
      )
      
      }
    </ScrollView>
    <View style={styles.recipientDrawerActions}>
        <TouchableOpacity style={styles.optionsIcons}
         onPress={() => setSelectedMembers([])}
        >
          <XCircle size={25} color={theme.foreground} />
          <Text>Clear all</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionsIcons,
            {
              backgroundColor:
                selectedMembers.length>0
                  ? theme.success
                  : theme.surface,
              borderColor:
                selectedMembers.length>0
                  ? theme.surface
                  : theme.border,
            },
          ]}
          onPress={handleDonePress}
        >
            <Text style={styles.optionsIconsText}>
    {selectedMembers.length > 0 ? 'Done' : 'Close'}
  </Text>
          <CheckCircle size={20} color={theme.text} />
        </TouchableOpacity>
      </View>
      </>
    )
}