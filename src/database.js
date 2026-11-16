
const DB_NAME = "FieldNoteDB";
const DB_VERSION = 3;
const STORE_NAME = "reports";
const SYNC_STORE_NAME = "pendingSync";

const LOCAL_REPORTS_KEY = "fieldnote_reports_fallback";
const LOCAL_SYNC_KEY = "fieldnote_pending_sync_fallback";

let indexedDBFailed = false;

function hasIndexedDB() {
  return (
    !indexedDBFailed &&
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined"
  );
}

function readLocalData(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Could not read local data:", error);
    throw error;
  }
}

function writeLocalData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Could not write local data:", error);
    throw error;
  }
}

export function openDatabase() {
  if (!hasIndexedDB()) {
    return Promise.reject(new Error("IndexedDB unavailable."));
  }

  return new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
          db.createObjectStore(SYNC_STORE_NAME, {
            keyPath: "id",
            autoIncrement: true
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(
        new Error("IndexedDB upgrade is blocked.")
      );
    } catch (error) {
      reject(error);
    }
  });
}

async function withDatabase(fallbackOperation, databaseOperation) {
  if (!hasIndexedDB()) {
    return fallbackOperation();
  }

  let db;

  try {
    db = await openDatabase();
    return await databaseOperation(db);
  } catch (error) {
    console.error("IndexedDB failed. Switching to LocalStorage:", error);
    indexedDBFailed = true;
    return fallbackOperation();
  } finally {
    db?.close();
  }
}

export async function saveReport(report) {
  return withDatabase(
    () => {
      const reports = readLocalData(LOCAL_REPORTS_KEY);
      const index = reports.findIndex(item => item.id === report.id);

      if (index >= 0) {
        reports[index] = report;
      } else {
        reports.push(report);
      }

      writeLocalData(LOCAL_REPORTS_KEY, reports);
    },
    (db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(report);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    })
  );
}

export async function getAllReports() {
  return withDatabase(
    () => readLocalData(LOCAL_REPORTS_KEY),
    (db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    })
  );
}

export async function deleteReport(id) {
  return withDatabase(
    () => {
      const reports = readLocalData(LOCAL_REPORTS_KEY);
      writeLocalData(
        LOCAL_REPORTS_KEY,
        reports.filter(report => report.id !== id)
      );
    },
    (db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    })
  );
}

export async function addPendingSync(operation) {
  return withDatabase(
    () => {
      const pending = readLocalData(LOCAL_SYNC_KEY);

      const nextId = pending.reduce(
        (max, item) => Math.max(max, item.id || 0),
        0
      ) + 1;

      pending.push({ ...operation, id: nextId });
      writeLocalData(LOCAL_SYNC_KEY, pending);
    },
    (db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_STORE_NAME, "readwrite");
      transaction.objectStore(SYNC_STORE_NAME).add(operation);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    })
  );
}

export async function getPendingSync() {
  return withDatabase(
    () => readLocalData(LOCAL_SYNC_KEY),
    (db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_STORE_NAME, "readonly");
      const request = transaction.objectStore(SYNC_STORE_NAME).getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    })
  );
}

export async function removePendingSync(id) {
  return withDatabase(
    () => {
      const pending = readLocalData(LOCAL_SYNC_KEY);
      writeLocalData(
        LOCAL_SYNC_KEY,
        pending.filter(item => item.id !== id)
      );
    },
    (db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_STORE_NAME, "readwrite");
      transaction.objectStore(SYNC_STORE_NAME).delete(id);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    })
  );
}
