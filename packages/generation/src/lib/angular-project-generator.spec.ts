import { AngularProjectGenerator } from './angular-project-generator';

describe('AngularProjectGenerator', () => {
  it('emits only the controlled project file set', () => {
    const files = new AngularProjectGenerator().generate({
      productSummary: 'Synthetic portal',
      audiences: [],
      roles: [],
      pages: [
        {
          id: 'home',
          name: 'Home',
          route: '/',
          purpose: 'Summarize service requests.',
          components: ['Status overview'],
          dataNeeds: [],
        },
      ],
      workflows: [],
      navigation: {
        pattern: 'SIDEBAR',
        items: [{ label: 'Home', route: '/' }],
      },
      branding: {
        tone: 'Professional',
        primaryColor: null,
        accessibilityNotes: [],
      },
      assumptions: [],
      openQuestions: [],
    });
    expect(files.map(({ path }) => path)).toEqual([
      'src/main.ts',
      'src/styles.css',
      'src/main.spec.ts',
      'ui-specification.json',
      'README.md',
    ]);
    expect(files[0]?.content).toContain('bootstrapApplication');
  });
});
