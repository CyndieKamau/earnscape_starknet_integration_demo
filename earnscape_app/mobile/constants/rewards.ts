// constants/rewards.ts
export const DEFAULT_USER_FIELDS = {
  starknetAddress: "",
  rewardPoints: 2000,   // starter balance for demos
  earnsClaimed: 0,
  walletDeployed: false,
} as const;

export const REWARD_CONVERSION = {
  POINTS_PER_EARNS: 100,   // 100 points = 1 EARNS (tweak later)
  MIN_POINTS: 100,         // minimum claim step
};

export const CLAIM_COPY = {
  title: "Claim Rewards",
  subtitle: "Convert your points to EARNS tokens",
};

export const fmt = (n: number, digits = 2) =>
  Number.isFinite(n) ? Number(n).toFixed(digits) : "0.00";

export const pointsToEarns = (points: number) =>
  points / REWARD_CONVERSION.POINTS_PER_EARNS;