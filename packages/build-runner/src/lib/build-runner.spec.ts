import { DockerBuildRunner } from './build-runner';

describe('DockerBuildRunner', () => {
  it('enforces container isolation and resource limits', async () => {
    const execute = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
      durationMs: 1,
    });
    const runner = new DockerBuildRunner({
      workspaceRoot: '/safe/workspaces',
      execute,
    });
    await runner.run({
      jobId: '11111111-1111-4111-8111-111111111111',
      workspacePath: '/safe/workspaces/project/versions/001/source',
      command: 'build',
    });
    const execution = execute.mock.calls[0][0];
    expect(execution.executable).toBe('docker');
    expect(execution.args).toEqual(
      expect.arrayContaining([
        '--network',
        'none',
        '--read-only',
        '--cap-drop',
        'ALL',
        '--pids-limit',
        '256',
        '--security-opt',
        'no-new-privileges',
      ]),
    );
    expect(execution.args.join(' ')).not.toContain('docker.sock');
  });

  it('rejects path escapes, arbitrary commands, and unsafe identifiers', () => {
    const runner = new DockerBuildRunner({ workspaceRoot: '/safe/workspaces' });
    expect(() =>
      runner.run({
        jobId: '11111111-1111-4111-8111-111111111111',
        workspacePath: '/safe/escape',
        command: 'build',
      }),
    ).toThrow('escapes');
    expect(() =>
      runner.run({
        jobId: 'unsafe',
        workspacePath: '/safe/workspaces/project',
        command: 'build',
      }),
    ).toThrow('identifier');
    expect(() =>
      runner.run({
        jobId: '11111111-1111-4111-8111-111111111111',
        workspacePath: '/safe/workspaces/project',
        command: 'shell' as never,
      }),
    ).toThrow('not approved');
  });
});
