import { DeterministicRequirementsProvider } from './requirements-provider';

describe('DeterministicRequirementsProvider', () => {
  it('creates a valid local specification without a cloud call', async () => {
    const provider = new DeterministicRequirementsProvider();
    const result = await provider.extract({
      instructions: 'Create a customer support dashboard.',
      documents: [
        {
          name: 'brief.md',
          mediaType: 'text/markdown',
          text: 'Agents review tickets.',
        },
        {
          name: 'layout.png',
          mediaType: 'image/png',
          base64: 'c3ludGhldGlj',
        },
      ],
    });

    expect(result.productSummary).toContain('customer support');
    expect(result.pages[0]?.route).toBe('/');
    expect(result.openQuestions).toHaveLength(1);
    expect(result.assumptions).toContain(
      'Requirements include the uploaded image layout.png.',
    );
  });

  it('extracts explicit pages, roles, navigation, and workflows from Markdown', async () => {
    const provider = new DeterministicRequirementsProvider();
    const result = await provider.extract({
      instructions: 'Build the portal. Starting style: MIDNIGHT.',
      documents: [
        {
          name: 'synthetic-portal.md',
          mediaType: 'text/markdown',
          text: `# Operations Portal

A standalone operations portal for internal teams.

## Roles and sample users

| Role | Access |
| --- | --- |
| **Requester** | Create |
| **Manager** | Review |

## Feature map

### Request Form (Requester)
- **Setup**: Capture a title and location.

### Request Detail
Everything required to review one request.

### Reports (all roles)
- **Listing**: Filter completed requests.

## Testing walkthroughs

### Requester end-to-end
1. Open the request form.
2. Submit a completed request.
`,
        },
      ],
    });

    expect(result.productSummary).toContain('standalone operations portal');
    expect(result.pages.map((page) => page.name)).toEqual([
      'Request Form',
      'Request Detail',
      'Reports',
    ]);
    expect(result.navigation).toEqual({
      pattern: 'TOPBAR',
      items: [
        { label: 'Request Form', route: '/request-form' },
        { label: 'Request Detail', route: '/request-detail' },
        { label: 'Reports', route: '/reports' },
      ],
    });
    expect(result.roles).toEqual(['Requester', 'Manager']);
    expect(result.workflows[0]).toEqual({
      name: 'Requester end-to-end',
      steps: ['Open the request form.', 'Submit a completed request.'],
    });
    expect(result.design?.themePreset).toBe('MIDNIGHT');
    expect(result.openQuestions).toEqual([]);
  });
});
