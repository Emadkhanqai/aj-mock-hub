import { DeterministicRequirementsProvider } from './requirements-provider';

describe('DeterministicRequirementsProvider', () => {
  it('creates a valid local specification without a cloud call', async () => {
    const provider = new DeterministicRequirementsProvider();
    const result = await provider.extract({
      instructions: 'Create a customer support dashboard.',
      documents: [{ name: 'brief.md', text: 'Agents review tickets.' }],
    });

    expect(result.productSummary).toContain('customer support');
    expect(result.pages[0]?.route).toBe('/');
    expect(result.assumptions[0]).toContain('brief.md');
  });
});
