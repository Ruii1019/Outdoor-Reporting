
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Get the current folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create or open the database file
const db = new Database(
  path.join(__dirname, "fieldnote.db")
);

// Create reports table
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    location TEXT,
    accuracy INTEGER,
    photo TEXT,
    status TEXT DEFAULT 'Open',
    createdAt TEXT
  )
`);

export default db;
