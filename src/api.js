const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5001"
    : "https://outdoor-reporting.onrender.com")
).replace(/\/$/, "");

const API_URL = `${API_BASE_URL}/api/reports`;

async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `API request failed (${response.status})${detail ? `: ${detail}` : ""}`
    );
  }

  return response.json();
}

// Get all reports from the server
export function fetchReports() {
  return request(API_URL);
}

// Create a new report
export function createReport(report) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report)
  });
}

// Update an existing report
export function updateReport(id, report) {
  return request(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report)
  });
}

// Delete a report
export function removeReport(id) {
  return request(`${API_URL}/${id}`, { method: "DELETE" });
}
