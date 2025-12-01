const API_BASE = "http://127.0.0.1:8000";

const API = {
  list: `${API_BASE}/reindeer/`,
  updateStatus: `${API_BASE}/reindeer/update-status`,
  logHealth: `${API_BASE}/reindeer/log-health`,
  getLogs: (id) => `${API_BASE}/reindeer/${id}/health-logs`,
  available: `${API_BASE}/reindeer/available`,
};

const state = {
  reindeers: [],
  availableReindeers: [],
  selectedHealthReindeerId: null, // 건강 기록 탭에서 선택된 루돌프
};

let editModal;

// -------------------- 공통 유틸 --------------------

function $(sel, parent = document) {
  return parent.querySelector(sel);
}

function showToast(message, type = "info") {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("d-none", "show", "toast-success", "toast-error");
  
  // 리플로우 강제하여 애니메이션 재시작 효과
  void toast.offsetWidth;

  if (type === "success") toast.classList.add("toast-success");
  else if (type === "error") toast.classList.add("toast-error");
  
  toast.classList.remove("d-none");
  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("d-none"), 300);
  }, 2500);
}

async function fetchJson(url, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      const msg = data.detail || JSON.stringify(data);
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    throw err;
  }
}

// -------------------- 초기화 --------------------

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  
  // 모달 인스턴스
  const modalEl = document.getElementById("editModal");
  if (modalEl && window.bootstrap) {
    editModal = new bootstrap.Modal(modalEl);
  }

  // 버튼 이벤트 리스너
  $("#btn-submit-edit").addEventListener("click", submitEdit);
  $("#btn-save-health-log").addEventListener("click", submitHealthLog);
  $("#health-reindeer-select").addEventListener("change", (e) => {
    loadHealthLogs(e.target.value);
  });

  // 초기 데이터 로드
  loadReindeers();
});

// -------------------- 탭 전환 --------------------

function initTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tabTarget;

      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const panel = document.querySelector(`#tab-${targetId}`);
      if (panel) panel.classList.add("active");

      // 탭 전환 시 데이터 리프레시
      if (targetId === "status") loadReindeers();
      if (targetId === "ready") loadAvailable();
      if (targetId === "health") loadReindeers().then(renderSelectOptions); 
    });
  });
}

// -------------------- 1. 루돌프 상태 관리 --------------------

async function loadReindeers() {
  try {
    const data = await fetchJson(API.list);
    state.reindeers = data;
    renderReindeerCards();
    return data;
  } catch (err) {
    console.error(err);
    showToast("데이터 로드 실패: " + err.message, "error");
  }
}

function renderReindeerCards() {
  const container = $("#reindeer-list-container");
  container.innerHTML = "";

  state.reindeers.forEach((r) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";

    let badgeClass = "status-READY";
    let badgeText = "준비완료";
    if (r.status === "RESTING") { badgeClass = "status-RESTING"; badgeText = "휴식 중"; }
    else if (r.status === "ONDELIVERY") { badgeClass = "status-ONDELIVERY"; badgeText = "배송 중"; }

    col.innerHTML = `
      <article class="reindeer-card">
        <div class="card-header-custom">
          <div class="reindeer-name">🦌 ${r.name}</div>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>
        
        <div class="stat-row">
          <div class="stat-label">
            <span>❤️ 체력</span>
            <span>${r.current_stamina} / 100</span>
          </div>
          <div class="progress-custom">
            <div class="progress-bar-stamina" style="width: ${r.current_stamina}%; height:100%;"></div>
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-label">
            <span>⚡ 마법력</span>
            <span>${r.current_magic} / 100</span>
          </div>
          <div class="progress-custom">
            <div class="progress-bar-magic" style="width: ${r.current_magic}%; height:100%;"></div>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn btn-outline-secondary btn-action btn-edit" data-id="${r.reindeer_id}">⚙ 수정</button>
          <button class="btn btn-outline-brown btn-action btn-carrot" data-id="${r.reindeer_id}">🥕 당근</button>
          <button class="btn btn-outline-brown btn-action btn-magic" data-id="${r.reindeer_id}">💎 마석</button>
        </div>
      </article>
    `;

    // 이벤트 연결
    col.querySelector(".btn-edit").addEventListener("click", () => openEditModal(r.reindeer_id));
    col.querySelector(".btn-carrot").addEventListener("click", () => giveItem(r.reindeer_id, "carrot"));
    col.querySelector(".btn-magic").addEventListener("click", () => giveItem(r.reindeer_id, "magic"));

    container.appendChild(col);
  });
}

// 🥕 & 💎 아이템 주기 로직 (프론트 계산 후 API 호출)
async function giveItem(id, type) {
  const target = state.reindeers.find(r => r.reindeer_id === id);
  if (!target) return;

  let newStamina = target.current_stamina;
  let newMagic = target.current_magic;
  const newStatus = "RESTING"; // 무조건 휴식으로 변경

  if (type === "carrot") {
    newStamina = Math.min(newStamina + 10, 100);
  } else if (type === "magic") {
    newMagic = Math.min(newMagic + 10, 100);
  }

  const payload = {
    reindeer_id: id,
    status: newStatus,
    current_stamina: newStamina,
    current_magic: newMagic
  };

  try {
    await fetchJson(API.updateStatus, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    showToast(type === "carrot" ? "당근을 주었습니다! (체력 +10)" : "마석을 주었습니다! (마력 +10)", "success");
    loadReindeers(); // 새로고침
  } catch (err) {
    showToast("업데이트 실패: " + err.message, "error");
  }
}

// 수정 모달 열기
function openEditModal(id) {
  const target = state.reindeers.find(r => r.reindeer_id === id);
  if (!target) return;

  $("#edit-id").value = id;
  $("#editModalTitle").innerText = `🦌 ${target.name} 정보 수정`;
  $("#edit-stamina").value = target.current_stamina;
  $("#edit-magic").value = target.current_magic;
  $("#edit-status").value = target.status;

  editModal.show();
}

// 수정 저장
async function submitEdit() {
  const id = parseInt($("#edit-id").value);
  const stamina = parseInt($("#edit-stamina").value);
  const magic = parseInt($("#edit-magic").value);
  const status = $("#edit-status").value;

  if (stamina < 0 || stamina > 100 || magic < 0 || magic > 100) {
    return showToast("체력과 마력은 0~100 사이여야 합니다.", "error");
  }

  const payload = {
    reindeer_id: id,
    status: status,
    current_stamina: stamina,
    current_magic: magic
  };

  try {
    await fetchJson(API.updateStatus, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showToast("정보가 수정되었습니다.", "success");
    editModal.hide();
    loadReindeers();
  } catch (err) {
    showToast("수정 실패: " + err.message, "error");
  }
}

// -------------------- 2. 건강 기록 관리 --------------------

function renderSelectOptions() {
  const select = $("#health-reindeer-select");
  // 기존 옵션 유지 여부는 로직에 따라 결정 (여기선 초기화 후 재생성)
  const currentVal = select.value; 
  
  select.innerHTML = `<option value="" disabled selected>루돌프를 선택하세요</option>`;
  
  state.reindeers.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.reindeer_id;
    opt.textContent = `[${r.reindeer_id}] ${r.name}`;
    select.appendChild(opt);
  });

  if(currentVal) select.value = currentVal;
}

async function loadHealthLogs(reindeerId) {
  if(!reindeerId) return;
  state.selectedHealthReindeerId = reindeerId;

  // UI 이름 업데이트
  const target = state.reindeers.find(r => r.reindeer_id == reindeerId);
  if(target) $("#health-log-target-name").textContent = `Target: ${target.name}`;

  const tbody = $("#health-log-tbody");
  tbody.innerHTML = `<tr><td colspan="2" class="text-center py-3">로딩 중...</td></tr>`;

  try {
    const logs = await fetchJson(API.getLogs(reindeerId)); // GET /reindeer/{id}/health-logs
    renderHealthLogs(logs);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger py-3">기록을 불러오지 못했습니다.</td></tr>`;
  }
}

function renderHealthLogs(logs) {
  const tbody = $("#health-log-tbody");
  tbody.innerHTML = "";

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center py-3 text-muted">기록이 없습니다.</td></tr>`;
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement("tr");
    
    // 날짜 포맷팅
    let dateStr = log.log_timestamp;
    try {
        const d = new Date(log.log_timestamp);
        dateStr = d.toLocaleDateString("ko-KR") + " " + d.toLocaleTimeString("ko-KR", {hour: '2-digit', minute:'2-digit'});
    } catch(e) {}

    tr.innerHTML = `
      <td class="small text-muted">${dateStr}</td>
      <td>${log.notes}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function submitHealthLog() {
  const id = $("#health-reindeer-select").value;
  const note = $("#health-note").value;

  if (!id) return showToast("루돌프를 선택해주세요.", "error");
  if (!note.trim()) return showToast("내용을 입력해주세요.", "error");

  try {
    await fetchJson(API.logHealth, {
      method: "POST",
      body: JSON.stringify({ reindeer_id: id, notes: note })
    });
    
    showToast("건강 기록이 추가되었습니다.", "success");
    $("#health-note").value = "";
    loadHealthLogs(id); // 목록 갱신
  } catch (err) {
    showToast("기록 저장 실패: " + err.message, "error");
  }
}

// -------------------- 3. 비행 준비 완료 조회 --------------------

async function loadAvailable() {
  const tbody = $("#ready-reindeer-tbody");
  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3">로딩 중...</td></tr>`;

  try {
    const data = await fetchJson(API.available);
    state.availableReindeers = data;
    renderAvailableTable(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">데이터 로드 실패</td></tr>`;
  }
}

function renderAvailableTable(list) {
  const tbody = $("#ready-reindeer-tbody");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">비행 가능한 루돌프가 없습니다.<br><small>(체력 70 이상 + 준비완료 상태 필요)</small></td></tr>`;
    return;
  }

  list.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="ps-4 fw-bold">🦌 ${r.name}</td>
      <td><span class="text-danger fw-bold">${r.current_stamina}</span> / 100</td>
      <td><span class="text-primary fw-bold">${r.current_magic}</span> / 100</td>
      <td class="text-end pe-4"><span class="badge bg-success">비행 가능</span></td>
    `;
    tbody.appendChild(tr);
  });
}