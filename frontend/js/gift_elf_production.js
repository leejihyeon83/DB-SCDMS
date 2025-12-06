const API_BASE = "http://127.0.0.1:8000";

const API = {
  gifts: `${API_BASE}/gift/`,
  giftRecipe: (id) => `${API_BASE}/gift/${id}/recipe`,
  productionCreate: `${API_BASE}/production/create`,
  productionLogs: `${API_BASE}/production/logs`, // 전체 로그
  staff: `${API_BASE}/staff`, // 직원 목록
  giftDemand: `${API_BASE}/list-elf/stats/gift-demand/summary` // 수요량 조회 API
};

const state = {
  gifts: [],
  logs: [],
  demandMap: {},
  staffId: null,
  selectedGiftId: null,
  pending: null
};

function $(s, p = document) { return p.querySelector(s); }
function $all(s, p = document) { return [...p.querySelectorAll(s)]; }

function showToast(message, type = "info") {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("d-none", "toast-success", "toast-error");
  toast.classList.add(type === "error" ? "toast-error" : "toast-success");
  setTimeout(() => toast.classList.add("d-none"), 2500);
}

/* ---------------- 사용자 정보 ---------------- */
function initUserInfo() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return;

  const u = JSON.parse(raw);
  state.staffId = u.staff_id;

  $("#header-user-name").textContent = `${u.name} 요정`;
  $("#header-user-role").textContent = u.role;
}

/* ---------------- 로그아웃 ---------------- */
function initLogout() {
  $("#btn-logout").onclick = () => {
    if (confirm("정말 로그아웃 하시겠습니까?")) {
      localStorage.removeItem("currentUser");
      location.href = "../index.html";
    }
  };
}

/* ---------------- 요정 필터 목록 동적 로드 ---------------- */
async function loadAndRenderElfFilter() {
  try {
    const res = await fetch(API.staff, {
      headers: {
          "x-staff-id": String(state.staffId),
        },
    });

    if (!res.ok) throw new Error("직원 목록 로드 실패");
    
    const allStaff = await res.json();
    
    // 역할이 'GiftElf'인 직원만 필터링
    const giftElves = allStaff.filter(s => s.role === "GiftElf");
    
    const select = $("#elf-filter");
    if (!select) return;

    // 기존 옵션 초기화 후 '전체' 옵션 추가
    select.innerHTML = `<option value="all">전체 요정</option>`;

    // API에서 가져온 요정들로 옵션 추가
    giftElves.forEach(elf => {
      // value에는 실제 DB의 staff_id가 들어갑니다.
      select.innerHTML += `<option value="${elf.staff_id}">${elf.name}</option>`;
    });

  } catch (err) {
    console.error("요정 목록을 불러오는데 실패했습니다:", err);
    // 실패 시 기본 옵션 유지
  }
}

/* ---------------- 선물 목록 불러오기 ---------------- */
async function loadGifts() {
  try {
    // 1. 선물 목록과 수요량을 병렬로 동시에 불러옵니다
    const [resGifts, resDemand] = await Promise.all([
      fetch(API.gifts, {
        headers: {
          "x-staff-id": String(state.staffId),
        },
      }),
      fetch(API.giftDemand, {
        headers: {
          "x-staff-id": String(state.staffId),
        },
      })
    ]);

    state.gifts = await resGifts.json();
    const demandData = await resDemand.json();

    // 2. 수요량 데이터를 검색하기 쉽게 Map 형태로 변환합니다.
    // 결과 예시: state.demandMap = { 5: 1, 3: 10, ... }
    state.demandMap = {};
    demandData.forEach(item => {
      state.demandMap[item.gift_id] = item.count;
    });

    // 3. 렌더링 수행
    renderGiftList();
    renderStock();
    loadLogs(); // 로그는 별도로 로드

  } catch (err) {
    console.error(err);
    showToast("데이터를 불러오는데 실패했습니다.", "error");
  }
}

/* ---------------- 선물 목록 렌더링 ---------------- */
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
      "list-group-item d-flex justify-content-between align-items-center gift-item";
    li.dataset.giftId = g.gift_id;

    li.innerHTML = `
      <div>🎁 ${g.gift_name}</div>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm btn-show-recipe"
        data-gift-id="${g.gift_id}">
        레시피 보기
      </button>
    `;

    li.addEventListener("click", () => selectGift(g.gift_id));

    const recipeBtn = li.querySelector(".btn-show-recipe");
    recipeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClickShowRecipe(g.gift_id, g.gift_name);
    });

    list.appendChild(li);
  });

  // 첫 항목 자동 선택
  if (state.gifts.length && state.selectedGiftId === null) {
    selectGift(state.gifts[0].gift_id);
  }
}

/* ---------------- 선물 선택 ---------------- */
function selectGift(id) {
  state.selectedGiftId = id;
  $all(".gift-item").forEach(li => {
    li.classList.toggle("selected", Number(li.dataset.giftId) === id);
  });
}

/* ---------------- 재고 렌더링 ---------------- */
function renderStock() {
  const body = $("#gift-stock-table tbody");
  body.innerHTML = "";

  state.gifts.forEach(g => {
    // 1. 현재 선물의 수요량 가져오기 (없으면 0)
    const demandQty = state.demandMap[g.gift_id] || 0;
    
    // 2. 재고가 수요보다 적은지 확인 (재고 < 수요)
    const isShortage = g.stock_quantity < demandQty;
    
    // 3. 부족할 경우 경고 스타일 적용
    const rowClass = isShortage ? 'stock-warning-row' : '';

    body.innerHTML += `
      <tr class="${rowClass}">
        <td>${g.gift_name}</td>
        <td class="text-end">
            ${g.stock_quantity} 개
        </td>
      </tr>`;
  });
}

/* ---------------- 생산 로그 렌더링 헬퍼 함수 ---------------- */
function createLogRow(log) {
    // 선물 이름 찾기
    const gift = state.gifts.find(g => g.gift_id === log.gift_id);
    const giftName = gift ? gift.gift_name : `(삭제된 선물)`;
    
    // 날짜 포맷팅
    const d = new Date(log.timestamp);
    const t = d.toLocaleString("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    // production_id 확인
    const logId = log.job_id || "-"; 

    return `
      <tr>
        <td class="fw-bold text-success">#${logId}</td>
        <td>${t}</td>
        <td>
            ${giftName}
        </td>
        <td class="text-end fw-bold">${log.quantity_produced}</td>
      </tr>`;
}


/* ---------------- 생산 로그 (전체 및 내 로그) ---------------- */
async function loadLogs() {
  try {
    const res = await fetch(API.productionLogs, {
      headers: {
          "x-staff-id": String(state.staffId),
        },
    });
    if (!res.ok) throw new Error("로그 로드 실패");
    state.logs = await res.json();
    
    renderMyLogs();
    renderAllLogs();

  } catch (err) {
    console.error(err);
  }
}

function renderMyLogs() {
  const tbody = $("#my-log-body");
  tbody.innerHTML = "";
  
  const myLogs = state.logs.filter(l => l.produced_by_staff_id === state.staffId);
  
  if (!myLogs.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">아직 생산한 기록이 없어요!</td></tr>`;
    return;
  }
  
  myLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  myLogs.forEach(l => {
    tbody.innerHTML += createLogRow(l);
  });
}

function renderAllLogs() {
  const filterVal = $("#elf-filter").value;
  const tbody = $("#all-log-body");
  tbody.innerHTML = "";

  let filteredLogs = state.logs;

  // 필터링 로직
  if (filterVal !== "all") {
    // value는 문자열이지만 ID는 숫자일 수 있으므로 Number로 변환하여 비교
    const targetId = Number(filterVal);
    filteredLogs = state.logs.filter(l => l.produced_by_staff_id === targetId);
  }

  if (!filteredLogs.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">해당 조건의 기록이 없습니다.</td></tr>`;
    return;
  }

  // 최신순 정렬
  filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  filteredLogs.forEach(l => {
    tbody.innerHTML += createLogRow(l);
  });
}

/* ---------------- 레시피 보기 ---------------- */
async function onClickShowRecipe(giftId, giftName) {
  try {
    const res = await fetch(API.giftRecipe(giftId), {
      headers: {
          "x-staff-id": String(state.staffId),
        },
    });
    const data = await res.json();

    const bodyEl = $("#recipeModalBody");
    const titleEl = $("#recipeModalLabel");

    titleEl.textContent = `🎁 ${giftName} 레시피`;

    if (!data.length) {
      bodyEl.innerHTML = "<p class='text-muted mb-0'>등록된 레시피가 없습니다.</p>";
    } else {
      bodyEl.innerHTML = `
        <ul class="list-group">
          ${data
            .map(
              (r) => `
                <li class="list-group-item d-flex justify-content-between">
                  <span>${r.material_name}</span>
                  <span>${r.quantity_required} 개</span>
                </li>`
            )
            .join("")}
        </ul>
      `;
    }

    recipeModal.show();
  } catch (err) {
    const res = await fetch(API.giftRecipe(giftId), {
      headers: {
          "x-staff-id": String(state.staffId),
        },
    });
    if (res.status === 404) {
      const bodyEl = $("#recipeModalBody");
      const titleEl = $("#recipeModalLabel");
      titleEl.textContent = `🎁 ${giftName} 레시피`;
      bodyEl.innerHTML = "<p class='text-muted mb-0'>등록된 레시피가 없습니다.</p>";
      recipeModal.show();
    } else {
      showToast("레시피를 불러오지 못했습니다.", "error");
    }
  }
}

/* ---------------- 제작 시작 및 수량 조절 ---------------- */
function initProduction() {
  const qtyInput = $("#produce-quantity");
  const minusBtn = $("#btn-qty-minus");
  const plusBtn = $("#btn-qty-plus");

  // 수량 감소
  minusBtn.onclick = () => {
    let current = Number(qtyInput.value);
    if (current > 1) { 
      qtyInput.value = current - 1;
    }
  };

  // 수량 증가
  plusBtn.onclick = () => {
    let current = Number(qtyInput.value);
    qtyInput.value = current + 1;
  };
  
  // 직접 입력 시 유효성 검사
  qtyInput.onchange = () => {
      let val = Number(qtyInput.value);
      if (val < 1 || isNaN(val)) {
          qtyInput.value = 1;
      }
  };

  // 제작 버튼 클릭 이벤트
  $("#btn-start-production").onclick = async () => {
    if (!state.selectedGiftId) {
      showToast("선물을 먼저 선택하세요", "error");
      return;
    }

    const qty = Number(qtyInput.value); 
    if (qty <= 0) {
      showToast("제작 수량은 1 이상이어야 합니다.", "error");
      return;
    }
    
    const g = state.gifts.find(x => x.gift_id === state.selectedGiftId);

    const result = await Swal.fire({
        title: '선물 제작 시작',
        html: `
            <span style="color:#2e6944; font-weight:bold;">${g.gift_name}</span>을(를) 
            <b style="font-size: 1.2rem;">${qty}개</b> 제작할까요?
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2e6944',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        background: '#f3faf5',
        iconColor: '#2e6944',
        reverseButtons: false
    });

    // 사용자가 '확인'을 눌렀을 때만 실행
    if (result.isConfirmed) {
        handleProduce(g.gift_id, qty);
    }
  };
}

/* ---------------- 제작 처리 ---------------- */
async function handleProduce(giftId, qty) {
  try {
    // 서버로 제작 요청 전송
    const res = await fetch(API.productionCreate, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-staff-id": String(state.staffId)
      },
      body: JSON.stringify({
        gift_id: giftId,
        produced_quantity: qty,
        staff_id: state.staffId
      })
    });

    const data = await res.json();

    // 실패 시 (서버 오류 등)
    if (!res.ok) {
      let errorMessage = data.detail;
      if (typeof errorMessage === 'object' && errorMessage.message) {
          errorMessage = errorMessage.message;
      } else if (typeof errorMessage !== 'string') {
          errorMessage = "알 수 없는 오류 발생";
      }
      
      // SweetAlert2로 에러 표시
      Swal.fire({
          icon: 'error',
          title: '제작 실패',
          text: errorMessage,
          confirmButtonColor: '#b3312d',
          background: '#fff5f5'
      });
      return;
    }

    // 성공 시
    Swal.fire({
        icon: 'success',
        title: '제작 완료!',
        text: `${qty}개의 선물이 창고로 이동되었습니다.`,
        confirmButtonColor: '#2e6944',
        timer: 2000,
        timerProgressBar: true
    });

    // 데이터 새로고침
    loadGifts();
    loadLogs();

  } catch (e) {
    console.error(e);
    // 프론트엔드 네트워크 오류 등
    Swal.fire({
        icon: 'error',
        title: '오류 발생',
        text: '서버와 통신할 수 없습니다.',
        confirmButtonColor: '#b3312d'
    });
  }
}

/* ---------------- 실행 ---------------- */
let recipeModal;
let confirmModal;

document.addEventListener("DOMContentLoaded", () => {
  initUserInfo();
  initLogout();
  
  recipeModal = new bootstrap.Modal($("#recipeModal"));
  // confirmModal = new bootstrap.Modal($("#confirmModal"));

  // 요정 목록을 먼저 불러와 드롭다운을 채웁니다.
  loadAndRenderElfFilter();

  // 필터 변경 시 전체 로그 다시 렌더링
  const filterSelect = $("#elf-filter");
  if (filterSelect) {
      filterSelect.addEventListener("change", () => {
          renderAllLogs();
      });
  }

  loadGifts();
  initProduction();
});