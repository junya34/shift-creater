// store.js
// Handles localStorage persistence and data structures

(() => {
  const TIME_START = 9; // 09:00
  const TIME_END = 22; // 22:00
  const SLOTS_PER_HOUR = 4; // 15-minute increments
  const TOTAL_SLOTS = (TIME_END - TIME_START) * SLOTS_PER_HOUR; // 13 * 4 = 52 slots

  const defaultState = {
    staff: [], // { id, name, color }
    availability: {}, // { "staffId_YYYY-MM-DD": [slotIndex1, slotIndex2, ...] }
    requirements: {}, // { "YYYY-MM-DD": [reqSlot0, reqSlot1, ... reqSlot51] }
    shifts: {}, // { "YYYY-MM-DD": [ { staffId, work: [startSlot, endSlot], break: [startSlot, endSlot] | null } ] }
  };

  function loadData() {
    const data = localStorage.getItem('shift_creator_data');
    if (data) {
      return JSON.parse(data);
    }
    return JSON.parse(JSON.stringify(defaultState));
  }

  function saveData(data) {
    localStorage.setItem('shift_creator_data', JSON.stringify(data));
  }

  function formatTime(slotIndex) {
    const hour = Math.floor(slotIndex / SLOTS_PER_HOUR) + TIME_START;
    const minute = (slotIndex % SLOTS_PER_HOUR) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  let cachedLabels = null;
  function generateSlotLabels() {
    if (cachedLabels) return cachedLabels;
    const labels = [];
    for (let i = 0; i <= TOTAL_SLOTS; i++) {
      if (i % SLOTS_PER_HOUR === 0) {
        labels.push(TIME_START + i / SLOTS_PER_HOUR + ':00');
      }
    }
    cachedLabels = labels;
    return labels;
  }

  // Expose globally
  window.Store = {
    TIME_START,
    TIME_END,
    SLOTS_PER_HOUR,
    TOTAL_SLOTS,
    defaultState,
    loadData,
    saveData,
    formatTime,
    generateSlotLabels
  };
})();
