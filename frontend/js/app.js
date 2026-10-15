/**
 * Zenith '26 Student Event Portal — frontend/js/app.js
 * Handles fetching events with server-side query params, rendering cards,
 * viewing event details, and submitting student registrations.
 */

const state = {
  selectedCategory: "All",
  searchQuery: "",
  activeEvent: null,
  closeTimer: null,
};

// DOM Elements
const eventsGrid = document.getElementById("events-grid");
const eventsLoading = document.getElementById("events-loading");
const eventsError = document.getElementById("events-error");
const eventsErrorMessage = document.getElementById("events-error-message");
const eventsEmpty = document.getElementById("events-empty");
const eventsCountLabel = document.getElementById("events-count-label");
const clearFiltersBtn = document.getElementById("clear-filters-btn");
const retryEventsBtn = document.getElementById("retry-events-btn");
const emptyResetBtn = document.getElementById("empty-reset-btn");
const searchInput = document.getElementById("search-input");
const categoryButtons = document.querySelectorAll(".category-btn");

// Modal DOM Elements
const eventModal = document.getElementById("event-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelModalBtn = document.getElementById("cancel-modal-btn");
const modalLoading = document.getElementById("modal-loading");
const modalContentBody = document.getElementById("modal-content-body");
const modalEventIcon = document.getElementById("modal-event-icon");
const modalEventCategory = document.getElementById("modal-event-category");
const modalEventSeatBadge = document.getElementById("modal-event-seat-badge");
const modalEventTitle = document.getElementById("modal-event-title");
const modalEventDescription = document.getElementById("modal-event-description");
const modalEventDatetime = document.getElementById("modal-event-datetime");
const modalEventVenue = document.getElementById("modal-event-venue");
const modalEventFee = document.getElementById("modal-event-fee");
const modalEventSeats = document.getElementById("modal-event-seats");

// Registration Form Elements
const registrationForm = document.getElementById("registration-form");
const regEventIdInput = document.getElementById("reg-event-id");
const regStudentName = document.getElementById("reg-student-name");
const regRollNumber = document.getElementById("reg-roll-number");
const regEmail = document.getElementById("reg-email");
const regPhone = document.getElementById("reg-phone");
const regFormError = document.getElementById("reg-form-error");
const regFormErrorText = document.getElementById("reg-form-error-text");
const regFormSuccess = document.getElementById("reg-form-success");
const regFormSuccessText = document.getElementById("reg-form-success-text");
const submitRegistrationBtn = document.getElementById("submit-registration-btn");

/**
 * Category badge color helper
 */
function getCategoryBadgeClasses(category) {
  const map = {
    Technical: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    Cultural: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    Sports: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Gaming: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Workshop: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  };
  return map[category] || "bg-slate-700/40 text-slate-300 border-slate-600";
}

/**
 * Escape HTML to prevent XSS when rendering dynamic strings
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format YYYY-MM-DD nicely
 */
function formatEventDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Fetch events from GET /api/events with optional category & search query parameters
 */
async function fetchEvents() {
  // Show loading state
  eventsLoading.classList.remove("hidden");
  eventsError.classList.add("hidden");
  eventsEmpty.classList.add("hidden");
  eventsGrid.innerHTML = "";
  eventsCountLabel.textContent = "Loading events...";

  const params = new URLSearchParams();
  if (state.selectedCategory && state.selectedCategory !== "All") {
    params.set("category", state.selectedCategory);
  }
  if (state.searchQuery.trim() !== "") {
    params.set("search", state.searchQuery.trim());
  }

  const hasActiveFilter =
    (state.selectedCategory && state.selectedCategory !== "All") ||
    state.searchQuery.trim() !== "";
  clearFiltersBtn.classList.toggle("hidden", !hasActiveFilter);

  const queryString = params.toString();
  const url = queryString ? `/api/events?${queryString}` : "/api/events";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      let errText = `Server returned status ${response.status}`;
      try {
        const errData = await response.json();
        if (errData && errData.detail) errText = errData.detail;
      } catch (_) {}
      throw new Error(errText);
    }

    const events = await response.json();
    eventsLoading.classList.add("hidden");

    if (!Array.isArray(events) || events.length === 0) {
      eventsEmpty.classList.remove("hidden");
      eventsCountLabel.textContent = "0 events found";
      return;
    }

    eventsCountLabel.textContent = `Showing ${events.length} event${events.length === 1 ? "" : "s"}${
      state.selectedCategory !== "All" ? ` in ${state.selectedCategory}` : ""
    }${state.searchQuery.trim() ? ` matching "${state.searchQuery.trim()}"` : ""}`;

    renderEventsGrid(events);
  } catch (err) {
    eventsLoading.classList.add("hidden");
    eventsError.classList.remove("hidden");
    eventsErrorMessage.textContent =
      err.message || "Could not connect to the backend server. Please verify FastAPI is running.";
    eventsCountLabel.textContent = "Failed to load events";
  }
}

/**
 * Render event cards into #events-grid
 */
function renderEventsGrid(events) {
  eventsGrid.innerHTML = "";

  events.forEach((ev, idx) => {
    const isFull = Number(ev.available_seats) <= 0;
    const feeDisplay = Number(ev.fee) === 0 ? "Free" : `₹${ev.fee}`;
    const badgeColor = getCategoryBadgeClasses(ev.category);

    const seatsBadgeHtml = isFull
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
           🚫 FULL
         </span>`
      : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
           💺 ${ev.available_seats} / ${ev.capacity} seats left
         </span>`;

    const card = document.createElement("article");
    card.style.animationDelay = `${Math.min(idx * 40, 360)}ms`;
    card.className =
      "opacity-0 animate-fade-in-up group bg-slate-900/90 border border-slate-800 hover:border-violet-500/60 rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between";

    card.innerHTML = `
      <div>
        <!-- Card Top Row: Icon + Category + Fee -->
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            ${escapeHtml(ev.icon || "✨")}
          </div>
          <div class="flex flex-wrap items-center justify-end gap-1.5">
            <span class="text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColor}">
              ${escapeHtml(ev.category)}
            </span>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${
              Number(ev.fee) === 0
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "bg-slate-800 text-slate-200 border border-slate-700"
            }">
              ${escapeHtml(feeDisplay)}
            </span>
          </div>
        </div>

        <!-- Title -->
        <h3 class="text-lg font-extrabold text-white group-hover:text-violet-300 transition-colors leading-snug mb-2">
          ${escapeHtml(ev.title)}
        </h3>

        <!-- Short Description snippet -->
        <p class="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          ${escapeHtml(ev.description || "")}
        </p>
      </div>

      <div class="pt-4 border-t border-slate-800/80 space-y-3.5">
        <!-- Date, Time & Venue -->
        <div class="space-y-1.5 text-xs text-slate-300">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">🗓️</span>
            <span class="font-medium">${escapeHtml(formatEventDate(ev.event_date))} • ${escapeHtml(ev.event_time)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">📍</span>
            <span class="truncate">${escapeHtml(ev.venue)}</span>
          </div>
        </div>

        <!-- Seats & Action Button -->
        <div class="flex items-center justify-between gap-2 pt-1">
          ${seatsBadgeHtml}
          <button
            type="button"
            data-event-id="${ev.id}"
            class="view-details-btn shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 active:bg-violet-700 active:scale-95 text-white shadow-sm shadow-violet-600/20 transition-all"
          >
            View Details →
          </button>
        </div>
      </div>
    `;

    const detailsBtn = card.querySelector(".view-details-btn");
    detailsBtn.addEventListener("click", () => openEventModal(ev.id));

    eventsGrid.appendChild(card);
  });
}

/**
 * Populate modal UI with an event object
 */
function populateModalEventDetails(ev) {
  state.activeEvent = ev;
  regEventIdInput.value = ev.id;

  modalEventIcon.textContent = ev.icon || "✨";
  modalEventCategory.textContent = ev.category;
  modalEventCategory.className = `text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClasses(
    ev.category
  )}`;
  modalEventTitle.textContent = ev.title;
  modalEventDescription.textContent = ev.description || "No description provided.";
  modalEventDatetime.textContent = `${formatEventDate(ev.event_date)} • ${ev.event_time}`;
  modalEventVenue.textContent = ev.venue;
  modalEventFee.textContent = Number(ev.fee) === 0 ? "Free" : `₹${ev.fee}`;
  modalEventSeats.textContent = `${ev.available_seats} / ${ev.capacity} available`;

  const isFull = Number(ev.available_seats) <= 0;
  if (isFull) {
    modalEventSeatBadge.textContent = "🚫 FULL (0 seats left)";
    modalEventSeatBadge.className =
      "text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40";
    submitRegistrationBtn.textContent = "Event Full (Try Waitlist / Check)";
  } else {
    modalEventSeatBadge.textContent = `💺 ${ev.available_seats} of ${ev.capacity} seats open`;
    modalEventSeatBadge.className =
      "text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    submitRegistrationBtn.textContent = "Confirm Registration";
  }
}

/**
 * Open the Event Detail & Registration Modal for a specific event_id
 */
async function openEventModal(eventId) {
  if (state.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }

  // Reset form and alerts
  registrationForm.reset();
  hideFormAlerts();
  submitRegistrationBtn.disabled = false;

  eventModal.classList.remove("hidden");
  eventModal.classList.add("flex");
  modalLoading.classList.remove("hidden");
  modalContentBody.classList.add("hidden");

  try {
    const response = await fetch(`/api/events/${eventId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || `Failed to load event #${eventId}`);
    }
    populateModalEventDetails(data);
    modalLoading.classList.add("hidden");
    modalContentBody.classList.remove("hidden");
  } catch (err) {
    modalLoading.classList.add("hidden");
    modalContentBody.classList.remove("hidden");
    showFormError(err.message || "Could not load event details from server.");
  }
}

/**
 * Close the modal
 */
function closeEventModal() {
  if (state.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }
  eventModal.classList.add("hidden");
  eventModal.classList.remove("flex");
  state.activeEvent = null;
}

function hideFormAlerts() {
  regFormError.classList.add("hidden");
  regFormErrorText.textContent = "";
  regFormSuccess.classList.add("hidden");
  regFormSuccessText.textContent = "";
}

function showFormError(message) {
  regFormSuccess.classList.add("hidden");
  regFormErrorText.textContent = message;
  regFormError.classList.remove("hidden");
}

function showFormSuccess(message) {
  regFormError.classList.add("hidden");
  regFormSuccessText.textContent = message;
  regFormSuccess.classList.remove("hidden");
}

/**
 * Handle student registration submission (Step 7)
 */
registrationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFormAlerts();

  const eventId = Number(regEventIdInput.value);
  const studentName = regStudentName.value.trim();
  const rollNumber = regRollNumber.value.trim();
  const email = regEmail.value.trim();
  const phone = regPhone.value.trim();

  // Client-side validation (Step 7.2)
  if (!studentName || !rollNumber || !email) {
    showFormError("Please fill in all required fields: Student Name, Roll Number, and Email.");
    return;
  }

  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    showFormError("Please enter a valid email address containing '@'.");
    return;
  }

  submitRegistrationBtn.disabled = true;
  const originalBtnLabel = submitRegistrationBtn.textContent;
  submitRegistrationBtn.textContent = "Registering...";

  try {
    const response = await fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: studentName,
        roll_number: rollNumber,
        email: email,
        phone: phone || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Display the exact error message sent back by the server (e.g. "Event is full" or "Already registered")
      showFormError(data.detail || `Registration failed (HTTP ${response.status})`);
      submitRegistrationBtn.disabled = false;
      submitRegistrationBtn.textContent = originalBtnLabel;
      return;
    }

    // Success (201 Created)
    const eventTitle = state.activeEvent ? state.activeEvent.title : `Event #${eventId}`;
    showFormSuccess(
      `Registered ${data.student_name} for "${eventTitle}"! Confirmation ID #${data.id}.`
    );
    if (window.triggerCrackerBarrage) {
      window.triggerCrackerBarrage(10);
    }
    registrationForm.reset();

    // Immediately re-fetch this event's details & refresh the grid so available_seats updates live
    try {
      const updatedRes = await fetch(`/api/events/${eventId}`);
      if (updatedRes.ok) {
        const updatedEvent = await updatedRes.json();
        populateModalEventDetails(updatedEvent);
      }
    } catch (_) {}

    await fetchEvents();

    submitRegistrationBtn.disabled = false;
    submitRegistrationBtn.textContent = "Confirm Registration";

    // Close the modal automatically after a brief moment
    state.closeTimer = setTimeout(() => {
      closeEventModal();
    }, 2200);
  } catch (err) {
    showFormError(
      err.message || "Network error: could not reach the backend server. Please check if FastAPI is running."
    );
    submitRegistrationBtn.disabled = false;
    submitRegistrationBtn.textContent = originalBtnLabel;
  }
});

/**
 * Category filter click handlers
 */
function updateActiveCategoryButton() {
  categoryButtons.forEach((btn) => {
    const cat = btn.getAttribute("data-category");
    if (cat === state.selectedCategory) {
      btn.className =
        "category-btn shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 bg-violet-600 text-white shadow-md shadow-violet-600/30";
    } else {
      btn.className =
        "category-btn shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white";
    }
  });
}

categoryButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const selected = btn.getAttribute("data-category") || "All";
    if (state.selectedCategory === selected) return;
    state.selectedCategory = selected;
    updateActiveCategoryButton();
    fetchEvents();
  });
});

/**
 * Search input handler (debounced so typing triggers clean GET /api/events?search=... calls)
 */
let searchDebounceTimer = null;
searchInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchEvents();
  }, 220);
});

/**
 * Reset filters helper
 */
function resetAllFilters() {
  state.selectedCategory = "All";
  state.searchQuery = "";
  searchInput.value = "";
  updateActiveCategoryButton();
  fetchEvents();
}

clearFiltersBtn.addEventListener("click", resetAllFilters);
emptyResetBtn.addEventListener("click", resetAllFilters);
retryEventsBtn.addEventListener("click", fetchEvents);

// Modal dismissal listeners
closeModalBtn.addEventListener("click", closeEventModal);
cancelModalBtn.addEventListener("click", closeEventModal);
eventModal.addEventListener("click", (e) => {
  if (e.target === eventModal) closeEventModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !eventModal.classList.contains("hidden")) {
    closeEventModal();
  }
});

// Initial load
document.addEventListener("DOMContentLoaded", () => {
  fetchEvents();
});
