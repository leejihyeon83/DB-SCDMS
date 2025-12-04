const API_BASE = "http://127.0.0.1:8000";

const API = {
  materials: `${API_BASE}/gift/materials`,
  mineMaterial: `${API_BASE}/gift/materials/mine`,
};

const state = {
  materials: [],
  staffId: null,
};

/* -------------------- 공통 util -------------------- */
function $(sel, parent = document) {
  return parent.querySelector(sel);
}

function showToast(message, type = "info") {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("d-none", "toast-success", "toast-error");

  if (type === "success") toast.classList.add("toast-success");
  else if (type === "error") toast.classList.add("toast-error");

  setTimeout(() => toast.classList.add("d-none"), 2500);
}

async function fetchJson(url, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (!headers["x-staff-id"]) {
    let staffId = state.staffId;

    if (staffId == null) {
      const raw = localStorage.getItem("currentUser");
      if (raw) {
        try {
          const user = JSON.parse(raw);
          staffId = user.staff_id;
        } catch (e) {
          console.warn("currentUser 파싱 실패:", e);
        }
      }
    }

    if (staffId != null) {
      headers["x-staff-id"] = String(staffId);
    }
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    let msg = data?.detail || data?.message || "요청 중 오류 발생";
    throw new Error(msg);
  }
  return data;
}

/* -------------------- 사용자 정보 -------------------- */
function initUserInfo() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return;

  try {
    const user = JSON.parse(raw);

    if (user && typeof user.staff_id === "number")
      state.staffId = user.staff_id;

    const nameEl = $("#header-user-name");
    const roleEl = $("#header-user-role");

    if (nameEl) nameEl.textContent = `${user.name || "이름 없음"} 요정`;
    if (roleEl) roleEl.textContent = user.role || "Unknown";
  } catch (err) {
    console.warn("유저 정보 파싱 실패:", err);
  }
}

/* -------------------- 로그아웃 -------------------- */
function initLogout() {
  const btn = $("#btn-logout");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (confirm("정말 로그아웃 하시겠습니까?")) {
      localStorage.removeItem("currentUser");
      location.href = "../index.html";
    }
  });
}

/* -------------------- 재료 불러오기 -------------------- */
async function loadMaterials() {
  try {
    const data = await fetchJson(API.materials);
    state.materials = data;
    renderMaterials();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderMaterials() {
  const container = $("#materials-container");
  if (!container) {
    console.error("materials-container가 HTML에 없음!");
    return;
  }

  function getMaterialEmoji(name) {
  if (name.includes("유니콘")) return "🦄";
  if (name.includes("별")) return "✨";
  if (name.includes("드래곤")) return "🐉";
  if (name.includes("천사")) return "💧";
  if (name.includes("태양")) return "☀️";
  return "🔮"; // 기본값 (혹시 매칭 안 되면)
  }


  container.innerHTML = "";

state.materials.forEach((m) => {
  const emoji = getMaterialEmoji(m.material_name);
  const percent = Math.min(m.stock_quantity, 100);

  const col = document.createElement("div");
  col.className = "col-md-6 col-xl-4";

  col.innerHTML = `
    <article class="material-card-green h-100">
      <div class="material-top">
        <div class="material-icon-circle">${emoji}</div>
        <div class="material-title-box">
          <div class="material-title">${m.material_name}</div>
          <div class="material-subtitle">마법 자원</div>
        </div>
      </div>

      <div class="material-count-row">
        <span>재고 수량</span>
        <span>${m.stock_quantity} 개</span>
      </div>

      <div class="material-progress-green">
        <div class="material-progress-fill-green" style="width:${percent}%;"></div>
      </div>

      <button class="btn btn-green w-100 btn-mine" data-id="${m.material_id}">
        ⛏ 재료 채굴하기
      </button>
    </article>
  `;

  container.appendChild(col);
  });


  // 채굴 버튼 이벤트 연결
  document.querySelectorAll(".btn-mine").forEach((btn) => {
    btn.addEventListener("click", () => onClickMine(btn.dataset.id));
  });
}

/* -------------------- 재료 채굴 -------------------- */
async function onClickMine(materialId) {
  try {
    await fetchJson(API.mineMaterial, {
      method: "POST",
      body: JSON.stringify({ material_id: Number(materialId) }),
    });

    showToast("재료 채굴 완료!", "success");
    loadMaterials();
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* -------------------- 실행 -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initUserInfo();
  initLogout();
  loadMaterials();
});
