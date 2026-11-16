import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Camera,
  Plus,
  Search,
  Trash2,
  Pencil,
  CheckCircle2,
  ClipboardList,
  Clock3,
  AlertCircle,
  Leaf
} from "lucide-react";
import "./App.css";
import {
  saveReport as saveReportToDB,
  getAllReports,
  deleteReport as deleteReportFromDB,
  addPendingSync,
  getPendingSync,
  removePendingSync
} from "./database";
import {
  fetchReports,
  createReport,
  updateReport,
  removeReport
} from "./api";

const categories = [
  "Path or road",
  "Broken equipment",
  "Litter or dumping",
  "Lighting",
  "Wildlife",
  "Other"
];

const starterReports = [
  {
    id: 1,
    title: "Damaged park bench",
    category: "Broken equipment",
    description: "One of the wooden boards on the bench is loose.",
    location: "Location not added",
    status: "Open",
    createdAt: new Date().toISOString(),
    photo: ""
  },
  {
    id: 2,
    title: "Litter near the entrance",
    category: "Litter or dumping",
    description: "Several items of litter have been left beside the main entrance.",
    location: "Location not added",
    status: "In progress",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    photo: ""
  }
];

function readReports() {
  try {
    const saved = localStorage.getItem("outdoorReports");
    return saved ? JSON.parse(saved) : starterReports;
  } catch {
    return starterReports;
  }
}

const emptyForm = {
  title: "",
  category: categories[0],
  description: "",
  location: "",
  accuracy: null,
  photo: ""
};

function App() {
  const [reports, setReports] = useState(starterReports);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [activePage, setActivePage] = useState("reports");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    async function loadReports() {
      try {
        // First, try to get reports from the server
        const serverReports = await fetchReports();

        setReports(serverReports);

        // Save server reports to local storage
        localStorage.setItem(
          "outdoorReports",
          JSON.stringify(serverReports)
        );

        // Save server reports to IndexedDB
        for (const report of serverReports) {
          await saveReportToDB(report);
        }

      } catch (serverError) {
        console.error("Could not connect to server:", serverError);

        try {
          // If the server is unavailable, load local reports
          const savedReports = await getAllReports();

          const oldReportsText = localStorage.getItem("outdoorReports");
          const oldReports = oldReportsText
            ? JSON.parse(oldReportsText)
            : [];

          const combinedReports = [...savedReports];

          for (const report of oldReports) {
            const alreadyExists = combinedReports.some(
              (saved) => saved.id === report.id
            );

            if (!alreadyExists) {
              combinedReports.push(report);
            }
          }

          if (combinedReports.length === 0) {
            combinedReports.push(...starterReports);
          }

          setReports(combinedReports);

          for (const report of combinedReports) {
            await saveReportToDB(report);
          }

        } catch (localError) {
          console.error("Failed to load local reports:", localError);
          setReports(starterReports);
          setMessage("Could not load saved reports.");
        }

      } finally {
        setReportsLoaded(true);
      }
    }

    loadReports();
  }, []);

  useEffect(() => {
    async function saveReportsToDatabase() {
      if (!reportsLoaded) return;

      try {
        // Save reports to IndexedDB
        for (const report of reports) {
          await saveReportToDB(report);
        }

        // Back up reports to Local Storage
        localStorage.setItem(
          "outdoorReports",
          JSON.stringify(reports)
        );

      } catch (error) {
        console.error("Failed to save reports:", error);
        console.error("Error name:", error?.name);
        console.error("Error message:", error?.message);
        setMessage(`Save failed: ${error?.name || "Unknown"} - ${error?.message || String(error)}`);
      }
    }

    saveReportsToDatabase();
  }, [reports, reportsLoaded]);

  useEffect(() => {
    if (cameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Automatically synchronise reports when the network is restored
  useEffect(() => {
    function handleOnline() {
      console.log("Network restored. Starting synchronisation...");
      syncPendingOperations();
    }

    window.addEventListener("online", handleOnline);

    // Check for pending operations when the app starts
    if (navigator.onLine) {
      console.log("App started online. Checking pending synchronisation...");
      syncPendingOperations();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        const matchesSearch = `${report.title} ${report.category} ${report.description}`
          .toLowerCase()
          .includes(search.toLowerCase());

        const matchesStatus =
          statusFilter === "All" || report.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [reports, search, statusFilter]);

  const openCount = reports.filter((report) => report.status === "Open").length;
  const progressCount = reports.filter(
    (report) => report.status === "In progress"
  ).length;
  const resolvedCount = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  function showMessage(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function getLocation() {
    if (!navigator.geolocation) {
      showMessage("Geolocation is not supported by this browser.");
      return;
    }

    showMessage("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const accuracy = position.coords.accuracy;
        console.log("GPS accuracy:", accuracy);

        setForm((current) => ({
          ...current,
          location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          accuracy: Math.round(accuracy)
        }));

        showMessage("Location added successfully.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          showMessage("Location permission was denied.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          showMessage("Location information is unavailable.");
        } else if (error.code === error.TIMEOUT) {
          showMessage("Location request timed out. Please try again.");
        } else {
          showMessage("Could not get your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  function addPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("Please choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, photo: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  async function startCamera() {
    try {
      console.log("Camera diagnostic:", {
        secureContext: window.isSecureContext,
        mediaDevices: navigator.mediaDevices,
        getUserMedia: navigator.mediaDevices?.getUserMedia,
        standalone: window.matchMedia("(display-mode: standalone)").matches,
        origin: window.location.origin
      });

      if (!navigator.mediaDevices) {
        showMessage(
          `Camera unavailable. Secure: ${window.isSecureContext}, Legacy API: ${typeof navigator.getUserMedia}, WebKit API: ${typeof navigator.webkitGetUserMedia}`
        );
        return;
      }

      if (!navigator.mediaDevices.getUserMedia) {
        showMessage("getUserMedia is unavailable.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);

    } catch (error) {
      console.error("Camera error:", error);
      showMessage(`Camera failed: ${error.name} - ${error.message}`);
    }
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    setCameraOpen(false);
  }

  function takePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      showMessage("Camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      showMessage("Could not capture the photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = canvas.toDataURL("image/jpeg", 0.85);

    setForm((current) => ({
      ...current,
      photo
    }));

    stopCamera();
    showMessage("Photo captured successfully.");
  }

  async function syncPendingOperations() {
    try {
      const pendingOperations = await getPendingSync();

      for (const operation of pendingOperations) {
        try {
          if (operation.type === "create") {
            await createReport(operation.report);

          } else if (operation.type === "update") {
            await updateReport(
              operation.report.id,
              operation.report
            );

          } else if (operation.type === "delete") {
            await removeReport(operation.reportId);
          }

          await removePendingSync(operation.id);

        } catch (error) {
          console.error("Sync operation failed:", error);
          showMessage("Some reports could not be synchronised.");
          return;
        }
      }

      const serverReports = await fetchReports();

      setReports(serverReports);

      showMessage("Reports synchronised successfully.");

    } catch (error) {
      console.error("Could not synchronise reports:", error);
      showMessage("Could not synchronise reports.");
    }
  }

  async function saveReport(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      showMessage("Please add a title and description.");
      return;
    }

    try {
      if (editingId !== null) {
        // Prepare the updated report
        const existingReport = reports.find(
          (report) => report.id === editingId
        );

        const updatedReport = {
          ...existingReport,
          ...form,
          id: editingId
        };

        // Save locally first
        await saveReportToDB(updatedReport);

        try {
          // Try to update the server
          const serverReport = await updateReport(
            editingId,
            updatedReport
          );

          setReports((current) =>
            current.map((report) =>
              report.id === editingId ? serverReport : report
            )
          );

          showMessage("Report updated and synchronised.");

        } catch (error) {
          // Keep the update for later synchronisation
          await addPendingSync({
            type: "update",
            report: updatedReport
          });

          setReports((current) =>
            current.map((report) =>
              report.id === editingId ? updatedReport : report
            )
          );

          showMessage("Report saved offline. It will sync later.");
        }

      } else {
        // Create a new report with a local ID
        const newReport = {
          ...form,
          id: Date.now(),
          status: "Open",
          createdAt: new Date().toISOString()
        };

        // Save locally first
        await saveReportToDB(newReport);

        try {
          // Try to create the report on the server
          const savedReport = await createReport(newReport);

          setReports((current) => [savedReport, ...current]);

          showMessage("Report submitted.");

        } catch (error) {
          // Add the report to the offline sync queue
          await addPendingSync({
            type: "create",
            report: newReport
          });

          setReports((current) => [newReport, ...current]);

          showMessage("Report saved offline. It will sync later.");
        }
      }

    } catch (error) {
      console.error("Failed to save report:", error);
      showMessage("Could not save report locally.");
      return;
    }

    stopCamera();
    setForm(emptyForm);
    setEditingId(null);
    setActivePage("reports");
  }

  async function deleteReport(id) {
    if (!window.confirm("Delete this report?")) return;

    try {
      // Delete the report from local IndexedDB first
      await deleteReportFromDB(id);

      // Update React state
      const updatedReports = reports.filter(
        (report) => report.id !== id
      );

      setReports(updatedReports);

      // Update Local Storage
      localStorage.setItem(
        "outdoorReports",
        JSON.stringify(updatedReports)
      );

      try {
        // Try to delete the report from the server
        await removeReport(id);

        showMessage("Report deleted.");

      } catch (error) {
        // Save the delete operation for later synchronisation
        await addPendingSync({
          type: "delete",
          reportId: id
        });

        showMessage("Deletion saved offline. It will sync later.");
      }

    } catch (error) {
      console.error("Failed to delete report:", error);
      showMessage("Could not delete report locally.");
    }
  }

  function editReport(report) {
    stopCamera();

    setForm({
      title: report.title || "",
      category: report.category || categories[0],
      description: report.description || "",
      location: report.location || "",
      accuracy: report.accuracy ?? null,
      photo: report.photo || ""
    });

    setEditingId(report.id);
    setActivePage("form");
  }

  async function changeStatus(id, status) {
    const existingReport = reports.find(
      (report) => report.id === id
    );

    if (!existingReport) {
      showMessage("Report not found.");
      return;
    }

    const updatedReport = {
      ...existingReport,
      status
    };

    try {
      // Save the updated report locally first
      await saveReportToDB(updatedReport);

      try {
        // Try to update the server
        const serverReport = await updateReport(
          id,
          updatedReport
        );

        setReports((current) =>
          current.map((report) =>
            report.id === id ? serverReport : report
          )
        );

        showMessage("Report status updated and synchronised.");

      } catch (error) {
        // Save the update for later synchronisation
        await addPendingSync({
          type: "update",
          report: updatedReport
        });

        setReports((current) =>
          current.map((report) =>
            report.id === id ? updatedReport : report
          )
        );

        showMessage("Status saved offline. It will sync later.");
      }

    } catch (error) {
      console.error("Failed to update report status:", error);
      showMessage("Could not save report status.");
    }
  }

  function cancelForm() {
    stopCamera();
    setForm(emptyForm);
    setEditingId(null);
    setActivePage("reports");
  }

  function openNewReport() {
    stopCamera();
    setForm(emptyForm);
    setEditingId(null);
    setActivePage("form");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={21} />
          </div>
          <div>
            <strong>FieldNote</strong>
            <span>Outdoor reporting</span>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        <button
          className={`nav-link ${activePage === "reports" ? "active" : ""}`}
          onClick={() => {
            stopCamera();
            setActivePage("reports");
          }}
        >
          <ClipboardList size={18} /> Reports
        </button>

        <button
          className={`nav-link ${activePage === "form" ? "active" : ""}`}
          onClick={openNewReport}
        >
          <Plus size={18} /> New report
        </button>

        <div className="sidebar-note">
          <span className="note-dot" />
          <div>
            <strong>Local workspace</strong>
            <p>Reports are saved in this browser on this device.</p>
          </div>
        </div>

        <div className="sidebar-footer">
          Outdoor Reporting · Project prototype
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">COMMUNITY MAINTENANCE</p>
            <h1>
              {activePage === "form"
                ? editingId
                  ? "Edit report"
                  : "Create a report"
                : "Reports overview"}
            </h1>
          </div>

          <button className="primary-button" onClick={openNewReport}>
            <Plus size={17} /> New report
          </button>
        </header>

        {message && (
          <div className="toast">
            <CheckCircle2 size={17} />
            {message}
          </div>
        )}

        {activePage === "reports" ? (
          <>
            <section className="welcome-panel">
              <div>
                <span className="welcome-kicker">
                  A BETTER OUTDOOR SPACE STARTS HERE
                </span>
                <h2>
                  Keep track of the little things
                  <br />
                  that make a big difference.
                </h2>
                <p>
                  Record maintenance issues in parks, paths and shared outdoor
                  areas.
                </p>
              </div>
              <div className="welcome-icon">
                <Leaf size={58} strokeWidth={1.2} />
              </div>
            </section>

            <section className="stats-grid">
              <StatCard
                label="Open reports"
                value={openCount}
                icon={<AlertCircle size={19} />}
                tone="orange"
              />
              <StatCard
                label="In progress"
                value={progressCount}
                icon={<Clock3 size={19} />}
                tone="blue"
              />
              <StatCard
                label="Resolved"
                value={resolvedCount}
                icon={<CheckCircle2 size={19} />}
                tone="green"
              />
              <StatCard
                label="All reports"
                value={reports.length}
                icon={<ClipboardList size={19} />}
                tone="purple"
              />
            </section>

            <section className="reports-section">
              <div className="section-heading">
                <div>
                  <h2>Recent reports</h2>
                  <p>Review and update submitted issues.</p>
                </div>
                <span className="report-total">
                  {filteredReports.length} items
                </span>
              </div>

              <div className="toolbar">
                <div className="search-box">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search reports..."
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by status"
                >
                  <option>All</option>
                  <option>Open</option>
                  <option>In progress</option>
                  <option>Resolved</option>
                </select>
              </div>

              <div className="report-list">
                {filteredReports.length === 0 ? (
                  <div className="empty-state">
                    <ClipboardList size={34} />
                    <h3>No reports found</h3>
                    <p>
                      Try changing your search or create a new report.
                    </p>
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <article className="report-card" key={report.id}>
                      <div className="report-image">
                        {report.photo ? (
                          <img src={report.photo} alt="" />
                        ) : (
                          <div className="image-placeholder">
                            <Leaf size={25} />
                          </div>
                        )}
                      </div>

                      <div className="report-info">
                        <div className="report-title-line">
                          <h3>{report.title}</h3>
                          <StatusBadge status={report.status} />
                        </div>

                        <span className="category-label">
                          {report.category}
                        </span>
                        <p>{report.description}</p>

                        <div className="report-meta">
                          <span>
                            <MapPin size={14} />
                            {report.location || "Location not added"}
                          </span>
                          <span>
                            {report.createdAt
                              ? new Date(report.createdAt).toLocaleString()
                              : "Date unavailable"}
                          </span>
                        </div>
                      </div>

                      <div className="report-actions">
                        <select
                          value={report.status}
                          onChange={(event) =>
                            changeStatus(report.id, event.target.value)
                          }
                          aria-label={`Status for ${report.title}`}
                        >
                          <option>Open</option>
                          <option>In progress</option>
                          <option>Resolved</option>
                        </select>

                        <button
                          className="icon-button"
                          onClick={() => editReport(report)}
                          aria-label="Edit report"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          className="icon-button danger"
                          onClick={() => deleteReport(report.id)}
                          aria-label="Delete report"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="form-panel">
            <div className="form-intro">
              <span className="form-icon">
                <ClipboardList size={22} />
              </span>
              <div>
                <h2>Issue details</h2>
                <p>
                  Give enough information for someone to understand the
                  problem.
                </p>
              </div>
            </div>

            <form onSubmit={saveReport}>
              <div className="form-grid">
                <label className="field full-width">
                  <span>
                    Report title <b>*</b>
                  </span>
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateField}
                    placeholder="e.g. Broken light beside the footpath"
                    required
                  />
                </label>

                <label className="field">
                  <span>Category</span>
                  <select
                    name="category"
                    value={form.category}
                    onChange={updateField}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <div className="field">
                  <span>Location</span>
                  <div className="location-row">
                    <input
                      name="location"
                      value={form.location}
                      onChange={updateField}
                      placeholder="Add coordinates or a place name"
                    />
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={getLocation}
                    >
                      <MapPin size={16} /> Get location
                    </button>
                  </div>
                  <small>Allow location access when your browser asks.</small>
                  {form.accuracy !== null && (
                    <small className="accuracy-info">
                      GPS accuracy: ±{form.accuracy} metres
                    </small>
                  )}
                </div>

                <label className="field full-width">
                  <span>
                    Description <b>*</b>
                  </span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    placeholder="Describe what you noticed..."
                    rows="5"
                    required
                  />
                </label>

                <div className="field full-width">
                  <span>Photo</span>

                  {cameraOpen ? (
                    <div className="camera-panel">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="camera-preview"
                      />

                      <div className="camera-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={takePhoto}
                        >
                          <Camera size={17} /> Take photo
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={stopCamera}
                        >
                          Close camera
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="camera-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={startCamera}
                        >
                          <Camera size={17} /> Open camera
                        </button>
                      </div>

                      <label className="upload-box">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={addPhoto}
                        />

                        {form.photo ? (
                          <img
                            className="photo-preview"
                            src={form.photo}
                            alt="Selected report"
                          />
                        ) : (
                          <>
                            <span className="upload-icon">
                              <Camera size={22} />
                            </span>
                            <strong>Add a photo</strong>
                            <small>
                              Choose an image from your device.
                            </small>
                          </>
                        )}
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="form-footer">
                <span>
                  <b>*</b> Required fields
                </span>
                <div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={cancelForm}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">
                    {editingId ? "Save changes" : "Submit report"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const className = status.toLowerCase().replace(" ", "-");
  return <span className={`status-badge ${className}`}>{status}</span>;
}

export default App;