window.MMC = window.MMC || {};

(() => {
  const AUTH_KEY = "mmc-auth-v1";
  const dataKey = (userId) => `mmc-data-${userId}`;

  function loadAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return { accounts: {}, sessionId: null };
      const parsed = JSON.parse(raw);
      return {
        accounts: parsed.accounts || {},
        sessionId: parsed.sessionId || null,
      };
    } catch {
      return { accounts: {}, sessionId: null };
    }
  }

  function saveAuth(auth) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }

  function bufferToHex(buffer) {
    return [...new Uint8Array(buffer)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer;
  }

  async function hashPassword(password, saltHex) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: hexToBuffer(saltHex),
        iterations: 120000,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );
    return bufferToHex(bits);
  }

  function makeSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bufferToHex(bytes);
  }

  function normalizeUsername(username) {
    return String(username || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function usernameKey(username) {
    return normalizeUsername(username).toLowerCase();
  }

  window.MMC.getSession = function getSession() {
    const auth = loadAuth();
    if (!auth.sessionId) return null;
    const account = Object.values(auth.accounts).find((a) => a.id === auth.sessionId);
    if (!account) return null;
    return {
      id: account.id,
      username: account.username,
      email: account.email || "",
      provider: account.provider || "local",
    };
  };

  window.MMC.listAccounts = function listAccounts() {
    return Object.values(loadAuth().accounts).map((a) => ({
      id: a.id,
      username: a.username,
      createdAt: a.createdAt,
    }));
  };

  window.MMC.hasAccounts = function hasAccounts() {
    return Object.keys(loadAuth().accounts).length > 0;
  };

  window.MMC.createAccount = async function createAccount(username, password) {
    const display = normalizeUsername(username);
    const key = usernameKey(display);
    if (display.length < 2) throw new Error("Username must be at least 2 characters.");
    if (!password || password.length < 4) {
      throw new Error("Password must be at least 4 characters.");
    }

    const auth = loadAuth();
    if (auth.accounts[key]) throw new Error("That username is already taken on this device.");

    const salt = makeSalt();
    const hash = await hashPassword(password, salt);
    const id = window.MMC.uid();

    auth.accounts[key] = {
      id,
      username: display,
      salt,
      hash,
      createdAt: Date.now(),
    };
    auth.sessionId = id;
    saveAuth(auth);

    // Seed new user data; migrate legacy anonymous data if present
    let seed = window.MMC.defaultState();
    const legacyV2 = localStorage.getItem(window.MMC.STORAGE_KEY);
    const legacyV1 = localStorage.getItem(window.MMC.LEGACY_KEY);
    const existingUsers = Object.keys(auth.accounts).length === 1;

    if (existingUsers && (legacyV2 || legacyV1)) {
      try {
        seed = window.MMC.loadAnonymousState();
      } catch {
        seed = window.MMC.defaultState();
      }
    }

    localStorage.setItem(dataKey(id), JSON.stringify(seed));
    return { id, username: display, provider: "local" };
  };

  window.MMC.login = async function login(username, password) {
    const key = usernameKey(username);
    const auth = loadAuth();
    const account = auth.accounts[key];
    if (!account) throw new Error("Account not found on this device.");

    const hash = await hashPassword(password, account.salt);
    if (hash !== account.hash) throw new Error("Incorrect password.");

    auth.sessionId = account.id;
    saveAuth(auth);
    return { id: account.id, username: account.username, provider: "local" };
  };

  window.MMC.loginWithGoogle = function loginWithGoogle({ sub, email, name }) {
    const googleSub = String(sub || "").trim();
    if (!googleSub) throw new Error("Google sign-in did not return a user id.");
    const key = `google:${googleSub}`;
    const id = `google-${googleSub}`;
    const display = String(name || email || "Google user").trim() || "Google user";
    const auth = loadAuth();
    const isFirst = Object.keys(auth.accounts).length === 0;

    if (!auth.accounts[key]) {
      auth.accounts[key] = {
        id,
        username: display,
        email: email || "",
        googleSub,
        provider: "google",
        createdAt: Date.now(),
      };
      let seed = window.MMC.defaultState();
      if (isFirst) {
        const legacyV2 = localStorage.getItem(window.MMC.STORAGE_KEY);
        const legacyV1 = localStorage.getItem(window.MMC.LEGACY_KEY);
        if (legacyV2 || legacyV1) {
          try {
            seed = window.MMC.loadAnonymousState();
          } catch {
            seed = window.MMC.defaultState();
          }
        }
      }
      localStorage.setItem(dataKey(id), JSON.stringify(seed));
    } else {
      auth.accounts[key].username = display;
      auth.accounts[key].email = email || auth.accounts[key].email || "";
    }

    auth.sessionId = id;
    saveAuth(auth);
    return {
      id,
      username: auth.accounts[key].username,
      email: auth.accounts[key].email || "",
      provider: "google",
    };
  };

  window.MMC.logout = function logout() {
    const auth = loadAuth();
    auth.sessionId = null;
    saveAuth(auth);
  };

  window.MMC.loadUserState = function loadUserState(userId) {
    try {
      const raw = localStorage.getItem(dataKey(userId));
      if (!raw) return window.MMC.ensureToday(window.MMC.defaultState());
      const parsed = JSON.parse(raw);
      return window.MMC.hydrateState(parsed);
    } catch {
      return window.MMC.ensureToday(window.MMC.defaultState());
    }
  };

  window.MMC.saveUserState = function saveUserState(userId, state) {
    localStorage.setItem(dataKey(userId), JSON.stringify(state));
  };
})();
