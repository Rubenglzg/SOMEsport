const API_KEY = "AIzaSyDJdbw3r_qR8Ak8GwqaHd3ncgiFyqUDhzY";
const PROJECT_ID = "avantiaesport";

// DOM Elements - Login
const loginView = document.getElementById("login-view");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btn-login");
const loginSpinner = document.getElementById("login-spinner");
const loginError = document.getElementById("login-error");

// DOM Elements - Dashboard
const dashboardView = document.getElementById("dashboard-view");
const clubNameEl = document.getElementById("club-name");
const btnLogout = document.getElementById("btn-logout");
const searchInput = document.getElementById("search-input");
const teamFilter = document.getElementById("team-filter");
const playersList = document.getElementById("players-list");
const listLoader = document.getElementById("list-loader");
const listEmpty = document.getElementById("list-empty");
const playerCountBadge = document.getElementById("player-count");

// DOM Elements - Active Player Banner
const activePlayerBanner = document.getElementById("active-player-banner");
const activePlayerName = document.getElementById("active-player-name");

// State
let session = null; // { uid, idToken, clubName }
let players = [];   // Parsed players list
let teamsMap = {};  // teamId -> teamName map

// --- INIT APP ---
document.addEventListener("DOMContentLoaded", () => {
  // Check if session is stored
  chrome.storage.local.get(["session", "selectedPlayer"], (result) => {
    if (result.session) {
      session = result.session;
      showDashboardView();
      loadClubData();
    } else {
      showLoginView();
    }

    if (result.selectedPlayer) {
      showActivePlayer(result.selectedPlayer);
    }
  });
});

// --- NAVIGATION ---
function showLoginView() {
  loginView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
}

function showDashboardView() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
}

// --- LOGIN FLOW ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  btnLogin.disabled = true;
  loginSpinner.classList.remove("hidden");

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    // 1. Sign in with Password using Firebase Auth REST API
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
    const authRes = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
      throw new Error(authData.error?.message || "Error al iniciar sesión.");
    }

    const { localId: uid, idToken } = authData;

    // 2. Fetch the club's profile document from Firestore to verify their role
    const clubDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    const clubRes = await fetch(clubDocUrl, {
      headers: { "Authorization": `Bearer ${idToken}` }
    });

    if (!clubRes.ok) {
      throw new Error("No se pudo obtener el perfil de club de la base de datos.");
    }

    const clubDoc = await clubRes.json();
    const clubProfile = parseFirestoreDoc(clubDoc);

    if (clubProfile.role !== "club") {
      throw new Error("Acceso denegado. Esta cuenta no pertenece a un Club registrado.");
    }

    // 3. Save session in Chrome Storage
    session = {
      uid,
      idToken,
      clubName: clubProfile.name || "Mi Club Deportivo"
    };

    chrome.storage.local.set({ session }, () => {
      showDashboardView();
      loadClubData();
    });

  } catch (err) {
    console.error(err);
    loginError.innerText = translateAuthError(err.message);
    loginError.classList.remove("hidden");
  } finally {
    btnLogin.disabled = false;
    loginSpinner.classList.add("hidden");
  }
});

// --- LOGOUT FLOW ---
btnLogout.addEventListener("click", () => {
  chrome.storage.local.remove(["session", "selectedPlayer"], () => {
    session = null;
    players = [];
    teamsMap = {};
    activePlayerBanner.classList.add("hidden");
    showLoginView();
  });
});

// --- LOAD CLUB DATA ---
async function loadClubData() {
  clubNameEl.innerText = session.clubName;
  listLoader.classList.remove("hidden");
  listEmpty.classList.add("hidden");
  playersList.querySelectorAll(".player-card").forEach(el => el.remove());

  try {
    // 1. Fetch Teams to construct mapping
    await loadTeams();

    // 2. Fetch Players with status === 'Pendiente'
    await loadPlayers();
  } catch (err) {
    console.error("Error loading club data:", err);
    // If unauthorized, token might have expired, log out
    if (err.message.includes("401") || err.message.includes("UNAUTHENTICATED")) {
      btnLogout.click();
    }
  }
}

// --- FETCH TEAMS ---
async function loadTeams() {
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: "teams" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "clubId" },
          op: "EQUAL",
          value: { stringValue: session.uid }
        }
      }
    }
  };

  const res = await fetch(queryUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(queryBody)
  });

  if (!res.ok) throw new Error(`Teams request failed: ${res.status}`);

  const results = await res.json();
  teamsMap = {};
  
  // Clear and populate team filter select
  teamFilter.innerHTML = '<option value="">Todos los equipos</option>';

  if (Array.isArray(results)) {
    results.forEach(item => {
      if (item.document) {
        const team = parseFirestoreDoc(item.document);
        if (team.uid && team.name) {
          teamsMap[team.uid] = team.name;
          
          const opt = document.createElement("option");
          opt.value = team.uid;
          opt.innerText = team.name;
          teamFilter.appendChild(opt);
        }
      }
    });
  }
}

// --- FETCH PLAYERS (PENDIENTE) ---
async function loadPlayers() {
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  
  // Query to filter by clubId, role === 'player', and status === 'Pendiente'
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "clubId" },
                op: "EQUAL",
                value: { stringValue: session.uid }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: "role" },
                op: "EQUAL",
                value: { stringValue: "player" }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "Pendiente" }
              }
            }
          ]
        }
      }
    }
  };

  const res = await fetch(queryUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(queryBody)
  });

  if (!res.ok) throw new Error(`Players request failed: ${res.status}`);

  const results = await res.json();
  players = [];

  if (Array.isArray(results)) {
    results.forEach(item => {
      if (item.document) {
        const p = parseFirestoreDoc(item.document);
        players.push(p);
      }
    });
  }

  listLoader.classList.add("hidden");
  renderPlayersList();
}

// --- RENDER PLAYERS ---
function renderPlayersList() {
  // Clear any existing cards
  playersList.querySelectorAll(".player-card").forEach(el => el.remove());

  const searchVal = searchInput.value.toLowerCase().trim();
  const selectedTeamId = teamFilter.value;

  const filteredPlayers = players.filter(p => {
    const matchesName = (p.name || "").toLowerCase().includes(searchVal);
    const matchesTeam = !selectedTeamId || p.teamId === selectedTeamId;
    return matchesName && matchesTeam;
  });

  playerCountBadge.innerText = filteredPlayers.length;

  if (filteredPlayers.length === 0) {
    listEmpty.classList.remove("hidden");
    return;
  }

  listEmpty.classList.add("hidden");

  // Get active selected player to highlight their card
  chrome.storage.local.get("selectedPlayer", (result) => {
    const activeUid = result.selectedPlayer?.uid;

    filteredPlayers.forEach(p => {
      const card = document.createElement("div");
      card.className = `player-card ${activeUid === p.uid ? "active" : ""}`;
      card.dataset.uid = p.uid;

      const teamName = teamsMap[p.teamId] || "Sin equipo asignado";
      const sportLabel = p.sportType ? ` - ${normalizeSportName(p.sportType)}` : "";

      card.innerHTML = `
        <div class="player-details">
          <div class="player-name">${p.name}</div>
          <div class="player-meta">${teamName}${sportLabel}</div>
        </div>
        <button class="btn-select">${activeUid === p.uid ? "✓ Activo" : "Seleccionar"}</button>
      `;

      card.addEventListener("click", () => selectPlayer(p));
      playersList.appendChild(card);
    });
  });
}

// --- SELECT PLAYER ---
function selectPlayer(p) {
  const exportData = {
    _isAvantiaExport: true,
    uid: p.uid,
    nombre: p.name || "",
    apellidos: "",
    dni: p.dni || "",
    email: p.email || "",
    telefono: p.phone || "",
    nacimiento: p.birthDate || "",
    tutorName: p.tutorName || "",
    tutorPhone: p.tutorPhone || "",
    tutorEmail: p.tutorEmail || "",
  };

  chrome.storage.local.set({ selectedPlayer: exportData }, () => {
    showActivePlayer(exportData);
    
    // Rerender cards to update active styling
    playersList.querySelectorAll(".player-card").forEach(card => {
      if (card.dataset.uid === p.uid) {
        card.classList.add("active");
        card.querySelector(".btn-select").innerText = "✓ Activo";
      } else {
        card.classList.remove("active");
        card.querySelector(".btn-select").innerText = "Seleccionar";
      }
    });
  });
}

function showActivePlayer(p) {
  activePlayerBanner.classList.remove("hidden");
  activePlayerName.innerText = p.nombre;
}

// --- INPUT LISTENERS ---
searchInput.addEventListener("input", renderPlayersList);
teamFilter.addEventListener("change", renderPlayersList);

// --- HELPERS ---
function parseFirestoreDoc(doc) {
  const fields = doc.fields || {};
  const data = {};
  Object.keys(fields).forEach(key => {
    const valObj = fields[key];
    if (valObj.stringValue !== undefined) data[key] = valObj.stringValue;
    else if (valObj.booleanValue !== undefined) data[key] = valObj.booleanValue;
    else if (valObj.integerValue !== undefined) data[key] = parseInt(valObj.integerValue);
  });
  data.uid = doc.name.split('/').pop();
  return data;
}

function translateAuthError(msg) {
  if (msg.includes("EMAIL_NOT_FOUND") || msg.includes("INVALID_PASSWORD")) {
    return "Correo o contraseña incorrectos.";
  }
  if (msg.includes("USER_DISABLED")) {
    return "Esta cuenta ha sido inhabilitada.";
  }
  return msg;
}

function normalizeSportName(sport) {
  if (sport === 'futbol') return 'Fútbol';
  if (sport === 'futbol_sala') return 'Fútbol Sala';
  if (sport === 'baloncesto') return 'Baloncesto';
  return sport;
}
