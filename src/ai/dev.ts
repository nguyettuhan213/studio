import { config } from 'dotenv';
config();

import '@/ai/flows/extract-booking-details.ts';
import '@/ai/flows/assess-request-validity.ts';
import '@/ai/flows/handle-missing-details.ts';