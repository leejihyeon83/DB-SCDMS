// FastAPI 기본 로컬 서버 주소
// 산타 공통 API
const API_BASE = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // ★ 나중에 진짜 로그아웃 만들면 여기서 토큰 삭제 추가하면 됨
            window.location.href = "/index.html";  
        });
    }
});


async function apiGET(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `GET ${path} failed (${res.status})`);
    }
    return res.json();
}

async function apiPOST(path, body = {}) {
    const res = await fetch(API_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `POST ${path} failed (${res.status})`);
    }
    return res.json();
}
