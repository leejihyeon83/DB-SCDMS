const API_BASE = "http://127.0.0.1:8000";

const API = {
  list: `${API_BASE}/reindeer/`,
  updateStatus: `${API_BASE}/reindeer/update-status`,
};

let reindeers = [];
let editModal;

/* ---------------- 유틸리티 ---------------- */
function $(sel) { return document.querySelector(sel); }

function showToast(message, type = "info") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.className = `toast-custom show ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("d-none"), 300);
  }, 2500);
  toast.classList.remove("d-none");
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "요청 실패");
  return data;
}

function initUserInfo() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return;
  const user = JSON.parse(raw);
  $("#header-user-name").textContent = `${user.name || "관리자"} 님`;
}

function initLogout() {
    $("#btn-logout").onclick = () => {
        if(confirm("정말 로그아웃 하시겠습니까?")) {
            localStorage.removeItem("currentUser");
            location.href = "../index.html";
        }
    };
}

/* ---------------- 메인 로직 ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initUserInfo();
  initLogout();

  const modalEl = document.getElementById("editModal");
  if (modalEl) editModal = new bootstrap.Modal(modalEl);

  $("#btn-submit-edit").addEventListener("click", submitEdit);

  loadReindeers();
});

async function loadReindeers() {
  try {
    reindeers = await fetchJson(API.list);
    renderCards();
  } catch (err) {
    console.error(err);
    showToast("데이터 로드 실패", "error");
  }
}

function renderCards() {
  const container = $("#reindeer-list-container");
  container.innerHTML = "";

  reindeers.forEach((r) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";

    // 상태별 배지 텍스트 및 클래스 설정 (이미지 3 참고)
    let badgeClass = "status-READY";
    let badgeText = "준비 완료";

    if (r.status === "RESTING") {
      badgeClass = "status-RESTING";
      badgeText = "휴식 중";
    } else if (r.status === "ONDELIVERY") {
      badgeClass = "status-ONDELIVERY";
      badgeText = "배송 중";
    }

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
            <div class="progress-bar-stamina" style="width: ${r.current_stamina}%"></div>
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-label">
            <span>⚡ 마력</span>
            <span>${r.current_magic} / 100</span>
          </div>
          <div class="progress-custom">
            <div class="progress-bar-magic" style="width: ${r.current_magic}%"></div>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn btn-outline-secondary btn-action btn-edit">⚙ 수정</button>
          <button class="btn btn-outline-brown btn-action btn-carrot">🥕 당근</button>
          <button class="btn btn-outline-brown btn-action btn-magic">💎 마석</button>
        </div>
      </article>
    `;

    // 이벤트 연결
    col.querySelector(".btn-edit").onclick = () => openEditModal(r);
    col.querySelector(".btn-carrot").onclick = () => giveItem(r, "carrot");
    col.querySelector(".btn-magic").onclick = () => giveItem(r, "magic");

    container.appendChild(col);
  });
}

async function giveItem(r, type) {
  let newStamina = r.current_stamina;
  let newMagic = r.current_magic;
  const newStatus = "RESTING"; 

  if (type === "carrot") newStamina = Math.min(newStamina + 10, 100);
  else if (type === "magic") newMagic = Math.min(newMagic + 10, 100);

  try {
    await fetchJson(API.updateStatus, {
      method: "POST",
      body: JSON.stringify({
        reindeer_id: r.reindeer_id,
        status: newStatus,
        current_stamina: newStamina,
        current_magic: newMagic
      })
    });
    showToast(type === "carrot" ? "체력 회복! (+10)" : "마력 충전! (+10)", "success");
    loadReindeers();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openEditModal(r) {
  $("#edit-id").value = r.reindeer_id;
  $("#editModalTitle").textContent = `🦌 ${r.name} 정보 수정`;
  $("#edit-stamina").value = r.current_stamina;
  $("#edit-magic").value = r.current_magic;
  $("#edit-status").value = r.status;
  editModal.show();
}

async function submitEdit() {
  const id = parseInt($("#edit-id").value);
  const stamina = parseInt($("#edit-stamina").value);
  const magic = parseInt($("#edit-magic").value);
  const status = $("#edit-status").value;

  if (stamina < 0 || stamina > 100 || magic < 0 || magic > 100) {
    return showToast("값은 0~100 사이여야 합니다.", "error");
  }

  try {
    await fetchJson(API.updateStatus, {
      method: "POST",
      body: JSON.stringify({
        reindeer_id: id,
        status: status,
        current_stamina: stamina,
        current_magic: magic
      })
    });
    showToast("정보가 수정되었습니다.", "success");
    editModal.hide();
    loadReindeers();
  } catch (err) {
    showToast(err.message, "error");
  }
}