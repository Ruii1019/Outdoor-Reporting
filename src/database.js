const DB_NAME = "FieldNoteDB";
const DB_VERSION = 3;
const STORE_NAME = "reports";
const SYNC_STORE_NAME = "pendingSync";

// Open or create the database
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
      
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });
        }
      
        if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
          db.createObjectStore(SYNC_STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Save a report
export async function saveReport(report) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put(report);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// Get all reports
export async function getAllReports() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// Delete a report
export async function deleteReport(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}


// Add an offline operation to the sync queue
export async function addPendingSync(operation) {
    const db = await openDatabase();
  
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_STORE_NAME, "readwrite");
      const store = transaction.objectStore(SYNC_STORE_NAME);
  
      store.add(operation);
  
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
  
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }
  
  // Get all pending sync operations
  export async function getPendingSync() {
    const db = await openDatabase();
  
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_STORE_NAME, "readonly");
      const store = transaction.objectStore(SYNC_STORE_NAME);
      const request = store.getAll();
  
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
  
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }
  
  // Delete a completed sync operation
  export async function removePendingSync(id) {
    const db = await openDatabase();
  
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_STORE_NAME, "readwrite");
      const store = transaction.objectStore(SYNC_STORE_NAME);
  
      store.delete(id);
  
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
  
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }
  