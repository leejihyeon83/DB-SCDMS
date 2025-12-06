const BASE_URL = "http://127.0.0.1:8000";
let childrenData = [];
let regions = [];
let currentEditChildId = null;
let currentUser = null; 


// 토스트 메시지 표시 유틸리티

function showToast(message) {
    const toastEl = document.getElementById('scdmsToast');
    const toastBody = document.getElementById('scdmsToastMessage');
    if (toastBody) toastBody.textContent = message;
    if (toastEl) {
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    }
}

// Region 불러오기

async function loadRegions() {
    const res = await fetch(`${BASE_URL}/regions/all`, {
        headers: {
            "x-staff-id": String(getStaffId())
        }
    });
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


// Child 목록 불러오기

async function loadChildren() {
    const res = await fetch(`${BASE_URL}/list-elf/child/all`, {
        headers: {
            "x-staff-id": String(getStaffId())
        }
    });
    childrenData = await res.json();
    renderChildren();
}


// Child 테이블 렌더링
// list_elf.js 파일의 renderChildren 함수를 이걸로 덮어쓰세요!

function renderChildren() {
    const searchInput = document.getElementById("searchInput");
    const regionFilter = document.getElementById("regionFilter");
    const tbody = document.getElementById("childTableBody");
    const statusFilter = document.getElementById("statusFilter");
    const deliveryFilter = document.getElementById("deliveryFilter"); // 새로 추가된 필터

    if (!searchInput || !regionFilter || !tbody || !statusFilter) return;

    const keyword = searchInput.value.trim();
    const regionValue = regionFilter.value;
    const statusValue = statusFilter.value;
    const deliveryValue = deliveryFilter ? deliveryFilter.value : ""; // 배송 필터 값

    tbody.innerHTML = "";

    let nice=0, naughty=0, pending=0;

    childrenData
        .filter(c => (!keyword || c.name.includes(keyword) || c.address.includes(keyword)))
        .filter(c => (!regionValue || c.region_id == regionValue))
        .filter(c => (!statusValue || c.status_code === statusValue))
        .filter(c => {
            // [추가] 배송 상태 필터링 로직
            if (!deliveryValue) return true; // 전체 보기
            if (deliveryValue === "DELIVERED") return c.delivery_status_code === "DELIVERED";
            if (deliveryValue === "NOT_DELIVERED") return c.delivery_status_code !== "DELIVERED";
            return true;
        })
        .forEach(c => {
            // 카운팅 로직
            if (c.status_code === "NICE") nice++;
            else if (c.status_code === "NAUGHTY") naughty++;
            else pending++;

            const regionName = (regions.find(r => r.RegionID == c.region_id) || {}).RegionName || "(미지정)";
            
            // 배송 완료 여부 확인
            const isDelivered = (c.delivery_status_code === "DELIVERED");

            // 1. 배송 완료 상태 뱃지
            let deliveryBadgeClass = "bg-secondary";
            if (isDelivered) deliveryBadgeClass = "badge-delivered";
            else if (c.delivery_status_code === "PENDING") deliveryBadgeClass = "badge-pending"; 
            
            // 2. 상태 변경 셀렉트 박스 처리 (완료되면 disabled)
            const statusDisabled = isDelivered ? "disabled" : "";
            
            // 3. 삭제 버튼 처리 (완료되면 '완료됨' 텍스트 / 아니면 쓰레기통 아이콘)
            let actionHtml;
            if (isDelivered) {
                actionHtml = `<span class="text-muted small fw-bold">완료됨</span>`; 
            } else {
                // 쓰레기통 아이콘 적용
                actionHtml = `
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteChild(${c.child_id})" title="삭제">
                        🗑
                    </button>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${c.child_id}</td>
                    <td>${c.name}</td>
                    <td>${c.address}</td>
                    <td>${regionName}</td>

                    <td>
                        <select class="form-select form-select-sm"
                                onchange="updateStatus(${c.child_id}, this.value)"
                                ${statusDisabled}>
                            <option value="PENDING" ${c.status_code==="PENDING"?"selected":""}>PENDING</option>
                            <option value="NICE" ${c.status_code==="NICE"?"selected":""}>NICE</option>
                            <option value="NAUGHTY" ${c.status_code==="NAUGHTY"?"selected":""}>NAUGHTY</option>
                        </select>
                    </td>

                    <td>
                        <span class="badge ${deliveryBadgeClass}">
                            ${c.delivery_status_code}
                        </span>
                    </td>

                    <td>
                        <button class="btn btn-main btn-sm" onclick="openWishlistModal('${c.child_id}')">
                            🎁 보기
                        </button>
                    </td>

                    <td>
                        <button class="btn btn-outline-secondary btn-sm" onclick="openNoteModal(${c.child_id})">
                            보기/수정
                        </button>
                    </td>

                    <td>
                        ${actionHtml}
                    </td>
                </tr>
            `;
        });

    // 요약 패널 업데이트
    const elNice = document.getElementById("countNice");
    const elNaughty = document.getElementById("countNaughty");
    const elPending = document.getElementById("countPending");
    
    if(elNice) elNice.innerText = nice;
    if(elNaughty) elNaughty.innerText = naughty;
    if(elPending) elPending.innerText = pending;
}


// Wishlist 모달

async function openWishlistModal(childId) {
    const res = await fetch(`${BASE_URL}/list-elf/child/${childId}/wishlist`, {
        headers: {
            "x-staff-id": String(getStaffId())
        }
    });
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



// Note 모달
function openNoteModal(childId) {
    currentEditChildId = childId;

    const child = childrenData.find(c => c.child_id === childId);
    const input = document.getElementById("noteInput");
    if(input) input.value = child.child_note || "";

    const modal = document.getElementById("noteModal");
    if(modal) new bootstrap.Modal(modal).show();
}


//Note 저장
async function saveNote() {
    const input = document.getElementById("noteInput");
    const note = input ? input.value : "";

    const res = await fetch(`${BASE_URL}/list-elf/child/${currentEditChildId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "x-staff-id": String(getStaffId())
        },
        body: JSON.stringify({ child_note: note })
    });

    if (res.ok) {
        Swal.fire({
            icon: "success",
            title: "저장 완료!",
            text: "추가 사항이 성공적으로 저장되었습니다.",
            timer: 2000, // 2초 후 자동 닫힘
            showConfirmButton: false
        });
    } else {
        // 실패 시 SweetAlert2 표시
        Swal.fire({
            icon: "error",
            title: "저장 실패",
            text: "추가 사항 저장 중 오류가 발생했습니다.",
        });
    }

    loadChildren();
    const modalEl = document.getElementById("noteModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if(modalInstance) modalInstance.hide();
}


// Child 삭제

async function deleteChild(childId) {
    const child = childrenData.find(c => c.child_id === childId);
    if (child && child.delivery_status_code === "DELIVERED") {
        showToast("배송이 완료된 아이는 삭제할 수 없습니다.");
        return;
    }

    Swal.fire({
        title: "정말 삭제하시겠습니까?",
        text: "삭제된 아이 정보는 복구할 수 없습니다.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "삭제",
        cancelButtonText: "취소"
    }).then(async (result) => {
        if (result.isConfirmed) {
            await fetch(`${BASE_URL}/list-elf/child/${childId}`, {
                method: "DELETE",
                headers: {
                    "x-staff-id": String(getStaffId())
                }
            });

            await loadChildren();
            
            Swal.fire("삭제 완료!", `${child.name} 아이의 정보가 삭제되었습니다.`, "success");
        }
    });
}


// 상태 변경

async function updateStatus(childId, newStatus) {
    await fetch(`${BASE_URL}/list-elf/child/${childId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "x-staff-id": String(getStaffId())
        },
        body: JSON.stringify({ status_code: newStatus })
    });

    loadChildren();
    
    showToast(`아이 상태가 ${newStatus}로 변경되었습니다.`);
}


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

// 로그아웃

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


document.addEventListener("DOMContentLoaded", async () => {
    

    if (typeof requireRole === 'function') {
        currentUser = requireRole(["ListElf"]);
    } else {
        console.error("auth.js 로드 실패");
    }

    initUserInfo(); 
    initLogout();   
    
    await loadRegions();
    await loadChildren();
});