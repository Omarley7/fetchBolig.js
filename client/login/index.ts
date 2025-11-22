// Login modal logic
async function showLoginModal(forceReload: boolean = false) {
  const modal = document.getElementById("login-modal");
  const content = document.getElementById("login-modal-content");
  if (!modal || !content) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (forceReload || !content.querySelector("form")) {
    const res = await fetch("/login");
    content.innerHTML = await res.text();
    attachLoginHandler();
  }
}

function hideLoginModal() {
  const modal = document.getElementById("login-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

async function attemptLogin(email: string, password: string): Promise<boolean> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success;
}

function attachLoginHandler() {
  const form = document.getElementById("login-form") as HTMLFormElement | null;
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.getElementById("login-email") as HTMLInputElement).value;
    const password = (document.getElementById("login-password") as HTMLInputElement).value;
    const errorEl = document.getElementById("login-error");
    if (errorEl) errorEl.textContent = "";

    form.querySelectorAll("input,button").forEach((el) => (el as HTMLInputElement).disabled = true);
    try {
      const ok = await attemptLogin(email, password);
      if (ok) {
        hideLoginModal();
        // After login, trigger update
        if (window && (window as any).updateAll) {
          (window as any).updateAll();
        }
      } else {
        if (errorEl) errorEl.textContent = "Login failed";
      }
    } catch (err: any) {
      if (errorEl) errorEl.textContent = err.message || "Error";
    } finally {
      form.querySelectorAll("input,button").forEach((el) => (el as HTMLInputElement).disabled = false);
    }
  });
}

// Expose globally
;(window as any).showLoginModal = showLoginModal;
;(window as any).hideLoginModal = hideLoginModal;

export {};
