window.MMC = window.MMC || {};

(() => {
  const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
  // drive.file is non-sensitive. Do not request drive.appdata — that is sensitive
  // and would force Google verification + a 100-user cap for random people.
  const SCOPES = `openid email profile ${DRIVE_FILE_SCOPE}`;
  const GIS_SRC = "https://accounts.google.com/gsi/client";
  const FOLDER_NAME = "Log it";
  const LEGACY_FOLDER_NAME = "MMC Tracker";
  const TOKEN_KEY = "mmc-google-token-v1";
  const CONSENT_KEY = "mmc-google-consented";
  const FILE_NAME = () => window.MMC.DRIVE_FILE_NAME || "mmc-tracker.json";

  let accessToken = "";
  let tokenClient = null;
  let fileId = null;
  let folderId = null;
  let folderUrl = "";
  let fileUrl = "";
  let gisPromise = null;
  let syncTimer = null;
  let lastSyncAt = 0;
  let lastSyncError = "";
  let grantedScopes = "";

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
      folderId,
      folderUrl,
      fileUrl,
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
      throw new Error("Google sign-in is not configured for this app.");
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

  function saveToken(resp) {
    const token = resp?.access_token || "";
    const seconds = Number(resp?.expires_in) || 3600;
    if (!token) return;
    accessToken = token;
    grantedScopes = resp.scope || grantedScopes || SCOPES;
    try {
      localStorage.setItem(
        TOKEN_KEY,
        JSON.stringify({
          access_token: token,
          scope: grantedScopes,
          expires_at: Date.now() + Math.max(60, seconds - 30) * 1000,
        })
      );
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      /* ignore quota */
    }
  }

  function clearStoredToken() {
    accessToken = "";
    grantedScopes = "";
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  function applyStoredToken() {
    if (accessToken) return true;
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data?.access_token || Date.now() >= Number(data.expires_at || 0)) {
        localStorage.removeItem(TOKEN_KEY);
        return false;
      }
      accessToken = data.access_token;
      grantedScopes = data.scope || SCOPES;
      return true;
    } catch {
      return false;
    }
  }

  applyStoredToken();

  function tokenHasDriveScope() {
    return (
      grantedScopes.includes("drive.file") ||
      grantedScopes.includes("drive.appdata") ||
      grantedScopes.includes("auth/drive")
    );
  }

  function tokenHasVisibleDrive() {
    return grantedScopes.includes("drive.file") || grantedScopes.includes("auth/drive");
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
      return "Drive permission is missing. Sign out, Continue with Google, and allow creating files in Drive.";
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
          saveToken(resp);
          if (!accessToken) {
            reject(new Error("Google did not return an access token."));
            return;
          }
          resolve(accessToken);
        };
        client.requestAccessToken({ prompt: prompt ?? "" });
      } catch (err) {
        reject(err);
      }
    });
  }

  async function api(url, options = {}) {
    const { keepalive, ...rest } = options;
    const res = await fetch(url, {
      ...rest,
      keepalive: Boolean(keepalive),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(rest.headers || {}),
      },
    });
    if (res.status === 401) {
      accessToken = "";
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
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

  function folderLink(id) {
    return id ? `https://drive.google.com/drive/folders/${encodeURIComponent(id)}` : "";
  }

  function fileLink(id) {
    return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/view` : "";
  }

  async function driveJson(url, options = {}) {
    const res = await api(url, options);
    if (!res.ok) {
      throw new Error(await readGoogleError(res, "Google Drive request failed."));
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function findNamedFile({ name, mimeType, parentId, spaces }) {
    const clauses = [`name='${name.replace(/'/g, "\\'")}'`, "trashed=false"];
    if (mimeType) clauses.push(`mimeType='${mimeType}'`);
    if (parentId) clauses.push(`'${parentId}' in parents`);
    const params = new URLSearchParams({
      q: clauses.join(" and "),
      fields: "files(id,name,webViewLink)",
      pageSize: "10",
    });
    if (spaces) params.set("spaces", spaces);
    const data = await driveJson(`https://www.googleapis.com/drive/v3/files?${params}`);
    return data?.files?.[0] || null;
  }

  async function ensureVisibleFolder() {
    if (folderId) {
      folderUrl = folderUrl || folderLink(folderId);
      return folderId;
    }
    let folder = await findNamedFile({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    });
    if (!folder) {
      const legacy = await findNamedFile({
        name: LEGACY_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      });
      if (legacy?.id) {
        folder = await driveJson(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(legacy.id)}?fields=id,name,webViewLink`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: FOLDER_NAME }),
          }
        );
        folder = folder || legacy;
      }
    }
    if (!folder) {
      folder = await driveJson("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: FOLDER_NAME,
          mimeType: "application/vnd.google-apps.folder",
        }),
      });
    }
    folderId = folder?.id || null;
    folderUrl = folder?.webViewLink || folderLink(folderId);
    return folderId;
  }

  async function findVisibleBackup() {
    const parent = await ensureVisibleFolder();
    if (!parent) return null;
    return findNamedFile({ name: FILE_NAME(), parentId: parent });
  }

  async function findAppDataBackup() {
    if (!grantedScopes.includes("drive.appdata")) return null;
    return findNamedFile({
      name: FILE_NAME(),
      spaces: "appDataFolder",
    });
  }

  async function downloadById(id) {
    const res = await api(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await readGoogleError(res, "Could not download tracker data from Drive."));
    return res.json();
  }

  async function multipartUpload({ metadata, body, fileIdToUpdate }) {
    if (fileIdToUpdate) {
      const res = await api(
        `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
          fileIdToUpdate
        )}?uploadType=media`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        }
      );
      if (!res.ok) throw new Error(await readGoogleError(res, "Could not update Google Drive data."));
      fileId = fileIdToUpdate;
      fileUrl = fileLink(fileId);
      return;
    }

    const boundary = `mmc_${Date.now().toString(16)}`;
    const multipart =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      "Content-Type: application/json\r\n\r\n" +
      `${body}\r\n` +
      `--${boundary}--`;

    const created = await driveJson(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: multipart,
      }
    );
    fileId = created?.id || null;
    fileUrl = created?.webViewLink || fileLink(fileId);
  }

  async function downloadDriveState() {
    const visibleMeta = await findVisibleBackup().catch(() => null);
    const hiddenMeta = await findAppDataBackup().catch(() => null);
    const parts = [];

    if (visibleMeta?.id) {
      fileId = visibleMeta.id;
      fileUrl = visibleMeta.webViewLink || fileLink(visibleMeta.id);
      const data = await downloadById(visibleMeta.id);
      if (data) parts.push(window.MMC.hydrateState(data));
    }

    if (hiddenMeta?.id && hiddenMeta.id !== visibleMeta?.id) {
      const data = await downloadById(hiddenMeta.id);
      if (data) parts.push(window.MMC.hydrateState(data));
    }

    if (!parts.length) return null;
    return parts.reduce((acc, cur) => window.MMC.mergeTrackerState(acc, cur));
  }

  async function uploadDriveState(state) {
    const name = FILE_NAME();
    const body = JSON.stringify(state);
    const parent = await ensureVisibleFolder();
    if (!parent) throw new Error("Could not create the Log it folder in Drive.");

    const existing = await findVisibleBackup();
    if (existing?.id) {
      await multipartUpload({ metadata: { name }, body, fileIdToUpdate: existing.id });
      fileUrl = existing.webViewLink || fileLink(existing.id);
      return;
    }

    await multipartUpload({
      metadata: { name, parents: [parent] },
      body,
    });
  }

  window.MMC.googleSignIn = async function googleSignIn() {
    if (!applyStoredToken() || !tokenHasVisibleDrive()) {
      const prompt = localStorage.getItem(CONSENT_KEY) ? "" : "consent";
      await requestToken(prompt);
      if (!tokenHasVisibleDrive()) {
        await requestToken("consent");
      }
    }
    return fetchProfile();
  };

  window.MMC.googleRestoreToken = async function googleRestoreToken(interactive = false) {
    if (applyStoredToken()) return true;
    if (!getClientId() || !interactive) return false;
    try {
      await requestToken(localStorage.getItem(CONSENT_KEY) ? "" : "consent");
      await window.MMC.flushDrivePush();
      return true;
    } catch {
      return false;
    }
  };

  window.MMC.googleSignOut = function googleSignOut() {
    const token = accessToken;
    clearStoredToken();
    fileId = null;
    folderId = null;
    folderUrl = "";
    fileUrl = "";
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

  window.MMC.drivePush = async function drivePush(state, extra = {}) {
    if (!state) return false;
    if (!accessToken) {
      pendingPayload = state;
      return false;
    }
    if (!tokenHasVisibleDrive()) {
      await requestToken("consent");
    }
    await uploadDriveState(state);
    lastSyncAt = Date.now();
    lastSyncError = "";
    if (pendingPayload === state) pendingPayload = null;
    return true;
  };

  let pendingPayload = null;

  window.MMC.flushDrivePush = async function flushDrivePush(keepalive = false) {
    const payload = pendingPayload;
    if (!payload || !accessToken) return false;
    clearTimeout(syncTimer);
    try {
      if (keepalive) {
        await uploadDriveState(payload);
        lastSyncAt = Date.now();
        lastSyncError = "";
        pendingPayload = null;
        return true;
      }
      return window.MMC.drivePush(payload);
    } catch (err) {
      lastSyncError = err.message || "Drive sync failed.";
      return false;
    }
  };

  window.MMC.scheduleDrivePush = function scheduleDrivePush(state) {
    pendingPayload = state;
    if (!accessToken) return;
    clearTimeout(syncTimer);
    window.MMC.flushDrivePush();
  };

  window.MMC.mergeDriveState = function mergeDriveState(localState, remoteState) {
    return window.MMC.mergeTrackerState(localState, remoteState);
  };
})();
