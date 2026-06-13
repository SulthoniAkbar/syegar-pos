import { create } from "zustand";

type ShiftState = {
  selectedShiftId: string | null;
  setSelectedShiftId: (shiftId: string | null) => void;
};

export const useShiftStore = create<ShiftState>((set) => ({
  selectedShiftId: null,
  setSelectedShiftId: (selectedShiftId) => set({ selectedShiftId })
}));
