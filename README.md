# @aegiz/sdk

**On-Chain AI Threat Detection for Solana**

Aegiz is a neural network that runs _entirely on-chain_ — it trains, learns, and predicts inside a Solana smart contract. No servers. No APIs. No trust required.

This SDK lets you integrate Aegiz threat detection into your dApp, wallet, or service.

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

// Connect to mainnet (default) or devnet
const client = new AegizClient("https://api.devnet.solana.com");

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

// Get reporter profile
const reporter = await client.getReporterProfile(reporterPubkey);

// Get model stats
const stats = await client.getModelStats();
console.log(stats.walletActiveParams);  // 145/145
console.log(stats.programActiveParams); // 145/145
console.log(stats.tokenActiveParams);   // 145/145
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

// Scan a program
await client.scanProgram(programId, programDataPda);

// Scan a token mint
await client.scanTokenMint(mintPubkey);

// Scan token accounts for drainers
await client.scanTokens(walletPubkey, tokenAccounts);

// Ensemble score (combines wallet + program + token NNs)
await client.ensembleScore(walletRepPda, programRepPda, mintAnalysisPda);

// Report a scam wallet or program
await client.reportScam(scamWallet, "Drainer — stole 50 SOL", 10_000_000);
await client.reportScamProgram(scamProgram, "Fake DEX", 10_000_000);

// Vote on reports
await client.voteOnReport(blacklistEntry, true);
await client.voteOnProgramReport(blacklistEntry, false);
```

## API Reference

### `AegizClient` (Read-Only)

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
| `AegizClient.classifyRisk(score)` | Score → tier classification |

### `AegizTransactionClient` (Wallet Required)

| Method | Description |
|---|---|
| `predict(wallet, txCount?)` | Run AI prediction on a wallet |
| `scanProgram(program, data, auth?)` | Scan a program for threats |
| `scanTokenMint(mint)` | Scan a token mint for rugpull signals |
| `scanTokens(wallet, accounts?)` | Scan token accounts for drainers |
| `ensembleScore(walletRep, progRep?, mint?)` | Combined ensemble risk score |
| `reportScam(wallet, proof, stake?)` | Report a wallet as scam |
| `reportScamProgram(program, proof, stake?)` | Report a program as scam |
| `voteOnReport(entry, confirm, stake?)` | Vote on a wallet report |
| `voteOnProgramReport(entry, confirm, stake?)` | Vote on a program report |

### Admin Methods

| Method | Description |
|---|---|
| `confirmScam(entry, wallet)` | Confirm a wallet scam report |
| `confirmScamProgram(program, data, auth?)` | Confirm a program scam report |
| `resolveReport(entry, wallet)` | Resolve a wallet report |
| `resolveProgramReport(entry, program)` | Resolve a program report |
| `rewardReporter(reporter, entry)` | Reward reporter for correct report |
| `rewardProgramReporter(reporter, entry)` | Reward reporter for correct program report |
| `setFees(prediction, scanProg, ensemble, scanToken)` | Set system fees |
| `resetAccuracy()` | Reset accuracy counters |
| `withdrawTreasury()` | Withdraw treasury funds |
| `snapshotWeights()` | Snapshot NN weights for rollback |
| `rollbackWeights()` | Rollback to last weight snapshot |
| `removeBlacklistEntry(wallet)` | Remove a blacklist entry |
| `emergencyPause(pause)` | Pause/unpause the system |
| `uploadWeights(weights, chunkSize?)` | Upload NN weights in chunks |

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

## Architecture

```
16 Input Features → 8 Hidden Nodes → 1 Output (Risk Score)
```

Three sub-networks running on-chain:
- **Wallet NN** (145 params): balance, age, drain detection, token infections, risk streaks
- **Program NN** (145 params): upgrade authority, binary size, deployer reputation
- **Token NN** (145 params): mint/freeze authority, supply analysis, rugpull signals

## Network

| | Address |
|---|---|
| **Program ID** | `5QA63aoUXwHB6aUSvbzpHejKaqFCf8RafAFjhfjjRVnT` |
| **Architecture** | 3× (16→8→1) Ensemble |
| **Total Parameters** | 435 active (1500 reserved) |

## Links

- Website: [aegiz.dev](https://aegiz.dev)
- Twitter: [@aegizsol](https://x.com/aegizsol)
- GitHub: [Bytez3/aegiz-sdk](https://github.com/Bytez3/aegiz-sdk)

## License

MIT
