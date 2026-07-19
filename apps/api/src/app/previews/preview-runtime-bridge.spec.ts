import { injectPreviewRuntimeBridge } from './preview-runtime-bridge';

describe('preview runtime bridge', () => {
  it('adds one fixed bridge to HTML without changing stored assets', () => {
    const html = Buffer.from('<html><body><main>Preview</main></body></html>');
    const bridged = injectPreviewRuntimeBridge(html, 'index.html');
    const repeated = injectPreviewRuntimeBridge(bridged, 'index.html');
    const asset = Buffer.from('console.log("preview")');

    expect(bridged.toString()).toContain('data-ajmh-preview-bridge');
    expect(bridged.toString()).toContain('ajmh:preview-operation');
    expect(repeated.equals(bridged)).toBe(true);
    expect(injectPreviewRuntimeBridge(asset, 'main.js')).toBe(asset);
  });

  it('contains bounded operations without dynamic code execution', () => {
    const output = injectPreviewRuntimeBridge(
      Buffer.from('<body></body>'),
      'index.html',
    ).toString();

    expect(output).toContain(
      "['RENAME','RECOLOR','CLONE','ADD_BUTTON','THEME']",
    );
    expect(output).toContain('/^#[0-9a-fA-F]{6}$/');
    expect(output).not.toContain('eval(');
    expect(output).not.toContain('innerHTML');
  });
});
