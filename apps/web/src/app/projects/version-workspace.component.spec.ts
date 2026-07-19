import { formatPipelineLog } from './version-workspace.component';

describe('formatPipelineLog', () => {
  it('removes ANSI styling codes from persisted builder output', () => {
    expect(
      formatPipelineLog(
        `${String.fromCharCode(27)}[1m${String.fromCharCode(27)}[32m1 passed${String.fromCharCode(27)}[39m`,
      ),
    ).toBe('1 passed');
  });

  it('preserves ordinary diagnostic content', () => {
    expect(formatPipelineLog('build exited 0 in 6406ms')).toBe(
      'build exited 0 in 6406ms',
    );
  });
});
