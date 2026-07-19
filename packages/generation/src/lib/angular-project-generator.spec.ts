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
    expect(files[0]?.content).toContain('data-ajmh-id');
    expect(files[0]?.content).toContain('ajmh:element-selected');
  });

  it('renders visual-editor styles, buttons and themes as controlled data', () => {
    const files = new AngularProjectGenerator().generate({
      productSummary: 'Synthetic portal',
      audiences: [],
      roles: [],
      pages: [
        {
          id: 'home',
          name: 'Home',
          route: '/',
          purpose: 'Show activity.',
          components: ['Overview', 'Open report'],
          componentKinds: ['CARD', 'BUTTON'],
          componentStyles: [
            { textColor: '#ffffff', backgroundColor: '#112233' },
            {},
          ],
          dataNeeds: [],
        },
      ],
      workflows: [],
      navigation: {
        pattern: 'SIDEBAR',
        items: [{ label: 'Home', route: '/' }],
      },
      branding: {
        tone: 'Warm',
        primaryColor: '#ff8c69',
        accessibilityNotes: [],
      },
      design: { themePreset: 'SUNSET' },
      assumptions: [],
      openQuestions: [],
    });
    expect(files[0]?.content).toContain('canvas-action');
    expect(files[0]?.content).toContain('Open report');
    expect(files[0]?.content).toContain('#112233');
    expect(files[0]?.content).toContain('SUNSET');
  });
});
