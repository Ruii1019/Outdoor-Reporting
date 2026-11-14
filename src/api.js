
const API_URL = "http://localhost:5001/api/reports";

// Get all reports from the server
export async function fetchReports() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }

  return response.json();
}

// Create a new report
export async function createReport(report) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(report)
  });

  if (!response.ok) {
    throw new Error("Failed to create report");
  }

  return response.json();
}

// Update an existing report
export async function updateReport(id, report) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(report)
  });

  if (!response.ok) {
    throw new Error("Failed to update report");
  }

  return response.json();
}

// Delete a report
export async function removeReport(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to delete report");
  }

  return response.json();
}
