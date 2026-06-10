const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const audioFile = process.env.LIVE_TEST_AUDIO_FILE || path.join(os.tmpdir(), "gemini-live-vad-test.wav");

async function main() {
  if (!fs.existsSync(audioFile)) {
    throw new Error(`Missing fake microphone WAV: ${audioFile}. Set LIVE_TEST_AUDIO_FILE to a spoken WAV file before running this smoke test.`);
  }

  const sockets = [];
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${audioFile}`,
      "--autoplay-policy=no-user-gesture-required"
    ]
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("websocket", (ws) => {
    if (!ws.url().includes("generativelanguage.googleapis.com")) return;
    const socket = { starts: 0, ends: 0, audio: 0, toolFrames: 0, functionCalls: 0 };
    sockets.push(socket);
    ws.on("framesent", (frame) => {
      const payload = typeof frame.payload === "string" ? frame.payload : frame.payload?.toString?.("utf8") || "";
      if (payload.includes("activityStart")) socket.starts += 1;
      if (payload.includes("activityEnd")) socket.ends += 1;
      if (payload.includes("audio")) socket.audio += 1;
      if (payload.includes("toolResponse")) socket.toolFrames += 1;
    });
    ws.on("framereceived", (frame) => {
      const payload = typeof frame.payload === "string" ? frame.payload : frame.payload?.toString?.("utf8") || "";
      if (payload.includes("toolCall")) socket.functionCalls += 1;
    });
  });

  await page.goto("http://127.0.0.1:3000/p/p-6", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1_000);
  const openAssistant = page.locator('button[aria-label="Open AI assistant"]').first();
  if ((await openAssistant.count()) === 0) {
    const buttons = await page.locator("button").evaluateAll((values) => values.map((button) => button.textContent?.trim() || button.getAttribute("aria-label") || ""));
    throw new Error(`Open assistant button was not found. Page buttons: ${buttons.join(", ")}`);
  }
  await openAssistant.click({ timeout: 30_000 });

  const drawer = page.locator("aside");
  await drawer.waitFor({ timeout: 30_000 });
  const startButton = drawer.locator("button").filter({ hasText: /Start|ابدأ/ }).first();
  if ((await startButton.count()) === 0) {
    const buttons = await drawer.locator("button").evaluateAll((values) => values.map((button) => button.textContent?.trim() || ""));
    throw new Error(`Live voice Start button was not found. Drawer buttons: ${buttons.join(", ")}`);
  }
  await startButton.click({ timeout: 60_000 });

  const heard = await page
    .waitForFunction(() => document.querySelector("aside")?.innerText.includes("Hearing you"), null, { timeout: 55_000 })
    .then(() => true)
    .catch(() => false);

  const found = await page
    .waitForFunction(
      () => {
        const text = document.querySelector("aside")?.innerText || "";
        return /Results ready|Fifth Settlement|Cheque & Key Signature Apartment|verified result|EGP 2,000,000|EGP 4,200,000/.test(text);
      },
      null,
      { timeout: 140_000 }
    )
    .then(() => true)
    .catch(() => false);

  await page.waitForTimeout(3_000);
  const text = await drawer.innerText();
  const platformResults = /Results ready|Fifth Settlement|Cheque & Key Signature Apartment|verified result|EGP\s*2,000,000|EGP\s*4,200,000/.test(text);
  const noHallucinatedNames = !/Cairo Gate|Fifth Square/.test(text);
  const readableTranscript = /Find apartments for sale in New Cairo under \$?5 million/i.test(text.replace(/\s+/g, " "));
  const ok = heard && found && platformResults && noHallucinatedNames;

  console.log(
    JSON.stringify(
      {
        ok,
        heard,
        found,
        platformResults,
        noHallucinatedNames,
        readableTranscript,
        sockets,
        text: text.slice(0, 5000)
      },
      null,
      2
    )
  );

  await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
