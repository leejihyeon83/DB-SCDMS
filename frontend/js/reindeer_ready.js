const API_BASE = "http://127.0.0.1:8000";
const API_AVAILABLE = `${API_BASE}/reindeer/available`;

function $(sel) { return document.querySelector(sel); }

document.addEventListener("DOMContentLoaded", () => {
    const raw = localStorage.getItem("currentUser");
    if(raw) $("#header-user-name").textContent = `${JSON.parse(raw).name} 님`;
    
    $("#btn-logout").onclick = () => {
        if(confirm("정말 로그아웃 하시겠습니까?")) {
            localStorage.removeItem("currentUser");
            location.href = "../index.html";
        }
    };

    loadReadyList();
});

function getStaffId() {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return "";
    try {
        const user = JSON.parse(raw);
        return user.staff_id ?? "";
    } catch {
        return "";
    }
}

async function loadReadyList() {
    const tbody = $("#ready-reindeer-tbody");
    
    try {
        const res = await fetch(API_AVAILABLE, {
            headers: {
                "x-staff-id": String(getStaffId())
            }
        });
        if(!res.ok) throw new Error("Load failed");
        
        const list = await res.json();
        
        tbody.innerHTML = "";
        
        if (!list.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5 text-muted">
                        비행 가능한 루돌프가 없습니다.<br>
                        <small>(체력 관리와 상태 변경이 필요합니다)</small>
                    </td>
                </tr>`;
            return;
        }

        list.forEach(r => {
            // 상태 처리
            let badgeClass = "status-READY";
            let badgeText = "READY";
            // READY 페이지지만 혹시 다른 상태가 섞여있을 경우를 대비
            if (r.status === "RESTING") { badgeClass = "status-RESTING"; badgeText = "RESTING"; }
            else if (r.status === "ONDELIVERY") { badgeClass = "status-ONDELIVERY"; badgeText = "ON DELIVERY"; }

            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 fw-bold text-brown" style="font-size: 1.1rem;">
                        🦌 ${r.name}
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <span class="text-danger fw-bold" style="width: 30px; text-align:right;">${r.current_stamina}</span>
                            <div class="progress-custom" style="width: 120px; height: 8px;">
                                <div class="progress-bar-stamina" style="width: ${r.current_stamina}%"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <span class="text-primary fw-bold" style="width: 30px; text-align:right;">${r.current_magic}</span>
                            <div class="progress-custom" style="width: 120px; height: 8px;">
                                <div class="progress-bar-magic" style="width: ${r.current_magic}%"></div>
                            </div>
                        </div>
                    </td>
                    <td class="text-end pe-4">
                        <span class="status-badge ${badgeClass}" style="font-size: 0.75rem;">${badgeText}</span>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">데이터를 불러오지 못했습니다.</td></tr>`;
    }
}