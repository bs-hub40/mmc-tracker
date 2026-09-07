window.MMC = window.MMC || {};

(() => {
  const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
  const SCOPES = `openid email profile ${DRIVE_SCOPE}`;
  const GIS_SRC = "https://accounts.google.com/gsi/client";

  let accessToken = "";
  let tokenClient = null;
  let fileId = null;
  let gisPromise = null;
  let syncTimer = null;
  let lastSyncAt = 0;
  let lastSyncError = "";

  function getClientId() {
    const fromSettings = (localStorage.getItem(window.MMC.GOOGLE_CLIENT_ID_KEY) || "").trim();
    return fromSettings || String(window.MMC.GOOGLE_CLIENT_ID || "").trim();
  }

  window.MMC.getGoogleClientId = getClientId;

  window.MMC.setGoogleClientId = function setGoogleClientId(id) {
    const value = String(id || "").trim();
    if (value) localStorage.setItem(window.MMC.GOOGLE_CLIENT_ID_KEY, value);
    else localStorage.removeItem(window.MMC.GOOGLE_CLIENT_ID_KEY);
    tokenClient = null;
  };

  window.MMC.googleSyncStatus = function googleSyncStatus() {
    return {
      connected: Boolean(accessToken),
      lastSyncAt,
      lastSyncError,
      fileId,
    };
  };

  function loadGis() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("Could not load Google Sign-In."))
        );
        return;
      }
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Google Sign-In."));
      document.head.appendChild(script);
    });
    return gisPromise;
  }

  async function ensureTokenClient() {
    const clientId = getClientId();
    if (!clientId) {
      throw new Error("Add a Google Client ID in Settings first.");
    }
    await loadGis();
    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google Sign-In is not available in this browser.");
    }
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        include_granted_scopes: true,
        callback: () => {},
      });
    }
    return tokenClient;
  }

  let grantedScopes = "";

  function tokenHasDriveScope() {
    return grantedScopes.includes("drive.appdata") || grantedScopes.includes("auth/drive");
  }

  async function readGoogleError(res, fallback) {
    let detail = "";
    try {
      const payload = await res.json();
      detail = payload?.error?.message || payload?.error_description || "";
    } catch {
      /* ignore */
    }
    const text = `${detail} ${fallback}`.toLowerCase();
    if (res.status === 403 && (text.includes("not been used") || text.includes("is disabled") || text.includes("access not configured"))) {
      return "Google Drive API is not enabled on this Cloud project. Enable it, wait a minute, then tap Sync now.";
    }
    if (res.status === 403 && (text.includes("insufficient") || text.includes("access_denied") || text.includes("permission"))) {
      return "Drive permission is missing. Sign out, then Continue with Google again and allow the app folder.";
    }
    if (detail) return detail;
    return `${fallback} (HTTP ${res.status})`;
  }

  function requestToken(prompt) {
    return new Promise(async (resolve, reject) => {
      try {
        const client = await ensureTokenClient();
        client.callback = (resp) => {
          if (resp?.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          accessToken = resp.access_token || "";
          grantedScopes = resp.scope || SCOPES;
          if (!accessToken) {
            reject(new Error("Google did not return an access token."));
            return;
          }
          resolve(accessToken);
        };
        client.requestAccessToken({ prompt: prompt ?? "consent" });
      } catch (err) {
        reject(err);
      }
    });
  }

  async function api(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) {
      accessToken = "";
      throw new Error("Google session expired. Sign in again.");
    }
    return res;
  }

  async function fetchProfile() {
    const res = await api("https://www.googleapis.com/oauth2/v3/userinfo");
    if (!res.ok) throw new Error("Could not read Google profile.");
    const profile = await res.json();
    return {
      sub: profile.sub,
      email: profile.email || "",
      name: profile.name || profile.email || "Google user",
    };
  }

  async function findDriveFile() {
    const name = window.MMC.DRIVE_FILE_NAME || "mmc-tracker.json";
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      fields: "files(id,name,modifiedTime)",
      pageSize: "20",
    });
    const res = await api(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!res.ok) {
      throw new Error(await readGoogleError(res, "Could not look up Google Drive data."));
    }
    const data = await res.json();
    const match = (data.files || []).find((f) => f.name === name);
    fileId = match?.id || null;
    return fileId;
  }

  async function downloadDriveState() {
    if (!fileId) await findDriveFile();
    if (!fileId) return null;
    const res = await api(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
    );
    if (res.status === 404) {
      fileId = null;
      return null;
    }
    if (!res.ok) throw new Error(await readGoogleError(res, "Could not download tracker data from Drive."));
    return res.json();
  }

  async function uploadDriveState(state) {
    const name = window.MMC.DRIVE_FILE_NAME || "mmc-tracker.json";
    const body = JSON.stringify(state);
    if (!fileId) await findDriveFile();

    if (fileId) {
      const res = await api(
        `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
          fileId
        )}?uploadType=media`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        }
      );
      if (!res.ok) throw new Error(await readGoogleError(res, "Could not update Google Drive data."));
      return;
    }

    const metadata = { name, parents: ["appDataFolder"] };
    const boundary = `mmc_${Date.now().toString(16)}`;
    const multipart =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      "Content-Type: application/json\r\n\r\n" +
      `${body}\r\n` +
      `--${boundary}--`;

    const res = await api(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: multipart,
      }
    );
    if (!res.ok) throw new Error(await readGoogleError(res, "Could not create Google Drive data."));
    const created = await res.json();
    fileId = created.id || null;
  }

  window.MMC.googleSignIn = async function googleSignIn() {
    await requestToken("consent");
    if (!tokenHasDriveScope()) {
      await requestToken("consent");
    }
    return fetchProfile();
  };

  window.MMC.googleRestoreToken = async function googleRestoreToken() {
    if (accessToken) return true;
    if (!getClientId()) return false;
    try {
      await requestToken("");
      return true;
    } catch {
      return false;
    }
  };

  window.MMC.googleSignOut = function googleSignOut() {
    const token = accessToken;
    accessToken = "";
    grantedScopes = "";
    fileId = null;
    lastSyncError = "";
    if (token && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(token, () => {});
    }
  };

  window.MMC.drivePull = async function drivePull() {
    if (!accessToken) return null;
    const raw = await downloadDriveState();
    if (!raw) return null;
    return window.MMC.hydrateState(raw);
  };

  window.MMC.drivePush = async function drivePush(state) {
    if (!accessToken) return false;
    await uploadDriveState(state);
    lastSyncAt = Date.now();
    lastSyncError = "";
    return true;
  };

  window.MMC.scheduleDrivePush = function scheduleDrivePush(state) {
    if (!accessToken) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      try {
        await window.MMC.drivePush(state);
      } catch (err) {
        lastSyncError = err.message || "Drive sync failed.";
      }
    }, 1200);
  };

  window.MMC.mergeDriveState = function mergeDriveState(localState, remoteState) {
    if (!remoteState) return localState;
    const localTs = Number(localState?.updatedAt) || 0;
    const remoteTs = Number(remoteState?.updatedAt) || 0;
    return remoteTs >= localTs ? remoteState : localState;
  };
})();
