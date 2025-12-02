// 배송 대상 페이지 JS

let allChildren = [];
let regionsMap = {};

const loader = document.getElementById("loaderBackdrop");
const errorBanner = document.getElementById("errorBanner");

function showLoader() { loader.classList.remove("hidden"); }
function hideLoader() { loader.classList.add("hidden"); }

function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove("hidden");
    setTimeout(() => errorBanner.classList.add("hidden"), 4000);
}

window.addEventListener("DOMContentLoaded", async () => {
    try {
        showLoader();
        await Promise.all([loadRegions(), loadChildren()]);
    } catch (e) {
        console.error(e);
        showError("데이터 불러오기 실패");
    } finally {
        hideLoader();
    }

    // 필터 이벤트
    document.getElementById("searchInput").addEventListener("input", renderFiltered);
    document.getElementById("regionFilter").addEventListener("change", renderFiltered);
    document.getElementById("statusFilter").addEventListener("change", renderFiltered);
    document.getElementById("deliveryFilter").addEventListener("change", renderFiltered);

    // 모달 닫기 이벤트
    const overlay = document.getElementById("childModalOverlay");
    document.getElementById("modalCloseBtn").onclick = () => overlay.classList.add("hidden");
    document.getElementById("modalCloseFooter").onclick = () => overlay.classList.add("hidden");
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.add("hidden");
    });
});

// 지역 목록 불러오기 (FastAPI: /regions/all)
async function loadRegions() {
    const data = await apiGET("/regions/all");
    const select = document.getElementById("regionFilter");

    data.forEach(r => {
        regionsMap[r.RegionID] = r.RegionName;
        const opt = document.createElement("option");
        opt.value = r.RegionID;
        opt.textContent = r.RegionName;
        select.appendChild(opt);
    });
}

// 전체 아이 불러오기 (FastAPI: /list-elf/child/all)
async function loadChildren() {
    allChildren = await apiGET("/list-elf/child/all");
    renderFiltered();
}

// 필터 적용 후 렌더링
function renderFiltered() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const region = document.getElementById("regionFilter").value;
    const status = document.getElementById("statusFilter").value;
    const delivery = document.getElementById("deliveryFilter").value;

    let arr = allChildren;

    if (region) arr = arr.filter(c => String(c.region_id) === region);
    if (status) arr = arr.filter(c => c.status_code === status);
    if (delivery) arr = arr.filter(c => c.delivery_status_code === delivery);

    if (search) {
        arr = arr.filter(c => 
            c.name.toLowerCase().includes(search) ||
            c.address.toLowerCase().includes(search) ||
            (regionsMap[c.region_id] || "").toLowerCase().includes(search)
        );
    }

    renderTable(arr);
    updateSummary(arr);
}

function renderTable(children) {
    const tbody = document.getElementById("targetsTableBody");
    tbody.innerHTML = "";

    children.forEach(child => {
        const regionName = regionsMap[child.region_id] || "-";
        const p1 = child.wishlist.find(w => w.priority === 1);
        const p2 = child.wishlist.find(w => w.priority === 2);

        const tr = document.createElement("tr");
        tr.onclick = () => openChildModal(child.child_id);

        tr.innerHTML = `
            <td>${child.name}</td>
            <td>${regionName}</td>
            <td>${child.address}</td>
            <td>${p1 ? "#" + p1.gift_id : "-"}</td>
            <td>${p2 ? "#" + p2.gift_id : "-"}</td>
            <td>${child.status_code}</td>
            <td>${child.delivery_status_code}</td>
        `;

        tbody.appendChild(tr);
    });
}

function updateSummary(arr) {
    document.getElementById("niceCount").textContent =
        arr.filter(c => c.status_code === "NICE").length + " 명";

    document.getElementById("pendingCount").textContent =
        arr.filter(c => c.delivery_status_code === "PENDING").length + " 건";

    document.getElementById("readyCount").textContent =
        arr.filter(c => c.delivery_status_code === "DELIVERED").length + " 건";
}

// 상세 모달 호출
async function openChildModal(childId) {
    try {
        showLoader();
        const detail = await apiGET(`/list-elf/child/${childId}/details`);
        fillModal(detail);
        document.getElementById("childModalOverlay").classList.remove("hidden");
    } catch (e) {
        console.error(e);
        showError("상세 정보를 가져올 수 없습니다");
    } finally {
        hideLoader();
    }
}

function fillModal(detail) {
    document.getElementById("modalChildName").textContent = detail.name;
    document.getElementById("modalAddress").textContent = detail.address;
    document.getElementById("modalRegion").textContent = regionsMap[detail.region_id] || "-";
    document.getElementById("modalNote").textContent = detail.child_note || "(메모 없음)";

    document.getElementById("modalStatus").innerHTML =
        `<span class="badge ${getStatusBadgeClass(detail.status_code)}">
            ${detail.status_code}
        </span>`;

    document.getElementById("modalDeliveryStatus").innerHTML =
        `<span class="badge ${getDeliveryBadgeClass(detail.delivery_status_code)}">
            ${detail.delivery_status_code}
        </span>`;

    const tbody = document.getElementById("modalWishlistBody");
    tbody.innerHTML = "";

    detail.wishlist
        .sort((a, b) => a.priority - b.priority)
        .forEach(w => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${w.priority}</td>
                <td>#${w.gift_id}</td>
            `;
            tbody.appendChild(tr);
        });
}

function getStatusBadgeClass(code) {
    code = code.toUpperCase();
    if (code === "NICE") return "badge-nice";
    if (code === "NAUGHTY") return "badge-naughty";
    return "badge-pending";   // PENDING 등
}

function getDeliveryBadgeClass(code) {
    code = code.toUpperCase();
    if (code === "DELIVERED") return "badge-delivered";
    if (code === "FAILED") return "badge-failed";
    return "badge-pending";   // 나머지는 PENDING 처리
}

function makeBadgeHtml(type, value) {
    if (!value) return "-";
    
    const text = value.toUpperCase(); // 대소문자 무시
    let className = "badge-pending";  // 기본값

    // 1. 상태/판정 관련 (NICE, NAUGHTY, SUCCESS, FAILED)
    if (type === 'status') {
        if (text === 'NICE') className = "badge-nice";
        else if (text === 'NAUGHTY') className = "badge-naughty";
        else if (text === 'SUCCESS') className = "badge-success"; // 로그용
        else if (text === 'FAILED') className = "badge-failed";   // 로그용
    } 
    // 2. 배송 관련 (PENDING, SCHEDULED, DELIVERED, DONE)
    else if (type === 'delivery') {
        if (text === 'PENDING') className = "badge-pending";
        else if (text === 'DELIVERED' || text === 'DONE') className = "badge-delivered";
        else if (text === 'FAILED') className = "badge-failed";
    }

    return `<span class="badge ${className}">${text}</span>`;
}