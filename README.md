<p align="center">
  <img src="assets/banner.png" alt="Aegiz SDK Banner" width="100%" />
</p>

<h1 align="center">@aegiz/sdk</h1>

<p align="center">
  <strong>On-Chain AI Threat Detection for Solana</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@aegiz/sdk"><img src="https://img.shields.io/npm/v/@aegiz/sdk?color=blue&label=npm" alt="npm version" /></a>
  <a href="https://github.com/Bytez3/aegiz-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License" /></a>
  <a href="https://solana.com"><img src="https://img.shields.io/badge/Solana-On--Chain-blueviolet" alt="Solana" /></a>
  <a href="https://aegiz.io"><img src="https://img.shields.io/badge/website-aegiz.io-cyan" alt="Website" /></a>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#links">Links</a>
</p>

---

Aegiz is a neural network that runs **inference entirely on-chain** — it predicts and scores threats inside a Solana smart contract. Training happens off-chain via RLHF, with trained weights uploaded to the on-chain model. No servers. No APIs. No trust required.

This SDK lets you integrate Aegiz threat detection into your dApp, wallet, or service.

## Architecture

<p align="center">
  <img src="assets/architecture.png" alt="Aegiz Architecture" width="700" />
</p>

Three independent neural networks run **inference on-chain** and combine into an ensemble risk score. Training is performed **off-chain** via RLHF (Reinforcement Learning from Human Feedback) and weight updates are uploaded to the on-chain model.

| Neural Network | Features | Purpose |
|---|---|---|
| **Wallet NN** | 16 → 8 → 1 (145 params) | Balance analysis, drain detection, risk streaks |
| **Program NN** | 16 → 8 → 1 (145 params) | Upgrade authority, binary size, deployer reputation |
| **Token NN** | 16 → 8 → 1 (145 params) | Mint/freeze authority, supply analysis, rugpull signals |

> **435 active parameters** across 3 sub-networks, with 1500 total reserved slots for future expansion.

## Installation

```bash
npm install @aegiz/sdk
```

Peer dependencies:
```bash
npm install @solana/web3.js @coral-xyz/anchor
```

## Quick Start

### Read-Only (No Wallet Required)

```typescript
import { AegizClient } from "@aegiz/sdk";
import { PublicKey } from "@solana/web3.js";

const client = new AegizClient("https://api.mainnet-beta.solana.com");

// Quick risk check — works for wallets AND programs
const result = await client.quickCheck(new PublicKey("SomeAddress..."));
console.log(result.tier);       // "low" | "moderate" | "high" | "critical"
console.log(result.riskScore);  // 0-100
console.log(result.type);       // "wallet" | "program" | "unknown"

// Get detailed wallet reputation
const rep = await client.getWalletReputation(walletPubkey);

// Get program reputation
const progRep = await client.getProgramReputation(programId);

// Get token mint analysis
const mint = await client.getTokenMintAnalysis(mintPubkey);

// Get model stats (version, accuracy, active params)
const stats = await client.getModelStats();
```

### With Wallet (Transactions)

```typescript
import { AegizTransactionClient } from "@aegiz/sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

const provider = AnchorProvider.env();
const client = new AegizTransactionClient(provider);

// Predict risk for a wallet
const prediction = await client.predict(targetWallet);
console.log(prediction.riskScore);     // 0-100
console.log(prediction.drainDetected); // boolean

// Scan a program for threats
await client.scanProgram(programId, programDataPda);

// Scan a token mint for rugpull signals
await client.scanTokenMint(mintPubkey);

// Ensemble score (combines all three NNs)
await client.ensembleScore(walletRepPda, programRepPda, mintAnalysisPda);

// Community reporting & voting
await client.reportScam(scamWallet, "Drainer — stole 50 SOL", 10_000_000);
await client.reportScamProgram(scamProgram, "Fake DEX", 10_000_000);
await client.voteOnReport(blacklistEntry, true);
await client.voteOnProgramReport(blacklistEntry, false);
```

## API Reference

### `AegizClient` — Read-Only

| Method | Description |
|---|---|
| `quickCheck(address)` | Quick risk lookup for any address |
| `getWalletReputation(wallet)` | Full wallet reputation data |
| `getProgramReputation(program)` | Full program reputation data |
| `getTokenMintAnalysis(mint)` | Token mint analysis (rugpull signals) |
| `getReporterProfile(reporter)` | Reporter profile and stats |
| `getModelStats()` | Model version, accuracy, active params |
| `getBlacklistEntry(wallet)` | Wallet blacklist report details |
| `getProgramBlacklistEntry(program)` | Program blacklist report details |
| `classifyRisk(score)` | Score → tier classification |

### `AegizTransactionClient` — Wallet Required

| Method | Description |
|---|---|
| `predict(wallet, txCount?)` | Run on-chain AI inference on a wallet |
| `scanProgram(program, data, auth?)` | Scan a program for threats |
| `scanTokenMint(mint)` | Scan a token mint for rugpull signals |
| `scanTokens(wallet, accounts?)` | Scan token accounts for drainers |
| `ensembleScore(walletRep, progRep?, mint?)` | Combined ensemble risk score |
| `reportScam(wallet, proof, stake?)` | Report a wallet as scam |
| `reportScamProgram(program, proof, stake?)` | Report a program as scam |
| `voteOnReport(entry, confirm, stake?)` | Vote on a wallet report |
| `voteOnProgramReport(entry, confirm, stake?)` | Vote on a program report |

### PDA Helpers

```typescript
import {
  getModelPda,
  getReputationPda,
  getProgramReputationPda,
  getBlacklistPda,
  getProgramBlacklistPda,
  getTreasuryPda,
  getVotePda,
  getMintAnalysisPda,
  getReporterProfilePda,
} from "@aegiz/sdk";
```

## Network

| | Value |
|---|---|
| **Program ID** | `5QA63aoUXwHB6aUSvbzpHejKaqFCf8RafAFjhfjjRVnT` |
| **Architecture** | 3× (16→8→1) Ensemble |
| **Total Parameters** | 435 active / 1500 reserved |
| **Inference** | On-chain (Solana BPF) |
| **Training** | Off-chain (RLHF) |

## Features

- 🧠 **On-Chain Inference** — Three 16→8→1 NNs running inference entirely on Solana
- 🎓 **Off-Chain Training** — RLHF-trained models with weights uploaded to the program
- 🛡️ **Ensemble Scoring** — Combined risk assessment from wallet, program, and token analysis
- 👥 **Community Reporting** — Stake-backed scam reporting with voting
- 🔍 **Token Scanning** — Detect honeypots, rugpulls, and drainer patterns
- 📊 **Reputation Tracking** — Persistent wallet and program reputation PDAs
- ⚡ **Zero Trust** — No servers, no APIs, everything verifiable on-chain

## Links

- 🌐 Website: [aegiz.io](https://aegiz.io)
- 🐦 Twitter: [@aegizsol](https://x.com/aegizsol)
- 💻 GitHub: [Bytez3/aegiz-sdk](https://github.com/Bytez3/aegiz-sdk)
- 🔗 Explorer: [View on Solana](https://explorer.solana.com/address/5QA63aoUXwHB6aUSvbzpHejKaqFCf8RafAFjhfjjRVnT)

## License

MIT — see [LICENSE](LICENSE) for details.
