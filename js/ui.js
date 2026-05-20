// ui.js

(() => {
  function updateDashboardStats(data) {
    document.getElementById('dash-staff-count').textContent = data.staff.length;
    document.getElementById('dash-submission-count').textContent = Object.keys(data.availability).length;
    document.getElementById('dash-status').textContent = Object.keys(data.shifts).length > 0 ? '生成済み' : '未作成';
  }

  function renderStaffSelect(data, selectElement) {
    const currentVal = selectElement.value;
    selectElement.innerHTML = '<option value="">-- 選択してください --</option>';
    data.staff.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      selectElement.appendChild(opt);
    });
    if (currentVal) selectElement.value = currentVal;
  }

  function renderAvailabilityCalendar(container, year, month, staffId, data) {
    const TOTAL_SLOTS = window.Store.TOTAL_SLOTS;
    const generateSlotLabels = window.Store.generateSlotLabels;
    
    container.innerHTML = '';
    const daysInMonth = new Date(year, month, 0).getDate();
    const labels = generateSlotLabels();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
      const availKey = `${staffId}_${dateStr}`;
      const selectedSlots = new Set(data.availability[availKey] || []);

      const row = document.createElement('div');
      row.className = 'day-row';
      
      const header = document.createElement('div');
      header.className = 'day-label';
      header.innerHTML = `<span>${month}月${day}日 (${dayOfWeek})</span>`;
      
      // Quick select buttons
      const quickSelect = document.createElement('div');
      const btnAll = document.createElement('button');
      btnAll.className = 'icon-btn';
      btnAll.innerHTML = '<span class="material-icons-round" style="font-size: 16px;">done_all</span>';
      btnAll.title = "終日選択";
      btnAll.onclick = () => {
        const slotsDiv = row.querySelector('.time-slots');
        Array.from(slotsDiv.children).forEach(s => s.classList.add('selected'));
      };
      const btnClear = document.createElement('button');
      btnClear.className = 'icon-btn';
      btnClear.innerHTML = '<span class="material-icons-round" style="font-size: 16px;">clear_all</span>';
      btnClear.title = "クリア";
      btnClear.onclick = () => {
        const slotsDiv = row.querySelector('.time-slots');
        Array.from(slotsDiv.children).forEach(s => s.classList.remove('selected'));
      };
      quickSelect.style.display = 'flex';
      quickSelect.appendChild(btnAll);
      quickSelect.appendChild(btnClear);
      header.appendChild(quickSelect);
      
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'time-slider-container';
      
      const timeSlots = document.createElement('div');
      timeSlots.className = 'time-slots';
      timeSlots.dataset.date = dateStr;
      
      let isDragging = false;
      let dragMode = null; // 'select' or 'deselect'
      
      for (let s = 0; s < TOTAL_SLOTS; s++) {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        if (selectedSlots.has(s)) {
          slot.classList.add('selected');
        }
        slot.dataset.index = s;
        
        // Mouse events for drag selection
        slot.addEventListener('mousedown', (e) => {
          isDragging = true;
          dragMode = !slot.classList.contains('selected');
          toggleSlot(slot, dragMode);
        });
        slot.addEventListener('mouseenter', (e) => {
          if (isDragging) {
            toggleSlot(slot, dragMode);
          }
        });
        
        timeSlots.appendChild(slot);
      }
      
      document.addEventListener('mouseup', () => { isDragging = false; });
      
      const labelsDiv = document.createElement('div');
      labelsDiv.className = 'time-labels';
      labels.forEach(l => {
        const span = document.createElement('span');
        span.textContent = l;
        labelsDiv.appendChild(span);
      });

      sliderContainer.appendChild(timeSlots);
      
      row.appendChild(header);
      row.appendChild(sliderContainer);
      row.appendChild(labelsDiv);
      container.appendChild(row);
    }
  }

  function toggleSlot(slot, mode) {
    if (mode) slot.classList.add('selected');
    else slot.classList.remove('selected');
  }

  function renderRequirementsGrid(container, year, month, data) {
    const TOTAL_SLOTS = window.Store.TOTAL_SLOTS;
    const formatTime = window.Store.formatTime;
    
    container.innerHTML = '';
    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const reqKey = `dow_${dayOfWeek}`;
      const reqs = data.requirements[reqKey] || new Array(TOTAL_SLOTS).fill(0);
      
      const block = document.createElement('div');
      block.className = 'req-day';
      
      const header = document.createElement('h4');
      header.textContent = dayNames[dayOfWeek];
      header.style.marginBottom = '8px';
      header.style.color = 'var(--primary)';
      
      const blocksContainer = document.createElement('div');
      blocksContainer.className = 'req-time-blocks';
      blocksContainer.dataset.dayOfWeek = dayOfWeek;
      
      // Group slots into hours for easier UI (4 slots = 1 hour)
      for (let h = 0; h < TOTAL_SLOTS / 4; h++) {
        const hourBlock = document.createElement('div');
        hourBlock.className = 'req-block';
        const label = document.createElement('label');
        // show e.g. 09:00
        label.textContent = formatTime(h * 4);
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.dataset.hourIndex = h;
        // We assume requirements are mostly the same for the whole hour in manual entry
        input.value = reqs[h * 4];
        
        hourBlock.appendChild(label);
        hourBlock.appendChild(input);
        blocksContainer.appendChild(hourBlock);
      }
      
      block.appendChild(header);
      block.appendChild(blocksContainer);
      container.appendChild(block);
    }
  }

  function renderShiftTable(container, year, month, data) {
    const TOTAL_SLOTS = window.Store.TOTAL_SLOTS;
    const formatTime = window.Store.formatTime;
    
    container.innerHTML = '';
    
    if (Object.keys(data.shifts).length === 0) {
      container.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">シフトが未作成です。「必要オペ数設定」から自動生成を行ってください。</div>';
      return;
    }
    
    const shortageList = document.getElementById('shortage-list');
    const shortageContainer = document.getElementById('shortage-report-container');
    if (shortageList) shortageList.innerHTML = '';
    let totalShortages = 0;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const table = document.createElement('table');
    table.className = 'shift-table';
    
    // Header
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    trHead.innerHTML = '<th>スタッフ / 時間</th>';
    for (let s = 0; s < TOTAL_SLOTS; s++) {
      // Only show hourly labels
      const th = document.createElement('th');
      if (s % 4 === 0) {
        th.textContent = formatTime(s).split(':')[0];
        th.colSpan = 4;
      } else {
        th.style.display = 'none'; // handled by colSpan
      }
      trHead.appendChild(th);
    }
    thead.appendChild(trHead);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayShifts = data.shifts[dateStr] || [];
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
      
      // Day Header Row
      const trDay = document.createElement('tr');
      const tdDay = document.createElement('td');
      tdDay.colSpan = TOTAL_SLOTS + 1;
      tdDay.textContent = `${month}月${day}日 (${dayOfWeek})`;
      tdDay.style.background = 'rgba(99, 102, 241, 0.1)';
      tdDay.style.color = 'var(--primary)';
      tdDay.style.fontWeight = '700';
      tdDay.style.textAlign = 'left';
      trDay.appendChild(tdDay);
      tbody.appendChild(trDay);
      
      // Calculate actual vs required
      const actualStaff = new Array(TOTAL_SLOTS).fill(0);
      const reqKey = `dow_${dateObj.getDay()}`;
      const reqs = data.requirements[reqKey] || new Array(TOTAL_SLOTS).fill(0);
      
      dayShifts.forEach(shift => {
        const sinfo = data.staff.find(s => s.id === shift.staffId);
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        
        const dot = document.createElement('span');
        dot.style.display = 'inline-block';
        dot.style.width = '8px';
        dot.style.height = '8px';
        dot.style.borderRadius = '50%';
        dot.style.background = sinfo ? sinfo.color : '#fff';
        dot.style.marginRight = '8px';
        
        tdName.appendChild(dot);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = sinfo ? sinfo.name : 'Unknown';
        tdName.appendChild(nameSpan);
        
        const workSlots = shift.work[1] - shift.work[0];
        const breakSlots = shift.break ? shift.break[1] - shift.break[0] : 0;
        const actualWorkMins = (workSlots - breakSlots) * 15;
        const breakMins = breakSlots * 15;
        
        const infoDiv = document.createElement('div');
        infoDiv.style.fontSize = '0.65rem';
        infoDiv.style.color = 'var(--text-muted)';
        infoDiv.style.marginTop = '4px';
        
        let infoText = `勤務: ${Math.floor(actualWorkMins / 60)}h${(actualWorkMins % 60) > 0 ? (actualWorkMins % 60) + 'm' : ''}`;
        if (breakMins > 0) {
          infoText += ` / 休憩: ${breakMins}m`;
        }
        infoDiv.textContent = infoText;
        
        tdName.appendChild(infoDiv);
        tr.appendChild(tdName);
        
        for (let s = 0; s < TOTAL_SLOTS; s++) {
          const td = document.createElement('td');
          td.className = 'shift-cell';
          
          let isWork = false;
          let isBreak = false;
          
          if (s >= shift.work[0] && s < shift.work[1]) {
            isWork = true;
            if (shift.break && s >= shift.break[0] && s < shift.break[1]) {
              isWork = false;
              isBreak = true;
            }
          }
          
          if (isWork) {
            td.classList.add('shift-work');
            actualStaff[s]++;
          } else if (isBreak) {
            td.classList.add('shift-break');
          }
          
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
      
      // Validation / Requirement Row (Red warning for unmet ops)
      const trReq = document.createElement('tr');
      trReq.className = 'req-row';
      const tdReqLabel = document.createElement('td');
      tdReqLabel.textContent = '配置 / 必要';
      trReq.appendChild(tdReqLabel);
      
      let currentShortageStart = null;
      let maxShortage = 0;

      const recordShortage = (endSlot) => {
        if (currentShortageStart !== null) {
          if (shortageList) {
            const li = document.createElement('li');
            li.style.marginBottom = '4px';
            li.innerHTML = `<strong>${month}月${day}日 (${dayOfWeek})</strong>: ${formatTime(currentShortageStart)} 〜 ${formatTime(endSlot)} <span style="color: var(--danger); font-weight: 600;">(${maxShortage}名不足)</span>`;
            shortageList.appendChild(li);
            totalShortages++;
          }
          currentShortageStart = null;
          maxShortage = 0;
        }
      };

      for (let s = 0; s < TOTAL_SLOTS; s++) {
        const td = document.createElement('td');
        td.textContent = `${actualStaff[s]}/${reqs[s]}`;
        const diff = reqs[s] - actualStaff[s];
        
        if (diff > 0) {
          td.classList.add('req-warning');
          td.title = `要員不足: ${diff}人足りません`;
          if (currentShortageStart === null) currentShortageStart = s;
          maxShortage = Math.max(maxShortage, diff);
        } else {
          recordShortage(s);
        }
        trReq.appendChild(td);
      }
      recordShortage(TOTAL_SLOTS);
      tbody.appendChild(trReq);
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    if (shortageContainer) {
      if (totalShortages > 0) {
        shortageContainer.style.display = 'block';
      } else {
        shortageContainer.style.display = 'none';
      }
    }
  }

  // Expose globally
  window.UI = {
    updateDashboardStats,
    renderStaffSelect,
    renderAvailabilityCalendar,
    renderRequirementsGrid,
    renderShiftTable
  };
})();
