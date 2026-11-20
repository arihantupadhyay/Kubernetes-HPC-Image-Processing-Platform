
const { Queue } = require("bullmq");

const imageQueue = new Queue("image-processing", {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: 6379
  }
});

module.exports = imageQueue;
