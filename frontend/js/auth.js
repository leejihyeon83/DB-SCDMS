// 현재 로그인한 유저 정보 가져오기
function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("currentUser 파싱 실패:", e);
    return null;
  }
}

// 특정 Role만 허용하는 간단한 가드
// 사용 예: const user = requireRole(["ListElf"]);
function requireRole(allowedRoles) {
  const user = getCurrentUser();

  if (!user) {
    alert("로그인이 필요합니다.");
    window.location.href = "index.html";
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    alert("접근 권한이 없습니다. (" + user.role + ")");
    window.location.href = "index.html";
    return null;
  }

  return user;
}

// auth.js 파일 맨 아래에 추가
function getStaffId() {
  const user = getCurrentUser(); 
  return user ? user.staff_id : null; 
}

// 로그아웃
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "/";
}
