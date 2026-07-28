import cron from "node-cron";

// Render sets this automatically for deployed web services — it's the
// public URL of this very instance. It's undefined locally, so the job
// simply won't start outside of Render.
const SELF_URL = process.env.RENDER_EXTERNAL_URL;

export const pingSelf = async () => {
  if (!SELF_URL) return;

  try {
    const res = await fetch(`${SELF_URL}/api/health`);
    console.log(`Keep-alive ping: ${res.status}`);
  } catch (error) {
    console.error("Keep-alive ping failed:", error.message);
  }
};

// Free-tier Render web services spin down after ~15 minutes with no
// inbound HTTP traffic. Pinging our own /api/health endpoint every 14
// minutes keeps the instance warm without needing an external uptime
// service or a paid plan.
const keepAliveJob = cron.schedule("*/14 * * * *", pingSelf, {
  scheduled: false,
});

export const startKeepAliveCronJob = () => {
  if (!SELF_URL) {
    console.log("RENDER_EXTERNAL_URL not set — skipping keep-alive ping (not running on Render)");
    return;
  }
  keepAliveJob.start();
  console.log("Keep-alive ping cron job started (every 14 minutes)");
};

export const stopKeepAliveCronJob = () => {
  keepAliveJob.stop();
};
