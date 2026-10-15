/**
 * Zenith '26 Admin Dashboard — frontend/js/admin.js
 * Fetches live statistics (GET /api/stats), event utilization sorted descending
 * (GET /api/events), and filterable student registrations (GET /api/registrations).
 * Also supports Stretch Goals: POST /api/events and DELETE /api/registrations/{id}.
 */

// DOM Elements — Global & Stats
const dashboardError = document.getElementById("dashboard-error");
const dashboardErrorText = document.getElementById("dashboard-error-text");
const retryDashboardBtn = document.getElementById("retry-dashboard-btn");
const refreshDashboardBtn = document.getElementById("refresh-dashboard-btn");
const statsLoading = document.getElementById("stats-loading");

const statTotalEvents = document.getElementById("stat-total-events");
const statTotalRegistrations = document.getElementById("stat-total-registrations");
const statTotalCapacitySub = document.getElementById("stat-total-capacity-sub");
const statUtilizationPct = document.getElementById("stat-utilization-pct");
const statUtilizationBar = document.getElementById("stat-utilization-bar");
const statUpcomingEvents = document.getElementById("stat-upcoming-events");
const categoryBreakdownContainer = document.getElementById("category-breakdown-container");

// Tabs
const tabEventsBtn = document.getElementById("tab-events-btn");
const tabRegistrationsBtn = document.getElementById("tab-registrations-btn");
const tabRegCount = document.getElementById("tab-reg-count");
const panelEvents = document.getElementById("panel-events");
const panelRegistrations = document.getElementById("panel-registrations");

// Events Table Elements
const adminEventsLoading = document.getElementById("admin-events-loading");
const adminEventsEmpty = document.getElementById("admin-events-empty");
const adminEventsTbody = document.getElementById("admin-events-tbody");

// Registrations Table Elements
const regEventFilter = document.getElementById("reg-event-filter");
const adminRegsLoading = document.getElementById("admin-regs-loading");
const adminRegsEmpty = document.getElementById("admin-regs-empty");
const adminRegsTableWrap = document.getElementById("admin-regs-table-wrap");
const adminRegsTbody = document.getElementById("admin-regs-tbody");

// Add Event Modal Elements (Stretch Goal 1)
const openAddEventModalBtn = document.getElementById("open-add-event-modal-btn");
const closeAddEventModalBtn = document.getElementById("close-add-event-modal-btn");
const cancelAddEventBtn = document.getElementById("cancel-add-event-btn");
const addEventModal = document.getElementById("add-event-modal");
const addEventForm = document.getElementById("add-event-form");
const addEventError = document.getElementById("add-event-error");
const submitAddEventBtn = document.getElementById("submit-add-event-btn");

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCategoryMeta(category) {
  const map = {
    Technical: {
      icon: "💻",
      badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      bar: "bg-sky-500",
    },
    Cultural: {
      icon: "🎭",
      badge: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
      bar: "bg-fuchsia-500",
    },
    Sports: {
      icon: "⚽",
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      bar: "bg-emerald-500",
    },
    Gaming: {
      icon: "🎮",
      badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      bar: "bg-amber-500",
    },
    Workshop: {
      icon: "🛠️",
      badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
      bar: "bg-violet-500",
    },
  };
  return (
    map[category] || {
      icon: "✨",
      badge: "bg-slate-700/40 text-slate-300 border-slate-600",
      bar: "bg-violet-500",
    }
  );
}

/**
 * 1. Fetch GET /api/stats and update stat cards + category breakdown
 */
async function fetchStats() {
  statsLoading.classList.remove("hidden");
  dashboardError.classList.add("hidden");

  try {
    const response = await fetch("/api/stats");
    if (!response.ok) {
      throw new Error(`GET /api/stats returned HTTP ${response.status}`);
    }
    const stats = await response.json();
    statsLoading.classList.add("hidden");

    statTotalEvents.textContent = stats.total_events;
    statTotalRegistrations.textContent = stats.total_registrations;
    statTotalCapacitySub.textContent = `Out of ${stats.total_capacity} total seat capacity`;
    statUtilizationPct.textContent = `${Number(stats.overall_utilization_pct).toFixed(1)}%`;
    statUtilizationBar.style.width = `${Math.min(100, Number(stats.overall_utilization_pct))}%`;
    statUpcomingEvents.textContent = stats.upcoming_events_count;
    tabRegCount.textContent = stats.total_registrations;

    renderCategoryBreakdown(stats.events_by_category || {}, stats.total_events || 1);
  } catch (err) {
    statsLoading.classList.add("hidden");
    dashboardError.classList.remove("hidden");
    dashboardErrorText.textContent =
      err.message || "Could not connect to the FastAPI backend.";
  }
}

/**
 * 2. Render category breakdown cards & bars
 */
function renderCategoryBreakdown(eventsByCategory, totalEvents) {
  categoryBreakdownContainer.innerHTML = "";
  const entries = Object.entries(eventsByCategory);

  if (entries.length === 0) {
    categoryBreakdownContainer.innerHTML = `
      <div class="col-span-full text-xs text-slate-400 py-4 text-center">
        No category statistics available.
      </div>
    `;
    return;
  }

  entries.forEach(([category, count]) => {
    const meta = getCategoryMeta(category);
    const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;

    const item = document.createElement("div");
    item.className =
      "bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between gap-2";
    item.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.badge}">
          ${meta.icon} ${escapeHtml(category)}
        </span>
        <span class="text-lg font-black text-white">${count}</span>
      </div>
      <div>
        <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
          <div class="h-full ${meta.bar} rounded-full" style="width: ${pct}%"></div>
        </div>
        <p class="text-[11px] text-slate-400 mt-1">${pct}% of fest schedule</p>
      </div>
    `;
    categoryBreakdownContainer.appendChild(item);
  });
}

/**
 * 3. Fetch GET /api/events, compute utilization %, sort descending, and render table
 */
async function fetchEventsTable() {
  adminEventsLoading.classList.remove("hidden");
  adminEventsEmpty.classList.add("hidden");
  adminEventsTbody.innerHTML = "";

  try {
    const response = await fetch("/api/events");
    if (!response.ok) {
      throw new Error(`GET /api/events returned HTTP ${response.status}`);
    }
    const events = await response.json();
    adminEventsLoading.classList.add("hidden");

    if (!Array.isArray(events) || events.length === 0) {
      adminEventsEmpty.classList.remove("hidden");
      return;
    }

    // Populate the filter dropdown in Registrations tab while preserving current selection
    const currentFilterVal = regEventFilter.value;
    regEventFilter.innerHTML = `<option value="">All Events (${events.length})</option>`;
    events.forEach((ev) => {
      const opt = document.createElement("option");
      opt.value = String(ev.id);
      opt.textContent = `${ev.icon || "✨"} ${ev.title}`;
      regEventFilter.appendChild(opt);
    });
    if (currentFilterVal) {
      regEventFilter.value = currentFilterVal;
    }

    // Compute registered count & utilization percentage for each event
    const enriched = events.map((ev) => {
      const capacity = Number(ev.capacity) || 0;
      const available = Number(ev.available_seats) || 0;
      const registered = Math.max(0, capacity - available);
      const utilizationPct = capacity > 0 ? (registered / capacity) * 100 : 0;
      return {
        ...ev,
        registered,
        utilizationPct,
      };
    });

    // Sort by utilization percentage descending by default (Step 8.3)
    enriched.sort((a, b) => {
      if (b.utilizationPct !== a.utilizationPct) {
        return b.utilizationPct - a.utilizationPct;
      }
      return b.registered - a.registered;
    });

    enriched.forEach((ev) => {
      const isOver90 = ev.utilizationPct > 90 || (ev.capacity > 0 && ev.available_seats === 0);
      const isFull = ev.capacity > 0 && ev.available_seats <= 0;
      const meta = getCategoryMeta(ev.category);
      const pctFormatted = `${ev.utilizationPct.toFixed(1)}%`;

      const tr = document.createElement("tr");
      // Highlight any event over 90% capacity in a warning color (Step 8.4)
      tr.className = isOver90
        ? "bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-400 transition"
        : "hover:bg-slate-800/50 transition";

      const statusBadge = isFull
        ? `<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">FULL</span>`
        : isOver90
        ? `<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">⚠️ &gt;90% High Demand</span>`
        : "";

      const barColor = isFull
        ? "bg-rose-500"
        : isOver90
        ? "bg-amber-400"
        : ev.utilizationPct >= 50
        ? "bg-violet-500"
        : "bg-emerald-500";

      tr.innerHTML = `
        <td class="py-3.5 px-4 sm:px-6 font-bold text-white">
          <div class="flex items-center gap-2.5">
            <span class="text-lg">${escapeHtml(ev.icon || "✨")}</span>
            <div>
              <span>${escapeHtml(ev.title)}</span>
              ${statusBadge}
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4">
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.badge}">
            ${escapeHtml(ev.category)}
          </span>
        </td>
        <td class="py-3.5 px-4 text-slate-300 whitespace-nowrap">
          ${escapeHtml(ev.event_date)} <span class="text-slate-500">•</span> ${escapeHtml(ev.event_time)}
        </td>
        <td class="py-3.5 px-4 text-slate-300">
          ${escapeHtml(ev.venue)}
        </td>
        <td class="py-3.5 px-4 text-right font-semibold whitespace-nowrap">
          <button
            type="button"
            data-filter-event-id="${ev.id}"
            title="View registrations for this event"
            class="view-event-regs-link text-violet-300 hover:text-violet-200 underline decoration-dotted underline-offset-4"
          >
            ${ev.registered} / ${ev.capacity}
          </button>
        </td>
        <td class="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-2.5">
            <div class="w-20 h-2 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
              <div class="h-full ${barColor} rounded-full" style="width: ${Math.min(100, ev.utilizationPct)}%"></div>
            </div>
            <span class="font-extrabold ${
              isOver90 ? "text-amber-300" : "text-slate-100"
            } w-12 text-right inline-block">
              ${pctFormatted}
            </span>
          </div>
        </td>
      `;

      const filterLink = tr.querySelector(".view-event-regs-link");
      filterLink.addEventListener("click", () => {
        regEventFilter.value = String(ev.id);
        switchTab("registrations");
        fetchRegistrations(String(ev.id));
      });

      adminEventsTbody.appendChild(tr);
    });
  } catch (err) {
    adminEventsLoading.classList.add("hidden");
    dashboardError.classList.remove("hidden");
    dashboardErrorText.textContent =
      err.message || "Failed to load events table from server.";
  }
}

/**
 * 4. Fetch GET /api/registrations (optionally filtered by event_id)
 */
async function fetchRegistrations(eventId = "") {
  adminRegsLoading.classList.remove("hidden");
  adminRegsEmpty.classList.add("hidden");
  adminRegsTableWrap.classList.add("hidden");
  adminRegsTbody.innerHTML = "";

  const url = eventId
    ? `/api/registrations?event_id=${encodeURIComponent(eventId)}`
    : "/api/registrations";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GET /api/registrations returned HTTP ${response.status}`);
    }
    const registrations = await response.json();
    adminRegsLoading.classList.add("hidden");

    if (!Array.isArray(registrations) || registrations.length === 0) {
      adminRegsEmpty.classList.remove("hidden");
      return;
    }

    adminRegsTableWrap.classList.remove("hidden");

    registrations.forEach((reg) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-800/50 transition";

      tr.innerHTML = `
        <td class="py-3.5 px-4 sm:px-6 font-mono text-xs text-slate-400">#${reg.id}</td>
        <td class="py-3.5 px-4 font-bold text-white">${escapeHtml(reg.student_name)}</td>
        <td class="py-3.5 px-4 font-mono text-xs text-slate-300">${escapeHtml(reg.roll_number)}</td>
        <td class="py-3.5 px-4 text-slate-300">
          <a href="mailto:${escapeHtml(reg.email)}" class="hover:text-violet-300 underline decoration-slate-700">
            ${escapeHtml(reg.email)}
          </a>
        </td>
        <td class="py-3.5 px-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
            ${escapeHtml(reg.event_title)}
          </span>
        </td>
        <td class="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">${escapeHtml(reg.registered_at)}</td>
        <td class="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
          <button
            type="button"
            data-reg-id="${reg.id}"
            data-student-name="${escapeHtml(reg.student_name)}"
            data-event-title="${escapeHtml(reg.event_title)}"
            class="cancel-reg-btn px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 active:scale-95 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition"
          >
            Cancel
          </button>
        </td>
      `;

      const cancelBtn = tr.querySelector(".cancel-reg-btn");
      cancelBtn.addEventListener("click", () =>
        handleCancelRegistration(reg.id, reg.student_name, reg.event_title)
      );

      adminRegsTbody.appendChild(tr);
    });
  } catch (err) {
    adminRegsLoading.classList.add("hidden");
    dashboardError.classList.remove("hidden");
    dashboardErrorText.textContent =
      err.message || "Failed to load student registrations from server.";
  }
}

/**
 * Stretch Goal 2: Cancel a registration via DELETE /api/registrations/{registration_id}
 */
async function handleCancelRegistration(registrationId, studentName, eventTitle) {
  const confirmed = window.confirm(
    `Cancel registration #${registrationId} for ${studentName} in "${eventTitle}"?\n\nThis will immediately free up 1 seat.`
  );
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/registrations/${registrationId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.detail || "Could not cancel registration.");
      return;
    }
    // Refresh all live data so available seats & stats update immediately
    await loadAllDashboardData();
  } catch (err) {
    window.alert("Network error while attempting to cancel registration.");
  }
}

/**
 * Switch between Events Utilization tab and Raw Registrations tab
 */
function switchTab(tabName) {
  if (tabName === "registrations") {
    panelEvents.classList.add("hidden");
    panelRegistrations.classList.remove("hidden");
    tabRegistrationsBtn.className =
      "px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 border-violet-500 text-violet-300 transition";
    tabEventsBtn.className =
      "px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition";
  } else {
    panelRegistrations.classList.add("hidden");
    panelEvents.classList.remove("hidden");
    tabEventsBtn.className =
      "px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 border-violet-500 text-violet-300 transition";
    tabRegistrationsBtn.className =
      "px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition";
  }
}

tabEventsBtn.addEventListener("click", () => switchTab("events"));
tabRegistrationsBtn.addEventListener("click", () => {
  switchTab("registrations");
  fetchRegistrations(regEventFilter.value);
});

regEventFilter.addEventListener("change", (e) => {
  fetchRegistrations(e.target.value);
});

/**
 * Stretch Goal 1: Add New Event Modal handlers (POST /api/events)
 */
function openAddEventModal() {
  addEventForm.reset();
  addEventError.classList.add("hidden");
  addEventError.textContent = "";
  addEventModal.classList.remove("hidden");
  addEventModal.classList.add("flex");
}

function closeAddEventModal() {
  addEventModal.classList.add("hidden");
  addEventModal.classList.remove("flex");
}

openAddEventModalBtn.addEventListener("click", openAddEventModal);
closeAddEventModalBtn.addEventListener("click", closeAddEventModal);
cancelAddEventBtn.addEventListener("click", closeAddEventModal);
addEventModal.addEventListener("click", (e) => {
  if (e.target === addEventModal) closeAddEventModal();
});

addEventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addEventError.classList.add("hidden");

  const title = document.getElementById("new-event-title").value.trim();
  const icon = document.getElementById("new-event-icon").value.trim() || "✨";
  const category = document.getElementById("new-event-category").value.trim();
  const venue = document.getElementById("new-event-venue").value.trim();
  const eventDate = document.getElementById("new-event-date").value.trim();
  const eventTime = document.getElementById("new-event-time").value.trim();
  const capacityVal = Number(document.getElementById("new-event-capacity").value);
  const feeVal = Number(document.getElementById("new-event-fee").value || 0);
  const description = document.getElementById("new-event-description").value.trim();

  if (!title || !category || !venue || !eventDate || !eventTime || !capacityVal) {
    addEventError.textContent = "Please fill in all required fields and provide a seat capacity > 0.";
    addEventError.classList.remove("hidden");
    return;
  }

  submitAddEventBtn.disabled = true;
  submitAddEventBtn.textContent = "Creating...";

  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        description,
        event_date: eventDate,
        event_time: eventTime,
        venue,
        capacity: capacityVal,
        fee: feeVal,
        icon,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      addEventError.textContent = data.detail || `Failed to create event (HTTP ${response.status})`;
      addEventError.classList.remove("hidden");
      submitAddEventBtn.disabled = false;
      submitAddEventBtn.textContent = "Create Event";
      return;
    }

    submitAddEventBtn.disabled = false;
    submitAddEventBtn.textContent = "Create Event";
    closeAddEventModal();
    await loadAllDashboardData();
  } catch (err) {
    addEventError.textContent = err.message || "Network error while creating event.";
    addEventError.classList.remove("hidden");
    submitAddEventBtn.disabled = false;
    submitAddEventBtn.textContent = "Create Event";
  }
});

/**
 * Load all dashboard sections concurrently
 */
async function loadAllDashboardData() {
  await Promise.all([
    fetchStats(),
    fetchEventsTable(),
    fetchRegistrations(regEventFilter.value),
  ]);
}

refreshDashboardBtn.addEventListener("click", loadAllDashboardData);
retryDashboardBtn.addEventListener("click", loadAllDashboardData);

document.addEventListener("DOMContentLoaded", () => {
  loadAllDashboardData();
});
