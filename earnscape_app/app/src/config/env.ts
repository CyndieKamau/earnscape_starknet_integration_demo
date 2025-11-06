import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url().optional(),

  // Privy (all required for server-side wallet ops)
  PRIVY_APP_ID: z.string().min(1, 'PRIVY_APP_ID is required'),
  PRIVY_APP_SECRET: z.string().min(1, 'PRIVY_APP_SECRET is required'),
  PRIVY_WALLET_AUTH_PRIVATE_KEY: z.string().min(1, 'PRIVY_WALLET_AUTH_PRIVATE_KEY is required'),

  // Starknet
  RPC_URL: z.url({ message: 'RPC_URL must be a valid URL' }),
  READY_CLASSHASH: z.string().min(1, 'READY_CLASSHASH is required'),

  // Earnscape contracts (required for demo)
  EARNS_TOKEN_ADDRESS: z.string().min(1, 'EARNS_TOKEN_ADDRESS is required'),
  EARNS_TOKEN_NAME: z.string().min(1, 'EARNS_TOKEN_NAME is required'),
  EARNS_TOKEN_SYMBOL: z.string().min(1, 'EARNS_TOKEN_SYMBOL is required'),
  EARNSTARK_MANAGER_ADDRESS: z.string().min(1, 'EARNSTARK_MANAGER_ADDRESS is required'),
  EARNS_TOKEN_OWNER: z.string().min(1, 'EARNS_TOKEN_OWNER is required'),

  // Paymaster (required)
  PAYMASTER_URL: z.url({ message: 'PAYMASTER_URL must be a valid URL' }),
  PAYMASTER_MODE: z.enum(['sponsored', 'default']).default('sponsored'),
  PAYMASTER_API_KEY: z.string().min(1, 'PAYMASTER_API_KEY is required'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('\n❌ Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const ENV = parsed.data;