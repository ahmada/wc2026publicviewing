import { z } from 'zod';

export const RegistrationSchema = z.object({
  // Step 2 — About you
  fullName: z.string().min(1).max(200),
  position: z.string().min(1).max(200),
  email: z.string().email().max(254),
  phone: z.string().regex(/^[+\d\s\-()\[\]]{7,20}$/),

  // Step 3 — Organization
  orgName: z.string().min(1).max(200),
  orgType: z.enum([
    'fnb',
    'hotel',
    'mall',
    'fanzone',
    'corporate',
    'community',
    'government',
    'other',
  ]),
  ssmNumber: z.string().max(50).optional(),

  // Step 4 — Venue
  venueName: z.string().max(200).optional(),
  venueAddress: z.string().min(1).max(500),
  state: z.enum([
    'johor', 'kedah', 'kelantan', 'melaka', 'negeri-sembilan',
    'pahang', 'perak', 'perlis', 'pulau-pinang', 'sabah',
    'sarawak', 'selangor', 'terengganu',
    'kuala-lumpur', 'labuan', 'putrajaya',
  ]),
  capacity: z.enum(['under-50', '50-200', '200-500', '500-2000', '2000+']),
  screenSetup: z.string().max(200).optional(),

  // Step 5 — Viewing plan
  matchesPlanned: z.array(z.enum([
    'all', 'group', 'r32', 'r16', 'quarters', 'semis', 'final', 'specific',
  ])).min(1),
  estimatedAudience: z.string().max(200).optional(),

  // Step 6 — Commercial
  chargesEntry: z.enum(['yes', 'no']),
  sellsFnb: z.enum(['yes', 'no']),
  sponsorshipInterest: z.enum(['yes', 'no', 'more']).optional(),

  // Step 7 — Notes
  notes: z.string().max(2000).optional(),

  // Step 8 — Consent
  consentPdpa: z.literal(true),
  consentCompliance: z.literal(true),

  // Security
  cfTurnstileToken: z.string().min(1),
  websiteUrl: z.string().max(0).optional(), // honeypot — must be empty

  // Meta
  lang: z.enum(['ms', 'en']),
});

export type RegistrationPayload = z.infer<typeof RegistrationSchema>;
