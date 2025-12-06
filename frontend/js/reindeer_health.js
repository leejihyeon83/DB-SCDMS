const API_BASE = "http://127.0.0.1:8000";

const API = {
  list: `${API_BASE}/reindeer/`,
  logHealth: `${API_BASE}/reindeer/log-health`,
  getLogs: (id) => `${API_BASE}/reindeer/${id}/health-logs`,
};

let reindeers = [];

function $(sel) { return document.querySelector(sel); }

function showToast(message, type = "info") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.className = `toast-custom show ${type === 'success' ? 'toast-success' : 'toast-error'}`;
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("d-none"), 300);
  }, 2500);
  toast.classList.remove("d-none");
}

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  const raw = localStorage.getItem("currentUser");
  if(raw) $("#header-user-name").textContent = `${JSON.parse(raw).name} 님`;
  
  $("#btn-logout").onclick = () => {
    if(confirm("정말 로그아웃 하시겠습니까?")) { 
        localStorage.removeItem("currentUser"); 
        location.href="../index.html"; 
    }
  };

  const select = $("#health-reindeer-select");
  select.addEventListener("change", (e) => handleSelectChange(e.target.value));
  $("#btn-save-health-log").addEventListener("click", submitLog);

  loadReindeers();
});

async function loadReindeers() {
  try {
    const res = await fetch(API.list, {
      headers: {
        "x-staff-id": String(getStaffId())
      }
    });

    reindeers = await res.json();
    
    const select = $("#health-reindeer-select");
    // 전체 보기 옵션 추가
    select.innerHTML = `<option value="" disabled selected>루돌프를 선택하세요</option>`;
    select.innerHTML += `<option value="all">[전체 보기] 모든 루돌프</option>`;
    
    reindeers.forEach(r => {
      select.innerHTML += `<option value="${r.reindeer_id}">[${r.reindeer_id}] ${r.name}</option>`;
    });
  } catch (err) {
    showToast("목록 로드 실패", "error");
  }
}

// 선택 변경 핸들러
async function handleSelectChange(value) {
    if (value === "all") {
        $("#current-view-badge").textContent = "전체 루돌프 기록";
        $("#current-view-badge").className = "badge bg-brown text-white"; // 갈색 배지
        await loadAllLogs();
    } else {
        const r = reindeers.find(x => x.reindeer_id == value);
        $("#current-view-badge").textContent = r ? r.name : "선택됨";
        $("#current-view-badge").className = "badge bg-light text-secondary border";
        await loadSingleLogs(value);
    }
}

// 단일 루돌프 로그 조회
async function loadSingleLogs(reindeerId) {
  updateTableHeader(false); // 이름 컬럼 제거
  const tbody = $("#health-log-tbody");
  tbody.innerHTML = `<tr><td colspan="2" class="text-center py-5">로딩 중...</td></tr>`;

  try {
    const res = await fetch(API.getLogs(reindeerId), {
      headers: {
        "x-staff-id": String(getStaffId())
      }
    });
    const logs = await res.json();
    renderLogs(logs, false);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger py-5">기록을 불러오지 못했습니다.</td></tr>`;
  }
}

// 전체 루돌프 로그 조회 (병렬 호출 후 병합)
async function loadAllLogs() {
    updateTableHeader(true); // 헤더 변경(이름 컬럼 추가)
    const tbody = $("#health-log-tbody");
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-5">전체 기록을 불러오는 중...</td></tr>`;

    try {
        // 모든 루돌프의 로그를 동시에 요청
        const promises = reindeers.map(r => 
            fetch(API.getLogs(r.reindeer_id), {
              headers: {
                "x-staff-id": String(getStaffId())
              }
            })
            .then(res => res.json())
            .then(logs => logs.map(log => ({...log, reindeer_name: r.name}))) // 로그에 이름 추가
        );

        const results = await Promise.all(promises);
        const allLogs = results.flat().sort((a, b) => new Date(b.log_timestamp) - new Date(a.log_timestamp));

        renderLogs(allLogs, true);

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-5">전체 기록 로드 실패</td></tr>`;
    }
}

// isAllView: 전체보기 모드인지 여부 확인
function renderLogs(logs, isAllView) {
    const tbody = $("#health-log-tbody");
    tbody.innerHTML = "";

    if (!logs.length) {
      const colSpan = isAllView ? 3 : 2;
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-5 text-muted">기록이 없습니다.</td></tr>`;
      return;
    }

    logs.forEach(log => {
        const date = new Date(log.log_timestamp).toLocaleString("ko-KR", {
            month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        let rowHtml = "";
        
        if (isAllView) {
            rowHtml = `
                <tr>
                    <td class="ps-4 fw-bold text-brown" style="width: 20%">${log.reindeer_name}</td>
                    <td class="text-secondary small" style="width: 25%">${date}</td>
                    <td class="pe-4 text-dark">${log.notes}</td>
                </tr>
            `;
        } else {
            rowHtml = `
                <tr>
                    <td class="ps-4 text-secondary small fw-bold" style="width: 30%">${date}</td>
                    <td class="pe-4 text-dark">${log.notes}</td>
                </tr>
            `;
        }
        tbody.innerHTML += rowHtml;
    });
}

// 테이블 헤더 동적 변경
function updateTableHeader(showNameColumn) {
    const headerRow = $("#table-header-row");
    if (showNameColumn) {
        headerRow.innerHTML = `
            <th class="ps-4">루돌프</th>
            <th>일시</th>
            <th class="pe-4">상세 내용</th>
        `;
    } else {
        headerRow.innerHTML = `
            <th class="ps-4">일시</th>
            <th class="pe-4">상세 내용</th>
        `;
    }
}

async function submitLog() {
  const select = $("#health-reindeer-select");
  const id = select.value;
  const note = $("#health-note").value;

  if (!id || id === "all") return showToast("루돌프를 선택해주세요. (전체 보기에서는 저장 불가)", "error");
  if (!note.trim()) return showToast("내용을 입력해주세요.", "error");

  try {
    const res = await fetch(API.logHealth, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-staff-id": String(getStaffId())
      },
      body: JSON.stringify({ reindeer_id: id, notes: note })
    });
    
    if(!res.ok) throw new Error();

    showToast("건강 기록 저장 완료", "success");
    $("#health-note").value = "";
    
    // 저장 후 해당 루돌프 목록 갱신
    handleSelectChange(id);

  } catch (err) {
    showToast("저장 실패", "error");
  }
}