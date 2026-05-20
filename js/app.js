// app.js
import { loadData, saveData, TOTAL_SLOTS, SLOTS_PER_HOUR } from './store.js';
import { generateShifts } from './scheduler.js';
import { updateDashboardStats, renderStaffSelect, renderAvailabilityCalendar, renderRequirementsGrid, renderShiftTable } from './ui.js';

let appData;
let currentDate = new Date();
// We'll fix to the current month for demo purposes, or let users navigate.
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth() + 1;

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
    const color = document.getElementById('new-staff-color').value;
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
      const dateStr = container.dataset.date;
      
      if (!appData.requirements[dateStr]) {
        appData.requirements[dateStr] = new Array(TOTAL_SLOTS).fill(0);
      }
      
      const hourIndex = parseInt(e.target.dataset.hourIndex, 10);
      const val = parseInt(e.target.value, 10) || 0;
      
      // Apply to all 4 slots of this hour
      for (let i = 0; i < 4; i++) {
        appData.requirements[dateStr][hourIndex * 4 + i] = val;
      }
      saveData(appData);
    }
  });
  
  // Copy to all days
  document.getElementById('btn-copy-reqs').addEventListener('click', () => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDayReqs = appData.requirements[`${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`];
    if (!firstDayReqs) return alert('1日の設定がありません。');
    
    for (let day = 2; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      appData.requirements[dateStr] = [...firstDayReqs];
    }
    saveData(appData);
    handleManagerPortalTab();
    alert('1日の設定を全日にコピーしました。');
  });

  // Generate Shifts
  document.getElementById('btn-generate-shift').addEventListener('click', () => {
    const btn = document.getElementById('btn-generate-shift');
    btn.innerHTML = '<span class="material-icons-round">autorenew</span>生成中...';
    btn.disabled = true;
    
    setTimeout(() => {
      const yearMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
      appData = generateShifts(yearMonth, appData);
      saveData(appData);
      
      // Switch to shift view tab
      document.querySelector('.tab[data-tab="shift-view"]').click();
      btn.innerHTML = '<span class="material-icons-round">auto_awesome</span>シフトを自動生成';
      btn.disabled = false;
      updateDashboardStats(appData);
    }, 500); // Simulate processing time for UX
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
