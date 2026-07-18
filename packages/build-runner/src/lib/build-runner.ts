import { spawn } from 'node:child_process';
import { resolve, sep } from 'node:path';

export type ApprovedBuildCommand = 'lint' | 'test' | 'build';

export interface BuildRunRequest {
  jobId: string;
  workspacePath: string;
  command: ApprovedBuildCommand;
}

export interface BuildRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}

export interface CommandExecution {
  executable: string;
  args: string[];
  timeoutMs: number;
  containerName: string;
}

export type CommandExecutor = (
  execution: CommandExecution,
) => Promise<BuildRunResult>;

export interface DockerBuildRunnerOptions {
  workspaceRoot: string;
  image?: string;
  timeoutMs?: number;
  execute?: CommandExecutor;
}

const SAFE_JOB_ID = /^[a-f0-9-]{36}$/i;

export class DockerBuildRunner {
  private readonly workspaceRoot: string;
  private readonly image: string;
  private readonly timeoutMs: number;
  private readonly execute: CommandExecutor;

  constructor(options: DockerBuildRunnerOptions) {
    this.workspaceRoot = resolve(options.workspaceRoot);
    this.image = options.image ?? 'aj-mock-hub-angular-builder:node22-v1';
    this.timeoutMs = options.timeoutMs ?? 300_000;
    this.execute = options.execute ?? executeDocker;
  }

  run(request: BuildRunRequest): Promise<BuildRunResult> {
    if (!SAFE_JOB_ID.test(request.jobId)) {
      throw new Error('Build job identifier is invalid');
    }
    if (!['lint', 'test', 'build'].includes(request.command)) {
      throw new Error('Build command is not approved');
    }
    const workspace = resolve(request.workspacePath);
    if (!workspace.startsWith(`${this.workspaceRoot}${sep}`)) {
      throw new Error('Build workspace escapes its configured root');
    }
    const containerName = `ajmh-builder-${request.jobId}`;
    return this.execute({
      executable: 'docker',
      containerName,
      timeoutMs: this.timeoutMs,
      args: [
        'run',
        '--rm',
        '--name',
        containerName,
        '--network',
        'none',
        '--read-only',
        '--tmpfs',
        '/tmp:rw,noexec,nosuid,size=256m',
        '--tmpfs',
        '/workspace:rw,nosuid,size=768m,uid=10001,gid=10001,mode=0700',
        '--cpus',
        '1',
        '--memory',
        '1g',
        '--pids-limit',
        '256',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--user',
        '10001:10001',
        '--volume',
        `${workspace}:/input:ro`,
        this.image,
        request.command,
      ],
    });
  }
}

async function executeDocker(
  execution: CommandExecution,
): Promise<BuildRunResult> {
  const startedAt = Date.now();
  return new Promise((resolveResult, reject) => {
    const child = spawn(execution.executable, execution.args, {
      env: { PATH: process.env['PATH'] ?? '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const append = (current: string, chunk: Buffer) =>
      `${current}${chunk.toString('utf8')}`.slice(-1_000_000);
    child.stdout.on(
      'data',
      (chunk: Buffer) => (stdout = append(stdout, chunk)),
    );
    child.stderr.on(
      'data',
      (chunk: Buffer) => (stderr = append(stderr, chunk)),
    );
    child.on('error', reject);
    const timer = setTimeout(() => {
      timedOut = true;
      const killer = spawn('docker', ['kill', execution.containerName], {
        env: { PATH: process.env['PATH'] ?? '' },
        stdio: 'ignore',
      });
      killer.unref();
    }, execution.timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveResult({
        exitCode: timedOut ? 124 : (code ?? 1),
        stdout,
        stderr,
        timedOut,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}
