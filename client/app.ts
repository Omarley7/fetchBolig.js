import { Dexie, type EntityTable } from "dexie";
import { apiOfferToDomain } from "../lib/offers-domain.js";
import { apiThreadToDomain } from "../lib/threads-domain.js";
import type { ApiOffer } from "../types/offers.js";
import type { ApiMessageThread } from "../types/threads.js";

// IndexedDB setup using Dexie
class FindboligDB extends Dexie {
  // Store RAW API shapes, transform only when rendering
  offers!: EntityTable<ApiOffer, "id">;
  threads!: EntityTable<ApiMessageThread, "id">;

  constructor() {
    super("FindboligDB");
    this.version(1).stores({
      // Index on created (string) instead of createdAt (Date)
      offers: "id, created, hasUnreadMessages",
      threads: "id, relatedEntity, hasUnreadMessages",
    });
  }
}

const db = new FindboligDB();

// Storage operations
export async function upsertOffers(apiOffers: ApiOffer[]): Promise<void> {
  await db.offers.bulkPut(apiOffers);
  updateStats();
}

export async function upsertThreads(
  apiThreads: ApiMessageThread[]
): Promise<void> {
  await db.threads.bulkPut(apiThreads);
  updateStats();
}

export async function getRawOffers(): Promise<ApiOffer[]> {
  return await db.offers.orderBy("created").reverse().toArray();
}

export async function getRawThreads(): Promise<ApiMessageThread[]> {
  return await db.threads.orderBy("id").toArray();
}

export async function clearAllData(): Promise<void> {
  await db.offers.clear();
  await db.threads.clear();
  updateStats();
}

// UI Updates
function updateStats() {
  db.offers.count().then((count) => {
    const el = document.getElementById("offers-count");
    if (el) el.textContent = count.toString();
  });

  db.threads.count().then((count) => {
    const el = document.getElementById("threads-count");
    if (el) el.textContent = count.toString();
  });
}

function renderOffers(offers: ReturnType<typeof apiOfferToDomain>) {
  const container = document.getElementById("offers-list");
  if (!container) return;

  if (offers.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-center py-8">No offers in storage</p>';
    return;
  }

  container.innerHTML = offers
    .map(
      (o) => `
    <article class="offer-card">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg font-semibold text-gray-900">Offer #${
          o.number ?? "N/A"
        }</h3>
        ${
          o.hasUnreadMessages
            ? `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">${o.unreadMessagesCount} unread</span>`
            : ""
        }
      </div>
      <p class="text-gray-600 mb-2">${o.residenceAddress ?? "No address"}</p>
      <div class="text-sm text-gray-500">
        <div>Created: ${o.createdAt.toLocaleDateString()}</div>
        <div>Updated: ${o.updatedAt.toLocaleDateString()}</div>
      </div>
    </article>
  `
    )
    .join("");
}

function renderThreads(threads: ReturnType<typeof apiThreadToDomain>) {
  const container = document.getElementById("threads-list");
  if (!container) return;

  if (threads.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-center py-8">No threads in storage</p>';
    return;
  }

  container.innerHTML = threads
    .map(
      (t) => `
    <article class="thread-card">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg font-semibold text-gray-900">Thread: ${t.id.slice(
          0,
          8
        )}...</h3>
        ${
          t.hasUnreadMessages
            ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Unread</span>'
            : ""
        }
      </div>
      ${
        t.lastMessage
          ? `
        <div class="bg-gray-50 p-3 rounded mb-2">
          <p class="text-sm text-gray-700">${t.lastMessage.body}</p>
          <p class="text-xs text-gray-500 mt-1">
            ${
              t.lastMessage.author ?? "Unknown"
            } · ${t.lastMessage.createdAt.toLocaleDateString()}
          </p>
        </div>
      `
          : ""
      }
      <div class="text-sm text-gray-500">
        ${t.relatedEntity ? `Related: ${t.relatedEntity}` : ""}
      </div>
    </article>
  `
    )
    .join("");
}

// API calls
async function fetchAndStoreOffers() {
  try {
    const res = await fetch("/api/offers");
    if (res.status === 401) {
      (window as any).showLoginModal?.(true);
      return;
    }
    const data = (await res.json()) as ApiOffer[];

    await upsertOffers(data);
    const domainOffers = apiOfferToDomain(data);
    renderOffers(domainOffers);
    showStatus("success", `Fetched and stored ${data.length} offers`);
  } catch (error: any) {
    showStatus("error", error.message);
  }
}

async function fetchAndStoreThreads() {
  console.log("Fetching threads...");
  try {
    const res = await fetch("/api/threads");
    if (res.status === 401) {
      (window as any).showLoginModal?.(true);
      return;
    }
    const data = (await res.json()) as ApiMessageThread[];

    await upsertThreads(data);
    const domainThreads = apiThreadToDomain(data);
    renderThreads(domainThreads);
    showStatus("success", `Fetched and stored ${data.length} threads`);
  } catch (error: any) {
    showStatus("error", error.message);
  }
}

async function loadFromStorage() {
  const rawOffers = await getRawOffers();
  const rawThreads = await getRawThreads();
  const domainOffers = apiOfferToDomain(rawOffers);
  const domainThreads = apiThreadToDomain(rawThreads);
  renderOffers(domainOffers);
  renderThreads(domainThreads);
  showStatus(
    "info",
    `Loaded ${rawOffers.length} offers and ${rawThreads.length} threads from storage`
  );
}

async function clearStorage() {
  if (confirm("Are you sure you want to clear all stored data?")) {
    await clearAllData();
    renderOffers([]);
    renderThreads([]);
    showStatus("info", "Storage cleared");
  }
}

function showStatus(type: "success" | "error" | "info", message: string) {
  const statusEl = document.getElementById("auth-status");
  if (!statusEl) return;

  const colors = {
    success: "bg-green-100 text-green-800 border-green-200",
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };

  statusEl.innerHTML = `
    <div class="p-3 rounded-lg border ${colors[type]}">
      ${message}
    </div>
  `;

  setTimeout(() => {
    statusEl.innerHTML = "";
  }, 5000);
}

function showTab(tab: "offers" | "threads") {
  // Update tab buttons
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(`tab-${tab}`)?.classList.add("active");

  // Update content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.add("hidden");
  });
  document.getElementById(`content-${tab}`)?.classList.remove("hidden");
}

// Make functions available globally
(async function initUpdateAll(){
  (window as any).updateAll = async () => {
    showStatus("info", "Updating offers & threads...");
    await Promise.all([fetchAndStoreOffers(), fetchAndStoreThreads()]);
    showStatus("success", "Update complete");
  };
})();
(window as any).loadFromStorage = loadFromStorage;
(window as any).clearStorage = clearStorage;
(window as any).showTab = showTab;

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  updateStats();
  loadFromStorage();
});
