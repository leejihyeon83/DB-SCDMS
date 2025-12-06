const API_BASE = "http://127.0.0.1:8000";

const API = {
  gifts: `${API_BASE}/gift/`,
  demand: `${API_BASE}/list-elf/stats/gift-demand/summary`
};

const state = { gifts: [], rows: [] };

function $(s, p = document) { return p.querySelector(s); }

function showToast(message, type = "info") {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("d-none", "toast-success", "toast-error");
  toast.classList.add(type === "error" ? "toast-error" : "toast-success");
  setTimeout(() => toast.classList.add("d-none"), 2500);
}

function initUserInfo() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return;

  const u = JSON.parse(raw);
  $("#header-user-name").textContent = `${u.name} 요정`;
  $("#header-user-role").textContent = u.role;
}

function initLogout() {
  const btn = $("#btn-logout");
  if (btn) {
      btn.onclick = () => {
        if (confirm("정말 로그아웃 하시겠습니까?")) {
          localStorage.removeItem("currentUser");
          location.href = "../index.html";
        }
      };
  }
}

async function loadGifts() {
  try {
      const raw = localStorage.getItem("currentUser");
      const staffId = raw ? JSON.parse(raw).staff_id : "";

      const res = await fetch(API.gifts, {
        headers: {
          "x-staff-id": String(staffId),
        },
      });

      if(!res.ok) throw new Error("선물 목록 로드 실패");
      state.gifts = await res.json();
  } catch(e) {
      console.error(e);
      showToast("데이터 로드 실패", "error");
  }
}

async function loadDemand() {
  try {
      const raw = localStorage.getItem("currentUser");
      const staffId = raw ? JSON.parse(raw).staff_id : "";

      const res = await fetch(API.demand, {
        headers: {
          "x-staff-id": String(staffId),
        },
      });
      
      if(!res.ok) throw new Error("수요 데이터 로드 실패");
      const summary = await res.json();

      const map = new Map();
      summary.forEach(s => map.set(s.gift_id, s.count));

      state.rows = state.gifts.map(g => {
        const req = map.get(g.gift_id) || 0;
        const stock = g.stock_quantity || 0;
        const diff = stock - req; // 양수면 여유, 음수면 부족
        
        let rate = 100;
        if (req > 0) {
            rate = Math.round((stock / req) * 100);
        }

        return { 
            name: g.gift_name, 
            req, 
            stock, 
            diff, 
            rate 
        };
      });

      render();
  } catch(e) {
      console.error(e);
      showToast("수요 분석 실패", "error");
  }
}

function render() {
  const totalDemand = state.rows.reduce((s, r) => s + r.req, 0);
  const totalStock = state.rows.reduce((s, r) => s + r.stock, 0);
  
  const totalShortage = state.rows.reduce((s, r) => s + (r.diff < 0 ? Math.abs(r.diff) : 0), 0);

  $("#summary-demand-count").textContent = totalDemand;
  $("#summary-stock-count").textContent = totalStock;
  $("#summary-shortage-count").textContent = totalShortage;

  const body = $("#demand-table tbody");
  body.innerHTML = "";

  if (state.rows.length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">데이터가 없습니다.</td></tr>`;
      return;
  }

  // 부족한 것부터 정렬해서 보여주기
  state.rows.sort((a, b) => a.rate - b.rate);

  state.rows.forEach(r => {
    // 진행바 너비 제한 (최대 100%)
    const barWidth = Math.min(r.rate, 100);
    
    // 충족률 100% 이상은 초록, 미만은 노랑/빨강
    let barColorClass = "bg-success";
    if (r.rate < 50) barColorClass = "bg-danger";
    else if (r.rate < 100) barColorClass = "bg-warning";
    
    const diffDisplay = r.diff < 0 
        ? `<span class="text-danger fw-bold">${r.diff}</span>` 
        : `<span class="text-success">+${r.diff}</span>`;

    body.innerHTML += `
      <tr>
        <td class="fw-bold">${r.name}</td>
        <td>${r.req}</td>
        <td>${r.stock}</td>
        <td>${diffDisplay}</td>
        <td class="fw-bold">${r.rate}%</td>
        <td>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar ${barColorClass}" role="progressbar" 
                   style="width: ${barWidth}%" aria-valuenow="${barWidth}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
        </td>
      </tr>
    `;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initUserInfo();
  initLogout();
  loadGifts().then(loadDemand);
});