let allTargets = [];    // 모든 배송 대상 아이
let targets = [];       // 현재 필터(지역)에 맞는 아이
let regions = [];
let reindeers = [];
let pendingGroups = [];
let gifts = [];

const loader = document.getElementById("loaderBackdrop");
const errorBanner = document.getElementById("errorBanner");

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

function formatChildSubtitle(target) {
    const region = target.region_name || "지역 미지정";
    const address = target.address || "";
    return `${region} · ${address}`;
}

function renderTargets(list) {
    const container = document.getElementById("childList");
    if (!container) return;

    const source = list || targets;
    container.innerHTML = "";

    if (!source.length) {
        const empty = document.createElement("div"); // p -> div로 변경하여 스타일링 용이하게
        empty.className = "empty-text";
        empty.style.padding = "20px";
        empty.style.textAlign = "center";
        empty.textContent = "표시할 배송 대상 아이가 없습니다. (지역 또는 상태를 확인해주세요)";
        container.appendChild(empty);
        return;
    }

    source.forEach((t) => {
        // 1. 전체를 감싸는 Label (클릭 시 체크박스 동작)
        const label = document.createElement("label");
        label.className = "child-item"; // CSS에서 스타일링한 클래스

        // 2. 체크박스
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = String(t.child_id);
        checkbox.className = "child-checkbox"; // CSS에서 커스텀한 클래스

        // 3. 정보 영역
        const info = document.createElement("div");
        info.className = "child-info";

        const nameRow = document.createElement("div");
        nameRow.className = "child-name-row";
        nameRow.textContent = t.name;

        const subRow = document.createElement("div");
        subRow.className = "child-sub-row";
        subRow.textContent = formatChildSubtitle(t);

        const giftRow = document.createElement("div");
        giftRow.style.fontSize = "0.85rem";
        giftRow.style.marginTop = "4px";
        giftRow.style.color = "#d64840";

        if (t.wishes && t.wishes.length > 0) {
            const wishText = t.wishes
                .slice(0, 3) 
                .map((gift, index) => `${index + 1}순위 : ${gift}`) 
                .join(" || "); 
            giftRow.textContent = wishText;
        } else {
            giftRow.textContent = "🎁 등록된 소원 없음";
            giftRow.style.color = "#999"; // 소원 없으면 회색
        }

        info.appendChild(nameRow);
        info.appendChild(subRow);
        info.appendChild(giftRow)

        label.appendChild(checkbox);
        label.appendChild(info);

        container.appendChild(label);
    });
}

function renderReindeers() {
    const select = document.getElementById("reindeerSelect");
    if (!select) return;

    select.innerHTML = '<option value="">루돌프를 선택하세요</option>';

    if (!reindeers.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.disabled = true;
        opt.textContent = "비행 가능한 루돌프가 없습니다";
        select.appendChild(opt);
        return;
    }

    reindeers.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = String(r.reindeer_id);
        opt.textContent = `${r.name} (체력 ${r.current_stamina}, 마력 ${r.current_magic})`;
        select.appendChild(opt);
    });
}

function renderRegions() {
    const select = document.getElementById("regionFilter");
    if (!select) return;

    // 기본 옵션 유지
    select.innerHTML = '<option value="">전체 지역</option>';

    regions.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = String(r.RegionID);
        opt.textContent = r.RegionName;
        select.appendChild(opt);
    });
}

function applyRegionFilter() {
    const select = document.getElementById("regionFilter");
    if (!select) return;

    const value = select.value;
    if (!value) {
        // 전체 지역
        targets = [...allTargets];
    } else {
        const regionId = Number(value);
        targets = allTargets.filter((t) => t.region_id === regionId);
    }

    // 선택 초기화
    const checkboxes = document.querySelectorAll(".child-checkbox");
    checkboxes.forEach((cb) => (cb.checked = false));

    renderTargets();
}

function statusBadge(status) {
    const span = document.createElement("span");
    span.className = "badge";
    if (status === "PENDING") {
        span.classList.add("badge-pending");
        span.textContent = "대기중";
    } else if (status === "DONE") {
        span.classList.add("badge-success");
        span.textContent = "완료";
    } else if (status === "FAILED") {
        span.classList.add("badge-failed");
        span.textContent = "실패";
    } else {
        span.textContent = status;
    }
    return span;
}

function findReindeerName(id) {
    const r = reindeers.find((x) => x.reindeer_id === id);
    return r ? r.name : `ID ${id}`;
}

function renderGroups() {
    const container = document.getElementById("groupList");
    if (!container) return;

    container.innerHTML = "";

    if (!pendingGroups.length) {
        const empty = document.createElement("div");
        empty.className = "queue-empty-state";

        const icon = document.createElement("img");
        icon.className = "queue-icon sleigh-icon";
        icon.src = "/img/sleigh.png";     

        const title = document.createElement("p");
        title.className = "queue-title";
        title.textContent = "아직 배송 그룹이 없습니다";

        const text = document.createElement("p");
        text.className = "queue-text";
        text.textContent = "왼쪽에서 아이와 루돌프를 선택해 새 배송 그룹을 만들어보세요.";

        empty.appendChild(icon);
        empty.appendChild(title);
        empty.appendChild(text);

        container.appendChild(empty);
        return;
    }

    pendingGroups.forEach((g) => {
        const card = document.createElement("div");
        card.className = "group-card";

        const header = document.createElement("div");
        header.className = "group-card-header";

        const titleBox = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = g.group_name || `그룹 #${g.group_id}`;
        const meta = document.createElement("div");
        meta.className = "group-meta";
        meta.textContent = `루돌프: ${findReindeerName(g.reindeer_id)} · 아이 ${g.child_count}명`;

        titleBox.appendChild(title);
        titleBox.appendChild(meta);

        const statusBox = document.createElement("div");
        statusBox.className = "group-status-box";
        statusBox.appendChild(statusBadge(g.status));

        header.appendChild(titleBox);
        header.appendChild(statusBox);

        const footer = document.createElement("div");
        footer.className = "group-card-footer";

        const infoText = document.createElement("span");
        infoText.className = "group-footer-text";
        infoText.textContent = "배송 실행 시 그룹 내 모든 아이에게 선물이 배송됩니다.";

        const btn = document.createElement("button");
        btn.className = "delivery-btn";
        btn.textContent = "이 그룹 배송 실행";
        btn.addEventListener("click", () => handleDeliverGroup(g.group_id));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "삭제";
        deleteBtn.addEventListener("click", () => handleDeleteGroup(g.group_id));

        footer.appendChild(infoText);
        footer.appendChild(btn);
        footer.appendChild(deleteBtn);

        card.appendChild(header);
        card.appendChild(footer);

        container.appendChild(card);
    });
}

function renderGiftStock() {
    const list = document.getElementById("giftStockList");
    if (!list) return;

    list.innerHTML = "";

    if (!gifts.length) {
        const li = document.createElement("li");
        li.className = "empty-text";
        li.textContent = "등록된 선물 재고가 없습니다.";
        list.appendChild(li);
        return;
    }

    // 재고 많은 순으로 정렬
    const sorted = [...gifts].sort(
        (a, b) => b.stock_quantity - a.stock_quantity
    );

    sorted.forEach((g) => {
        const li = document.createElement("li");
        li.className = "simple-list-item";

        const nameSpan = document.createElement("span");
        nameSpan.textContent = g.gift_name;

        const qtySpan = document.createElement("span");
        qtySpan.className = "list-meta";
        qtySpan.textContent = `${g.stock_quantity} 개`;

        if (g.stock_quantity <= 0) {
            qtySpan.classList.add("stock-zero");
        }

        li.appendChild(nameSpan);
        li.appendChild(qtySpan);
        list.appendChild(li);
    });
}

async function fetchInitialData() {
    try {
        setLoading(true);

        const [targetsRes, reindeerRes, groupsRes, regionsRes, giftRes] =
            await Promise.all([
                apiGET("/santa/targets"),      
                apiGET("/reindeer/available"),
                apiGET("/santa/groups?status_filter=PENDING"),
                apiGET("/regions/all"),
                apiGET("/gift/"),            
            ]);

        const targetsWithWishes = await Promise.all(
            targetsRes.map(async (child) => {
                try {
                    const wishRes = await apiGET(`/list-elf/child/${child.child_id}/wishlist`);
                    
                    const wishList = wishRes.wishlist
                        .sort((a, b) => a.priority - b.priority) 
                        .map(w => w.gift_name); 

                    return {
                        ...child,
                        wishes: wishList
                    };
                } catch (e) {
                    console.warn(`아이(${child.child_id}) 소원 조회 실패`, e);
                    return { ...child, wishes: [] };
                }
            })
        );

        allTargets = targetsWithWishes; 
        targets = [...allTargets];
        
        reindeers = reindeerRes;
        pendingGroups = groupsRes;
        regions = regionsRes;
        gifts = giftRes;

        renderRegions();
        renderTargets();
        renderReindeers();
        renderGroups();
        renderGiftStock();

    } catch (err) {
        console.error(err);
        showError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
        setLoading(false);
    }
}

// santa_groups.js

async function handleAddToQueue() {
    if (!santaState.staffId) {
        showError("로그인 정보가 없어 작업을 수행할 수 없습니다.");
        return;
    }

    const checkboxes = document.querySelectorAll(".child-checkbox");
    const selectedIds = Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => Number(cb.value));

    if (!selectedIds.length) {
        showError("배송 그룹에 추가할 아이를 한 명 이상 선택하세요.");
        return;
    }

    const reindeerSelect = document.getElementById("reindeerSelect");
    const reindeerId = Number(reindeerSelect.value);
    if (!reindeerId) {
        showError("배송에 사용할 루돌프를 선택하세요.");
        return;
    }

    // 지역 체크 등 기존 로직 유지
    const selectedTargets = allTargets.filter((t) =>
        selectedIds.includes(t.child_id)
    );
    const regionSet = new Set(selectedTargets.map((t) => t.region_id));

    if (regionSet.size > 1) {
        showError("같은 지역의 아이만 한 배송 그룹에 포함할 수 있습니다.");
        return;
    }

    if (!selectedTargets.length) {
        showError("선택된 아이 정보가 유효하지 않습니다.");
        return;
    }

    // SweetAlert2 사용 
    const result = await Swal.fire({
        title: '배송 그룹 생성',
        text: "선택한 아이들로 새 배송 그룹을 생성할까요?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d64840', // 산타 레드
        cancelButtonColor: '#999',
        confirmButtonText: '네, 생성할게요',
        cancelButtonText: '취소',
        background: '#fffaf6'
    });

    if (!result.isConfirmed) return;

    try {
        setLoading(true);

        const assignments = await apiGET("/santa/assign-gifts");
        const mapByChild = new Map(
            assignments.map((a) => [a.child_id, a.gift_id])
        );

        const pairs = selectedIds
            .map((cid) => ({
                child_id: cid,
                gift_id: mapByChild.get(cid),
            }))
            .filter((p) => p.gift_id != null);

        if (!pairs.length) {
            showToast("선물 재고가 부족하여 그룹을 생성할 수 없습니다.", "warning");
            return;
        }

        const reindeerName = findReindeerName(reindeerId);
        const regionName = selectedTargets[0].region_name || "지역";
        const groupName = `배송 그룹 (${regionName} · ${reindeerName} · ${pairs.length}명)`;

        const groupId = await apiPOST("/santa/groups", 
            {
                group_name: groupName,
                reindeer_id: reindeerId,
            },
            { "x-staff-id": String(santaState.staffId) }
        );

        for (const pair of pairs) {
            await apiPOST(`/santa/groups/${groupId}/items`, {
                child_id: pair.child_id,
                gift_id: pair.gift_id,
            });
        }

        checkboxes.forEach((cb) => (cb.checked = false));

        await fetchInitialData();
        showToast("배송 그룹이 생성되어 대기열에 추가되었습니다.", "success");
    } catch (err) {
        console.error(err);
        showError("배송 그룹 생성 중 오류가 발생했습니다.\n" + err);
    } finally {
        setLoading(false);
    }
}

// santa_groups.js

async function handleDeliverGroup(groupId) {
    const result = await Swal.fire({
        title: '!배송 시작!',
        text: "이 그룹의 선물 배송을 실제로 시작할까요?",
        icon: 'warning', 
        showCancelButton: true,
        confirmButtonColor: '#d64840',
        cancelButtonColor: '#999',
        confirmButtonText: '시작',
        cancelButtonText: '취소',
        background: '#fffaf6'
    });

    if (!result.isConfirmed) return;

    if (!santaState.staffId) {
        showError("로그인 정보가 확인되지 않습니다.");
        return;
    }

    try {
        setLoading(true);
        const res = await apiPOST(
            `/santa/groups/${groupId}/deliver`,
            {}, // POST body (내용 없음)
            { "x-staff-id": String(santaState.staffId) } // Headers
        );
        
        // 성공 메시지도 SweetAlert로 예쁘게
        await Swal.fire({
            title: '배송 완료!',
            text: `총 ${res.delivered_count}개의 선물이 전달되었습니다.`,
            icon: 'success',
            confirmButtonColor: '#d64840'
        });

        await fetchInitialData();
    } catch (err) {
        console.error(err);
        showError("배송 실행 중 오류가 발생했습니다.\n" + err);
        await fetchInitialData();
    } finally {
        setLoading(false);
    }
}

async function handleDeleteGroup(groupId) {
    const result = await Swal.fire({
        title: '그룹 삭제',
        html: "정말로 이 배송 그룹을 삭제할까요?<br><small>(대기중 또는 실패한 그룹만 삭제됩니다)</small>",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // 삭제는 강렬한 빨강
        cancelButtonColor: '#999',
        confirmButtonText: '네, 삭제합니다',
        cancelButtonText: '취소',
        background: '#fffaf6'
    });

    if (!result.isConfirmed) return;

    try {
        setLoading(true);
        await apiDELETE(`/santa/groups/${groupId}`);
        
        showToast("배송 그룹이 삭제되었습니다.", "success");
        await fetchInitialData();
    } catch (err) {
        console.error(err);
        showError("배송 그룹 삭제 중 오류가 발생했습니다.\n" + err);
    } finally {
        setLoading(false);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const addBtn = document.getElementById("addToQueueBtn");
    if (addBtn) addBtn.addEventListener("click", handleAddToQueue);

    const regionSelect = document.getElementById("regionFilter");
    if (regionSelect) regionSelect.addEventListener("change", applyRegionFilter);

    fetchInitialData();
});