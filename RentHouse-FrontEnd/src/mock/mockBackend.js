// src/mock/mockBackend.js
// In-browser replacement for the Spring Boot backend.
// It intercepts window.fetch and axios calls aimed at the API URL and answers
// them from seeded data persisted in localStorage (virtual tours in IndexedDB).
//
// Enabled by default. Set REACT_APP_USE_MOCK_API=false to talk to a real backend.
// Reset the demo data from the browser console with: resetDemoData()

import axios, { AxiosError } from "axios";
import { buildSeed } from "./seedData";

export const IS_DEMO = process.env.REACT_APP_USE_MOCK_API !== "false";

const API_BASES = [process.env.REACT_APP_API_URL, "http://localhost:5000"]
  .filter(Boolean)
  .map((b) => b.replace(/\/+$/, ""));

const DB_KEY = "renthouse_mock_db_v1";
const LATENCY_MS = 150;

/* ───────────────────────────── Persistence ───────────────────────────── */

let db = null;

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable or corrupt → reseed */ }
  return buildSeed();
}

function saveDb() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("[mock] Could not persist demo data (storage full?)", e);
  }
}

function getDb() {
  if (!db) { db = loadDb(); saveDb(); }
  return db;
}

const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;

// Virtual-tour panoramas are too large for localStorage → IndexedDB (memory fallback)
const tourMemory = new Map();
function idb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("no indexedDB"));
    const req = indexedDB.open("renthouse_mock_tours", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("tours");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tourStore(mode, fn) {
  const conn = await idb();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction("tours", mode);
    const req = fn(tx.objectStore("tours"));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}
const putTour = (id, blob) => tourStore("readwrite", (s) => s.put(blob, id)).catch(() => tourMemory.set(id, blob));
const getTour = (id) => tourStore("readonly", (s) => s.get(id)).catch(() => tourMemory.get(id));
const deleteTour = (id) => tourStore("readwrite", (s) => s.delete(id)).catch(() => tourMemory.delete(id));

// Shrink uploaded photos so they fit in localStorage
function shrinkImage(dataUrl, maxSize = 1280) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image")) return resolve(dataUrl);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

/* ───────────────────────────── Helpers ───────────────────────────── */

const today = () => new Date().toISOString().slice(0, 10);
const isFuture = (d) => d > today();

const json = (body, status = 200) => ({ status, body: JSON.stringify(body), type: "application/json" });
const text = (body, status = 200) => ({ status, body: String(body), type: "text/plain" });
const empty = (status = 200) => ({ status, body: "", type: "text/plain" });

const findUser = (id) => getDb().users.find((u) => u.id === Number(id));
const findHouse = (id) => getDb().houses.find((h) => h.id === Number(id));
const findOwner = (id) => getDb().owners.find((o) => o.id === Number(id));
const findUserByEmail = (email) =>
  getDb().users.find((u) => u.email.toLowerCase() === String(email || "").trim().toLowerCase());

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return { fcmToken: null, ...rest };
}

function houseJson(h) {
  if (!h) return null;
  const { ownerId, ...rest } = h;
  const owner = findOwner(ownerId);
  return { ...rest, owner: owner ? { ...owner } : null };
}

const rentJson = (r) => ({
  id: r.id, startDate: r.startDate, endDate: r.endDate, totalPrice: r.totalPrice,
  house: houseJson(findHouse(r.houseId)), user: publicUser(findUser(r.userId)),
});

const offerJson = (o) => ({
  id: o.id, discountPercentage: o.discountPercentage, minPoints: o.minPoints, active: o.active,
  sameOwnerOnly: o.sameOwnerOnly, used: o.used, expiryDate: o.expiryDate,
  house: o.houseId ? houseJson(findHouse(o.houseId)) : null,
  user: o.userId ? publicUser(findUser(o.userId)) : null,
});

function feedbackJson(f) {
  const u = findUser(f.userId);
  return {
    id: f.id, message: f.message, submittedAt: f.submittedAt,
    username: f.username || u?.username || "Guest",
    email: f.email || u?.email || "",
    user: u ? { id: u.id, username: u.username, email: u.email } : null,
  };
}

const rentsForHouse = (houseId) => getDb().rents.filter((r) => r.houseId === Number(houseId));
const coversToday = (r) => r.startDate <= today() && r.endDate >= today();
const overlaps = (r, start, end) => !(end < r.startDate || start > r.endDate);

function ownerHousesForUser(userId) {
  const user = findUser(userId);
  if (!user) return [];
  const ownerIds = getDb().owners
    .filter((o) => o.email?.toLowerCase() === user.email.toLowerCase())
    .map((o) => o.id);
  return getDb().houses.filter((h) => ownerIds.includes(h.ownerId));
}

const offerIsLive = (o) => o.active && !o.used && isFuture(o.expiryDate);

function applicableOffer(userId, houseId) {
  const house = findHouse(houseId);
  if (!house) return null;
  const loyalty = getDb().offers.find((o) =>
    o.userId === Number(userId) && offerIsLive(o) &&
    (!o.sameOwnerOnly || !o.houseId || findHouse(o.houseId)?.ownerId === house.ownerId) &&
    (!o.houseId || o.houseId === house.id));
  if (loyalty) return { offer: loyalty, type: "loyalty" };
  const ownerOffers = getDb().offers
    .filter((o) => o.userId == null && o.houseId === house.id && offerIsLive(o))
    .sort((a, b) => b.discountPercentage - a.discountPercentage);
  return ownerOffers.length ? { offer: ownerOffers[0], type: "owner" } : null;
}

function syncHouseStatus(house) {
  house.status = rentsForHouse(house.id).some(coversToday) ? "rented" : "available";
}

function findOrCreateOwner(name, email, phone) {
  const d = getDb();
  let owner = d.owners.find((o) => o.email?.toLowerCase() === String(email || "").toLowerCase());
  if (!owner) {
    owner = { id: nextId(d.owners), name, email, phone };
    d.owners.push(owner);
  } else {
    Object.assign(owner, { name, email, phone });
  }
  return owner;
}

const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");

/* ───────────────────────────── Chat assistant ───────────────────────────── */

function chatReply(message, userId) {
  const d = getDb();
  const low = String(message || "").toLowerCase().trim();
  const opt = (low.match(/^(?:option\s*)?([1-6])$/) || [])[1];
  const user = findUser(userId);
  const avgStars = (hid) => {
    const rs = d.ratings.filter((r) => r.houseId === hid);
    return rs.length ? (rs.reduce((s, r) => s + r.stars, 0) / rs.length).toFixed(1) : "—";
  };
  const table = (houses) =>
    "| Property | Location | Type | Beds | Per month |\n|---|---|---|---|---|\n" +
    houses.map((h) => `| ${h.title} | ${h.location} | ${h.propertyType} | ${h.nbOfBedrooms} | ${fmtMoney(h.pricePerMonth)} |`).join("\n");
  const needLogin = "🔒 Please **sign in** to see this information.";

  if (opt === "1") {
    const mine = user ? d.rents.filter((r) => r.userId === user.id).map((r) => findHouse(r.houseId)).filter(Boolean) : [];
    const types = new Set(mine.map((h) => h.propertyType));
    const locs = new Set(mine.map((h) => h.location));
    const picks = d.houses
      .filter((h) => !mine.some((m) => m.id === h.id) && h.status !== "rented")
      .map((h) => ({ h, s: (types.has(h.propertyType) ? 2 : 0) + (locs.has(h.location) ? 3 : 0) + Number(avgStars(h.id) === "—" ? 0 : avgStars(h.id)) / 5 }))
      .sort((a, b) => b.s - a.s).slice(0, 4).map((x) => x.h);
    return `# 💡 Personalized Picks\n${mine.length ? "Based on your rental history:" : "Here are some great available homes to start with:"}\n\n${table(picks)}`;
  }
  if (opt === "2") {
    const top = d.houses
      .map((h) => ({ h, n: rentsForHouse(h.id).length }))
      .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 5);
    return "# 🔥 Trending Now\n| Property | Location | Rentals | Rating |\n|---|---|---|---|\n" +
      top.map(({ h, n }) => `| ${h.title} | ${h.location} | ${n} | ⭐ ${avgStars(h.id)} |`).join("\n");
  }
  if (opt === "3") {
    const byLoc = {};
    d.houses.forEach((h) => (byLoc[h.location] = byLoc[h.location] || []).push(h));
    const rows = Object.entries(byLoc).map(([loc, hs]) => {
      const m = hs.map((h) => h.pricePerMonth);
      return `| ${loc} | ${hs.length} | ${fmtMoney(m.reduce((a, b) => a + b, 0) / m.length)} | ${fmtMoney(Math.min(...m))} – ${fmtMoney(Math.max(...m))} |`;
    });
    return "# 💰 Market Prices\n| Location | Listings | Avg / month | Range |\n|---|---|---|---|\n" + rows.join("\n");
  }
  if (opt === "4") {
    const total = d.houses.length;
    const rented = d.houses.filter((h) => rentsForHouse(h.id).some(coversToday)).length;
    const byType = {};
    d.houses.forEach((h) => (byType[h.propertyType] = (byType[h.propertyType] || 0) + 1));
    return `# 📊 Market Health\n- **Total listings:** ${total}\n- **Currently rented:** ${rented}\n- **Vacancy rate:** ${Math.round(((total - rented) / total) * 100)}%\n- **Total bookings:** ${d.rents.length}\n\n| Type | Listings |\n|---|---|\n` +
      Object.entries(byType).map(([t, n]) => `| ${t} | ${n} |`).join("\n");
  }
  if (opt === "5") {
    if (!user) return needLogin;
    const mine = d.rents.filter((r) => r.userId === user.id);
    if (!mine.length) return "# 🗂️ My Rental History\nYou haven't rented anything yet.";
    return "# 🗂️ My Rental History\n| Property | From | To | Paid |\n|---|---|---|---|\n" +
      mine.map((r) => `| ${findHouse(r.houseId)?.title || "Removed"} | ${r.startDate} | ${r.endDate} | ${fmtMoney(r.totalPrice)} |`).join("\n") +
      `\n\n**Total spent:** ${fmtMoney(mine.reduce((s, r) => s + r.totalPrice, 0))} · **Points:** ${user.points}`;
  }
  if (opt === "6") {
    if (!user) return needLogin;
    const favs = d.favorites.filter((f) => f.userId === user.id).map((f) => findHouse(f.houseId)).filter(Boolean);
    return favs.length ? `# ❤️ My Favourites\n${table(favs)}` : "# ❤️ My Favourites\nYou have no saved properties yet.";
  }

  // Free-text search: location, type, bedrooms, "under 3000"
  let results = d.houses;
  const filters = [];
  const loc = [...new Set(d.houses.map((h) => h.location))].find((l) => low.includes(l.toLowerCase()));
  if (loc) { results = results.filter((h) => h.location === loc); filters.push(`📍 ${loc}`); }
  const type = ["apartment", "house", "villa", "studio", "condo"].find((t) => low.includes(t));
  if (type) { results = results.filter((h) => h.propertyType.toLowerCase() === type); filters.push(`🏠 ${type}`); }
  const beds = low.match(/(\d+)\s*(?:bed|br|bedroom)/);
  if (beds) { results = results.filter((h) => h.nbOfBedrooms >= Number(beds[1])); filters.push(`🛏️ ${beds[1]}+ beds`); }
  const under = low.match(/(?:under|below|less than|max|<)\s*\$?\s*(\d[\d,]*)/);
  if (under) { const max = Number(under[1].replace(/,/g, "")); results = results.filter((h) => h.pricePerMonth <= max); filters.push(`💰 ≤ ${fmtMoney(max)}`); }

  if (filters.length) {
    return results.length
      ? `# 🔎 Search results\n${filters.join(" · ")}\n\n${table(results.slice(0, 8))}`
      : `No properties match ${filters.join(" · ")}. Try widening your search.`;
  }
  return `Hi${user ? " " + user.username : ""}! 👋 I can help you find a home.\n\nPick an option above, or ask something like:\n- *apartment in New York*\n- *3 bedroom house under 3000*\n- *villa in Miami*`;
}

/* ───────────────────────────── Routes ───────────────────────────── */

const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const regex = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "/?$");
  routes.push({ method, regex, keys, handler });
};

/* Auth */
const pendingSignups = {};
const authUserJson = (u, extra = {}) => ({
  ...extra, id: u.id, role: u.role, email: u.email, password: u.password,
  username: u.username, phoneNumber: u.phoneNumber, profileImage: u.profileImage,
});

route("POST", "/api/auth/signup", ({ body }) => {
  if (findUserByEmail(body.email)) return text("Email already exists", 409);
  pendingSignups[body.email.trim().toLowerCase()] = { ...body, role: body.role || "USER" };
  return json({ id: null, role: body.role || "USER", email: body.email, username: body.username, phoneNumber: body.phoneNumber, profileImage: null }, 201);
});
route("POST", "/api/auth/send-otp", () => text("OTP sent to email"));
route("POST", "/api/auth/resend-otp", ({ body }) => {
  const email = String(body.email || "").trim().toLowerCase();
  if (pendingSignups[email]) return text("OTP resent to " + email);
  if (findUserByEmail(email)) return text("Email already verified", 409);
  return text("No pending signup for this email", 404);
});
route("POST", "/api/auth/verify-otp", ({ body }) => {
  if (!/^\d{6}$/.test(String(body.otp || ""))) return text("Invalid OTP", 401);
  const email = String(body.email || "").trim().toLowerCase();
  const existing = findUserByEmail(email);
  if (existing) return json(authUserJson(existing));
  const pending = pendingSignups[email];
  if (!pending) return text("No pending signup found. Please sign up again.", 404);
  const d = getDb();
  const user = {
    id: nextId(d.users), username: pending.username, email, password: pending.password,
    phoneNumber: pending.phoneNumber, role: pending.role, points: 0, profileImage: null,
  };
  d.users.push(user);
  delete pendingSignups[email];
  saveDb();
  return json(authUserJson(user));
});
route("POST", "/api/auth/login", ({ body }) => {
  const email = String(body.email || "").trim().toLowerCase();
  if (pendingSignups[email]) return text("Please verify your email first", 403);
  const user = findUserByEmail(email);
  if (!user || user.password !== body.password) return text("Invalid credentials", 401);
  return json(authUserJson(user, { message: "Sign in successful" }));
});
route("POST", "/api/auth/forgot-password/send-code", () => json({ message: "Reset code sent to your email." }));
route("POST", "/api/auth/forgot-password/verify-code", ({ body }) =>
  /^\d{6}$/.test(String(body.code || "")) ? json({ verified: true }) : json({ error: "Invalid code" }, 401));
route("POST", "/api/auth/forgot-password/reset", ({ body }) => {
  if (body.newPassword !== body.confirmPassword) return json({ error: "Passwords do not match" }, 400);
  const user = findUserByEmail(body.email);
  if (!user) return json({ error: "No account found for this email" }, 404);
  user.password = body.newPassword;
  saveDb();
  return json({ message: "Password reset successfully. You can now sign in." });
});

/* Users */
route("GET", "/api/users", () => json(getDb().users.map(publicUser)));
route("GET", "/api/users/count", () => json({ count: getDb().users.length }));
route("PUT", "/api/users/update", ({ body }) => {
  const user = findUser(body.userId);
  if (!user) return text("User not found", 404);
  if (body.username) user.username = body.username;
  if (body.email) user.email = body.email;
  if (body.password) user.password = body.password;
  if (body.phoneNumber != null) user.phoneNumber = body.phoneNumber;
  if (body.profileImage) user.profileImage = body.profileImage;
  saveDb();
  return text("User updated successfully");
});
route("POST", "/api/users/:id/fcm-token", () => text("FCM token saved ✅"));
route("DELETE", "/api/users/:id/force-delete", ({ params }) => {
  const d = getDb();
  const user = findUser(params.id);
  if (!user) return text("User not found", 404);
  if (user.role === "ADMIN") return text("Cannot delete admin accounts", 403);
  ["offers", "ratings", "feedback", "visits", "favorites", "rents"].forEach((k) => {
    d[k] = d[k].filter((x) => x.userId !== user.id);
  });
  d.users = d.users.filter((u) => u.id !== user.id);
  saveDb();
  return text("User deleted successfully");
});
route("GET", "/api/users/:id", ({ params }) => {
  const user = findUser(params.id);
  return user ? json(publicUser(user)) : text("User not found", 404);
});

/* Houses */
route("GET", "/api/houses", () => json(getDb().houses.map((h) => ({
  id: h.id, title: h.title, location: h.location, image: h.image, nbOfBedrooms: h.nbOfBedrooms,
  propertyType: h.propertyType, pricePerDay: h.pricePerDay, pricePerMonth: h.pricePerMonth,
}))));
route("GET", "/api/houses/count", () => json({ count: getDb().houses.length }));
route("GET", "/api/houses/owners/all", () => json(getDb().owners));
route("GET", "/api/houses/most-rented", () => json(
  getDb().houses
    .map((h) => ({ h, n: rentsForHouse(h.id).length }))
    .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3)
    .map((x) => houseJson(x.h))));
route("POST", "/api/houses/uploadBase64", async ({ body }) => {
  const d = getDb();
  const owner = findOrCreateOwner(body.ownerName, body.ownerEmail, body.ownerPhone);
  const house = {
    id: nextId(d.houses), ownerId: owner.id, title: body.title, location: body.location,
    pricePerDay: Number(body.pricePerDay), pricePerMonth: Number(body.pricePerMonth),
    nbOfBedrooms: Number(body.nbOfBedrooms), propertyType: body.propertyType,
    description: body.description, latitude: body.latitude ?? null, longitude: body.longitude ?? null,
    image: await shrinkImage(body.imageData), status: "available", virtualTourUrl: null,
    createdAt: new Date().toISOString(),
  };
  d.houses.push(house);
  // Mirror the backend: provision a HOUSE_OWNER login for new owner emails
  if (body.ownerEmail && !findUserByEmail(body.ownerEmail)) {
    d.users.push({
      id: nextId(d.users), username: body.ownerName || body.ownerEmail, email: body.ownerEmail.trim().toLowerCase(),
      password: "owner123", phoneNumber: body.ownerPhone, role: "HOUSE_OWNER", points: 0, profileImage: null,
    });
    console.info(`[mock] Created owner account ${body.ownerEmail} with password "owner123"`);
  }
  saveDb();
  return json(houseJson(house));
});
route("PUT", "/api/houses/update/:id", async ({ params, body }) => {
  const house = findHouse(params.id);
  if (!house) return empty(404);
  const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
  Object.assign(house, {
    title: body.title, location: body.location, status: body.status, description: body.description,
    propertyType: body.propertyType, nbOfBedrooms: Number(body.nbOfBedrooms),
    pricePerDay: Number(body.pricePerDay), pricePerMonth: Number(body.pricePerMonth),
    latitude: num(body.latitude), longitude: num(body.longitude),
  });
  if (body.imageData) house.image = await shrinkImage(body.imageData);
  house.ownerId = findOrCreateOwner(body.ownerName, body.ownerEmail, body.ownerPhone).id;
  saveDb();
  return json(houseJson(house));
});
route("GET", "/api/houses/:id/related-count", ({ params }) => {
  const id = Number(params.id);
  const d = getDb();
  return json({ count: d.favorites.filter((f) => f.houseId === id).length + d.rents.filter((r) => r.houseId === id).length });
});
route("DELETE", "/api/houses/:id", ({ params, query }) => {
  const d = getDb();
  const id = Number(params.id);
  if (!findHouse(id)) return empty(404);
  const related = d.favorites.some((f) => f.houseId === id) || d.rents.some((r) => r.houseId === id);
  if (related && query.get("force") !== "true") return text("Cannot delete this house because it's referenced by other data.", 409);
  ["favorites", "rents", "ratings", "offers", "visits"].forEach((k) => { d[k] = d[k].filter((x) => x.houseId !== id); });
  d.houses = d.houses.filter((h) => h.id !== id);
  deleteTour(id);
  saveDb();
  return text("House deleted successfully");
});
route("GET", "/api/houses/:id/image", ({ params }) => {
  const h = findHouse(params.id);
  return h?.image ? { status: 302, redirect: h.image } : empty(404);
});
route("PUT", "/api/houses/:id/virtual-tour", async ({ params, formData }) => {
  const house = findHouse(params.id);
  if (!house) return empty(404);
  const file = formData?.get("file");
  if (!file) return json({ error: "No file uploaded" }, 400);
  await putTour(house.id, file);
  house.virtualTourUrl = `mock-tours/${house.id}/${file.name || "tour.jpg"}`;
  saveDb();
  return json({ message: "Virtual tour uploaded", key: house.virtualTourUrl });
});
route("DELETE", "/api/houses/:id/virtual-tour", async ({ params }) => {
  const house = findHouse(params.id);
  if (!house) return empty(404);
  await deleteTour(house.id);
  house.virtualTourUrl = null;
  saveDb();
  return json({ message: "Virtual tour removed" });
});
route("GET", "/api/houses/:id/virtual-tour-url", ({ params }) => {
  const house = findHouse(params.id);
  if (!house) return empty(404);
  return json({ virtualTourUrl: house.virtualTourUrl || "" });
});
route("GET", "/api/houses/:id/virtual-tour-image", async ({ params }) => {
  const blob = await getTour(Number(params.id));
  return blob ? { status: 200, body: blob, type: blob.type || "image/jpeg" } : empty(404);
});
route("GET", "/api/houses/:id", ({ params }) => {
  const h = findHouse(params.id);
  return h ? json(houseJson(h)) : empty(404);
});

/* Rents */
route("POST", "/api/rents/rent", ({ query }) => {
  const d = getDb();
  const house = findHouse(query.get("houseId"));
  const user = findUser(query.get("userId"));
  if (!house) return json({ error: "House not found" }, 409);
  if (!user) return json({ error: "User not found" }, 409);
  const start = query.get("startDate");
  const end = query.get("endDate");
  if (rentsForHouse(house.id).some((r) => overlaps(r, start, end)))
    return json({ error: "House already rented during this period." }, 409);

  let price = house.pricePerMonth;
  const applicable = applicableOffer(user.id, house.id);
  if (applicable) {
    price = price * (1 - applicable.offer.discountPercentage / 100);
    if (applicable.type === "loyalty") applicable.offer.used = true;
  }
  const rentsBefore = d.rents.filter((r) => r.userId === user.id).length;
  const rent = { id: nextId(d.rents), houseId: house.id, userId: user.id, startDate: start, endDate: end, totalPrice: price };
  d.rents.push(rent);
  syncHouseStatus(house);
  user.points = (user.points || 0) + 10;
  if ((rentsBefore + 1) % 3 === 0) {
    d.offers.push({
      id: nextId(d.offers), houseId: house.id, userId: user.id, discountPercentage: 20, minPoints: 0,
      active: true, sameOwnerOnly: true, used: false,
      expiryDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    });
  }
  saveDb();
  return json(rentJson(rent));
});
route("GET", "/api/rents/is-rented/:houseId", ({ params }) => {
  const house = findHouse(params.houseId);
  if (!house) return text("House not found", 500);
  const rents = rentsForHouse(house.id);
  const current = rents.find(coversToday);
  syncHouseStatus(house);
  saveDb();
  if (current) return json(rentJson(current));
  const res = { available: true };
  const next = rents.filter((r) => r.startDate > today()).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (next) res.nextBooking = rentJson(next);
  const last = rents.filter((r) => r.endDate < today()).sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  if (last) res.lastRent = rentJson(last);
  return json(res);
});
route("GET", "/api/rents/house/:houseId", ({ params }) => json(rentsForHouse(params.houseId).map(rentJson)));
route("GET", "/api/rents/user/:userId", ({ params }) =>
  json(getDb().rents.filter((r) => r.userId === Number(params.userId)).map(rentJson)));
route("GET", "/api/rents/count", () => json({ count: getDb().rents.length }));
route("GET", "/api/rents/active/count", () => json({ count: getDb().rents.filter((r) => r.endDate >= today()).length }));

/* Favorites */
route("POST", "/api/favorites/add", ({ query }) => {
  const d = getDb();
  const userId = Number(query.get("userId"));
  const houseId = Number(query.get("propertyId"));
  let fav = d.favorites.find((f) => f.userId === userId && f.houseId === houseId);
  if (!fav) { fav = { id: nextId(d.favorites), userId, houseId }; d.favorites.push(fav); saveDb(); }
  return json({ id: fav.id, property: houseJson(findHouse(houseId)) });
});
route("DELETE", "/api/favorites/remove", ({ query }) => {
  const d = getDb();
  const userId = Number(query.get("userId"));
  const houseId = Number(query.get("propertyId"));
  d.favorites = d.favorites.filter((f) => !(f.userId === userId && f.houseId === houseId));
  saveDb();
  return empty();
});
route("GET", "/api/favorites/user/:userId", ({ params }) => json(
  getDb().favorites
    .filter((f) => f.userId === Number(params.userId) && findHouse(f.houseId))
    .map((f) => ({ id: f.id, property: houseJson(findHouse(f.houseId)) }))));

/* Ratings */
const ratingJson = (r) => ({ id: r.id, stars: r.stars, comment: r.comment, house: houseJson(findHouse(r.houseId)), user: publicUser(findUser(r.userId)) });
route("GET", "/api/ratings", () => json(getDb().ratings.map(ratingJson)));
route("GET", "/api/ratings/house/:houseId", ({ params }) =>
  json(getDb().ratings.filter((r) => r.houseId === Number(params.houseId)).map(ratingJson)));
route("POST", "/api/ratings/add", ({ query }) => {
  const d = getDb();
  const rating = {
    id: nextId(d.ratings), houseId: Number(query.get("houseId")), userId: Number(query.get("userId")),
    stars: Number(query.get("stars")), comment: query.get("comment") || "",
  };
  d.ratings.push(rating);
  saveDb();
  return json(ratingJson(rating));
});

/* Feedback */
route("GET", "/api/feedback", () => json(getDb().feedback.map(feedbackJson)));
route("POST", "/api/feedback", ({ body, query }) => {
  const d = getDb();
  const user = findUser(query.get("userId"));
  const fb = {
    id: nextId(d.feedback), message: body.message, userId: user?.id ?? null,
    username: body.username || user?.username, email: body.email || user?.email,
    submittedAt: new Date().toISOString(),
  };
  d.feedback.push(fb);
  saveDb();
  return json(feedbackJson(fb), 201);
});
route("DELETE", "/api/feedback/:id", ({ params }) => {
  const d = getDb();
  const before = d.feedback.length;
  d.feedback = d.feedback.filter((f) => f.id !== Number(params.id));
  saveDb();
  return empty(d.feedback.length < before ? 200 : 404);
});

/* Offers */
route("GET", "/api/offers/user/:userId", ({ params }) =>
  json(getDb().offers.filter((o) => o.userId === Number(params.userId) && !o.used).map(offerJson)));
route("GET", "/api/offers/user/:userId/applicable/:houseId", ({ params }) => {
  if (!findHouse(params.houseId)) return empty(404);
  const a = applicableOffer(params.userId, params.houseId);
  return json(a ? { hasOffer: true, discountPercentage: a.offer.discountPercentage, offerType: a.type } : { hasOffer: false });
});

/* Owner dashboard */
route("GET", "/api/owner/resolve", ({ query }) => {
  const user = findUser(query.get("userId"));
  const owner = user && getDb().owners.find((o) => o.email?.toLowerCase() === user.email.toLowerCase());
  return owner ? json({ ownerId: owner.id, ownerName: owner.name }) : text("Owner not found", 404);
});
route("GET", "/api/owner/:userId/houses", ({ params }) => json(ownerHousesForUser(params.userId).map((h) => ({
  id: h.id, title: h.title, location: h.location, image: h.image, status: h.status,
  pricePerMonth: h.pricePerMonth, pricePerDay: h.pricePerDay, propertyType: h.propertyType, nbOfBedrooms: h.nbOfBedrooms,
  activeRents: rentsForHouse(h.id).filter((r) => r.endDate >= today()).length,
  activeOffers: getDb().offers.filter((o) => o.houseId === h.id && offerIsLive(o)).length,
}))));
route("GET", "/api/owner/:userId/rents", ({ params }) => {
  const list = [];
  ownerHousesForUser(params.userId).forEach((h) => rentsForHouse(h.id).forEach((r) => {
    const u = findUser(r.userId);
    list.push({
      rentId: r.id, houseId: h.id, houseTitle: h.title, houseLocation: h.location, houseImage: h.image,
      startDate: r.startDate, endDate: r.endDate, totalPrice: r.totalPrice,
      status: r.endDate < today() ? "completed" : "active",
      ...(u && { tenantName: u.username, tenantEmail: u.email, tenantPhone: u.phoneNumber }),
    });
  }));
  list.sort((a, b) => (a.status === b.status ? b.startDate.localeCompare(a.startDate) : a.status === "active" ? -1 : 1));
  return json(list);
});
route("GET", "/api/owner/:userId/offers", ({ params }) => {
  const ids = new Set(ownerHousesForUser(params.userId).map((h) => h.id));
  return json(getDb().offers.filter((o) => o.houseId && ids.has(o.houseId) && o.userId == null).map((o) => ({
    id: o.id, discountPercentage: o.discountPercentage, expiryDate: o.expiryDate, active: o.active, used: o.used,
    houseId: o.houseId, houseTitle: findHouse(o.houseId)?.title, sameOwnerOnly: o.sameOwnerOnly,
    status: o.used ? "used" : o.expiryDate < today() ? "expired" : o.active ? "active" : "inactive",
  })));
});
route("POST", "/api/owner/:userId/offers", ({ params, body }) => {
  const d = getDb();
  const discount = Math.round(Number(body.discountPercentage));
  if (!(discount > 0 && discount <= 100)) return text("Discount must be between 1 and 100", 400);
  if (!body.expiryDate || !isFuture(body.expiryDate)) return text("Expiry date must be in the future", 400);
  const house = ownerHousesForUser(params.userId).find((h) => h.id === Number(body.houseId));
  if (!house) return text("House not found or not owned by you", 400);
  const offer = {
    id: nextId(d.offers), houseId: house.id, userId: null, discountPercentage: discount, minPoints: 0,
    active: true, sameOwnerOnly: !!body.sameOwnerOnly, used: false, expiryDate: body.expiryDate,
  };
  d.offers.push(offer);
  saveDb();
  return json({ message: "Offer created successfully", offerId: offer.id });
});
route("PUT", "/api/owner/:userId/offers/:offerId", ({ params, body }) => {
  const offer = getDb().offers.find((o) => o.id === Number(params.offerId));
  if (!offer) return text("Offer not found", 400);
  if (!ownerHousesForUser(params.userId).some((h) => h.id === offer.houseId)) return text("Not authorized to edit this offer", 403);
  if (offer.used) return text("Cannot edit a used offer", 400);
  if ("discountPercentage" in body) {
    const dsc = Math.round(Number(body.discountPercentage));
    if (!(dsc > 0 && dsc <= 100)) return text("Discount must be 1–100", 400);
    offer.discountPercentage = dsc;
  }
  if ("expiryDate" in body) {
    if (!isFuture(body.expiryDate)) return text("Expiry date must be in the future", 400);
    offer.expiryDate = body.expiryDate;
  }
  if ("active" in body) offer.active = !!body.active;
  if ("sameOwnerOnly" in body) offer.sameOwnerOnly = !!body.sameOwnerOnly;
  saveDb();
  return json({ message: "Offer updated successfully" });
});
route("DELETE", "/api/owner/:userId/offers/:offerId", ({ params }) => {
  const d = getDb();
  const offer = d.offers.find((o) => o.id === Number(params.offerId));
  if (!offer) return text("Offer not found", 400);
  if (!ownerHousesForUser(params.userId).some((h) => h.id === offer.houseId)) return text("Not authorized", 403);
  d.offers = d.offers.filter((o) => o !== offer);
  saveDb();
  return json({ message: "Offer deleted successfully" });
});
route("GET", "/api/owner/:userId/stats", ({ params }) => {
  const houses = ownerHousesForUser(params.userId);
  const ids = new Set(houses.map((h) => h.id));
  const rents = getDb().rents.filter((r) => ids.has(r.houseId));
  return json({
    totalHouses: houses.length,
    activeRents: rents.filter((r) => r.endDate >= today()).length,
    totalRevenue: rents.reduce((s, r) => s + r.totalPrice, 0),
    activeOffers: getDb().offers.filter((o) => o.houseId && ids.has(o.houseId) && offerIsLive(o)).length,
  });
});

/* Visits */
route("POST", "/api/visits/request", ({ query }) => {
  const d = getDb();
  const house = findHouse(query.get("houseId"));
  const user = findUser(query.get("userId"));
  if (!house || !user) return text("Invalid house or user ID", 400);
  const date = query.get("date");
  const time = query.get("time");
  if (d.visits.some((v) => v.houseId === house.id && v.visitDate === date && v.visitTime === time))
    return text("This date and time are already taken.", 409);
  const visit = {
    id: nextId(d.visits), houseId: house.id, userId: user.id, visitorName: query.get("visitorName"),
    visitorEmail: query.get("visitorEmail"), visitDate: date, visitTime: time, accepted: null, status: null, responded: false,
  };
  d.visits.push(visit);
  saveDb();
  return json({ ...visit, house: houseJson(house), user: publicUser(user) });
});

/* Payments: Stripe needs a real server to create a PaymentIntent */
route("POST", "/api/stripe/checkout/integrated", () =>
  text("Card payments are disabled in demo mode. Please choose cash instead.", 503));

/* Chat */
route("POST", "/api/chat", ({ body }) => json({ reply: chatReply(body.message, body.userId) }));

/* ───────────────────────────── Dispatcher ───────────────────────────── */

function matchApi(url) {
  const base = API_BASES.find((b) => url.startsWith(b + "/"));
  if (!base) return null;
  const u = new URL(url);
  return { path: u.pathname, query: u.searchParams };
}

async function handle(method, url, rawBody) {
  const m = matchApi(url);
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  let body = {};
  let formData = null;
  if (typeof FormData !== "undefined" && rawBody instanceof FormData) formData = rawBody;
  else if (typeof rawBody === "string" && rawBody) { try { body = JSON.parse(rawBody); } catch { body = {}; } }
  else if (rawBody && typeof rawBody === "object") body = rawBody;

  for (const r of routes) {
    if (r.method !== method) continue;
    const hit = m.path.match(r.regex);
    if (!hit) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(hit[i + 1])]));
    try {
      return await r.handler({ params, query: m.query, body, formData });
    } catch (e) {
      console.error("[mock] handler error", method, m.path, e);
      return text("Mock server error: " + e.message, 500);
    }
  }
  console.warn("[mock] No mock route for", method, m.path);
  return text("Not found (demo mode)", 404);
}

/* ───────────────────────────── Install ───────────────────────────── */

let installed = false;

export function installMockBackend() {
  if (installed || !IS_DEMO || typeof window === "undefined") return;
  installed = true;

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!matchApi(url)) return realFetch(input, init);
    const method = (init.method || (typeof input === "object" && input.method) || "GET").toUpperCase();
    const res = await handle(method, url, init.body);
    if (res.redirect) return realFetch(res.redirect);
    return new Response(res.status === 204 ? null : res.body, {
      status: res.status, headers: { "Content-Type": res.type },
    });
  };

  const realAdapter = axios.getAdapter(axios.defaults.adapter);
  axios.defaults.adapter = async (config) => {
    let url = config.url || "";
    if (!/^https?:\/\//.test(url)) url = (config.baseURL || "").replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
    if (config.params) {
      const qs = new URLSearchParams(config.params).toString();
      if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    }
    if (!matchApi(url)) return realAdapter(config);
    const res = await handle((config.method || "get").toUpperCase(), url, config.data);
    const response = {
      data: res.body, status: res.status, statusText: String(res.status),
      headers: { "content-type": res.type }, config, request: {},
    };
    const validate = config.validateStatus || ((s) => s >= 200 && s < 300);
    if (validate(res.status)) return response;
    throw new AxiosError(
      "Request failed with status code " + res.status,
      res.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config, response.request, response
    );
  };

  window.resetDemoData = () => {
    db = buildSeed();
    saveDb();
    console.info("[mock] Demo data reset. Reload the page.");
  };
  console.info("%c[RentHouse] Demo mode: using seeded mock data (no backend).", "color:#0a7");
}

installMockBackend();
