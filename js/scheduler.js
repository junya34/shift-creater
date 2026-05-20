// scheduler.js

(() => {
  /**
   * 15分単位のヒューリスティックシフト生成アルゴリズム
   * @param {string} yearMonth - "YYYY-MM"
   * @param {object} data - store data
   */
  function generateShifts(yearMonth, data) {
    const TOTAL_SLOTS = window.Store.TOTAL_SLOTS;
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Initialize staff hours tracking for balancing (Priority 3)
    const staffHours = {};
    data.staff.forEach(s => staffHours[s.id] = 0);
    
    // Clear existing shifts for this month
    for (let key in data.shifts) {
      if (key.startsWith(yearMonth)) {
        delete data.shifts[key];
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${yearMonth}-${day.toString().padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, day);
      const reqKey = `dow_${dateObj.getDay()}`;
      const reqs = data.requirements[reqKey] || new Array(TOTAL_SLOTS).fill(0);
      // Copy reqs to mutate
      const currentReqs = [...reqs];
      
      // Get staff available on this day
      const availableStaff = [];
      data.staff.forEach(staff => {
        const availKey = `${staff.id}_${dateStr}`;
        if (data.availability[availKey] && data.availability[availKey].length > 0) {
          availableStaff.push({
            id: staff.id,
            avail: new Set(data.availability[availKey]),
            worked: staffHours[staff.id]
          });
        }
      });
      
      // Sort staff by worked hours (ascending) to balance workload. Add a slight random factor to provide variations on "Regenerate"
      availableStaff.sort((a, b) => {
        if (a.worked === b.worked) return Math.random() - 0.5;
        return a.worked - b.worked;
      });
      
      const dayShifts = [];
      
      for (const staff of availableStaff) {
        let bestShift = null;
        let maxScore = -1;
        
        // Evaluate all possible shifts
        // Minimum work = 2 slots (30 mins)
        // Maximum work = 32 slots (8 hours)
        // Break = 3 slots (45 mins) if work >= 24 slots (6 hours)
        
        for (let start = 0; start < TOTAL_SLOTS; start++) {
          if (!staff.avail.has(start)) continue;
          
          for (let end = start + 2; end <= TOTAL_SLOTS; end++) {
            // Check if all slots from start to end-1 are available
            let allAvail = true;
            for (let t = start; t < end; t++) {
              if (!staff.avail.has(t)) {
                allAvail = false;
                break;
              }
            }
            if (!allAvail) break; // If one slot is unavailable, further ends are also invalid
            
            const length = end - start;
            
            // Case 1: No break
            // Valid if work_time < 24 slots (6 hours)
            if (length < 24 && length <= 32) {
              const score = evaluateShift(currentReqs, start, end, null);
              if (score > maxScore) {
                maxScore = score;
                bestShift = { start, end, breakStart: null, breakEnd: null, workSlots: length };
              }
            }
            
            // Case 2: With break (>= 45 mins = >= 3 slots)
            // Break must start >= 8 slots (2h) after start, and end <= 4 slots (1h) before end
            if (length >= 15) { // 8 (before) + 3 (break) + 4 (after) = 15
              for (let bStart = start + 8; bStart <= end - 7; bStart++) {
                // Try break lengths from 3 slots (45 min) upwards
                for (let bLen = 3; bStart + bLen <= end - 4; bLen++) {
                  const bEnd = bStart + bLen;
                  const workSlots = length - bLen;
                  
                  // Rule: Total work time cannot exceed 8 hours (32 slots)
                  if (workSlots <= 32) {
                    const score = evaluateShift(currentReqs, start, end, { bStart, bEnd });
                    if (score > maxScore) {
                      maxScore = score;
                      bestShift = { start, end, breakStart: bStart, breakEnd: bEnd, workSlots };
                    }
                  }
                }
              }
            }
          }
        }
        
        // Assign the best shift if it contributes to the requirements (score > 0)
        if (bestShift && maxScore > 0) {
          dayShifts.push({
            staffId: staff.id,
            work: [bestShift.start, bestShift.end],
            break: bestShift.breakStart !== null ? [bestShift.breakStart, bestShift.breakEnd] : null
          });
          
          // Update requirements
          for (let t = bestShift.start; t < bestShift.end; t++) {
            if (bestShift.breakStart !== null && t >= bestShift.breakStart && t < bestShift.breakEnd) {
              continue; // Break time does not contribute to operation count
            }
            if (currentReqs[t] > 0) {
              currentReqs[t]--;
            }
          }
          
          staffHours[staff.id] += bestShift.workSlots;
        }
      }
      
      if (dayShifts.length > 0) {
        data.shifts[dateStr] = dayShifts;
      }
    }
    
    return data;
  }

  /**
   * Score a shift based on how many required slots it fulfills.
   */
  function evaluateShift(reqs, start, end, breakInfo) {
    let score = 0;
    for (let t = start; t < end; t++) {
      if (breakInfo && t >= breakInfo.bStart && t < breakInfo.bEnd) {
        continue;
      }
      if (reqs[t] > 0) {
        // 1 point for fulfilling a requirement
        score += 1;
      } else {
        // Slight penalty for overstaffing to avoid unnecessary shifts
        score -= 0.1;
      }
    }
    return score;
  }

  // Expose globally
  window.Scheduler = {
    generateShifts
  };
})();
