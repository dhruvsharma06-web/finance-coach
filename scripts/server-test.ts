import { spawnSync } from "node:child_process";
/** Re-exec only the test process under server-only's documented react-server condition. */
export function serverTest(file: string, run: () => Promise<void>): void {
  if (!(process.env.NODE_OPTIONS ?? "").includes("--conditions=react-server")) {
    const result = spawnSync(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", file],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_OPTIONS: (
            (process.env.NODE_OPTIONS ?? "") + " --conditions=react-server"
          ).trim(),
        },
      },
    );
    process.exitCode = result.status ?? 1;
  } else
    run().catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
}
