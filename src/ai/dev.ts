'use client';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-insights-from-data.ts';
import '@/ai/flows/generate-protocol-recommendations.ts';
import '@/ai/flows/generate-system-plan-flow.ts';
import '@/ai/flows/generate-onboarding-setup-flow.ts';
import '@/ai/flows/generate-morning-briefing.ts';
