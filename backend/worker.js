
const { Worker } = require("bullmq");
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const pythonPath =
  process.env.PYTHON_PATH ||
  path.join(__dirname, "../image-worker/venv/bin/python");

const scriptPath =
  process.env.PROCESS_SCRIPT ||
  path.join(__dirname, "../image-worker/process_image.py");

const workerName = os.hostname();

const imageWorker = new Worker(
  "image-processing",
  async (job) => {
    const { filename, path: imagePath, operation } = job.data;
    const selectedOperation = operation || "resize";

    await job.updateProgress({
      worker: workerName,
      operation: selectedOperation,
      status: "processing"
    });

    console.log(`Worker: ${workerName}`);
    console.log(`Processing: ${filename}`);

    const metrics = await new Promise((resolve, reject) => {
      const python = spawn(pythonPath, [
        scriptPath,
        imagePath,
        filename,
        selectedOperation
      ]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("error", (error) => {
        reject(error);
      });

      python.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Error(errorOutput || `Python exited with code ${code}`)
          );
        }

        try {
          const lines = output.trim().split("\n");
          const jsonLine = lines[lines.length - 1];
          const result = JSON.parse(jsonLine);

          if (!result.success) {
            return reject(new Error("Image processing was unsuccessful"));
          }

          resolve(result);
        } catch (error) {
          reject(
            new Error(
              `Could not read Python analytics output: ${error.message}. Output: ${output}`
            )
          );
        }
      });
    });

    const jobResult = {
      ...metrics,
      filename,
      operation: selectedOperation,
      worker: workerName,
      completedAt: new Date().toISOString()
    };

    await job.updateProgress({
      worker: workerName,
      operation: selectedOperation,
      status: "completed",
      processingTimeSeconds: metrics.processingTimeSeconds
    });

    console.log("Job completed:", JSON.stringify(jobResult));

    return jobResult;
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: 6379
    },
    concurrency: 1
  }
);

imageWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

imageWorker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log(`HPC Image Worker running: ${workerName}`);
