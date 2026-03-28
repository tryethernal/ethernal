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
    'erc-tutorial': '21dbb30f',
    'eip-explainer': '94abd245',
    'research-deep-dive': '86f39acd',
    'upgrade-guide': '485f1ac9',
    'trend-survey': 'aca904af',
  },
};

/** RSS feed URLs */
export const FEEDS = {
  ethresearch: 'https://ethresear.ch/latest.rss',
  magicians: 'https://ethereum-magicians.org/latest.rss',
};

/** arxiv API search query for blockchain/Ethereum papers */
export const ARXIV_QUERY = '(ethereum OR "smart contract" OR EVM OR solidity OR blockchain) AND (cat:cs.CR OR cat:cs.DC OR cat:cs.SE)';

/** How many days back to look */
export const LOOKBACK_DAYS = 30;
