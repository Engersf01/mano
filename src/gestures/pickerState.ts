// High-frequency view-picker state written by the finger-count detector and
// read by the ModePicker overlay via a RAF loop. Kept out of React/Zustand
// so 60fps updates don't cause render floods.
export const pickerState = {
  visible: false, // left hand up showing 1-4 fingers
  count: 0, // current extended-finger count (1-4)
  progress: 0, // dwell progress 0..1 toward confirming
  justConfirmed: 0, // timestamp of last confirm (for the flash)
};

export function resetPicker() {
  pickerState.visible = false;
  pickerState.count = 0;
  pickerState.progress = 0;
}
