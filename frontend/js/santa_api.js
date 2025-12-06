const API_BASE = "http://127.0.0.1:8000";

// 로그인한 산타 정보
const santaState = {
    staffId: null,
    username: null,
    role: null
};

function initUserInfo() {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return;

    try {
        const user = JSON.parse(raw);
        
        // 전역 상태 업데이트
        if (user && user.staff_id) {
            santaState.staffId = user.staff_id;
            santaState.username = user.username;
            santaState.role = user.role;
        }

        const nameEl = document.getElementById("header-user-name");
        const roleEl = document.getElementById("header-user-role");

        if (nameEl) nameEl.textContent = `${user.name || "산타"} 님`;
        if (roleEl) roleEl.textContent = user.role || "Santa";

    } catch (e) {
        console.warn("currentUser 파싱 실패:", e);
    }
}

// 로그아웃 버튼 초기화
function initLogout() {
  const btn = document.getElementById("btn-logout");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      if (!confirm("정말 로그아웃 하시겠습니까?")) {
        return; 
      }

      localStorage.removeItem("currentUser");
      window.location.href = "/index.html"; 
    });
  }
}

async function apiRequest(path, options = {}) {
    const headers = options.headers || {};
    
    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    // 사용자를 식별하기 위해 헤더 사용
    if (santaState.staffId) {
        headers["x-staff-id"] = String(santaState.staffId);
    }

    const res = await fetch(API_BASE + path, { ...options, headers });
    
    // 204 처리
    if (res.status === 204) return true;

    const text = await res.text();
    if (!res.ok) {
        try {
            const errJson = JSON.parse(text);
            throw new Error(errJson.detail || errJson.message || `API Error (${res.status})`);
        } catch (e) {
            throw new Error(text || `Request failed (${res.status})`);
        }
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
}

async function apiGET(path) {
    return apiRequest(path, { method: "GET" });
}

async function apiPOST(path, body = {}) {
    return apiRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

async function apiDELETE(path) {
    return apiRequest(path, { method: "DELETE" });
}

// 초기화 실행
document.addEventListener("DOMContentLoaded", () => {
    initUserInfo();
    initLogout();
});