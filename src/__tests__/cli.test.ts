/**
 * CLI routing tests — spawns dist/cli.js as a child process.
 */
import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = "node";
const CLI_ARGS = [join(__dirname, "../../dist/cli.js")];

const pkg = createRequire(import.meta.url)("../../package.json") as {
  version: string;
};

describe("cli", () => {
  it("--help outputs 'tmux-bridge-mcp' and 'Usage:'", async () => {
    const { stdout } = await execFileAsync(CLI, [...CLI_ARGS, "--help"], {
      timeout: 10_000,
    });
    expect(stdout).toContain("tmux-bridge-mcp");
    expect(stdout).toContain("Usage:");
  });

  it("-h outputs same as --help", async () => {
    const [help, h] = await Promise.all([
      execFileAsync(CLI, [...CLI_ARGS, "--help"], { timeout: 10_000 }),
      execFileAsync(CLI, [...CLI_ARGS, "-h"], { timeout: 10_000 }),
    ]);
    expect(h.stdout).toBe(help.stdout);
  });

  it("--version outputs version matching package.json", async () => {
    const { stdout } = await execFileAsync(CLI, [...CLI_ARGS, "--version"], {
      timeout: 10_000,
    });
    expect(stdout.trim()).toBe(pkg.version);
  });

  it("-V outputs same as --version", async () => {
    const [version, v] = await Promise.all([
      execFileAsync(CLI, [...CLI_ARGS, "--version"], { timeout: 10_000 }),
      execFileAsync(CLI, [...CLI_ARGS, "-V"], { timeout: 10_000 }),
    ]);
    expect(v.stdout).toBe(version.stdout);
  });

  it("unknown subcommand shows help (exits cleanly)", async () => {
    const { stdout } = await execFileAsync(CLI, [...CLI_ARGS, "foobar"], {
      timeout: 10_000,
    });
    expect(stdout).toContain("tmux-bridge-mcp");
    expect(stdout).toContain("Usage:");
  });
});
