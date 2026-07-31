import { create } from "zustand";

interface GroupState {
  rotationCycles:number;
  setRotationCycles:(n: number)=>void;
  rotationMemberId:string,
  setRotationMemberId:(id: string)=>void;
  rotationPlanId:string
  setRotationPlanId:(id: string)=>void;
    isAdmin:boolean
  setIsAdmin:(b: boolean)=>void;
   planIsActive:boolean
  setPlanIsActive:(b: boolean)=>void;
   groupMemberId:string
  setGroupMemberId:(gm: string)=>void;
  reset: () => void;
  
}
export const useGroupStorage= create<GroupState>((set) => ({
    rotationCycles: 0,
  setRotationCycles: (rotationCycles) =>
    set({ rotationCycles }),
   rotationMemberId: '',
  setRotationMemberId: (rotationMemberId) =>
    set({ rotationMemberId }),
  groupMemberId: '',
  setGroupMemberId: (groupMemberId) =>
    set({ groupMemberId }),
    rotationPlanId: '',
  setRotationPlanId: (rotationPlanId) =>
    set({ rotationPlanId }),
   isAdmin:false,
  setIsAdmin: (isAdmin) =>
    set({ isAdmin }),
  planIsActive:false,
  setPlanIsActive: (planIsActive) =>
    set({ planIsActive }),
  reset: () =>
    set({
      rotationPlanId: undefined,
    }),
}));
