/* =========================================
   전역 변수 및 설정
   ========================================= */
const BASE_URL = "http://127.0.0.1:8000";
let gifts = [];
let currentUser = null; // 로그인 사용자 정보

/* -------------------------------
    사용자 정보 초기화
-------------------------------- */
function initUserInfo() {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return;

    try {
        const user = JSON.parse(raw);
        
        const nameEl = document.getElementById("header-user-name");
        if (nameEl) nameEl.textContent = `${user.name || "이름 없음"} 요정`;

        const roleEl = document.getElementById("header-user-role");
        if (roleEl) roleEl.textContent = user.role || "ListElf";

    } catch (e) {
        console.warn("사용자 정보 파싱 실패", e);
    }
}

/* -------------------------------
    로그아웃
-------------------------------- */
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
                localStorage.removeItem("token"); // 토큰 삭제도 포함
                window.location.href = "../index.html"; // 경로 수정 (상위 폴더로)
            }
        });
    }
}

/* -------------------------------
   1️. 선물 목록 불러오기
-------------------------------- */
async function loadGifts() {
    const res = await fetch(`${BASE_URL}/gift/`);
    gifts = await res.json();

    const hint = document.getElementById("wishlistHint");
    if (hint) {
        if (gifts.length > 0) {
            hint.textContent = `위시리스트는 최대 ${gifts.length}개까지 추가할 수 있어요.`;
        } else {
            hint.textContent = "등록 가능한 선물이 아직 없어요.";
        }
    }
}

/* -------------------------------
   2️. 지역 목록 불러오기
-------------------------------- */
async function loadRegions() {
    const res = await fetch(`${BASE_URL}/regions/all`);
    const regions = await res.json();

    const select = document.getElementById("region");
    if (select) {
        select.innerHTML = "";
        regions.forEach(r => {
            const opt = document.createElement("option");
            opt.value = r.RegionID;
            opt.textContent = r.RegionName;
            select.appendChild(opt);
        });
    }
}

/* -------------------------------
   3️. wishlist 입력행 추가
-------------------------------- */
function addWishlistItem() {
    const container = document.getElementById("wishlistContainer");
    if (!container) return;

    const currentCount = container.querySelectorAll(".wishlist-item").length;
    if (currentCount >= gifts.length) {
        alert(`위시리스트는 최대 ${gifts.length}개까지만 추가할 수 있어요!`);
        return;
    }

    const usedPriorities = Array.from(
        document.querySelectorAll(".wishlist-item .priority")
    ).map(input => parseInt(input.value))
     .filter(v => !isNaN(v));

    let defaultPriority = 1;
    while (usedPriorities.includes(defaultPriority)) {
        defaultPriority++;
    }

    const row = document.createElement("div");
    row.className = "wishlist-item";

    const giftSelect = document.createElement("select");
    giftSelect.className = "form-select gift-id";

    gifts.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.gift_id;
        opt.textContent = `${g.gift_id} - ${g.gift_name}`;
        giftSelect.appendChild(opt);
    });

    const priorityInput = document.createElement("input");
    priorityInput.className = "form-control priority";
    priorityInput.placeholder = "우선순위 (1 ~ n)";
    priorityInput.value = defaultPriority;    

    priorityInput.addEventListener("change", validatePriorities);

    row.appendChild(giftSelect);
    row.appendChild(priorityInput);

    container.appendChild(row);
}

/* -------------------------------
   중복 priority 검증
-------------------------------- */
function validatePriorities() {
    const priorityInputs = Array.from(document.querySelectorAll(".priority"));

    let values = priorityInputs.map(i => parseInt(i.value) || 1);

    values = values.map(v => {
        if (v < 1) return 1;
        if (v > gifts.length) return gifts.length;
        return v;
    });

    const duplicates = values.filter((v, i, arr) => arr.indexOf(v) !== i);

    if (duplicates.length > 0) {
        alert("우선순위는 중복될 수 없어요! (1 ~ n 각 1회만 가능)");

        priorityInputs.forEach((input, i) => {
            input.value = i + 1 <= gifts.length ? i + 1 : gifts.length;
        });
    }
}


/* -------------------------------
   4. 아이 등록 요청
-------------------------------- */
async function submitChild() {
    const nameInput = document.getElementById("name");
    const addressInput = document.getElementById("address");
    const regionSelect = document.getElementById("region");
    const noteInput = document.getElementById("note");

    if (!nameInput || !addressInput || !regionSelect) return;

    const name = nameInput.value.trim();
    const address = addressInput.value.trim();
    const region_id = parseInt(regionSelect.value);
    const child_note = noteInput ? noteInput.value : "";
    
    if (!name || !address) {
        alert("이름과 주소는 필수입니다.");
        return;
    }

    const wishlist = [];
    const priorityInputs = document.querySelectorAll(".wishlist-item .priority");
    const priorities = Array.from(priorityInputs).map(i => parseInt(i.value));

    const hasDuplicate = priorities.some(
        (p, idx) => priorities.indexOf(p) !== idx
    );

    if (hasDuplicate) {
        alert("위시리스트 우선순위가 중복되었어요. 서로 다른 번호로 설정해주세요!");
        return;
    }
    document.querySelectorAll(".wishlist-item").forEach(row => {
        const gift_id = parseInt(row.querySelector(".gift-id").value);
        const priority = parseInt(row.querySelector(".priority").value) || 1;
        wishlist.push({ gift_id, priority });
    });

    const body = {
        name,
        address,
        region_id,
        child_note,
        wishlist
    };

    const res = await fetch(`${BASE_URL}/list-elf/child/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (res.ok) {
        alert("아이 등록 완료! 🎁");
        window.location.href = "/list_elf.html";
    } else {
        alert("등록 실패… 서버 로그를 확인해주세요!");
    }
}

/* =========================================
   [중요] DOMContentLoaded 이벤트 통합
   HTML이 모두 로딩된 후에 JS가 실행되도록 감쌉니다.
   ========================================= */
document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. 로그인 체크 (auth.js가 먼저 로드되어 있어야 함)
    if (typeof requireRole === 'function') {
        currentUser = requireRole(["ListElf"]);
    } else {
        console.error("auth.js 로드 실패");
    }

    // 2. 초기화 함수 실행
    initUserInfo(); 
    initLogout();   
    
    // 3. 비동기 데이터 로드 및 화면 설정
    await loadGifts();
    await loadRegions();
    addWishlistItem(); // 첫 번째 위시리스트 항목 자동 추가

    // 기존의 로그아웃 버튼 이벤트 리스너도 여기에 통합 (중복 제거)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
             window.location.href = "/index.html";  
        });
    }
});