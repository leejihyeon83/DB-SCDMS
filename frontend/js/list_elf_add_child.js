const BASE_URL = "http://127.0.0.1:8000";
let gifts = [];
let currentUser = null; // 로그인 사용자 정보
const MAX_WISHLIST_COUNT = 3; // 1, 2, 3위만 허용


function showToast(message) {
    const toastEl = document.getElementById('scdmsToast');
    const toastBody = document.getElementById('scdmsToastMessage');
    if (toastBody) toastBody.textContent = message;
    if (toastEl) {
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    }
}

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
                window.location.href = "../index.html"; 
            }
        });
    }
}


async function loadGifts() {
    const res = await fetch(`${BASE_URL}/gift/`, {
        headers: {
            "x-staff-id": String(currentUser.staff_id)
        }
    });
    gifts = await res.json();

    const hint = document.getElementById("wishlistHint");
    if (hint) {
        hint.textContent = `최대 ${MAX_WISHLIST_COUNT}개(1, 2, 3위)까지 추가할 수 있습니다.`;
    }
    
    const addBtn = document.querySelector(".btn-add-wishlist");
    if (gifts.length === 0 && addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = "선물 목록이 비어있음";
    }
}

async function loadRegions() {
    const res = await fetch(`${BASE_URL}/regions/all`, {
        headers: {
            "x-staff-id": String(currentUser.staff_id)
        }
    });
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

function addWishlistItem() {
    const container = document.getElementById("wishlistContainer");
    if (!container) return;

    const currentCount = container.querySelectorAll(".wishlist-item").length;
    
    // 최대 항목 수 제한 (1, 2, 3위까지만)
    if (currentCount >= MAX_WISHLIST_COUNT) {
        showToast(`위시리스트는 최대 ${MAX_WISHLIST_COUNT}개(1, 2, 3위)까지만 추가할 수 있어요!`);
        return;
    }

    const priority = currentCount + 1;

    const row = document.createElement("div");
    row.className = "wishlist-item d-flex align-items-center mb-2";

    const priorityLabel = document.createElement("label");
    priorityLabel.className = "form-label me-3 fw-bold";
    priorityLabel.style.width = "50px";
    priorityLabel.textContent = `${priority}위`;
    
    const giftSelect = document.createElement("select");
    giftSelect.className = "form-select gift-id me-2";
    giftSelect.style.flex = "1"; 

    // 기본 - 선택 안 함
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "--- 선물 선택 안 함 ---";
    giftSelect.appendChild(defaultOpt);

    // 선물 목록 채우기
    gifts.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.gift_id;
        opt.textContent = `${g.gift_id} - ${g.gift_name}`;
        giftSelect.appendChild(opt);
    });

    const priorityInput = document.createElement("input");
    priorityInput.type = "hidden";
    priorityInput.className = "priority";
    priorityInput.value = priority;    
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-outline-danger btn-sm";
    removeBtn.innerHTML = "&times;";
    removeBtn.type = "button";
    removeBtn.title = "위시리스트 항목 삭제";
    removeBtn.onclick = () => {
        row.remove();
        reorderPriorities();
        checkAddButtonState();
    };
    
    giftSelect.addEventListener("change", validateGiftDuplicates);
    
    row.appendChild(priorityLabel);
    row.appendChild(giftSelect);
    row.appendChild(priorityInput);
    row.appendChild(removeBtn);

    container.appendChild(row);
    
    checkAddButtonState();
}

function reorderPriorities() {
    const rows = document.querySelectorAll("#wishlistContainer .wishlist-item");
    
    rows.forEach((row, index) => {
        const newPriority = index + 1;
        
        const label = row.querySelector("label");
        if (label) {
            label.textContent = `${newPriority}위`;
        }
        
        const input = row.querySelector(".priority");
        if (input) {
            input.value = newPriority;
        }
    });
    
    validateGiftDuplicates();
}

function checkAddButtonState() {
    const container = document.getElementById("wishlistContainer");
    const currentCount = container.querySelectorAll(".wishlist-item").length;
    const addBtn = document.querySelector(".btn-add-wishlist");
    
    if (addBtn) {
        if (currentCount >= MAX_WISHLIST_COUNT) {
            addBtn.disabled = true;
            addBtn.textContent = `최대 ${MAX_WISHLIST_COUNT}개 항목이 등록되었습니다.`;
        } else {
            addBtn.disabled = false;
            addBtn.textContent = `+ 소원 추가하기 (${currentCount + 1}위 등록)`;
        }
    }
}

function validateGiftDuplicates() {
    const giftSelects = document.querySelectorAll("#wishlistContainer .gift-id");
    const selectedGifts = Array.from(giftSelects)
        .map(select => select.value)
        .filter(value => value !== "");

    const uniqueGifts = new Set(selectedGifts);
    let hasDuplicate = selectedGifts.length !== uniqueGifts.size;

    // 시각적 경고 처리
    giftSelects.forEach(select => {
        if (select.value !== "") {
            const count = selectedGifts.filter(g => g === select.value).length;
            if (count > 1) {
                select.style.border = '2px solid red';
            } else {
                select.style.border = '';
            }
        } else {
             select.style.border = '';
        }
    });

    if (hasDuplicate) {
        showToast("위시리스트의 선물은 중복될 수 없습니다.");
    }

    return !hasDuplicate;
}

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
        showToast("이름과 주소는 필수입니다.");
        return;
    }
    
    if (!validateGiftDuplicates()) {
        showToast("위시리스트의 선물이 중복되었습니다. 다시 확인해주세요.");
        return;
    }

    const wishlist = [];
    let filledWishlistCount = 0;
    
    document.querySelectorAll("#wishlistContainer .wishlist-item").forEach(row => {
        const giftSelect = row.querySelector(".gift-id");
        const priorityInput = row.querySelector(".priority");
        
        const gift_id_str = giftSelect.value;
        const priority = parseInt(priorityInput.value);
        
        if (gift_id_str !== "") {
            const gift_id = parseInt(gift_id_str);
            wishlist.push({ gift_id, priority });
            filledWishlistCount++;
        }
    });

    if (filledWishlistCount === 0) {
        showToast("위시리스트 항목은 최소 1개 이상 등록해야 합니다.");
        return;
    }
    
    wishlist.sort((a, b) => a.priority - b.priority); 

    const body = {
        name,
        address,
        region_id,
        child_note,
        wishlist
    };

    const res = await fetch(`${BASE_URL}/list-elf/child/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-staff-id": String(currentUser.staff_id)
        },
        body: JSON.stringify(body),
    });

    if (res.ok) {
        Swal.fire({
            title: "아이 등록 완료! 🎁",
            text: `${name} 아이가 노스폴 등록부에 추가되었습니다.`,
            icon: "success",
            confirmButtonText: "확인"
        }).then(() => {
            window.location.href = "/list_elf.html";
        });
    } else {
        Swal.fire({
            title: "등록 실패",
            text: "아이 등록 중 오류가 발생했습니다. 서버 로그를 확인해주세요.",
            icon: "error",
            confirmButtonText: "닫기"
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    
    if (typeof requireRole === 'function') {
        currentUser = requireRole(["ListElf"]);
    } else {
        console.error("auth.js 로드 실패");
    }

    initUserInfo(); 
    initLogout();   
    
    await loadGifts(); 
    await loadRegions();
    
    if (gifts.length > 0) {
         addWishlistItem();
    }
    
    checkAddButtonState();
});