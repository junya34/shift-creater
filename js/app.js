// app.js

(() => {
  let appData;
  let currentDate = new Date();
  // We'll fix to the current month for demo purposes, or let users navigate.
  let currentYear = currentDate.getFullYear();
  let currentMonth = currentDate.getMonth() + 1;

  // Destructure from globals
  const { loadData, saveData, TOTAL_SLOTS, SLOTS_PER_HOUR } = window.Store;
  const { generateShifts } = window.Scheduler;
  const { updateDashboardStats, renderStaffSelect, renderAvailabilityCalendar, renderRequirementsGrid, renderShiftTable } = window.UI;

  document.addEventListener('DOMContentLoaded', () => {
    appData = loadData();
    initApp();
    setupEventListeners();
  });

  function initApp() {
    updateDashboardStats(appData);
    renderStaffSelect(appData, document.getElementById('staff-select'));
    updateMonthDisplay();
    
    // Re-render current active view data
    const activeView = document.querySelector('.view.active').id;
    if (activeView === 'staff-portal') {
      handleStaffSelection();
    } else if (activeView === 'manager-portal') {
      handleManagerPortalTab();
    }
  }

  function updateMonthDisplay() {
    document.getElementById('current-month-display').textContent = `${currentYear}年${currentMonth}月`;
  }

  function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const targetId = e.currentTarget.dataset.target;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        if (targetId === 'dashboard') updateDashboardStats(appData);
        if (targetId === 'staff-portal') handleStaffSelection();
        if (targetId === 'manager-portal') handleManagerPortalTab();
      });
    });

    // Modal handlers
    document.getElementById('btn-add-staff').addEventListener('click', () => {
      document.getElementById('add-staff-modal').classList.add('active');
    });
    
    document.getElementById('btn-cancel-staff').addEventListener('click', () => {
      document.getElementById('add-staff-modal').classList.remove('active');
    });
    
    document.getElementById('btn-submit-staff').addEventListener('click', () => {
      const name = document.getElementById('new-staff-name').value.trim();
      const colors = ['#4f46e5', '#2563eb', '#0ea5e9', '#0d9488', '#059669', '#16a34a', '#ca8a04', '#d97706', '#ea580c', '#dc2626', '#db2777', '#9333ea'];
      const color = colors[appData.staff.length % colors.length];
      if (name) {
        appData.staff.push({ id: 'staff_' + Date.now(), name, color });
        saveData(appData);
        renderStaffSelect(appData, document.getElementById('staff-select'));
        document.getElementById('add-staff-modal').classList.remove('active');
        document.getElementById('new-staff-name').value = '';
        updateDashboardStats(appData);
      }
    });

    // Staff Portal
    document.getElementById('staff-select').addEventListener('change', handleStaffSelection);
    
    document.getElementById('btn-prev-month').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 1) { currentMonth = 12; currentYear--; }
      updateMonthDisplay();
      handleStaffSelection();
    });
    
    document.getElementById('btn-next-month').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 12) { currentMonth = 1; currentYear++; }
      updateMonthDisplay();
      handleStaffSelection();
    });

    document.getElementById('btn-save-availability').addEventListener('click', () => {
      const staffId = document.getElementById('staff-select').value;
      if (!staffId) return;
      
      // Collect from DOM
      const timeSlotsContainers = document.querySelectorAll('.time-slots');
      timeSlotsContainers.forEach(container => {
        const dateStr = container.dataset.date;
        const key = `${staffId}_${dateStr}`;
        const selected = [];
        container.querySelectorAll('.time-slot.selected').forEach(slot => {
          selected.push(parseInt(slot.dataset.index, 10));
        });
        appData.availability[key] = selected;
      });
      
      saveData(appData);
      alert('希望シフトを保存しました！');
      updateDashboardStats(appData);
    });

    // Manager Portal
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const targetTabId = e.currentTarget.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(`tab-${targetTabId}`).classList.add('active');
        
        handleManagerPortalTab();
      });
    });
    
    // Save requirements on change
    document.getElementById('requirements-grid').addEventListener('change', (e) => {
      if (e.target.tagName === 'INPUT') {
        const container = e.target.closest('.req-time-blocks');
        const dayOfWeek = container.dataset.dayOfWeek;
        const reqKey = `dow_${dayOfWeek}`;
        
        if (!appData.requirements[reqKey]) {
          appData.requirements[reqKey] = new Array(TOTAL_SLOTS).fill(0);
        }
        
        const hourIndex = parseInt(e.target.dataset.hourIndex, 10);
        const val = parseInt(e.target.value, 10) || 0;
        
        // Apply to all 4 slots of this hour
        for (let i = 0; i < 4; i++) {
          appData.requirements[reqKey][hourIndex * 4 + i] = val;
        }
        saveData(appData);
      }
    });

    // Generate Shifts
    const doGenerateShifts = (btn) => {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<span class="material-icons-round">autorenew</span>生成中...';
      btn.disabled = true;
      
      setTimeout(() => {
        const yearMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        appData = generateShifts(yearMonth, appData);
        saveData(appData);
        
        // Switch to shift view tab
        document.querySelector('.tab[data-tab="shift-view"]').click();
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        updateDashboardStats(appData);
        handleManagerPortalTab(); // refresh view if already on it
      }, 500); // Simulate processing time for UX
    };

    document.getElementById('btn-generate-shift').addEventListener('click', (e) => doGenerateShifts(e.currentTarget));
    document.getElementById('btn-regenerate-shift').addEventListener('click', (e) => doGenerateShifts(e.currentTarget));
    document.getElementById('btn-print-pdf').addEventListener('click', () => {
      window.print();
    });
    
    document.getElementById('btn-clear-shift').addEventListener('click', () => {
      if (confirm('この月のシフトをすべてクリアしますか？')) {
        const yearMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        for (let key in appData.shifts) {
          if (key.startsWith(yearMonth)) {
            delete appData.shifts[key];
          }
        }
        saveData(appData);
        updateDashboardStats(appData);
        handleManagerPortalTab();
      }
    });
  }

  function handleStaffSelection() {
    const staffId = document.getElementById('staff-select').value;
    const section = document.getElementById('availability-section');
    if (staffId) {
      section.classList.remove('hidden');
      renderAvailabilityCalendar(document.getElementById('availability-calendar'), currentYear, currentMonth, staffId, appData);
    } else {
      section.classList.add('hidden');
    }
  }

  function handleManagerPortalTab() {
    const activeTabId = document.querySelector('.tab-content.active').id;
    if (activeTabId === 'tab-requirements') {
      renderRequirementsGrid(document.getElementById('requirements-grid'), currentYear, currentMonth, appData);
    } else if (activeTabId === 'tab-shift-view') {
      renderShiftTable(document.getElementById('shift-table-container'), currentYear, currentMonth, appData);
    }
  }
})();
