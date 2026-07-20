import { AzureOpenAI } from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import type {
  RequirementDocumentMediaType,
  UiSpecificationContent,
} from '@aj-mock-hub/contracts';
import {
  UI_SPECIFICATION_JSON_SCHEMA,
  uiSpecificationSchema,
} from './ui-specification-schema';

export interface RequirementsInput {
  instructions: string;
  documents: Array<{
    name: string;
    mediaType: RequirementDocumentMediaType;
    text?: string;
    base64?: string;
  }>;
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
Treat every supplied document and image as an authoritative source. Typed instructions supplement those sources.
Include every explicitly documented page, screen, feature module, navigation destination, and user workflow; never collapse a multi-page feature map into a generic Home page.
If any sources or instructions conflict, do not choose a side or guess. Add a precise clarification request to openQuestions for every conflict.
Do not invent backend behavior. Record uncertainty under assumptions and openQuestions.
Routes must begin with / and page ids must be lowercase kebab-case.`;

interface MarkdownSection {
  level: number;
  title: string;
  ancestors: Array<{ level: number; title: string }>;
  body: string;
}

const PAGE_CONTAINER = /^(feature map|features|pages|screens|modules)$/i;
const WORKFLOW_CONTAINER = /^(testing walkthroughs|workflows|user flows)$/i;

function cleanMarkdown(value: string, maxLength = 2_000): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanHeading(value: string): string {
  return cleanMarkdown(value, 200)
    .replace(/^\d+(?:\.\d+)*\.?\s+/, '')
    .replace(/\s+\([^)]*\)\s*$/, '')
    .trim();
}

function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'page'
  );
}

function parseMarkdownSections(text: string): MarkdownSection[] {
  const headings = [...text.matchAll(/^(#{1,6})\s+(.+?)\s*$/gm)];
  const stack: Array<{ level: number; title: string }> = [];
  return headings.map((heading, index) => {
    const level = heading[1]?.length ?? 1;
    while ((stack.at(-1)?.level ?? 0) >= level) stack.pop();
    const section = {
      level,
      title: cleanHeading(heading[2] ?? ''),
      ancestors: [...stack],
      body: text.slice(
        (heading.index ?? 0) + heading[0].length,
        headings[index + 1]?.index ?? text.length,
      ),
    };
    stack.push({ level, title: section.title });
    return section;
  });
}

function directChildOf(section: MarkdownSection, container: RegExp): boolean {
  const parent = [...section.ancestors]
    .reverse()
    .find((ancestor) => container.test(ancestor.title));
  return !!parent && section.level === parent.level + 1;
}

function firstMeaningfulLine(body: string): string {
  const line = body
    .split('\n')
    .map((candidate) => candidate.trim())
    .find(
      (candidate) =>
        candidate &&
        !candidate.startsWith('```') &&
        !candidate.startsWith('|') &&
        !/^[-:|\s]+$/.test(candidate),
    );
  return cleanMarkdown(line?.replace(/^[-+]\s+|^\d+[.)]\s+/, '') ?? '');
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function extractRoles(sections: MarkdownSection[]): string[] {
  return unique(
    sections
      .filter((section) => /roles?|permissions?/i.test(section.title))
      .flatMap((section) =>
        section.body
          .split('\n')
          .filter((line) => line.trim().startsWith('|'))
          .map((line) => cleanMarkdown(line.split('|')[1] ?? '', 200))
          .filter(
            (role) =>
              role && role.toLowerCase() !== 'role' && !/^[-: ]+$/.test(role),
          ),
      ),
  ).slice(0, 20);
}

function extractPreset(instructions: string) {
  const match = instructions.match(
    /starting style:\s*(AURORA|MIDNIGHT|PAPER|SUNSET)/i,
  );
  return (match?.[1]?.toUpperCase() ?? 'AURORA') as
    | 'AURORA'
    | 'MIDNIGHT'
    | 'PAPER'
    | 'SUNSET';
}

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
    const userContent: ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Instructions:\n${input.instructions}`,
      },
    ];
    for (const document of input.documents) {
      userContent.push({
        type: 'text',
        text: `Source: ${document.name} (${document.mediaType})${
          document.text ? `\n${document.text}` : ''
        }`,
      });
      if (document.base64) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${document.mediaType};base64,${document.base64}`,
            detail: 'auto',
          },
        });
      }
    }
    const completion = await this.client.chat.completions.create({
      model: this.options.deployment,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: userContent,
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
    const markdownDocuments = input.documents.filter(
      (document) => document.text && document.mediaType === 'text/markdown',
    );
    const sections = markdownDocuments.flatMap((document) =>
      parseMarkdownSections(document.text ?? ''),
    );
    const explicitPageSections = sections.filter((section) =>
      directChildOf(section, PAGE_CONTAINER),
    );
    const pageNames = new Set<string>();
    const pages = explicitPageSections.slice(0, 50).map((section) => {
      let id = slugify(section.title);
      let suffix = 2;
      while (pageNames.has(id)) id = `${slugify(section.title)}-${suffix++}`;
      pageNames.add(id);
      const components = unique(
        [...section.body.matchAll(/\*\*([^*]+)\*\*/g)].map((match) =>
          cleanMarkdown(match[1] ?? '', 200),
        ),
      ).slice(0, 50);
      return {
        id,
        name: section.title,
        route: `/${id}`,
        purpose:
          firstMeaningfulLine(section.body) ||
          `Present the ${section.title} experience.`,
        components: components.length ? components : [section.title],
        dataNeeds: [],
      };
    });
    const fallbackName = /dashboard/i.test(input.instructions)
      ? 'Dashboard'
      : /portal/i.test(input.instructions)
        ? 'Portal'
        : 'Home';
    if (!pages.length) {
      pages.push({
        id: slugify(fallbackName),
        name: fallbackName,
        route: '/',
        purpose: 'Present the primary prototype experience.',
        components: ['Application shell'],
        dataNeeds: [],
      });
    }
    const workflows = sections
      .filter((section) => directChildOf(section, WORKFLOW_CONTAINER))
      .map((section) => ({
        name: section.title,
        steps: section.body
          .split('\n')
          .filter((line) => /^\s*\d+[.)]\s+/.test(line))
          .map((line) => cleanMarkdown(line.replace(/^\s*\d+[.)]\s+/, '')))
          .filter(Boolean)
          .slice(0, 50),
      }))
      .filter((workflow) => workflow.steps.length > 0)
      .slice(0, 50);
    const roles = extractRoles(sections);
    const documentSummary = sections
      .filter((section) => section.level === 1)
      .map((section) => firstMeaningfulLine(section.body))
      .find(Boolean);
    const summary = cleanMarkdown(
      [documentSummary, input.instructions.trim()].filter(Boolean).join(' '),
    );
    const hasReadableDocuments = input.documents.some((document) =>
      Boolean(document.text?.trim()),
    );
    return uiSpecificationSchema.parse({
      productSummary: summary || 'Angular prototype requirements',
      audiences: roles,
      roles,
      pages,
      workflows,
      navigation: {
        pattern: pages.length > 4 ? 'SIDEBAR' : 'TOPBAR',
        items: pages.map((page) => ({
          label: page.name,
          route: page.route,
        })),
      },
      branding: {
        tone: 'Professional',
        primaryColor: null,
        accessibilityNotes: [
          'Use semantic landmarks and visible focus states.',
        ],
      },
      design: { themePreset: extractPreset(input.instructions) },
      assumptions: [
        ...(explicitPageSections.length
          ? ['Page structure follows the explicit feature map in the sources.']
          : []),
        ...input.documents
          .filter((document) => document.mediaType.startsWith('image/'))
          .map(
            (document) =>
              `Requirements include the uploaded image ${document.name}.`,
          ),
      ],
      openQuestions:
        hasReadableDocuments && explicitPageSections.length === 0
          ? [
              'The supplied sources do not identify explicit pages, screens, or feature modules. Confirm the proposed starting page before approval.',
            ]
          : [],
    }) as unknown as UiSpecificationContent;
  }
}
