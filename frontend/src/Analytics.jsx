
import { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const API = "http://localhost:5001";

const COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f87171"];

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(2)} KB`;
}

function Analytics() {
  const [data, setData] = useState(null);
  const [mlResults, setMlResults] = useState(null);
  const [mlError, setMlError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/api/analytics`);
      setData(response.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load analytics"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMLResults = async () => {
    try {
      const response = await axios.get(`${API}/api/ml-results`);
      setMlResults(response.data);
      setMlError("");
    } catch (err) {
      setMlError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load ML results"
      );
    }
  };

  const fetchAll = async () => {
    await Promise.all([fetchAnalytics(), fetchMLResults()]);
  };

  useEffect(() => {
    fetchAll();

    const interval = setInterval(fetchAll, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="panel">
        <h2>Loading Analytics...</h2>
        <p>Collecting Kubernetes processing metrics.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel analytics-error">
        <h2>Analytics unavailable</h2>
        <p>{error}</p>
        <button className="upload-button" onClick={fetchAll}>
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const jobs = data?.jobs || [];

  const measuredJobs = jobs.filter(
    (job) =>
      job.status === "completed" &&
      Number.isFinite(Number(job.processingTimeSeconds)) &&
      job.input &&
      job.output
  );

  const completed = summary.completedJobs || 0;
  const failed = summary.failedJobs || 0;
  const successRate = summary.successRate || 0;

  const averageTime =
    measuredJobs.length > 0
      ? measuredJobs.reduce(
          (total, job) => total + Number(job.processingTimeSeconds),
          0
        ) / measuredJobs.length
      : 0;

  const totalInput = measuredJobs.reduce(
    (total, job) => total + Number(job.input.sizeBytes || 0),
    0
  );

  const totalOutput = measuredJobs.reduce(
    (total, job) => total + Number(job.output.sizeBytes || 0),
    0
  );

  const compression =
    totalInput > 0
      ? ((totalInput - totalOutput) / totalInput) * 100
      : 0;

  const workerMap = {};

  measuredJobs.forEach((job) => {
    const name = job.worker || "Unknown worker";
    workerMap[name] = (workerMap[name] || 0) + 1;
  });

  const workerData = Object.entries(workerMap).map(([worker, count]) => ({
    worker: worker.replace("image-worker-", "worker-"),
    jobs: count,
  }));

  const recentMeasured = [...measuredJobs]
    .reverse()
    .slice(-12)
    .map((job) => ({
      job: `#${job.id}`,
      seconds: Number(job.processingTimeSeconds),
    }));

  const imageSizeData = measuredJobs
    .slice(0, 10)
    .reverse()
    .map((job) => ({
      job: `#${job.id}`,
      input: Number((job.input.sizeBytes / 1024).toFixed(2)),
      output: Number((job.output.sizeBytes / 1024).toFixed(2)),
    }));

  const operationMap = {};

  measuredJobs.forEach((job) => {
    const name = job.operation || "Unknown";
    operationMap[name] = (operationMap[name] || 0) + 1;
  });

  const operationData = Object.entries(operationMap).map(
    ([name, value]) => ({
      name,
      value,
    })
  );

  const statusData = [
    { name: "Completed", value: completed },
    { name: "Failed", value: failed },
  ].filter((item) => item.value > 0);

  const latestJob = measuredJobs[0];

  return (
    <div className="analytics-page">
      <div className="analytics-heading">
        <div>
          <h2>AI & HPC Analytics</h2>
          <p>
            Real-time performance intelligence from your
            Kubernetes image processing cluster.
          </p>
        </div>

        <button className="refresh-button" onClick={fetchAll}>
          ↻ Refresh Analytics
        </button>
      </div>

      <div className="analytics-live">
        <span className="live-dot"></span>
        Live data · Auto refresh every 5 seconds
        <span>
          {data?.checkedAt
            ? new Date(data.checkedAt).toLocaleTimeString()
            : ""}
        </span>
      </div>

      <section className="stats analytics-stats">
        <div className="stat-card">
          <p>Total Jobs</p>
          <h2>{summary.totalJobs || 0}</h2>
          <span>All recorded jobs</span>
        </div>

        <div className="stat-card">
          <p>Success Rate</p>
          <h2>{successRate}%</h2>
          <span>Completed successfully</span>
        </div>

        <div className="stat-card">
          <p>Average Processing Time</p>
          <h2>{averageTime.toFixed(3)}s</h2>
          <span>{measuredJobs.length} measured jobs</span>
        </div>

        <div className="stat-card">
          <p>Image Size Reduction</p>
          <h2>{compression.toFixed(1)}%</h2>
          <span>Combined measured image sizes</span>
        </div>
      </section>

      <section className="analytics-grid">
        <div className="panel analytics-panel">
          <h2>Job Status Distribution</h2>
          <p>Completed and failed jobs</p>

          {statusData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={270}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {statusData.map((item, index) => (
                      <Cell key={item.name} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              No job status data available.
            </div>
          )}
        </div>

        <div className="panel analytics-panel">
          <h2>Operation Distribution</h2>
          <p>Successfully measured operations</p>

          {operationData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={operationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263247" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #334155",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    name="Jobs"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              No measured operations available.
            </div>
          )}
        </div>
      </section>

      <section className="panel analytics-panel analytics-wide">
        <h2>Processing Time Performance</h2>
        <p>Actual processing time for the latest measured jobs</p>

        {recentMeasured.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={recentMeasured}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263247" />
                <XAxis dataKey="job" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" unit="s" />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #334155",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="seconds"
                  name="Processing time"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state">
            Process images to generate performance data.
          </div>
        )}
      </section>

      <section className="panel analytics-panel analytics-wide">
        <h2>Image Input vs Output Size</h2>
        <p>File sizes in KB for measured processing jobs</p>

        {imageSizeData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={imageSizeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263247" />
                <XAxis dataKey="job" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" unit=" KB" />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #334155",
                  }}
                />
                <Legend />
                <Bar dataKey="input" name="Input size" fill="#818cf8" />
                <Bar dataKey="output" name="Output size" fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state">
            No image size metrics available.
          </div>
        )}
      </section>

      <section className="panel analytics-panel analytics-wide">
        <h2>Kubernetes Worker Performance</h2>
        <p>Measured jobs completed by each worker pod</p>

        {workerData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={workerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263247" />
                <XAxis dataKey="worker" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #334155",
                  }}
                />
                <Bar
                  dataKey="jobs"
                  name="Completed jobs"
                  fill="#818cf8"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state">
            No worker metrics available yet.
          </div>
        )}
      </section>

      <section className="analytics-grid">
        <div className="panel analytics-panel">
          <h2>Image Processing Metrics</h2>
          <p>Latest measured job details</p>

          {latestJob ? (
            <div className="metric-details">
              <div>
                <span>Job ID</span>
                <strong>#{latestJob.id}</strong>
              </div>
              <div>
                <span>Operation</span>
                <strong>{latestJob.operation}</strong>
              </div>
              <div>
                <span>Input dimensions</span>
                <strong>
                  {latestJob.input.width} × {latestJob.input.height}
                </strong>
              </div>
              <div>
                <span>Output dimensions</span>
                <strong>
                  {latestJob.output.width} × {latestJob.output.height}
                </strong>
              </div>
              <div>
                <span>Input file size</span>
                <strong>{formatBytes(latestJob.input.sizeBytes)}</strong>
              </div>
              <div>
                <span>Output file size</span>
                <strong>{formatBytes(latestJob.output.sizeBytes)}</strong>
              </div>
              <div>
                <span>Processing duration</span>
                <strong>{latestJob.processingTimeSeconds}s</strong>
              </div>
              <div>
                <span>Image format</span>
                <strong>{latestJob.input.format || "Unknown"}</strong>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              No measured image details available.
            </div>
          )}
        </div>

        <div className="panel analytics-panel">
          <h2>AI Prediction Model</h2>
          <p>Real machine learning training and test results</p>

          {mlError ? (
            <div className="empty-state">
              Unable to load ML results: {mlError}
            </div>
          ) : mlResults ? (
            <>
              <div className="model-status">
                <span className="model-icon">AI</span>
                <div>
                  <strong>{mlResults.modelName}</strong>
                  <span>
                    {mlResults.status === "trained"
                      ? "Training completed"
                      : "Model status: " + mlResults.status}
                  </span>
                </div>
              </div>

              <div className="metric-details">
                <div>
                  <span>Target</span>
                  <strong>{mlResults.target}</strong>
                </div>
                <div>
                  <span>Total records</span>
                  <strong>{mlResults.totalRecords}</strong>
                </div>
                <div>
                  <span>Training records</span>
                  <strong>{mlResults.trainingRecords}</strong>
                </div>
                <div>
                  <span>Testing records</span>
                  <strong>{mlResults.testingRecords}</strong>
                </div>
                <div>
                  <span>Mean Absolute Error (MAE)</span>
                  <strong>{Number(mlResults.maeSeconds).toFixed(4)} s</strong>
                </div>
                <div>
                  <span>R² Score</span>
                  <strong>{Number(mlResults.r2Score).toFixed(4)}</strong>
                </div>
                <div>
                  <span>Operations trained</span>
                  <strong>
                    {mlResults.operations?.join(", ") || "Not available"}
                  </strong>
                </div>
                <div>
                  <span>Training date</span>
                  <strong>
                    {mlResults.trainedAt
                      ? new Date(mlResults.trainedAt).toLocaleString()
                      : "Not available"}
                  </strong>
                </div>
              </div>

              <div className="model-note">
                <strong>
                  {Number(mlResults.r2Score) < 0
                    ? "Model performance needs improvement"
                    : "Model evaluation completed"}
                </strong>
                <p>
                  {Number(mlResults.r2Score) < 0
                    ? "The negative R² score indicates that this model performed worse than the mean baseline on the test dataset. More real training records and further model evaluation are needed."
                    : "The R² score is based on the held-out test dataset. Continue collecting real processing records to evaluate model performance."}
                </p>
                <p>
                  MAE represents the average absolute prediction error in
                  seconds. No live prediction is currently being generated.
                </p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              Loading machine learning results...
            </div>
          )}
        </div>
      </section>

      <div className="analytics-footer-note">
        Data source: Kubernetes workers · BullMQ · Redis · Python
        image processor · Scikit-learn
      </div>
    </div>
  );
}

export default Analytics;
