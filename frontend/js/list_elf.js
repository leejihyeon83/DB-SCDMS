/* =========================================
   [수정됨] 화면 로딩 후 실행되도록 안전장치 추가
   ========================================= */

// 전역 변수 선언
const BASE_URL = "http://127.0.0.1:8000";
let childrenData = [];
let regions = [];
let currentEditChildId = null;
let currentUser = null; // 나중에 할당

/* -------------------------
   Region 불러오기
------------------------- */
async function loadRegions() {
    const res = await fetch(`${BASE_URL}/regions/all`);
    regions = await res.json();

    const filter = document.getElementById("regionFilter");
    // 요소가 있을 때만 실행 (안전장치)
    if (filter) {
        filter.innerHTML = '<option value="">전체 지역</option>';
        regions.forEach(r => {
            filter.innerHTML += `<option value="${r.RegionID}">${r.RegionName}</option>`;
        });
    }
}

/* -------------------------
   Child 목록 불러오기
------------------------- */
async function loadChildren() {
    const res = await fetch(`${BASE_URL}/list-elf/child/all`);
    childrenData = await res.json();
    renderChildren();
}

/* -------------------------
   Child 테이블 렌더링
------------------------- */
function renderChildren() {
    const searchInput = document.getElementById("searchInput");
    const regionFilter = document.getElementById("regionFilter");
    const tbody = document.getElementById("childTableBody");

    // HTML 요소가 없으면 실행 중단 (오류 방지)
    if (!searchInput || !regionFilter || !tbody) return;

    const keyword = searchInput.value.trim();
    const regionValue = regionFilter.value;

    tbody.innerHTML = "";

    let nice=0, naughty=0, pending=0;

    childrenData
        .filter(c => (!keyword || c.name.includes(keyword) || c.address.includes(keyword)))
        .filter(c => (!regionValue || c.region_id == regionValue))
        .forEach(c => {

            if (c.status_code === "NICE") nice++;
            else if (c.status_code === "NAUGHTY") naughty++;
            else pending++;

            const regionName = (regions.find(r => r.RegionID == c.region_id) || {}).RegionName || "(미지정)";

            tbody.innerHTML += `
                <tr>
                    <td>${c.child_id}</td>
                    <td>${c.name}</td>
                    <td>${c.address}</td>
                    <td>${regionName}</td>

                    <td>
                        <select class="form-select form-select-sm"
                                onchange="updateStatus(${c.child_id}, this.value)">
                            <option value="PENDING" ${c.status_code==="PENDING"?"selected":""}>PENDING</option>
                            <option value="NICE" ${c.status_code==="NICE"?"selected":""}>NICE</option>
                            <option value="NAUGHTY" ${c.status_code==="NAUGHTY"?"selected":""}>NAUGHTY</option>
                        </select>
                    </td>

                    <td>
                        <span class="badge bg-${c.delivery_status_code === "DELIVERED" ? "primary" : "secondary"}">
                            ${c.delivery_status_code}
                        </span>
                    </td>

                    <td>
                        <button class="btn btn-info btn-sm" onclick="openWishlistModal('${c.child_id}')">
                            🎁 보기
                        </button>
                    </td>

                    <td>
                        <button class="btn btn-outline-secondary btn-sm" onclick="openNoteModal(${c.child_id})">
                            보기/수정
                        </button>
                    </td>

                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteChild(${c.child_id})">삭제</button>
                    </td>
                </tr>
            `;
        });

    // 요약 패널 업데이트 (요소가 존재할 때만)
    const elNice = document.getElementById("countNice");
    const elNaughty = document.getElementById("countNaughty");
    const elPending = document.getElementById("countPending");
    
    if(elNice) elNice.innerText = nice;
    if(elNaughty) elNaughty.innerText = naughty;
    if(elPending) elPending.innerText = pending;
}

/* -------------------------
   🎁 Wishlist 모달
------------------------- */
async function openWishlistModal(childId) {
    const res = await fetch(`${BASE_URL}/list-elf/child/${childId}/wishlist`);
    const data = await res.json();

    const tbody = document.getElementById("wishlistTableBody");
    if(tbody) {
        tbody.innerHTML = "";
        data.wishlist.forEach(item => {
            tbody.innerHTML += `
                <tr class="priority-${item.priority}">
                    <td>${item.priority}</td>
                    <td>${item.gift_id}</td>
                    <td>${item.gift_name}</td>
                </tr>
            `;
        });
    }

    const modal = document.getElementById("wishlistModal");
    if(modal) new bootstrap.Modal(modal).show();
}


/* -------------------------
   📝 Note 모달
------------------------- */
function openNoteModal(childId) {
    currentEditChildId = childId;

    const child = childrenData.find(c => c.child_id === childId);
    const input = document.getElementById("noteInput");
    if(input) input.value = child.child_note || "";

    const modal = document.getElementById("noteModal");
    if(modal) new bootstrap.Modal(modal).show();
}

/* -------------------------
   Note 저장
------------------------- */
async function saveNote() {
    const input = document.getElementById("noteInput");
    const note = input ? input.value : "";

    await fetch(`${BASE_URL}/list-elf/child/${currentEditChildId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ child_note: note })
    });

    loadChildren();
    
    const modalEl = document.getElementById("noteModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if(modalInstance) modalInstance.hide();
}

/* -------------------------
   Child 삭제
------------------------- */
async function deleteChild(childId) {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    await fetch(`${BASE_URL}/list-elf/child/${childId}`, {
        method: "DELETE"
    });

    loadChildren();
}

/* -------------------------
   상태 변경
------------------------- */
async function updateStatus(childId, newStatus) {
    await fetch(`${BASE_URL}/list-elf/child/${childId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ status_code: newStatus })
    });

    loadChildren();
}

/* -------------------------
   [추가] 사용자 정보 초기화
------------------------- */
function initUserInfo() {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return;

    try {
        const user = JSON.parse(raw);
        
        // 이름 표시
        const nameEl = document.getElementById("header-user-name");
        if (nameEl) nameEl.textContent = `${user.name || "이름 없음"} 요정`;

        // 역할 표시
        const roleEl = document.getElementById("header-user-role");
        if (roleEl) roleEl.textContent = user.role || "ListElf";

    } catch (e) {
        console.warn("사용자 정보 파싱 실패", e);
    }
}

/* -------------------------
   로그아웃
------------------------- */
function initLogout() {
    const btn = document.getElementById("btn-logout");
    if (btn) {
        btn.addEventListener("click", (e) => {
            e.preventDefault();

            if (!confirm("정말 로그아웃 하시겠습니까?")) {
                return;
            }

            if (typeof logout === "function") {
                logout();
            } else {
                localStorage.removeItem("currentUser");
                window.location.href = "./index.html";
            }
        });
    }
}

/* =========================================
   [중요] DOMContentLoaded 이벤트 추가
   HTML이 모두 로딩된 후에 JS가 실행되도록 감쌉니다.
   ========================================= */
document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. 로그인 체크 (auth.js가 먼저 로드되어 있어야 함)
    if (typeof requireRole === 'function') {
        currentUser = requireRole(["ListElf"]);
    } else {
        console.error("auth.js 로드 실패");
        // 필요하다면 여기서 로그인 페이지로 튕겨낼 수 있습니다.
    }

    // 2. 초기화 함수 실행
    initUserInfo(); 
    initLogout();   
    
    await loadRegions();
    await loadChildren();
});

// 기존의 중복된 리스너 제거 및 통합