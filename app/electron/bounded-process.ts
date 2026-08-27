import { execFile } from "node:child_process";

export type BoundedProcessFailure = "exit" | "output" | "spawn" | "timeout";

export class BoundedProcessError extends Error {
  readonly failure: BoundedProcessFailure;

  constructor(failure: BoundedProcessFailure) {
    super(`Bounded child process failed: ${failure}.`);
    this.name = "BoundedProcessError";
    this.failure = failure;
  }
}

export interface BoundedProcessOptions {
  readonly executable: string;
  readonly args: readonly string[];
  readonly timeoutMilliseconds: number;
  readonly maximumOutputBytes: number;
  readonly env?: NodeJS.ProcessEnv;
}

export async function runBoundedProcess(options: BoundedProcessOptions): Promise<string> {
  if (!Number.isSafeInteger(options.timeoutMilliseconds) || options.timeoutMilliseconds < 1) throw new Error("Invalid process timeout.");
  if (!Number.isSafeInteger(options.maximumOutputBytes) || options.maximumOutputBytes < 1) throw new Error("Invalid process output limit.");
  return new Promise<string>((resolve, reject) => {
    let timedOut = false;
    const child = execFile(
      options.executable,
      [...options.args],
      {
        ...(options.env ? { env: options.env } : {}),
        killSignal: "SIGKILL",
        maxBuffer: options.maximumOutputBytes,
      },
      (error, stdout) => {
        clearTimeout(timer);
        if (timedOut) {
          reject(new BoundedProcessError("timeout"));
          return;
        }
        if (error) {
          const code = (error as NodeJS.ErrnoException & { code?: string }).code;
          reject(new BoundedProcessError(code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ? "output" : code === "ENOENT" ? "spawn" : "exit"));
          return;
        }
        resolve(stdout);
      },
    );
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMilliseconds);
  });
}
