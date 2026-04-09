const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginMessage = document.getElementById("loginMessage");
const adminMessage = document.getElementById("adminMessage");
const submissionTableBody = document.getElementById("submissionTableBody");
const approvedWallets = document.getElementById("approvedWallets");
const refreshButton = document.getElementById("refreshButton");
const copyWalletsButton = document.getElementById("copyWalletsButton");
const exportLinks = Array.from(document.querySelectorAll(".link-button"));
const storageSummary = document.getElementById("storageSummary");

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
  return `<div class="cell-text" title="${escapeHtml(value || "")}">${escapeHtml(value || "")}</div>`;
}

function renderSubmissions(submissions) {
  if (submissions.length === 0) {
    submissionTableBody.innerHTML = `<tr><td colspan="16">No submissions yet.</td></tr>`;
    return;
  }

  submissionTableBody.innerHTML = submissions
    .map(
      (submission) => `
        <tr data-id="${submission.id}">
          <td class="cell-id">${submission.id}</td>
          <td class="cell-short">${escapeHtml(formatDate(submission.created_at))}</td>
          <td class="cell-text">${escapeHtml(submission.wallet_address)}</td>
          <td class="cell-text">${escapeHtml(submission.discord_handle)}<br>${escapeHtml(submission.discord_duration)}</td>
          <td class="cell-text">${escapeHtml(submission.follows_x)}${submission.x_handle ? `<br>${escapeHtml(submission.x_handle)}` : ""}</td>
          <td>${field("Favorite Collection", submission.favorite_collection)}</td>
          <td>${field("Why It Stands Out", submission.favorite_collection_reason)}</td>
          <td class="cell-short">${escapeHtml(submission.joined_discord)}</td>
          <td class="cell-text">${escapeHtml(submission.biggest_collection_count)}<br>${escapeHtml(submission.biggest_collection_name)}</td>
          <td>${field("NFT Uniqueness", submission.nft_uniqueness)}</td>
          <td>${field("Contribution", submission.squigs_contribution)}</td>
          <td>${field("Ugly Behavior", submission.ugly_behavior)}</td>
          <td class="cell-short">${escapeHtml(submission.participate_without_wl)}</td>
          <td>
            <select class="select-input table-select status-select">
              <option value="pending" ${submission.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="approved" ${submission.status === "approved" ? "selected" : ""}>Approved</option>
              <option value="rejected" ${submission.status === "rejected" ? "selected" : ""}>Rejected</option>
            </select>
          </td>
          <td>
            <input class="text-input table-input admin-notes" type="text" value="${escapeHtml(submission.admin_notes || "")}" placeholder="Admin notes" />
          </td>
          <td>
            <button class="action-button primary table-save save-button" type="button">Save</button>
          </td>
        </tr>
      `
    )
    .join("");

  Array.from(document.querySelectorAll(".save-button")).forEach((button) => {
    button.addEventListener("click", async (event) => {
      const row = event.target.closest("tr");
      const id = row.dataset.id;
      const status = row.querySelector(".status-select").value;
      const adminNotes = row.querySelector(".admin-notes").value;
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
  storageSummary.textContent = `Submissions currently load from the server data store. CSV and approved wallet exports update immediately. Total submissions: ${result.submissions.length}.`;
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
