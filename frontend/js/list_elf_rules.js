/* =========================================
   전역 변수 및 설정
   ========================================= */
const BASE_URL = "http://127.0.0.1:8000";

let rules = [];
let currentRuleId = null; // 상세보기 / 수정 대상 rule_id
let currentUser = null;   // 로그인한 사용자 정보

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
                localStorage.removeItem("token");
                window.location.href = "../index.html";
            }
        });
    }
}

function getStaffId() {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    try {
        const user = JSON.parse(raw);
        return user.staff_id || null;
    } catch(e) {
        return null;
    }
}

/* 규칙 생성 */
async function createRule() {
    const titleInput = document.getElementById("ruleTitle");
    const descInput = document.getElementById("ruleDescription");
    
    if (!titleInput || !descInput) return;

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const staffId = getStaffId();

    if (!title || !description) {
        showToast("규칙 제목과 상세 기준을 모두 입력해주세요.");
        return;
    }

    if (!staffId) {
        Swal.fire("오류", "로그인 정보(staff_id)를 찾을 수 없습니다. 다시 로그인해주세요.", "error");
        return;
    }

    const body = {
        title,
        description,
        created_by_staff_id: staffId
    };

    try {
        const res = await fetch(`${BASE_URL}/list-elf/rules/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-staff-id": String(getStaffId())
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            Swal.fire("규칙 생성 실패", err.detail || "서버에서 오류가 발생했습니다.", "error");
            return;
        }

        titleInput.value = "";
        descInput.value = "";
        await loadRules();
        
        Swal.fire("생성 완료!", "새로운 규칙이 성공적으로 등록되었습니다.", "success");
    } catch (e) {
        console.error(e);
        Swal.fire("오류", "서버와 통신 중 오류가 발생했습니다.", "error");
    }
}

async function loadRules() {
    try {
        const res = await fetch(`${BASE_URL}/list-elf/rules/all`, {
            headers: {
                "x-staff-id": String(getStaffId())
            }
        });
        rules = await res.json();
        renderRules();
    } catch (e) {
        console.error(e);
        Swal.fire({
            icon: "error",
            title: "오류", 
            text: "규칙 목록을 불러오는 중 오류가 발생했습니다. 서버 연결을 확인해 주세요.",
            confirmButtonText: "닫기"
        });
    }
}

function renderRules() {
    const container = document.getElementById("rulesContainer");
    if (!container) return;
    
    container.innerHTML = "";

    if (!rules || rules.length === 0) {
        container.innerHTML = `<div class="rules-empty">등록된 규칙이 없습니다. 위에서 새 규칙을 추가해 주세요.</div>`;
        return;
    }

    const table = document.createElement("table");
    table.className = "table align-middle mb-0";

    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr class="table-secondary">
        <th style="width: 70px;">ID</th>
        <th>제목</th>
        <th style="width: 130px;">작성자</th>
        <th style="width: 170px;">생성일</th>
        <th style="width: 180px;">규칙 내용</th>
        </tr>
    `;

    const tbody = document.createElement("tbody");

    rules.forEach(rule => {
        const tr = document.createElement("tr");

        const createdAt = formatDate(rule.created_at);

        tr.innerHTML = `
        <td>${rule.rule_id}</td>
        <td class="rule-row-title">${escapeHtml(rule.title)}</td>
        <td>${rule.created_by_staff_id}</td>
        <td>${createdAt}</td>
        <td>
            <button class="btn btn-sm btn-outline-primary me-1"
                    onclick="openRuleDetail(${rule.rule_id})">
            상세보기
            </button>
            <button class="btn btn-sm btn-outline-danger"
                    onclick="deleteRule(${rule.rule_id})">
            🗑
            </button>
        </td>
        `;

        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
}

function openRuleDetail(ruleId) {
    const rule = rules.find(r => r.rule_id === ruleId);
    if (!rule) return;

    currentRuleId = ruleId;

    const titleEl = document.getElementById("detailTitle");
    const metaEl = document.getElementById("detailMeta");
    const descEl = document.getElementById("detailDescription");

    if (titleEl) titleEl.textContent = rule.title;

    const createdAt = formatDate(rule.created_at);
    const updatedAt = formatDate(rule.updated_at);

    let meta = `작성자: #${rule.created_by_staff_id} · 생성: ${createdAt}`;
    if (rule.updated_by_staff_id) {
        meta += `\n수정자: #${rule.updated_by_staff_id} · 수정: ${updatedAt}`;
    } else {
        meta += `\n수정 기록 없음`;
    }
    if (metaEl) metaEl.textContent = meta;

    if (descEl) descEl.textContent = rule.description || "";

    const modalEl = document.getElementById("ruleDetailModal");
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

/* 상세보기에서 수정 모달 열기
// ... (openEditModal 함수 내용 변경 없음)
-------------------------------- */
function openEditModal() {
    const rule = rules.find(r => r.rule_id === currentRuleId);
    if (!rule) return;

    const editTitle = document.getElementById("editTitle");
    const editDesc = document.getElementById("editDescription");

    if (editTitle) editTitle.value = rule.title;
    if (editDesc) editDesc.value = rule.description;

    const detailModalEl = document.getElementById("ruleDetailModal");
    const detailModal = bootstrap.Modal.getInstance(detailModalEl);
    if (detailModal) detailModal.hide();

    const editModalEl = document.getElementById("ruleEditModal");
    if (editModalEl) {
        const editModal = new bootstrap.Modal(editModalEl);
        editModal.show();
    }
}

/* 규칙 수정 저장 */
async function saveRuleEdit() {
    const titleInput = document.getElementById("editTitle");
    const descInput = document.getElementById("editDescription");

    if (!titleInput || !descInput) return;

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const staffId = getStaffId();

    if (!title || !description) {
        showToast("규칙 제목과 상세 기준을 모두 입력해주세요.");
        return;
    }
    
    if (!staffId) {
        Swal.fire("오류", "로그인 정보(staff_id)를 찾을 수 없습니다. 다시 로그인해주세요.", "error");
        return;
    }

    const body = {
        title,
        description,
        updated_by_staff_id: staffId
    };

    try {
        const res = await fetch(`${BASE_URL}/list-elf/rules/update/${currentRuleId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-staff-id": String(getStaffId())
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            Swal.fire("규칙 수정 실패", err.detail || "서버에서 오류가 발생했습니다.", "error");
            return;
        }

        const editModalEl = document.getElementById("ruleEditModal");
        const editModal = bootstrap.Modal.getInstance(editModalEl);
        if (editModal) editModal.hide();

        await loadRules();
        
        Swal.fire("수정 완료!", "규칙이 성공적으로 업데이트되었습니다.", "success");
    } catch (e) {
        console.error(e);
        Swal.fire("오류", "서버와 통신 중 오류가 발생했습니다.", "error");
    }
}

/* 🗑 규칙 삭제 */
async function deleteRule(ruleId) {
    Swal.fire({
        title: "규칙을 삭제하시겠습니까?",
        text: "삭제된 규칙은 복구할 수 없습니다.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "삭제",
        cancelButtonText: "취소"
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`${BASE_URL}/list-elf/rules/${ruleId}`, {
                    method: "DELETE",
                    headers: { 
                        "Content-Type": "application/json",
                        "x-staff-id": String(getStaffId())
                    },
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    Swal.fire("삭제 실패", err.detail || "서버에서 오류가 발생했습니다.", "error");
                    return;
                }

                await loadRules();
                Swal.fire("삭제 완료!", "규칙이 성공적으로 삭제되었습니다.", "success");
            } catch (e) {
                console.error(e);
                Swal.fire("오류", "서버와 통신 중 오류가 발생했습니다.", "error");
            }
        }
    });
}

function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString("ko-KR");
}

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", async () => {
    
    if (typeof requireRole === 'function') {
        currentUser = requireRole(["ListElf"]);
    } else {
        console.error("auth.js 로드 실패");
    }

    initUserInfo();
    initLogout();
    
    await loadRules();
});