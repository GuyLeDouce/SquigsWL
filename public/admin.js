const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginMessage = document.getElementById("loginMessage");
const adminMessage = document.getElementById("adminMessage");
const submissionList = document.getElementById("submissionList");
const approvedWallets = document.getElementById("approvedWallets");
const refreshButton = document.getElementById("refreshButton");
const copyWalletsButton = document.getElementById("copyWalletsButton");
const exportLinks = Array.from(document.querySelectorAll(".link-button"));

let adminPassword = window.localStorage.getItem("squigs_admin_password") || "";

function setAdminMessage(message, isSuccess = false) {
  adminMessage.textContent = message;
  adminMessage.classList.toggle("success", isSuccess);
}

function setLoginMessage(message) {
  loginMessage.textContent = message;
}

async function login(password) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Login failed");
  }

  adminPassword = password;
  window.localStorage.setItem("squigs_admin_password", password);
  updateExportLinks();
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function adminFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword,
      ...(options.headers || {})
    }
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function updateExportLinks() {
  exportLinks.forEach((link) => {
    const base = link.getAttribute("href").split("?")[0];
    link.setAttribute("href", `${base}?password=${encodeURIComponent(adminPassword)}`);
  });
}

function field(label, value) {
  return `
    <div class="submission-field">
      <strong>${escapeHtml(label)}</strong>
      <div>${escapeHtml(value || "")}</div>
    </div>
  `;
}

function renderSubmissions(submissions) {
  if (submissions.length === 0) {
    submissionList.innerHTML = `<div class="admin-card compact">No submissions yet.</div>`;
    return;
  }

  submissionList.innerHTML = submissions
    .map(
      (submission) => `
        <article class="submission-card" data-id="${submission.id}">
          <div class="submission-header">
            <div>
              <h3 class="submission-title">${escapeHtml(submission.wallet_address)}</h3>
              <p class="submission-meta">Submitted ${escapeHtml(formatDate(submission.created_at))} | Updated ${escapeHtml(formatDate(submission.updated_at))}</p>
            </div>
            <span class="submission-meta">Status: ${escapeHtml(submission.status)}</span>
          </div>
          <div class="submission-grid">
            ${field("Favorite Collection", submission.favorite_collection)}
            ${field("Why It Stands Out", submission.favorite_collection_reason)}
            ${field("Discord Handle", submission.discord_handle)}
            ${field("Discord Duration", submission.discord_duration)}
            ${field("Joined Discord", submission.joined_discord)}
            ${field("Biggest NFT Count", submission.biggest_collection_count)}
            ${field("Biggest NFT Collection", submission.biggest_collection_name)}
            ${field("NFT Uniqueness", submission.nft_uniqueness)}
            ${field("Contribution", submission.squigs_contribution)}
            ${field("Ugly Behavior", submission.ugly_behavior)}
            ${field("Stay Without WL", submission.participate_without_wl)}
            ${field("Following on X", submission.follows_x)}
            ${field("X Handle", submission.x_handle)}
          </div>
          <div class="submission-admin">
            <select class="select-input status-select">
              <option value="pending" ${submission.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="approved" ${submission.status === "approved" ? "selected" : ""}>Approved</option>
              <option value="rejected" ${submission.status === "rejected" ? "selected" : ""}>Rejected</option>
            </select>
            <input class="text-input admin-notes" type="text" value="${escapeHtml(submission.admin_notes || "")}" placeholder="Admin notes" />
            <button class="action-button primary save-button" type="button">Save Review</button>
          </div>
        </article>
      `
    )
    .join("");

  Array.from(document.querySelectorAll(".save-button")).forEach((button) => {
    button.addEventListener("click", async (event) => {
      const card = event.target.closest(".submission-card");
      const id = card.dataset.id;
      const status = card.querySelector(".status-select").value;
      const adminNotes = card.querySelector(".admin-notes").value;
      setAdminMessage("Saving review...");

      try {
        const response = await adminFetch(`/api/admin/submissions/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status, adminNotes })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Update failed");
        }

        setAdminMessage("Review saved.", true);
        await loadDashboard();
      } catch (error) {
        setAdminMessage(error.message);
      }
    });
  });
}

async function loadDashboard() {
  const response = await adminFetch("/api/admin/submissions", { method: "GET" });

  if (response.status === 401) {
    window.localStorage.removeItem("squigs_admin_password");
    adminPassword = "";
    dashboard.classList.add("hidden");
    loginCard.classList.remove("hidden");
    throw new Error("Your admin session is no longer valid.");
  }

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Unable to load submissions");
  }

  approvedWallets.value = result.approvedWallets.join("\n");
  renderSubmissions(result.submissions);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginMessage("Checking password...");

  try {
    await login(passwordInput.value);
    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
    setLoginMessage("");
    await loadDashboard();
  } catch (error) {
    setLoginMessage(error.message);
  }
});

refreshButton.addEventListener("click", async () => {
  try {
    setAdminMessage("Refreshing...");
    await loadDashboard();
    setAdminMessage("Dashboard refreshed.", true);
  } catch (error) {
    setAdminMessage(error.message);
  }
});

copyWalletsButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(approvedWallets.value);
    setAdminMessage("Approved wallets copied.", true);
  } catch (error) {
    setAdminMessage("Clipboard copy failed. Open the TXT export instead.");
  }
});

if (adminPassword) {
  updateExportLinks();
  loginCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadDashboard().catch((error) => {
    loginCard.classList.remove("hidden");
    dashboard.classList.add("hidden");
    setLoginMessage(error.message);
  });
}
