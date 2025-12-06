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
let staffList = [];

let childMap = {};
let giftMap = {};

function setLoading(isLoading) {
    if (!loader) return;
    loader.classList.toggle("hidden", !isLoading);
}

function showToast(message, type = "info") {
    const toastEl = document.getElementById("scdmsToast");
    const msgEl = document.getElementById("scdmsToastMessage");

    msgEl.textContent = message;

    toastEl.classList.remove("text-bg-danger", "text-bg-success", "text-bg-dark");

    if (type === "error") {
        toastEl.classList.add("text-bg-danger");
    } else if (type === "success") {
        toastEl.classList.add("text-bg-success");
    } else {
        toastEl.classList.add("text-bg-dark");
    }

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

function renderSummaryCounts(successCount, failedCount) {
    document.getElementById("successCount").textContent = `${successCount} 건`;
    document.getElementById("failedCount").textContent = `${failedCount} 건`;
}

function convertFailedGroupsToLogs() {
    const failedLogs = [];

    failedDetails.forEach(group => {
        const timestamp = group.updated_at || group.created_at || new Date().toISOString();

        // 산타 ID 가져오기
        const creatorId = group.created_by_staff_id; 

        group.items.forEach(item => {
            const cName = childMap[item.child_id] || `아이 #${item.child_id}`;
            
            const giftInfo = giftMap[item.gift_id];
            let gName = `선물 #${item.gift_id}`; 

            if (giftInfo) {
                if (giftInfo.stock <= 0) {
                    gName = `재고 없음: ${giftInfo.name} (${giftInfo.stock}개)`;
                } else {
                    gName = `재고 부족: ${giftInfo.name} (현재 ${giftInfo.stock}개)`;
                }
            } else {
                gName = "알 수 없는 선물";
            }

            failedLogs.push({
                log_id: `F-${group.group_id}-${item.child_id}`,
                delivery_timestamp: timestamp,
                child_name: cName,
                gift_name: gName,
                status: "FAILED",
                delivered_by_staff_id: creatorId 
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
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!logsToRender.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="6" class="empty-text-cell">해당 조건에 해당하는 배송 로그가 없습니다.</td>`;
        tbody.appendChild(tr);
        return;
    }

    logsToRender.forEach((log) => {
        const isFailed = log.status === "FAILED";
        const badge = isFailed
            ? `<span class="badge badge-failed">FAILED</span>`
            : `<span class="badge badge-success">DELIVERED</span>`;

        let displayGift = log.gift_name;

        if (displayGift && displayGift.includes("재고 부족")) {
            displayGift = `<span style="color: #dc2626; font-weight: bold;">${displayGift}</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${log.log_id}</td>
            <td>${formatDateTime(log.delivery_timestamp)}</td>
            <td>${log.child_name}</td>
            <td>${displayGift}</td>
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
        if (log.gift_name && (log.gift_name.includes("재고 부족") || log.gift_name.includes("알 수 없는"))) {
            return;
        }
        if (!stats.has(log.gift_id)) {
            stats.set(log.gift_id, { name: log.gift_name, count: 0 });
        }
        stats.get(log.gift_id).count++;
    });

    if (stats.size === 0) {
        list.innerHTML = `<li class="empty-text">집계된 인기 선물이 없습니다.</li>`;
        return;
    }

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

    const myId = santaState.staffId;
    if (!myId) {
         tbody.innerHTML = `<tr><td colspan="5" class="empty-text-cell">로그인 정보가 없습니다.</td></tr>`;
         return;
    }

    // 1. 성공 로그 + 실패 로그 합치기
    const successLogs = logs.map(l => ({ ...l, status: "SUCCESS" }));
    const failedLogs = convertFailedGroupsToLogs();
    const allLogs = [...successLogs, ...failedLogs].sort(
        (a, b) => new Date(b.delivery_timestamp) - new Date(a.delivery_timestamp)
    );

    const myLogs = allLogs.filter((log) => log.delivered_by_staff_id === myId);

    if (!myLogs.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-text-cell">내 배송 기록이 없습니다.</td></tr>`;
        return;
    }

    myLogs.forEach((log) => {
        const isFailed = log.status === "FAILED";
        const badge = isFailed
            ? `<span class="badge badge-failed">FAILED</span>`
            : `<span class="badge badge-success">DELIVERED</span>`;
        
        let displayGift = log.gift_name;
        if (displayGift && displayGift.includes("재고 부족")) {
            displayGift = `<span style="color: #dc2626; font-weight: bold;">${displayGift}</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${log.log_id}</td>
            <td>${formatDateTime(log.delivery_timestamp)}</td>
            <td>${log.child_name}</td>
            <td>${displayGift}</td>
            <td>${badge}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================
// 산타 필터
// ============================
function applyStaffFilter() {
    const staffId = Number(document.getElementById("logStaffFilter").value);
    const successLogs = logs.map(l => ({ ...l, status: "SUCCESS" }));
    const failedLogs = convertFailedGroupsToLogs();
    const allLogs = [...successLogs, ...failedLogs].sort(
        (a, b) => new Date(b.delivery_timestamp) - new Date(a.delivery_timestamp)
    );

    let filtered = allLogs;

    if (staffId) {
        filtered = allLogs.filter((l) => l.delivered_by_staff_id === staffId);
    }

    renderLogsTable(filtered);

    renderPopularGifts(allLogs);
    renderBestReindeers(allLogs);
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
            reindeerRes,
            staffRes,
            allChildrenRes,
            allGiftsRes
        ] = await Promise.all([
            apiGET("/delivery-log/"),
            apiGET("/santa/groups?status_filter=DONE"),
            apiGET("/santa/groups?status_filter=FAILED"),
            apiGET("/reindeer/"),  
            apiGET("/staff"),
            apiGET("/list-elf/child/all"), 
            apiGET("/gift/")
        ]);

        logs = logsRes;
        doneGroups = doneGroupsRes;
        failedGroups = failedGroupsRes;
        reindeers = reindeerRes;
        staffList = staffRes;

        // ID -> 이름 매핑
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

        allChildrenRes.forEach(c => {
            childMap[c.child_id] = c.name;
        });
        
        allGiftsRes.forEach(g => {
            giftMap[g.gift_id] = g.gift_name;
        });

        allGiftsRes.forEach(g => {
            giftMap[g.gift_id] = {
                name: g.gift_name,
                stock: g.stock_quantity
            };
        });

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
        populateStaffFilter();
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

function convertFailedGroupsToLogs() {
    const failedLogs = [];

    failedDetails.forEach(group => {
        const timestamp = group.updated_at || group.created_at || new Date().toISOString();
        const creatorId = group.created_by_staff_id;

        // 1. 그룹 내에서 필요한 선물 개수 집계 (어떤 선물이 몇 개 필요한지)
        const neededCounts = {}; // { giftId: 개수 }
        const childrenNames = [];

        group.items.forEach(item => {
            // 아이 이름 수집
            const cName = childMap[item.child_id] || `아이#${item.child_id}`;
            childrenNames.push(cName);

            // 선물 개수 카운트
            const gid = item.gift_id;
            neededCounts[gid] = (neededCounts[gid] || 0) + 1;
        });

        // 2. 아이 이름 요약
        let childSummary = "";
        if (childrenNames.length <= 2) {
            childSummary = childrenNames.join(", ");
        } else {
            childSummary = `${childrenNames[0]}, ${childrenNames[1]} 외 ${childrenNames.length - 2}명`;
        }

        // 3. 재고 부족 분석 
        const shortages = []; // 부족한 선물 메시지들

        for (const [gid, countNeeded] of Object.entries(neededCounts)) {
            const giftInfo = giftMap[gid];
            
            if (giftInfo) {
                if (giftInfo.stock < countNeeded) {
                    const missingCnt = countNeeded - giftInfo.stock;
                    shortages.push(`${giftInfo.name}(${missingCnt}개 부족)`);
                }
            } else {
                shortages.push(`알 수 없는 선물#${gid}`);
            }
        }

        // 4. 선물 컬럼에 표시할 메시지 만들기
        let giftDisplay = "";
        
        if (shortages.length > 0) {
            // 부족한 게 있으면 빨갛게 표시
            giftDisplay = `재고 부족: ${shortages.join(", ")}`;
        } else {
            // 재고는 있는데 다른 에러로 실패한 경우 (단순 선물 나열)
            // (보통 여기에 걸릴 일은 거의 없지만 예외 처리)
            const giftNames = Object.keys(neededCounts).map(gid => giftMap[gid]?.name || gid);
            giftDisplay = giftNames.join(", ");
        }

        failedLogs.push({
            log_id: `F-${group.group_id}`, 
            delivery_timestamp: timestamp,
            child_name: childSummary, 
            gift_name: giftDisplay,   
            status: "FAILED",
            delivered_by_staff_id: creatorId
        });
    });

    return failedLogs;
}

function calculateSummary() {
    const successCount = logs.length;
    const failedCount = failedDetails.reduce(
        (sum, g) => sum + g.items.length, 0
    );
    renderSummaryCounts(successCount, failedCount);
}

function populateStaffFilter() {
    const select = document.getElementById("logStaffFilter");
    if (!select) return;

    select.innerHTML = '<option value="">전체 산타</option>';

    staffList.forEach(staff => {
        if (staff.role !== 'Santa') return; 

        const option = document.createElement("option");
        option.value = String(staff.staff_id);
        
        option.textContent = `${staff.name}`;
        
        select.appendChild(option);
    });
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
