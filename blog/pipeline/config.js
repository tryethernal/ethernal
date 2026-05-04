/**
 * @fileoverview Configuration for the blog trend pipeline.
 * Defines topic clusters, scoring weights, and source settings.
 */

/** Scoring weights for priority calculation */
export const WEIGHTS = {
  erc_count: 3,
  eip_count: 3,
  ethresearch_posts: 2,
  arxiv_papers: 2,
  magicians_topics: 1,
  google_trends: 0.5,
};

/** Minimum score to create a project card */
export const SCORE_THRESHOLD = 5;

/**
 * Per-cluster performance multipliers, derived from PostHog visitors/day on
 * published articles. Re-evaluate quarterly. Multiplier > 1 boosts the cluster
 * score so high-performing topics surface earlier in pickNextTopic().
 *
 * Last updated: 2026-05-04 from 30d PostHog data (n=27 published articles).
 * Top performers (>=1.0 vis/day): account-abstraction, security-auditing, defi-primitives.
 * Underperformers (<0.5 vis/day): ai-agents-onchain, zk-cryptography.
 */
export const CLUSTER_PERFORMANCE_MULTIPLIER = {
  'account-abstraction': 1.5,
  'security-auditing': 1.5,
  'evm-internals': 1.3,
  'defi-primitives': 1.2,
  'l2-rollups': 1.1,
  'protocol-networking': 1.0,
  'governance-standards': 1.0,
  'payments-streams': 1.0,
  'encrypted-mempools': 1.0,
  'nft-token-standards': 0.9,
  'ai-agents-onchain': 0.7,
  'zk-cryptography': 0.6,
};

/**
 * Topic clusters with keyword patterns.
 * Each keyword is matched case-insensitively against titles and abstracts.
 */
export const CLUSTERS = {
  'ai-agents-onchain': {
    label: 'AI Agents Onchain',
    keywords: ['agent', 'autonomous', 'agentic', 'LLM', 'AI-native', 'machine learning onchain', 'federated learning'],
  },
  'account-abstraction': {
    label: 'Account Abstraction',
    keywords: ['ERC-4337', 'smart account', 'paymaster', 'bundler', 'account abstraction', 'ERC-7702', 'EOA', 'composable transaction', 'identity account', 'key delegation'],
  },
  'encrypted-mempools': {
    label: 'Encrypted Mempools & Privacy',
    keywords: ['encrypted mempool', 'MEV protection', 'threshold encryption', 'LUCID', 'order flow', 'privacy pool', 'private transaction', 'confidential'],
  },
  'payments-streams': {
    label: 'Payments & Streams',
    keywords: ['subscription', 'recurring payment', 'payment channel', 'payment stream', 'voucher'],
  },
  'security-auditing': {
    label: 'Security & Auditing',
    keywords: ['vulnerability', 'audit', 'reentrancy', 'exploit', 'security', 'fuzzing', 'formal verification', 'intrusion detection', 'poisoning attack'],
  },
  'l2-rollups': {
    label: 'L2 & Rollups',
    keywords: ['rollup', 'L2', 'layer 2', 'optimistic', 'sequencer', 'blob', 'EIP-4844', 'data availability', 'finality', 'confirmation rule'],
  },
  'zk-cryptography': {
    label: 'ZK & Cryptography',
    keywords: ['zero knowledge', 'ZK', 'zkSNARK', 'zkSTARK', 'PLONK', 'post-quantum', 'FHE', 'homomorphic', 'BN254', 'altbn128', 'elliptic curve', 'pairing', 'BLS', 'polynomial'],
  },
  'defi-primitives': {
    label: 'DeFi Primitives',
    keywords: ['AMM', 'lending', 'oracle', 'DEX', 'liquidity', 'yield', 'flash loan', 'MEV', 'vault', 'memecoin', 'price elasticit', 'tokenized'],
  },
  'nft-token-standards': {
    label: 'NFT & Token Standards',
    keywords: ['NFT', 'ERC-721', 'ERC-1155', 'token standard', 'soulbound', 'SBT', 'metadata'],
  },
  'evm-internals': {
    label: 'EVM Internals',
    keywords: ['opcode', 'arithmetic', 'control flow', 'gas pricing', 'gas cost', 'repricing', 'state write', 'state pricing', 'EVM stack', 'trie', 'SSZ', 'verkle'],
  },
  'protocol-networking': {
    label: 'Protocol & Networking',
    keywords: ['consensus', 'engine API', 'FOCIL', 'fork choice', 'inclusion list', 'RPC', 'p2p', 'networking', 'beacon', 'validator'],
  },
  'governance-standards': {
    label: 'Governance & Standards',
    keywords: ['registry', 'proxy', 'dispatch', 'DAO', 'governance', 'entity', 'cross-chain message', 'ERC-7786'],
  },
};

/** GitHub Projects V2 field IDs */
export const PROJECT = {
  id: 'PVT_kwDOBLpTN84BRc80',
  owner: 'tryethernal',
  number: 1,
  fields: {
    status: 'PVTSSF_lADOBLpTN84BRc80zg_Rr0E',
    trendScore: 'PVTF_lADOBLpTN84BRc80zg_Rtis',
    topicCluster: 'PVTSSF_lADOBLpTN84BRc80zg_RtzU',
    sourceLinks: 'PVTF_lADOBLpTN84BRc80zg_Rt28',
    contentType: 'PVTSSF_lADOBLpTN84BRc80zg_Rt3A',
    articlePath: 'PVTF_lADOBLpTN84BRc80zg_SJMU',
  },
  statusOptions: {
    detected: 'f75ad846',
    researched: '61e4505c',
    drafting: '47fc9ee4',
    published: '98236657',
  },
  clusterOptions: {
    'ai-agents-onchain': '18018e53',
    'account-abstraction': '1900af26',
    'encrypted-mempools': '6dc1811f',
    'payments-streams': '2c30b2c4',
    'security-auditing': '603cd6d6',
    'l2-rollups': 'de668efe',
    'zk-cryptography': 'b1876853',
    'defi-primitives': '734451ef',
    'nft-token-standards': '936d9af5',
    'evm-internals': '8f7bc284',
    'protocol-networking': '534ef426',
    'governance-standards': 'c467de54',
    'emerging': '27ca63f4',
  },
  contentTypeOptions: {
    // IDs regenerated 2026-05-04 when 'comparison-listicle' was added via
    // updateProjectV2Field mutation — GitHub rotates all option IDs on edit.
    'erc-tutorial': 'fee285ed',
    'eip-explainer': '08ee3226',
    'research-deep-dive': '04540eaf',
    'upgrade-guide': '386b7e7d',
    'trend-survey': '4182f2e8',
    'comparison-listicle': 'a645d615',
  },
};

/**
 * Curated comparison-listicle topics. The pipeline doesn't generate these from
 * trend scans — they're picked manually because they're high-intent commercial
 * search terms ("best X for Y in 2026"), which `best-block-explorers-evm-chains-2026`
 * proved are our highest sustained-traffic format (~2.0 vis/day vs ~0.7 average).
 *
 * Add new entries here, then run `node blog/pipeline/seed-listicles.js` to push
 * them as Detected cards on the project board. The picker will surface them
 * normally via the existing round-robin logic.
 */
export const LISTICLE_TOPICS = [
  {
    title: 'Best Block Explorers for Arbitrum Orbit Chains in 2026',
    cluster: 'l2-rollups',
    score: 8,
    sources: [],
    body: 'Comparison-listicle for Orbit chain teams choosing an explorer. Cover Arbiscan (per-chain only), Blockscout, Ethernal, Routescan. Highlight Orbit-specific features (bridge monitoring, batch tracking, AnyTrust Nova).',
  },
  {
    title: 'Best Hardhat Alternatives for 2026',
    cluster: 'evm-internals',
    score: 8,
    sources: [],
    body: 'Comparison-listicle for teams evaluating Hardhat vs Foundry vs Brownie vs Truffle (deprecated) vs Apeworx. Decision framework by team type. Tie back to Ethernal\'s Hardhat plugin and Foundry/Anvil integration.',
  },
  {
    title: 'Best EVM Trace Tools Compared in 2026',
    cluster: 'security-auditing',
    score: 9,
    sources: [],
    body: 'Comparison-listicle: Tenderly, Phalcon, Ethernal traces, hardhat trace, foundry trace, OpenChain trace. Setup, depth (call tree, state diff, gas profile), pricing. Strong fit for our existing tracing feature.',
  },
];

/** RSS feed URLs */
export const FEEDS = {
  ethresearch: 'https://ethresear.ch/latest.rss',
  magicians: 'https://ethereum-magicians.org/latest.rss',
};

/** arxiv API search query for blockchain/Ethereum papers */
export const ARXIV_QUERY = '(ethereum OR "smart contract" OR EVM OR solidity OR blockchain) AND (cat:cs.CR OR cat:cs.DC OR cat:cs.SE)';

/** How many days back to look */
export const LOOKBACK_DAYS = 30;
