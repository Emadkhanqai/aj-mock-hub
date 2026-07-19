import { AzureOpenAI } from 'openai';
import type { UiSpecificationContent } from '@aj-mock-hub/contracts';
import {
  UI_SPECIFICATION_JSON_SCHEMA,
  uiSpecificationSchema,
} from './ui-specification-schema';

export interface RequirementsInput {
  instructions: string;
  documents: Array<{ name: string; text: string }>;
}

export interface RequirementsProvider {
  extract(input: RequirementsInput): Promise<UiSpecificationContent>;
}

export interface AzureRequirementsProviderOptions {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const SYSTEM_PROMPT = `You are a product requirements analyst for Angular UI prototypes.
Create a framework-independent UI specification from the supplied instructions and documents.
Do not invent backend behavior. Record uncertainty under assumptions and openQuestions.
Routes must begin with / and page ids must be lowercase kebab-case.`;

export class AzureOpenAiRequirementsProvider implements RequirementsProvider {
  private readonly client: AzureOpenAI;

  constructor(private readonly options: AzureRequirementsProviderOptions) {
    this.client = new AzureOpenAI({
      endpoint: options.endpoint,
      apiKey: options.apiKey,
      apiVersion: options.apiVersion,
      deployment: options.deployment,
      timeout: options.timeoutMs ?? 60_000,
      maxRetries: options.maxRetries ?? 2,
    });
  }

  async extract(input: RequirementsInput): Promise<UiSpecificationContent> {
    const documents = input.documents
      .map(({ name, text }) => `\n--- Document: ${name} ---\n${text}`)
      .join('');
    const completion = await this.client.chat.completions.create({
      model: this.options.deployment,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Instructions:\n${input.instructions}${documents}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ui_specification',
          strict: true,
          schema: UI_SPECIFICATION_JSON_SCHEMA,
        },
      },
    });
    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error('Requirements provider returned no specification');
    }
    return uiSpecificationSchema.parse(
      JSON.parse(content),
    ) as unknown as UiSpecificationContent;
  }
}

export class DeterministicRequirementsProvider implements RequirementsProvider {
  async extract(input: RequirementsInput): Promise<UiSpecificationContent> {
    const summary = input.instructions.trim().slice(0, 2_000);
    return uiSpecificationSchema.parse({
      productSummary: summary || 'Angular prototype requirements',
      audiences: [],
      roles: [],
      pages: [
        {
          id: 'home',
          name: 'Home',
          route: '/',
          purpose: 'Present the primary prototype experience.',
          components: ['Application shell'],
          dataNeeds: [],
        },
      ],
      workflows: [],
      navigation: {
        pattern: 'TOPBAR',
        items: [{ label: 'Home', route: '/' }],
      },
      branding: {
        tone: 'Professional',
        primaryColor: null,
        accessibilityNotes: [
          'Use semantic landmarks and visible focus states.',
        ],
      },
      assumptions: input.documents.map(
        ({ name }) => `Requirements include the uploaded document ${name}.`,
      ),
      openQuestions: [],
    }) as unknown as UiSpecificationContent;
  }
}
