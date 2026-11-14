import express from "express";
import cors from "cors";
import db from "./database.js";

const app = express();
const PORT = 5001;
// Insert starter reports if the database is empty
const reportCount = db
  .prepare("SELECT COUNT(*) AS count FROM reports")
  .get();

if (reportCount.count === 0) {
  const insertReport = db.prepare(`
    INSERT INTO reports
    (id, title, category, description, location, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertReport.run(
    1,
    "Damaged park bench",
    "Broken equipment",
    "One of the wooden boards on the bench is loose.",
    "Location not added",
    "Open"
  );

  insertReport.run(
    2,
    "Litter near the entrance",
    "Litter or dumping",
    "Several items of litter have been left beside the main entrance.",
    "Location not added",
    "In progress"
  );
}

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.send("FieldNote API server is running!");
  });
  
console.log("API reports route is being registered");

  // Get all reports from SQLite
app.get("/api/reports", (req, res) => {
    const reports = db
      .prepare("SELECT * FROM reports ORDER BY createdAt DESC")
      .all();
  
    res.json(reports);
  });

  // Add a new report to SQLite
app.post("/api/reports", (req, res) => {
    const newReport = {
      id: Date.now(),
      ...req.body,
      status: "Open"
    };
  
    const insertReport = db.prepare(`
      INSERT INTO reports
      (id, title, category, description, location, accuracy, photo, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  
    insertReport.run(
      newReport.id,
      newReport.title,
      newReport.category,
      newReport.description,
      newReport.location,
      newReport.accuracy ?? null,
      newReport.photo || "",
      newReport.status,
      newReport.createdAt || new Date().toISOString()
    );
  
    res.status(201).json(newReport);
  });

  // Update a report in SQLite
app.put("/api/reports/:id", (req, res) => {
    const id = Number(req.params.id);
  
    const existingReport = db
      .prepare("SELECT * FROM reports WHERE id = ?")
      .get(id);
  
    if (!existingReport) {
      return res.status(404).json({
        message: "Report not found"
      });
    }
  
    const updatedReport = {
      ...existingReport,
      ...req.body,
      id
    };
  
    db.prepare(`
      UPDATE reports
      SET title = ?,
          category = ?,
          description = ?,
          location = ?,
          accuracy = ?,
          photo = ?,
          status = ?,
          createdAt = ?
      WHERE id = ?
    `).run(
      updatedReport.title,
      updatedReport.category,
      updatedReport.description,
      updatedReport.location,
      updatedReport.accuracy ?? null,
      updatedReport.photo || "",
      updatedReport.status,
      updatedReport.createdAt || null,
      id
    );
  
    res.json(updatedReport);
  });

  // Delete a report from SQLite
app.delete("/api/reports/:id", (req, res) => {
    const id = Number(req.params.id);
  
    const result = db
      .prepare("DELETE FROM reports WHERE id = ?")
      .run(id);
  
    if (result.changes === 0) {
      return res.status(404).json({
        message: "Report not found"
      });
    }
  
    res.json({
      message: "Report deleted successfully"
    });
  });

// Start server
app.listen(PORT, () => {
  console.log(`FieldNote server is running on http://localhost:${PORT}`);
});