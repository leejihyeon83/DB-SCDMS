// ============================
// 전역 변수
// ============================
const loader = document.getElementById("loaderBackdrop");
const errorBanner = document.getElementById("errorBanner");

let logs = [];
let doneGroups = [];
let failedGroups = [];
let doneDetails = [];
let failedDetails = [];
let reindeers = [];
let reindeerMap = new Map();
let childToReindeer = new Map();

// ============================
// 공통 유틸
// ============================
function setLoading(isLoading) {
    if (!loader) return;
    loader.classList.toggle("hidden", !isLoading);
}

function showToast(message, type = "info") {
    const toastEl = document.getElementById("scdmsToast");
    const msgEl = document.getElementById("scdmsToastMessage");

    msgEl.textContent = message;

    // 기존 클래스 초기화 (기본 디자인 유지 후 색상만 변경)
    toastEl.classList.remove("text-bg-danger", "text-bg-success", "text-bg-dark");

    // 타입별 색상 적용
    if (type === "error") {
        toastEl.classList.add("text-bg-danger");
    } else if (type === "success") {
        toastEl.classList.add("text-bg-success");
    } else {
        toastEl.classList.add("text-bg-dark");
    }

    // Bootstrap Toast 인스턴스 생성 및 표시
    // { delay: 3000 } -> 3초 뒤 자동 사라짐
    // 기존 인스턴스가 있다면 재사용하는 것이 좋으나, 간편 구현을 위해 새로 생성
    const bsToast = new bootstrap.Toast(toastEl, { delay: 3000 });
    bsToast.show();
}

function showError(message) {
    showToast(message, "error");
}

function formatDateTime(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}. ${m}. ${day}. ${hh}:${mm}`;
}

function statusBadgeSuccess() {
    const span = document.createElement("span");
    span.className = "badge badge-success";
    span.textContent = "DELIVERED";
    return span;
}

// ============================
// 요약 카드 (성공/실패)
// ============================
function renderSummaryCounts(successCount, failedCount) {
    document.getElementById("successCount").textContent = `${successCount} 건`;
    document.getElementById("failedCount").textContent = `${failedCount} 건`;
}

// ============================
// 실패 그룹 -> 실패 로그 변환
// ============================
function convertFailedGroupsToLogs() {
    const failedLogs = [];

    failedDetails.forEach(group => {
        const timestamp = group.updated_at || group.created_at || new Date().toISOString();

        group.items.forEach(item => {
            failedLogs.push({
                log_id: `F-${group.group_id}-${item.child_id}`,
                delivery_timestamp: timestamp,
                child_name: item.child_name || "알 수 없음",
                gift_name: item.gift_name || "재고 없음",
                status: "FAILED"
            });
        });
    });

    return failedLogs;
}

// ============================
// 성공/실패 통합 로그 렌더링
// ============================
function renderAllLogs() {
    const successLogs = logs.map(l => ({
        ...l,
        status: "SUCCESS"
    }));

    const failedLogs = convertFailedGroupsToLogs();

    const allLogs = [...successLogs, ...failedLogs].sort(
        (a, b) => new Date(b.delivery_timestamp) - new Date(a.delivery_timestamp)
    );

    renderLogsTable(allLogs);
}


// ============================
// SUCCESS / FAILED 구분 렌더링
// ============================
function renderLogsTable(logsToRender) {
    const tbody = document.getElementById("logsTableBody");
    tbody.innerHTML = "";

    if (!logsToRender.length) {
        const tr = document.createElement("tr");
        tr.innerHTML =
            `<td colspan="6" class="empty-text-cell">해당 조건에 해당하는 배송 로그가 없습니다.</td>`;
        tbody.appendChild(tr);
        return;
    }

    logsToRender.forEach((log) => {
        const isFailed = log.status === "FAILED";
        const badge = isFailed
            ? `<span class="badge badge-failed">FAILED</span>`
            : `<span class="badge badge-success">DELIVERED</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${log.log_id}</td>
            <td>${formatDateTime(log.delivery_timestamp)}</td>
            <td>${log.child_name}</td>
            <td>${log.gift_name}</td>
            <td>${badge}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================
// 인기 선물
// ============================
function renderPopularGifts(logsToRender) {
    const list = document.getElementById("popularGiftsList");
    list.innerHTML = "";

    if (!logsToRender.length) {
        list.innerHTML = `<li class="empty-text">해당 범위에서 배송된 선물이 없습니다.</li>`;
        return;
    }

    const stats = new Map();
    logsToRender.forEach((log) => {
        if (!stats.has(log.gift_id)) {
            stats.set(log.gift_id, { name: log.gift_name, count: 0 });
        }
        stats.get(log.gift_id).count++;
    });

    const items = [...stats.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    items.forEach((item) => {
        const li = document.createElement("li");
        li.className = "simple-list-item";
        li.innerHTML =
            `<span>${item.name}</span><span class="list-meta">${item.count} 건</span>`;
        list.appendChild(li);
    });
}

// ============================
// 루돌프 순위
// ============================
function renderBestReindeers(logsToRender) {
    const list = document.getElementById("bestReindeerList");
    list.innerHTML = "";

    const stats = new Map();

    logsToRender.forEach((log) => {
        const rid = childToReindeer.get(log.child_id);
        if (!rid) return;

        stats.set(rid, (stats.get(rid) || 0) + 1);
    });

    const arr = [...stats.entries()]
        .map(([rid, count]) => ({
            reindeer_id: rid,
            name: reindeerMap.get(rid) || `루돌프 #${rid}`,
            count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (!arr.length) {
        list.innerHTML =
            `<li class="empty-text">해당 범위에서 배송에 참여한 루돌프가 없습니다.</li>`;
        return;
    }

    arr.forEach((item) => {
        const li = document.createElement("li");
        li.className = "simple-list-item";
        li.innerHTML =
            `<span>${item.name}</span><span class="list-meta">${item.count} 건</span>`;
        list.appendChild(li);
    });
}

// ============================
// 내 배송 기록
// ============================
function renderMyLogs() {
    const tbody = document.getElementById("myLogsTableBody");
    tbody.innerHTML = "";

    const myLogs = logs.filter((log) => log.delivered_by_staff_id === 1);

    if (!myLogs.length) {
        tbody.innerHTML =
            `<tr><td colspan="4" class="empty-text-cell">내 배송 기록이 없습니다.</td></tr>`;
        return;
    }

    myLogs.forEach((log) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${log.log_id}</td>
            <td>${formatDateTime(log.delivery_timestamp)}</td>
            <td>${log.child_name}</td>
            <td>${log.gift_name}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================
// 산타 필터
// ============================
function applyStaffFilter() {
    const staffId = Number(document.getElementById("logStaffFilter").value);
    let filtered = logs;

    if (staffId) {
        filtered = logs.filter((l) => l.delivered_by_staff_id === staffId);
    }

    renderLogsTable(filtered);
    renderPopularGifts(filtered);
    renderBestReindeers(filtered);
}

// ============================
// 메인 로더
// ============================
async function loadLogsPage() {
    try {
        setLoading(true);

        // 1) 모든 기본 데이터 불러오기
        const [
            logsRes,
            doneGroupsRes,
            failedGroupsRes,
            reindeerRes
        ] = await Promise.all([
            apiGET("/delivery-log/"),
            apiGET("/santa/groups?status_filter=DONE"),
            apiGET("/santa/groups?status_filter=FAILED"),
            apiGET("/reindeer/"),   // 전체 루돌프 목록
        ]);

        logs = logsRes;
        doneGroups = doneGroupsRes;
        failedGroups = failedGroupsRes;
        reindeers = reindeerRes;

        // ID → 이름 매핑
        reindeerMap = new Map(
            reindeers.map((r) => [r.reindeer_id, r.name])
        );

        // 2) 그룹 상세 가져오기
        const doneDetailPromises = doneGroups.map((g) =>
            apiGET(`/santa/groups/${g.group_id}`)
        );
        const failedDetailPromises = failedGroups.map((g) =>
            apiGET(`/santa/groups/${g.group_id}`)
        );

        const [doneDet, failedDet] = await Promise.all([
            Promise.all(doneDetailPromises),
            Promise.all(failedDetailPromises),
        ]);

        doneDetails = doneDet;
        failedDetails = failedDet;

        // child → reindeer_id 매핑
        childToReindeer = new Map();

        doneDetails.forEach((group) => {
            group.items.forEach((item) =>
                childToReindeer.set(item.child_id, group.reindeer_id)
            );
        });

        failedDetails.forEach((group) => {
            group.items.forEach((item) =>
                childToReindeer.set(item.child_id, group.reindeer_id)
            );
        });

        // 렌더링
        renderMyLogs();
        applyStaffFilter();
        calculateSummary();
        renderAllLogs();


    } catch (error) {
        console.error(error);
        showError("배송 기록을 불러오는 중 오류가 발생했습니다.\n" + error);
    } finally {
        setLoading(false);
    }
}

function calculateSummary() {
    const successCount = logs.length;
    const failedCount = failedDetails.reduce(
        (sum, g) => sum + g.items.length, 0
    );
    renderSummaryCounts(successCount, failedCount);
}


// ============================
// DOM 이벤트
// ============================
document.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("logStaffFilter")
        ?.addEventListener("change", applyStaffFilter);

    loadLogsPage();
});
