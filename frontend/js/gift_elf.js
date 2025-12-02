const API_BASE = "http://127.0.0.1:8000";

const API = {
  materials: `${API_BASE}/gift/materials`,
  mineMaterial: `${API_BASE}/gift/materials/mine`,
  gifts: `${API_BASE}/gift/`,
  giftRecipe: (id) => `${API_BASE}/gift/${id}/recipe`,
  productionCreate: `${API_BASE}/production/create`,
  productionLogs: `${API_BASE}/production/logs`,
  giftDemandSummary: `${API_BASE}/list-elf/stats/gift-demand/summary`,
};

const state = {
  materials: [],
  gifts: [],
  demandRows: [],
  productionLogs: [],
  selectedGiftId: null,
  staffId: 1, // TODO: 로그인 연동 시 교체
};

let recipeModal;

// -------------------- 공통 util --------------------

function $(sel, parent = document) {
  return parent.querySelector(sel);
}
function $all(sel, parent = document) {
  return Array.from(parent.querySelectorAll(sel));
}

function showToast(message, type = "info") {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("d-none", "toast-success", "toast-error");
  if (type === "success") toast.classList.add("toast-success");
  else if (type === "error") toast.classList.add("toast-error");

  setTimeout(() => {
    toast.classList.add("d-none");
  }, 2500);
}

async function fetchJson(url, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });

  let data = null;
  try {
    // 응답을 한 번만 파싱해서 재사용
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    let msg = "요청 중 오류가 발생했습니다.";

    if (data) {
      // FastAPI 기본 에러형식: {"detail": ...}
      if (data.detail) {
        msg =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail);
      }
      // 우리가 만든 형식: {"message": "...", "shortages": [...]}
      else if (data.message) {
        msg = data.message;

        if (Array.isArray(data.shortages) && data.shortages.length > 0) {
          const list = data.shortages
            .map(
              (s) =>
                `${s.material_name}: 필요 ${s.required}개, 보유 ${s.available}개`
            )
            .join(" / ");
          msg += ` (부족 재료: ${list})`;
        }
      }
      // 그 외에는 그냥 문자열이면 그대로, 객체면 최대한 짧게
      else if (typeof data === "string") {
        msg = data;
      }
    }

    throw new Error(msg);
  }

  // 성공인 경우: JSON 파싱한 결과 그대로 반환
  return data;
}

// -------------------- 초기화 --------------------

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initActions();

  // 레시피 모달 인스턴스 생성
  const modalEl = document.getElementById("recipeModal");
  if (modalEl && window.bootstrap) {
    recipeModal = new bootstrap.Modal(modalEl);
  }

  loadMaterials();
  loadGifts().then(() => {
    renderGiftList();
    renderGiftStockTable();
    loadProductionLogs();
    loadDemand();
  });
});

// -------------------- 탭 전환 --------------------

function initTabs() {
  const buttons = $all(".tab-button");
  const panels = $all(".tab-panel");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tabTarget;

      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const panel = document.querySelector(`#tab-${targetId}`);
      if (panel) panel.classList.add("active");

      if (targetId === "materials") {
        loadMaterials();
      }
    });
  });
}

// -------------------- 액션 초기화 --------------------

function initActions() {
  const produceBtn = $("#btn-start-production");
  if (produceBtn) produceBtn.addEventListener("click", onClickProduce);
}

// -------------------- 재료 채굴 탭 --------------------

async function loadMaterials() {
  try {
    const data = await fetchJson(API.materials); // GET /gift/materials
    state.materials = data;
    renderMaterials();
  } catch (err) {
    console.error(err);
    showToast(err.message || "재료 목록을 불러오지 못했습니다.", "error");
  }
}

// 재료 목록 그리기
function renderMaterials() {
  const container = $("#materials-container");
  if (!container) return;

  container.innerHTML = "";

  state.materials.forEach((m) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-xl-4";

    const card = document.createElement("article");
    card.className = "material-card h-100";
    card.dataset.materialId = m.material_id;

    card.innerHTML = `
      <div class="material-header">
        <div class="material-icon">✨</div>
        <div>
          <div class="material-name">${m.material_name}</div>
          <div class="material-type">마법 자원</div>
        </div>
      </div>
      <div class="material-body">
        <div class="material-stock-row">
          <span>재고 수량</span>
          <span class="material-stock-value">${m.stock_quantity} 개</span>
        </div>
        <div class="material-progress">
          <div class="material-progress-fill"></div>
        </div>
        <button class="btn btn-sm btn-dark w-100 btn-mine-material" type="button">
          ⛏ 재료 채굴하기
        </button>
      </div>
    `;

    // 진행바: 최대 100 기준, 1개당 1%
    const percent = Math.max(
      0,
      Math.min(100, m.stock_quantity) // 0~100으로 클램프
    );
    const bar = card.querySelector(".material-progress-fill");
    bar.style.width = `${percent}%`;

    card
      .querySelector(".btn-mine-material")
      .addEventListener("click", () => onClickMineMaterial(m.material_id));

    col.appendChild(card);
    container.appendChild(col);
  });
}

// 재료 채굴 버튼 클릭 시 (항상 +1)
async function onClickMineMaterial(materialId) {
  try {
    const body = JSON.stringify({ material_id: materialId });

    const res = await fetchJson(API.mineMaterial, {
      method: "POST",
      body,
    });

    // 서버에서 재고를 1 증가시킨 뒤, 최신 목록 다시 로드
    await loadMaterials();

    showToast(res.message || "재료 채굴이 완료되었습니다.", "success");
  } catch (err) {
    console.error(err);
    showToast(err.message || "재료 채굴 중 오류가 발생했습니다.", "error");
  }
}

// -------------------- 선물 제작 탭 --------------------

async function loadGifts() {
  try {
    const data = await fetchJson(API.gifts);
    state.gifts = data;
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderGiftList() {
  const list = $("#gift-list");
  if (!list) return;
  list.innerHTML = "";

  if (!state.gifts.length) {
    const li = document.createElement("li");
    li.className = "list-group-item small";
    li.textContent = "등록된 선물이 없습니다.";
    list.appendChild(li);
    return;
  }

  state.gifts.forEach((g) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-start gift-item";
    li.dataset.giftId = g.gift_id;

    li.innerHTML = `
      <div class="me-2">
        <div class="gift-name">🎁 ${g.gift_name}</div>
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm align-self-center btn-show-recipe"
        data-gift-id="${g.gift_id}">
        레시피 보기
      </button>
    `;

    // 선물 선택 (배경 하이라이트)
    li.addEventListener("click", () => onSelectGift(g.gift_id));

    // 레시피 보기 버튼 클릭
    const recipeBtn = li.querySelector(".btn-show-recipe");
    recipeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // 선택 토글과 분리
      onClickShowRecipe(g.gift_id, g.gift_name);
    });

    list.appendChild(li);
  });

  if (state.gifts.length && state.selectedGiftId === null) {
    onSelectGift(state.gifts[0].gift_id);
  }
}


function onSelectGift(giftId) {
  state.selectedGiftId = giftId;

  $all(".gift-item").forEach((li) => {
    li.classList.toggle("selected", Number(li.dataset.giftId) === giftId);
  });
}

function renderGiftStockTable() {
  const tbody = $("#gift-stock-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  state.gifts.forEach((g) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${g.gift_name}</td>
      <td class="text-end">${g.stock_quantity} 개</td>
    `;
    tbody.appendChild(tr);
  });
}

// 레시피 보기 버튼 클릭 시
async function onClickShowRecipe(giftId, giftName) {
  try {
    const data = await fetchJson(API.giftRecipe(giftId));

    const bodyEl = $("#recipeModalBody");
    const titleEl = $("#recipeModalLabel");

    const titleText = `🎁 ${giftName} 레시피`;
    const contentHtml = !data.length
      ? "<p class='mb-0'>등록된 레시피가 없습니다.</p>"
      : `
        <ul class="list-group list-group-flush">
          ${data
            .map(
              (r) => `
                <li class="list-group-item d-flex justify-content-between">
                  <span>${r.material_name}</span>
                  <span>${r.quantity_required} 개</span>
                </li>
              `
            )
            .join("")}
        </ul>
      `;

    if (bodyEl && titleEl && recipeModal) {
      titleEl.textContent = titleText;
      bodyEl.innerHTML = contentHtml;
      recipeModal.show();
    } else {
      // 혹시 모달이 없거나 실패한 경우 대비한 fallback
      const text = data.length
        ? data.map((r) => `${r.quantity_required}x ${r.material_name}`).join("\n")
        : "등록된 레시피가 없습니다.";
      alert(`${titleText}\n\n${text}`);
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || "레시피를 불러오지 못했습니다.", "error");
  }
}

async function onClickProduce() {
  if (!state.selectedGiftId) {
    showToast("먼저 제작할 선물을 선택해 주세요.", "error");
    return;
  }

  const input = $("#produce-quantity");
  const quantity = parseInt(input.value, 10);
  if (Number.isNaN(quantity) || quantity <= 0) {
    showToast("제작 수량은 1 이상이어야 합니다.", "error");
    return;
  }

  try {
    const body = JSON.stringify({
      gift_id: state.selectedGiftId,
      produced_quantity: quantity,
      staff_id: state.staffId,
    });

    const res = await fetchJson(API.productionCreate, {
      method: "POST",
      body,
    });

    const idx = state.gifts.findIndex((g) => g.gift_id === res.gift_id);
    if (idx !== -1 && typeof res.new_gift_stock === "number") {
      state.gifts[idx].stock_quantity = res.new_gift_stock;
    }

    renderGiftList();
    renderGiftStockTable();
    loadDemand();
    await loadProductionLogs();

    showToast(res.message || "선물 제작이 완료되었습니다.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// -------------------- 생산 로그 --------------------

async function loadProductionLogs() {
  try {
    const data = await fetchJson(API.productionLogs);
    state.productionLogs = data;
    renderProductionLogs();
  } catch (err) {
    console.error(err);
  }
}

function renderProductionLogs() {
  const tbody = $("#production-log-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!state.productionLogs.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "text-center small text-muted";
    td.textContent = "생산 로그가 없습니다.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  state.productionLogs.forEach((log) => {
    const tr = document.createElement("tr");

    // 선물 이름 매핑 (gift_id → gift_name)
    const gift = state.gifts.find((g) => g.gift_id === log.gift_id);
    const giftName = gift ? gift.gift_name : `#${log.gift_id}`;

    // 간단한 시간 포맷 (YYYY-MM-DD HH:MM)
    let timeText = log.timestamp;
    try {
      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        timeText = d.toLocaleString("ko-KR", {
          year: "2-digit",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (_) {}

    tr.innerHTML = `
      <td>${timeText}</td>
      <td>${log.produced_by_staff_id}</td>
      <td>${giftName}</td>
      <td class="text-end">${log.quantity_produced} 개</td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------- 수요 분석 --------------------

async function loadDemand() {
  try {
    const summaryList = await fetchJson(API.giftDemandSummary);
    // { gift_id, count, p1, p2, p3 }[]

    const summaryByGift = new Map();
    summaryList.forEach((item) => {
      summaryByGift.set(item.gift_id, item);
    });

    const rows = state.gifts.map((g) => {
      const s = summaryByGift.get(g.gift_id);
      const requested = s ? s.count : 0;          // 총 수요량
      const stock = g.stock_quantity || 0;        // 현재 재고
      const diff = stock - requested;             // 재고 - 수요
      let rate = 0;

      if (requested > 0) {
        rate = Math.round((stock / requested) * 100); // 충족률 %
      } else if (stock > 0) {
        rate = 100;
      }

      return {
        giftId: g.gift_id,
        name: g.gift_name,
        requested,
        stock,
        diff,
        rate,
      };
    });

    state.demandRows = rows;
    renderDemandTable();
    renderDemandSummary();
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

function renderDemandTable() {
  const tbody = $("#demand-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!state.demandRows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "text-center small text-muted";
    td.textContent = "수요 분석 데이터가 없습니다.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  state.demandRows.forEach((row) => {
    const tr = document.createElement("tr");
    const diffText = row.diff >= 0 ? `+${row.diff}` : `${row.diff}`;
    const rateText = `${row.rate}%`;
    const rateWidth = Math.min(row.rate, 150);

    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.requested}</td>
      <td>${row.stock}</td>
      <td>${diffText}</td>
      <td>${rateText}</td>
      <td>
        <div class="demand-bar">
          <div class="demand-bar-fill" style="width:${rateWidth}%;"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDemandSummary() {
  const totalRequested = state.demandRows.reduce(
    (sum, r) => sum + r.requested,
    0
  );
  const totalStock = state.demandRows.reduce((sum, r) => sum + r.stock, 0);
  const totalShortage = state.demandRows.reduce(
    (sum, r) => (r.diff < 0 ? sum + Math.abs(r.diff) : sum),
    0
  );

  $("#summary-demand-count").textContent = totalRequested;
  $("#summary-stock-count").textContent = totalStock;
  $("#summary-shortage-count").textContent = totalShortage;
}