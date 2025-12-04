const API_BASE = "http://127.0.0.1:8000";

let currentStaffId = null;

// 로그인 성공 후 staff_id 저장하는 함수
export function setStaffId(id) {
  currentStaffId = String(id);
  localStorage.setItem("staffId", currentStaffId);
}

// 페이지 로드 시 이전에 로그인한 staff_id 복원
export function initStaffId() {
  const saved = localStorage.getItem("staffId");
  if (saved) {
    currentStaffId = saved;
  }
}

// 공통 GET 함수
export async function apiGet(path) {
  if (!currentStaffId) {
    throw new Error("Missing staff ID. Please login again.");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "x-staff-id": String(currentStaffId), // 없으면 빈 문자열
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}
