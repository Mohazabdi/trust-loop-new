import { GroupMembers } from "@/lib/types/group_types";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupMemberSectionStyles } from "@/styles/group_style/group_members_section.styles";
import { Dot, Users } from "lucide-react-native";
import { useMemo } from "react";
import { Dimensions, Text, View } from "react-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
interface GroupMemberSectionProps {
  members: GroupMembers[] | undefined;
}
export default function GroupMemberSection({
  members,
}: GroupMemberSectionProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => GroupMemberSectionStyles(theme), [theme]);
  return (
    <View style={styles.groupMembersContainer}>
      {members?.map((member) => {
        return (
          <View style={styles.groupMember} key={member.id}>
            <View style={styles.groupMemberAvatar}>
              <Users size={32} color={theme.text} />
            </View>
            <View style={styles.groupMemberDetails}>
              <Text
                style={styles.groupMemberName}
              >{`${member.member.first_name} ${member.member.last_name}`}</Text>
              <Text
                style={styles.memberDateJoined}
              >{`joined: ${member.created_at}`}</Text>
            </View>
            <View style={styles.memberRightItems}>
              <Text style={styles.memberType}>{`${member.role}`}</Text>
              <Dot size={26} color={theme.success} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
