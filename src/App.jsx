import React from 'react';
import { useEffect, useMemo, useState } from "react";
import {
  MapPin, Camera, Plus, Search, Trash2, Pencil, CheckCircle2,
  ClipboardList, Clock3, AlertCircle, X, Leaf
} from "lucide-react";
import "./App.css";

const categories = ["Path or road", "Broken equipment", "Litter or dumping", "Lighting", "Wildlife", "Other"];

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
  photo: ""
};

function App() {
  const [reports, setReports] = useState(readReports);
  const [activePage, setActivePage] = useState("reports");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("outdoorReports", JSON.stringify(reports));
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = `${report.title} ${report.category} ${report.description}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  const openCount = reports.filter((report) => report.status === "Open").length;
  const progressCount = reports.filter((report) => report.status === "In progress").length;
  const resolvedCount = reports.filter((report) => report.status === "Resolved").length;

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

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          location: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
        }));
        showMessage("Location added.");
      },
      () => showMessage("Location could not be accessed. Check browser permissions.")
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
    reader.onload = () => setForm((current) => ({ ...current, photo: reader.result }));
    reader.readAsDataURL(file);
  }

  function saveReport(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      showMessage("Please add a title and description.");
      return;
    }

    if (editingId !== null) {
      setReports((current) =>
        current.map((report) =>
          report.id === editingId ? { ...report, ...form } : report
        )
      );
      showMessage("Report updated.");
    } else {
      const newReport = {
        ...form,
        id: Date.now(),
        status: "Open",
        createdAt: new Date().toISOString()
      };
      setReports((current) => [newReport, ...current]);
      showMessage("Report submitted.");
    }

    setForm(emptyForm);
    setEditingId(null);
    setActivePage("reports");
  }

  function editReport(report) {
    setForm({
      title: report.title,
      category: report.category,
      description: report.description,
      location: report.location,
      photo: report.photo || ""
    });
    setEditingId(report.id);
    setActivePage("form");
  }

  function deleteReport(id) {
    if (!window.confirm("Delete this report?")) return;
    setReports((current) => current.filter((report) => report.id !== id));
    showMessage("Report deleted.");
  }

  function changeStatus(id, status) {
    setReports((current) =>
      current.map((report) => report.id === id ? { ...report, status } : report)
    );
  }

  function cancelForm() {
    setForm(emptyForm);
    setEditingId(null);
    setActivePage("reports");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Leaf size={21} /></div>
          <div>
            <strong>FieldNote</strong>
            <span>Outdoor reporting</span>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>
        <button className={`nav-link ${activePage === "reports" ? "active" : ""}`} onClick={() => setActivePage("reports")}>
          <ClipboardList size={18} /> Reports
        </button>
        <button className={`nav-link ${activePage === "form" ? "active" : ""}`} onClick={() => { setForm(emptyForm); setEditingId(null); setActivePage("form"); }}>
          <Plus size={18} /> New report
        </button>

        <div className="sidebar-note">
          <span className="note-dot" />
          <div>
            <strong>Local workspace</strong>
            <p>Reports are saved in this browser on this device.</p>
          </div>
        </div>
        <div className="sidebar-footer">Outdoor Reporting · Project prototype</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">COMMUNITY MAINTENANCE</p>
            <h1>{activePage === "form" ? (editingId ? "Edit report" : "Create a report") : "Reports overview"}</h1>
          </div>
          <button className="primary-button" onClick={() => { setForm(emptyForm); setEditingId(null); setActivePage("form"); }}>
            <Plus size={17} /> New report
          </button>
        </header>

        {message && <div className="toast"><CheckCircle2 size={17} />{message}</div>}

        {activePage === "reports" ? (
          <>
            <section className="welcome-panel">
              <div>
                <span className="welcome-kicker">A BETTER OUTDOOR SPACE STARTS HERE</span>
                <h2>Keep track of the little things<br />that make a big difference.</h2>
                <p>Record maintenance issues in parks, paths and shared outdoor areas.</p>
              </div>
              <div className="welcome-icon"><Leaf size={58} strokeWidth={1.2} /></div>
            </section>

            <section className="stats-grid">
              <StatCard label="Open reports" value={openCount} icon={<AlertCircle size={19} />} tone="orange" />
              <StatCard label="In progress" value={progressCount} icon={<Clock3 size={19} />} tone="blue" />
              <StatCard label="Resolved" value={resolvedCount} icon={<CheckCircle2 size={19} />} tone="green" />
              <StatCard label="All reports" value={reports.length} icon={<ClipboardList size={19} />} tone="purple" />
            </section>

            <section className="reports-section">
              <div className="section-heading">
                <div>
                  <h2>Recent reports</h2>
                  <p>Review and update submitted issues.</p>
                </div>
                <span className="report-total">{filteredReports.length} items</span>
              </div>

              <div className="toolbar">
                <div className="search-box">
                  <Search size={17} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports..." />
                </div>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
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
                    <p>Try changing your search or create a new report.</p>
                  </div>
                ) : filteredReports.map((report) => (
                  <article className="report-card" key={report.id}>
                    <div className="report-image">
                      {report.photo ? <img src={report.photo} alt="" /> : <div className="image-placeholder"><Leaf size={25} /></div>}
                    </div>
                    <div className="report-info">
                      <div className="report-title-line">
                        <h3>{report.title}</h3>
                        <StatusBadge status={report.status} />
                      </div>
                      <span className="category-label">{report.category}</span>
                      <p>{report.description}</p>
                      <div className="report-meta">
                        <span><MapPin size={14} />{report.location || "Location not added"}</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="report-actions">
                      <select value={report.status} onChange={(event) => changeStatus(report.id, event.target.value)} aria-label={`Status for ${report.title}`}>
                        <option>Open</option>
                        <option>In progress</option>
                        <option>Resolved</option>
                      </select>
                      <button className="icon-button" onClick={() => editReport(report)} aria-label="Edit report"><Pencil size={16} /></button>
                      <button className="icon-button danger" onClick={() => deleteReport(report.id)} aria-label="Delete report"><Trash2 size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="form-panel">
            <div className="form-intro">
              <span className="form-icon"><ClipboardList size={22} /></span>
              <div>
                <h2>Issue details</h2>
                <p>Give enough information for someone to understand the problem.</p>
              </div>
            </div>
            <form onSubmit={saveReport}>
              <div className="form-grid">
                <label className="field full-width">
                  <span>Report title <b>*</b></span>
                  <input name="title" value={form.title} onChange={updateField} placeholder="e.g. Broken light beside the footpath" required />
                </label>
                <label className="field">
                  <span>Category</span>
                  <select name="category" value={form.category} onChange={updateField}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <div className="field">
                  <span>Location</span>
                  <div className="location-row">
                    <input name="location" value={form.location} onChange={updateField} placeholder="Add coordinates or a place name" />
                    <button type="button" className="secondary-button" onClick={getLocation}><MapPin size={16} /> Get location</button>
                  </div>
                  <small>Allow location access when your browser asks.</small>
                </div>
                <label className="field full-width">
                  <span>Description <b>*</b></span>
                  <textarea name="description" value={form.description} onChange={updateField} placeholder="Describe what you noticed..." rows="5" required />
                </label>
                <div className="field full-width">
                  <span>Photo</span>
                  <label className="upload-box">
                    <input type="file" accept="image/*" capture="environment" onChange={addPhoto} />
                    {form.photo ? (
                      <img className="photo-preview" src={form.photo} alt="Selected report" />
                    ) : (
                      <>
                        <span className="upload-icon"><Camera size={22} /></span>
                        <strong>Add a photo</strong>
                        <small>Choose an image from your device or take a photo.</small>
                      </>
                    )}
                  </label>
                </div>
              </div>
              <div className="form-footer">
                <span><b>*</b> Required fields</span>
                <div>
                  <button type="button" className="secondary-button" onClick={cancelForm}>Cancel</button>
                  <button type="submit" className="primary-button">{editingId ? "Save changes" : "Submit report"}</button>
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
      <div><p>{label}</p><strong>{value}</strong></div>
    </div>
  );
}

function StatusBadge({ status }) {
  const className = status.toLowerCase().replace(" ", "-");
  return <span className={`status-badge ${className}`}>{status}</span>;
}

export default App;
