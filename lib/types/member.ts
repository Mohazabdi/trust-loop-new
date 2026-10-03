export interface MemberProfile {
  id: string;
  member_ref: string | null;
  auth_id: string;
  first_name: string;
  last_name: string;
  date_of_register: string;
  is_active: boolean;
}
