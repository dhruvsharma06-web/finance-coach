import { aiText } from "../src/lib/ai";
async function main() {
  try {
    await aiText({ system: "Reply READY.", prompt: "Connection check" });
    console.log("Google generation verified");
  } catch (e) {
    const err = e as { statusCode?: number; responseBody?: string };
    let message = "";
    try {
      message = JSON.parse(err.responseBody ?? "{}").error?.message ?? "";
    } catch {}
    console.log(
      JSON.stringify({
        status: err.statusCode,
        message: message.replaceAll(
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "__none__",
          "[redacted]",
        ),
      }),
    );
    process.exitCode = 1;
  }
}
main();
