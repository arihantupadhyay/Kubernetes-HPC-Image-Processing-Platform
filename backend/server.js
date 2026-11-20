
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const imageQueue = require("./queue");

const app = express();
const PORT = 5001;

const uploadDir = path.join(__dirname, "uploads");
const processedDir = path.join(uploadDir, "processed");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(processedDir, { recursive: true });

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + extension;

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// Get job history with processing metrics
const getJobHistory = async () => {
  const jobs = await imageQueue.getJobs(
    ["active", "waiting", "completed", "failed", "delayed"],
    0,
    99,
    false
  );

  const history = await Promise.all(
    jobs.map(async (job) => {
      const progress =
        typeof job.progress === "object" ? job.progress : {};

      const result =
        job.returnvalue && typeof job.returnvalue === "object"
          ? job.returnvalue
          : null;

      return {
        id: job.id,
        filename: job.data.originalName || job.data.filename,
        operation: job.data.operation || "resize",
        status: await job.getState(),
        worker: result?.worker || progress.worker || null,
        createdAt: job.timestamp,
        completedAt: result?.completedAt || null,
        processingTimeSeconds:
          result?.processingTimeSeconds ?? null,
        input: result?.input || null,
        output: result?.output || null,
        metrics: result,
        error: job.failedReason || null
      };
    })
  );

  history.sort((a, b) => b.createdAt - a.createdAt);

  return history;
};

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Distributed Image Processing API is running!"
  });
});

// Upload images
app.post("/api/upload", upload.array("images", 100), async (req, res) => {
  try {
    const allowedOperations = [
      "resize",
      "grayscale",
      "blur",
      "sharpen"
    ];

    const operation = req.body.operation || "resize";

    if (!allowedOperations.includes(operation)) {
      return res.status(400).json({
        message: "Invalid processing operation"
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Please upload images"
      });
    }

    const jobs = [];

    for (const file of req.files) {
      const job = await imageQueue.add("process-image", {
        filename: file.filename,
        path: file.path,
        originalName: file.originalname,
        operation
      });

      jobs.push(job.id);
    }

    res.json({
      message: "Images submitted for processing",
      totalImages: req.files.length,
      operation,
      jobIds: jobs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Job history
app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await getJobHistory();
    res.json({ jobs });
  } catch (error) {
    console.error("Job history error:", error);
    res.status(500).json({
      message: "Could not load job history"
    });
  }
});

// AI & HPC Analytics
app.get("/api/analytics", async (req, res) => {
  try {
    const jobs = await getJobHistory();

    const completedJobs = jobs.filter(
      (job) => job.status === "completed"
    );

    const failedJobs = jobs.filter(
      (job) => job.status === "failed"
    );

    const activeJobs = jobs.filter(
      (job) => job.status === "active"
    );

    const waitingJobs = jobs.filter(
      (job) => job.status === "waiting"
    );

    const delayedJobs = jobs.filter(
      (job) => job.status === "delayed"
    );

    const measuredJobs = completedJobs.filter(
      (job) =>
        typeof job.processingTimeSeconds === "number"
    );

    const totalProcessingTime = measuredJobs.reduce(
      (total, job) => total + job.processingTimeSeconds,
      0
    );

    const averageProcessingTime =
      measuredJobs.length > 0
        ? Number(
            (totalProcessingTime / measuredJobs.length).toFixed(4)
          )
        : 0;

    const totalInputBytes = completedJobs.reduce(
      (total, job) => total + (job.input?.sizeBytes || 0),
      0
    );

    const totalOutputBytes = completedJobs.reduce(
      (total, job) => total + (job.output?.sizeBytes || 0),
      0
    );

    const terminalJobs = completedJobs.length + failedJobs.length;

    const successRate =
      terminalJobs > 0
        ? Number(
            ((completedJobs.length / terminalJobs) * 100).toFixed(2)
          )
        : 0;

    const workerStats = {};

    completedJobs.forEach((job) => {
      if (!job.worker) return;

      if (!workerStats[job.worker]) {
        workerStats[job.worker] = {
          worker: job.worker,
          completedJobs: 0,
          totalProcessingTimeSeconds: 0,
          measuredJobs: 0
        };
      }

      workerStats[job.worker].completedJobs += 1;

      if (typeof job.processingTimeSeconds === "number") {
        workerStats[job.worker].totalProcessingTimeSeconds +=
          job.processingTimeSeconds;

        workerStats[job.worker].measuredJobs += 1;
      }
    });

    const workers = Object.values(workerStats).map((worker) => ({
      ...worker,
      averageProcessingTimeSeconds:
        worker.measuredJobs > 0
          ? Number(
              (
                worker.totalProcessingTimeSeconds /
                worker.measuredJobs
              ).toFixed(4)
            )
          : null
    }));

    const operationStats = {};

    completedJobs.forEach((job) => {
      const operation = job.operation || "resize";

      if (!operationStats[operation]) {
        operationStats[operation] = {
          operation,
          completedJobs: 0,
          totalProcessingTimeSeconds: 0,
          measuredJobs: 0
        };
      }

      operationStats[operation].completedJobs += 1;

      if (typeof job.processingTimeSeconds === "number") {
        operationStats[operation].totalProcessingTimeSeconds +=
          job.processingTimeSeconds;

        operationStats[operation].measuredJobs += 1;
      }
    });

    const operations = Object.values(operationStats).map((item) => ({
      ...item,
      averageProcessingTimeSeconds:
        item.measuredJobs > 0
          ? Number(
              (
                item.totalProcessingTimeSeconds /
                item.measuredJobs
              ).toFixed(4)
            )
          : null
    }));

    res.json({
      summary: {
        totalJobs: jobs.length,
        completedJobs: completedJobs.length,
        failedJobs: failedJobs.length,
        activeJobs: activeJobs.length,
        waitingJobs: waitingJobs.length,
        delayedJobs: delayedJobs.length,
        successRate,
        averageProcessingTimeSeconds: averageProcessingTime,
        measuredJobs: measuredJobs.length,
        totalInputBytes,
        totalOutputBytes,
        totalInputMB: Number(
          (totalInputBytes / (1024 * 1024)).toFixed(2)
        ),
        totalOutputMB: Number(
          (totalOutputBytes / (1024 * 1024)).toFixed(2)
        )
      },
      workers,
      operations,
      jobs,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      message: "Could not load analytics data"
    });
  }
});

// ML training results
app.get("/api/ml-results", async (req, res) => {
  try {
    const resultsPath = path.join(
      __dirname,
      "ml",
      "training_results.json"
    );

    const results = await fs.promises.readFile(
      resultsPath,
      "utf8"
    );

    res.json(JSON.parse(results));
  } catch (error) {
    console.error("ML results error:", error);

    res.status(500).json({
      message: "Could not load ML training results"
    });
  }
});

// System monitoring
app.get("/api/monitor", async (req, res) => {
  try {
    const counts = await imageQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    const jobs = await imageQueue.getJobs(
      ["active", "completed"],
      0,
      99,
      true
    );

    const workers = [
      ...new Set(
        jobs
          .map(
            (job) =>
              job.returnvalue?.worker ||
              job.progress?.worker
          )
          .filter(Boolean)
      )
    ];

    res.json({
      queue: counts,
      workers,
      workerCountSeen: workers.length,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Monitoring error:", error);
    res.status(500).json({
      message: "Could not load monitoring data"
    });
  }
});

// Processed image gallery
app.get("/api/processed", async (req, res) => {
  try {
    const files = await fs.promises.readdir(processedDir);

    const images = files
      .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map((filename) => ({
        filename,
        url: `/processed/${encodeURIComponent(filename)}`
      }));

    res.json({ images });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not load processed images"
    });
  }
});

// Delete one processed image
app.delete("/api/processed/:filename", async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);

    if (!/\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return res.status(400).json({
        message: "Invalid image filename"
      });
    }

    const filePath = path.join(processedDir, filename);

    await fs.promises.unlink(filePath);

    res.json({
      message: "Image deleted successfully",
      filename
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        message: "Image not found"
      });
    }

    console.error(error);
    res.status(500).json({
      message: "Could not delete image"
    });
  }
});

// Delete all processed images
app.delete("/api/processed", async (req, res) => {
  try {
    const files = await fs.promises.readdir(processedDir);

    const images = files.filter((file) =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    await Promise.all(
      images.map((file) =>
        fs.promises.unlink(path.join(processedDir, file))
      )
    );

    res.json({
      message: "All processed images deleted",
      deletedCount: images.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not delete images"
    });
  }
});

// Serve processed images
app.get("/processed/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(processedDir, filename);

  res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) {
      res.status(error.statusCode || 404).json({
        message: "Processed image not found"
      });
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
