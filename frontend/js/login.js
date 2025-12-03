// ===========================
// 설정: 백엔드 API 기본 URL
// ===========================
const API_BASE_URL = "http://127.0.0.1:8000"; // FastAPI 서버 주소에 맞게 수정

// 에러 메시지 표시/숨기기
function showError(message) {
  const box = document.getElementById("error-message");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
}

function hideError() {
  const box = document.getElementById("error-message");
  if (!box) return;
  box.textContent = "";
  box.style.display = "none";
}

// 로그인 정보 저장
function saveLoginInfo(user) {
  // 비밀번호는 저장 X
  localStorage.setItem("currentUser", JSON.stringify(user));
}

// Role별 대시보드 분기
function redirectByRole(role) {
  switch (role) {
    case "ListElf":
      window.location.href = "list_elf.html";
      break;
    case "GiftElf":
      window.location.href = "gift_elf_materials.html";
      break;
    case "Keeper":
      window.location.href = "reindeer_status.html";
      break;
    case "Santa":
      window.location.href = "santa.html";
      break;
    default:
      showError("알 수 없는 권한(Role)입니다: " + role);
  }
}

// 메인: 로그인 처리
async function handleLogin(event) {
  event.preventDefault();
  hideError();

  const form = event.target;
  const username = form.username.value.trim();
  const password = form.password.value;

  if (!username || !password) {
    showError("사용자명과 비밀번호를 모두 입력해 주세요.");
    return;
  }

  const submitBtn = form.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "입장 처리 중...";

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      let message = "로그인에 실패했습니다.";
      try {
        const err = await res.json();
        if (err && err.detail) {
          message = err.detail;
        }
      } catch (_) {
        // ignore
      }
      showError(message);
      return;
    }

    const data = await res.json();
    // data: { staff_id, username, name, role }

    saveLoginInfo(data);
    redirectByRole(data.role);
  } catch (error) {
    console.error("로그인 요청 오류:", error);
    showError("서버와 통신 중 오류가 발생했습니다.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// 이미 로그인 되어 있으면 자동 분기 (선택 기능)
function tryAutoRedirect() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return;

  try {
    const user = JSON.parse(raw);
    if (user && user.role) {
      redirectByRole(user.role);
    }
  } catch (e) {
    console.warn("currentUser 파싱 실패:", e);
  }
}

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", handleLogin);
  }

  tryAutoRedirect();
});
