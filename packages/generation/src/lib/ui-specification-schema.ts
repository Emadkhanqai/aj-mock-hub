import { z } from 'zod';

const nonEmptyText = z.string().trim().min(1).max(2_000);
const shortText = z.string().trim().min(1).max(200);
const route = z
  .string()
  .trim()
  .regex(/^\/[a-z0-9/_-]*$/)
  .max(200);

export const uiSpecificationSchema = z.strictObject({
  productSummary: nonEmptyText,
  audiences: z.array(shortText).max(20),
  roles: z.array(shortText).max(20),
  pages: z
    .array(
      z.strictObject({
        id: z
          .string()
          .trim()
          .regex(/^[a-z][a-z0-9-]*$/)
          .max(80),
        name: shortText,
        route,
        purpose: nonEmptyText,
        components: z.array(shortText).max(50),
        dataNeeds: z.array(shortText).max(50),
      }),
    )
    .min(1)
    .max(50),
  workflows: z
    .array(
      z.strictObject({
        name: shortText,
        steps: z.array(nonEmptyText).min(1).max(50),
      }),
    )
    .max(50),
  navigation: z.strictObject({
    pattern: z.enum(['SIDEBAR', 'TOPBAR', 'HYBRID']),
    items: z
      .array(z.strictObject({ label: shortText, route }))
      .min(1)
      .max(50),
  }),
  branding: z.strictObject({
    tone: shortText,
    primaryColor: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .nullable(),
    accessibilityNotes: z.array(nonEmptyText).max(30),
  }),
  assumptions: z.array(nonEmptyText).max(50),
  openQuestions: z.array(nonEmptyText).max(50),
});

export type ParsedUiSpecification = z.infer<typeof uiSpecificationSchema>;

export const UI_SPECIFICATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'productSummary',
    'audiences',
    'roles',
    'pages',
    'workflows',
    'navigation',
    'branding',
    'assumptions',
    'openQuestions',
  ],
  properties: {
    productSummary: { type: 'string' },
    audiences: { type: 'array', items: { type: 'string' } },
    roles: { type: 'array', items: { type: 'string' } },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'route', 'purpose', 'components', 'dataNeeds'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          route: { type: 'string' },
          purpose: { type: 'string' },
          components: { type: 'array', items: { type: 'string' } },
          dataNeeds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    workflows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'steps'],
        properties: {
          name: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    navigation: {
      type: 'object',
      additionalProperties: false,
      required: ['pattern', 'items'],
      properties: {
        pattern: { type: 'string', enum: ['SIDEBAR', 'TOPBAR', 'HYBRID'] },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'route'],
            properties: {
              label: { type: 'string' },
              route: { type: 'string' },
            },
          },
        },
      },
    },
    branding: {
      type: 'object',
      additionalProperties: false,
      required: ['tone', 'primaryColor', 'accessibilityNotes'],
      properties: {
        tone: { type: 'string' },
        primaryColor: { type: ['string', 'null'] },
        accessibilityNotes: { type: 'array', items: { type: 'string' } },
      },
    },
    assumptions: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
} as const;
