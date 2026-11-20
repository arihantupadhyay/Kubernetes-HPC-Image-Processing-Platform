
import { useState, useEffect } from "react";
import axios from "axios";
import Analytics from "./Analytics";
import "./App.css";

const API = "http://localhost:5001";

const operations = [
  {
    id: "resize",
    icon: "↔",
    title: "Resize Image",
    description: "Optimize image dimensions",
  },
  {
    id: "grayscale",
    icon: "◐",
    title: "Grayscale",
    description: "Convert image to black and white",
  },
  {
    id: "blur",
    icon: "◉",
    title: "Gaussian Blur",
    description: "Apply smooth blur effect",
  },
  {
    id: "sharpen",
    icon: "✧",
    title: "Sharpen",
    description: "Enhance image sharpness",
  },
];

function App() {
  const [page, setPage] = useState("dashboard");
  const [files, setFiles] = useState([]);
  const [operation, setOperation] = useState("resize");
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [message, setMessage] = useState("");
  const [jobs, setJobs] = useState([]);
  const [monitor, setMonitor] = useState(null);
  const [processedImages, setProcessedImages] = useState([]);
  const [apiError, setApiError] = useState("");

  const refreshData = async () => {
    setRefreshing(true);

    try {
      const [jobResponse, monitorResponse, imageResponse] =
        await Promise.all([
          axios.get(`${API}/api/jobs`),
          axios.get(`${API}/api/monitor`),
          axios.get(`${API}/api/processed`),
        ]);

      setJobs(jobResponse.data.jobs || []);
      setMonitor(monitorResponse.data);
      setProcessedImages(imageResponse.data.images || []);
      setApiError("");
    } catch (error) {
      console.error("Refresh error:", error);

      setApiError(
        error.response?.data?.message ||
          error.message ||
          "Unable to connect to backend"
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();

    const interval = setInterval(refreshData, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setFiles((previous) => {
      const combined = [...previous, ...selectedFiles];

      return combined.filter(
        (file, index, array) =>
          array.findIndex(
            (item) =>
              item.name === file.name &&
              item.size === file.size &&
              item.lastModified === file.lastModified
          ) === index
      );
    });

    setMessage("");
    event.target.value = "";
  };

  const removeSelectedImage = (index) => {
    setFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index)
    );

    setMessage("Selected image removed.");
  };

  const removeAllSelectedImages = () => {
    setFiles([]);
    setMessage("All selected images removed.");

    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage("Please select images first.");
      return;
    }

    const formData = new FormData();
    formData.append("operation", operation);

    files.forEach((file) => {
      formData.append("images", file);
    });

    try {
      setUploading(true);
      setMessage("");

      const response = await axios.post(
        `${API}/api/upload`,
        formData
      );

      setMessage(
        `${response.data.totalImages} images submitted successfully for ${operation}!`
      );

      setFiles([]);

      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";

      await refreshData();
    } catch (error) {
      console.error("Upload error:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Image upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (filename) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${filename}?`
    );

    if (!confirmed) return;

    try {
      setDeleting(filename);

      await axios.delete(
        `${API}/api/processed/${encodeURIComponent(filename)}`
      );

      setProcessedImages((previous) =>
        previous.filter((image) => image.filename !== filename)
      );

      setMessage("Image deleted successfully.");
    } catch (error) {
      alert(
        error.response?.data?.message || "Could not delete image."
      );
    } finally {
      setDeleting("");
    }
  };

  const deleteAllImages = async () => {
    if (processedImages.length === 0) return;

    const confirmed = window.confirm(
      `Delete all ${processedImages.length} processed images? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting("all");

      const response = await axios.delete(`${API}/api/processed`);

      setProcessedImages([]);
      setMessage(
        `${response.data.deletedCount} processed images deleted successfully.`
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Could not delete processed images."
      );
    } finally {
      setDeleting("");
    }
  };

  const queue = monitor?.queue || {};
  const workers = monitor?.workers || [];

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "processing", label: "Image Processing", icon: "▧" },
    { id: "history", label: "Job History", icon: "◷" },
    { id: "monitor", label: "System Monitor", icon: "⚙" },
    { id: "analytics", label: "AI & HPC Analytics", icon: "◈" },
  ];

  const getStatusClass = (status) => {
    if (status === "completed") return "status-completed";
    if (status === "active") return "status-active";
    if (status === "failed") return "status-failed";
    return "status-waiting";
  };

  const getWorkerStatus = (job) => {
    if (job.worker) return job.worker;
    if (job.status === "waiting") return "Waiting for worker";
    if (job.status === "active") return "Assigning worker...";
    return "Not assigned";
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>
          HPC<span>Cloud</span>
        </h2>

        <p className="menu-title">MAIN MENU</p>

        {navigation.map((item) => (
          <button
            key={item.id}
            className={`menu ${page === item.id ? "active" : ""}`}
            onClick={() => setPage(item.id)}
          >
            {item.icon} {item.label}
          </button>
        ))}

        <div className="sidebar-bottom">
          Kubernetes Cluster
          <br />
          <span>● Connected</span>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <p className="subtitle">
              DISTRIBUTED HIGH PERFORMANCE COMPUTING
            </p>

            <h1>
              {navigation.find((item) => item.id === page)?.label}
            </h1>
          </div>

          <div className="connection">● System Online</div>
        </header>

        {apiError && (
          <div className="error-message">
            Backend connection issue: {apiError}
          </div>
        )}

        {page === "dashboard" && (
          <>
            <section className="stats">
              <div className="stat-card">
                <p>Total Jobs</p>
                <h2>{jobs.length}</h2>
                <span>Recorded jobs</span>
              </div>

              <div className="stat-card">
                <p>Active Jobs</p>
                <h2>{queue.active || 0}</h2>
                <span>Currently processing</span>
              </div>

              <div className="stat-card">
                <p>Completed Jobs</p>
                <h2>{queue.completed || 0}</h2>
                <span>Successfully completed</span>
              </div>

              <div className="stat-card">
                <p>Failed Jobs</p>
                <h2>{queue.failed || 0}</h2>
                <span>Processing failures</span>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel">
                <h2>Quick Image Processing</h2>
                <p>Upload and process multiple images.</p>

                <button
                  className="upload-button"
                  onClick={() => setPage("processing")}
                >
                  Open Image Processing
                </button>
              </div>

              <div className="panel">
                <h2>Worker Activity</h2>
                <p>Workers recorded in processing jobs</p>

                {workers.length > 0 ? (
                  workers.map((worker) => (
                    <div className="worker" key={worker}>
                      <div className="worker-icon">W</div>

                      <div className="worker-info">
                        <strong>{worker}</strong>
                        <span>Kubernetes worker pod</span>
                      </div>

                      <span className="worker-status">
                        ● Recorded
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    No worker activity recorded yet.
                  </div>
                )}
              </div>
            </section>

            <section className="panel activity">
              <h2>Recent Jobs</h2>

              {jobs.length === 0 ? (
                <div className="empty-state">No jobs yet.</div>
              ) : (
                jobs.slice(0, 5).map((job) => (
                  <div className="recent-job" key={job.id}>
                    <div>
                      <strong>{job.filename}</strong>
                      <span>{job.operation}</span>
                    </div>

                    <span
                      className={`status-badge ${getStatusClass(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {page === "processing" && (
          <section className="panel upload-panel">
            <h2>Image Processing Center</h2>
            <p>Select an operation and upload your images.</p>

            <div className="operation-selector">
              <h3>Select Processing Operation</h3>

              <div className="operation-grid">
                {operations.map((item) => (
                  <button
                    key={item.id}
                    className={`operation-card ${
                      operation === item.id ? "selected" : ""
                    }`}
                    onClick={() => setOperation(item.id)}
                  >
                    <span className="operation-icon">{item.icon}</span>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>

                    {operation === item.id && (
                      <span className="selected-label">
                        ✓ Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <label className="upload-area">
              <div className="upload-icon">↑</div>
              <h3>Choose images to upload</h3>
              <p>Select multiple JPG, PNG or WebP files</p>

              <input
                id="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFiles}
              />

              <span className="choose-btn">Browse Files</span>
            </label>

            {files.length > 0 && (
              <div className="selected-files">
                <div className="panel-heading">
                  <div>
                    <h3>{files.length} images selected</h3>
                    <p>Remove images you don't want to process.</p>
                  </div>

                  <button
                    type="button"
                    className="delete-all-button"
                    onClick={removeAllSelectedImages}
                    disabled={uploading}
                  >
                    Remove All
                  </button>
                </div>

                <div className="selected-image-list">
                  {files.map((file, index) => (
                    <div
                      className="selected-image-item"
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    >
                      <div className="selected-image-info">
                        <span className="selected-image-icon">▧</span>

                        <div>
                          <strong>{file.name}</strong>
                          <span>
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="remove-selected-button"
                        onClick={() => removeSelectedImage(index)}
                        disabled={uploading}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="upload-button"
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0}
                >
                  {uploading ? "Processing Images..." : "Process Images"}
                </button>
              </div>
            )}

            {message && <p className="upload-message">{message}</p>}
          </section>
        )}

        {page === "history" && (
          <section className="panel activity">
            <div className="panel-heading">
              <div>
                <h2>Job History</h2>
                <p>Image processing job records</p>
              </div>

              <button
                className="upload-button"
                onClick={refreshData}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="table-scroll">
              <table className="job-table">
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Image</th>
                    <th>Operation</th>
                    <th>Status</th>
                    <th>Worker Pod</th>
                  </tr>
                </thead>

                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.id}</td>
                      <td>{job.filename}</td>
                      <td>{job.operation}</td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td>{getWorkerStatus(job)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {jobs.length === 0 && (
              <div className="empty-state">
                No job history available.
              </div>
            )}
          </section>
        )}

        {page === "monitor" && (
          <>
            <section className="stats">
              <div className="stat-card">
                <p>Waiting Jobs</p>
                <h2>{queue.waiting || 0}</h2>
                <span>Redis queue</span>
              </div>

              <div className="stat-card">
                <p>Active Jobs</p>
                <h2>{queue.active || 0}</h2>
                <span>Currently processing</span>
              </div>

              <div className="stat-card">
                <p>Completed Jobs</p>
                <h2>{queue.completed || 0}</h2>
                <span>Successfully completed</span>
              </div>

              <div className="stat-card">
                <p>Failed Jobs</p>
                <h2>{queue.failed || 0}</h2>
                <span>Failed processing jobs</span>
              </div>
            </section>

            <section className="panel activity">
              <div className="panel-heading">
                <div>
                  <h2>Worker Activity</h2>
                  <p>Worker identities recorded in processing jobs</p>
                </div>

                <button
                  className="upload-button"
                  onClick={refreshData}
                  disabled={refreshing}
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {workers.length > 0 ? (
                workers.map((worker) => (
                  <div className="worker" key={worker}>
                    <div className="worker-icon">W</div>

                    <div className="worker-info">
                      <strong>{worker}</strong>
                      <span>Kubernetes worker pod</span>
                    </div>

                    <span className="worker-status">
                      ● Recorded
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  No worker activity recorded yet.
                </div>
              )}

              <p className="monitor-time">
                Last checked:{" "}
                {monitor?.checkedAt
                  ? new Date(monitor.checkedAt).toLocaleTimeString()
                  : "Waiting for data"}
              </p>
            </section>
          </>
        )}

        {page === "analytics" && <Analytics />}

        {page !== "analytics" && (
          <section className="panel gallery-panel">
            <div className="panel-heading">
              <div>
                <h2>Processed Images Gallery</h2>
                <p>{processedImages.length} processed images saved</p>
              </div>

              <div className="gallery-actions">
                <button
                  className="refresh-button"
                  onClick={refreshData}
                  disabled={refreshing}
                >
                  {refreshing ? "Refreshing..." : "↻ Refresh"}
                </button>

                {processedImages.length > 0 && (
                  <button
                    className="delete-all-button"
                    onClick={deleteAllImages}
                    disabled={deleting !== ""}
                  >
                    {deleting === "all" ? "Deleting..." : "Delete All"}
                  </button>
                )}
              </div>
            </div>

            {processedImages.length === 0 ? (
              <div className="empty-state">
                No processed images yet.
              </div>
            ) : (
              <div className="image-gallery">
                {processedImages.map((image) => (
                  <div className="gallery-item" key={image.filename}>
                    <img
                      src={`${API}${image.url}`}
                      alt={image.filename}
                    />

                    <p>{image.filename}</p>

                    <button
                      className="delete-button"
                      onClick={() => deleteImage(image.filename)}
                      disabled={deleting !== ""}
                    >
                      {deleting === image.filename
                        ? "Deleting..."
                        : "Delete Image"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {message && <p className="upload-message">{message}</p>}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
