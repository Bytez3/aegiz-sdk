/**
 * @aegiz/sdk — On-Chain AI Threat Detection for Solana
 *
 * V5 SDK with 16-feature neural network support.
 * Scan wallets, programs, and tokens for threats — all on-chain.
 *
 * @example
 * ```ts
 * import { AegizClient } from "@aegiz/sdk";
 * import { Connection } from "@solana/web3.js";
 *
 * const client = new AegizClient(connection);
 * const risk = await client.scanProgram(programId);
 * console.log(`Risk: ${risk.riskScore}%`);
 * ```
 *
 * @packageDocumentation
 */

import { PublicKey, Connection, type AccountInfo } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
import idl from "../idl/aegiz.json";

// ============================================================
// Constants
// ============================================================

export const AEGIZ_PROGRAM_ID = new PublicKey(
    "5QA63aoUXwHB6aUSvbzpHejKaqFCf8RafAFjhfjjRVnT"
);

export const MAINNET_RPC = "https://api.mainnet-beta.solana.com";
export const DEVNET_RPC = "https://api.devnet.solana.com";

/** NN architecture constants */
export const INPUT_COUNT = 16;
export const HIDDEN_COUNT = 8;
export const TOTAL_NN_PARAMS =
    INPUT_COUNT * HIDDEN_COUNT + HIDDEN_COUNT + HIDDEN_COUNT + 1; // 145

/** Staking constants */
export const PREDICTION_FEE_LAMPORTS = 1_000_000; // 0.001 SOL
export const MIN_REPORT_STAKE = 10_000_000; // 0.01 SOL
export const MIN_VOTE_STAKE = 5_000_000; // 0.005 SOL

// ============================================================
// PDA Helpers
// ============================================================

export function getModelPda(
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("model_weights")],
        programId
    );
}

export function getTreasuryPda(
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("sentinel_treasury")],
        programId
    );
}

export function getReputationPda(
    wallet: PublicKey,
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("reputation"), wallet.toBuffer()],
        programId
    );
}

export function getBlacklistPda(
    wallet: PublicKey,
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("blacklist"), wallet.toBuffer()],
        programId
    );
}

export function getProgramReputationPda(
    targetProgram: PublicKey,
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("program_rep"), targetProgram.toBuffer()],
        programId
    );
}

export function getProgramBlacklistPda(
    targetProgram: PublicKey,
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("prog_blacklist"), targetProgram.toBuffer()],
        programId
    );
}

export function getVotePda(
    report: PublicKey,
    voter: PublicKey,
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), report.toBuffer(), voter.toBuffer()],
        programId
    );
}

export function getMintAnalysisPda(
    mint: PublicKey,
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("mint_analysis"), mint.toBuffer()],
        programId
    );
}

export function getReporterProfilePda(
    reporter: PublicKey,
    programId = AEGIZ_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("reporter"), reporter.toBuffer()],
        programId
    );
}

// ============================================================
// Types
// ============================================================

export interface PredictionResult {
    riskScore: number;
    confidence: number;
    drainDetected: boolean;
    passiveLearning: boolean;
    txSignature: string;
}

export interface WalletReputation {
    wallet: string;
    firstSeenSlot: number;
    totalPredictions: number;
    timesReported: number;
    timesConfirmedScam: number;
    timesCleared: number;
    avgRiskScore: number | null;
    lastKnownBalance: number;
    minBalanceSeen: number;
    maxBalanceSeen: number;
    drainCount: number;
    tokenInfectionCount: number;
    highRiskStreak: number;
    deployerProgramCount: number;
    autoEscalated: boolean;
    riskHistory: number[];
}

export interface ProgramReputation {
    programId: string;
    firstScannedSlot: number;
    timesScanned: number;
    timesReported: number;
    timesConfirmedScam: number;
    hasUpgradeAuthority: boolean;
    authorityIsFlagged: boolean;
    programDataLen: number;
    riskScore: number;
    riskHistory: number[];
    highRiskStreak: number;
    autoEscalated: boolean;
    programBalance: number;
    deployerProgramCount: number;
    deployerDrainCount: number;
    deployerTokenInfections: number;
}

export interface BlacklistEntry {
    flaggedWallet: string;
    reporter: string;
    proof: string;
    timestamp: number;
    stake: number;
    status: "pending" | "confirmed" | "dismissed";
    resolved: boolean;
    predictedScore: number;
    confirmCount: number;
    disputeCount: number;
}

export interface ProgramBlacklistEntry {
    flaggedProgram: string;
    reporter: string;
    proof: string;
    timestamp: number;
    stake: number;
    status: "pending" | "confirmed" | "dismissed";
    resolved: boolean;
    predictedScore: number;
    confirmCount: number;
    disputeCount: number;
    confirmStake: number;
    disputeStake: number;
}

export interface TokenMintAnalysis {
    mint: string;
    firstScannedSlot: number;
    timesScanned: number;
    hasMintAuthority: boolean;
    hasFreezeAuthority: boolean;
    /** Same account controls both mint and freeze (common rug pattern) */
    sameAuthority: boolean;
    /** Authority is a multisig — safer */
    authorityIsMultisig: boolean;
    supply: number;
    decimals: number;
    riskScore: number;
}

export interface ReporterProfile {
    reporter: string;
    totalReports: number;
    confirmedCorrect: number;
    dismissedIncorrect: number;
    totalRewardsEarned: number;
    reputationTier: number;
    joinedSlot: number;
}

export interface ModelStats {
    admin: string;
    modelVersion: number;
    learningRate: number;
    correctPredictions: number;
    totalEvaluated: number;
    totalTrainingEvents: number;
    accuracy: number | null;
    paused: boolean;
    walletActiveParams: number;
    programActiveParams: number;
    /** Token NN weights[400..545), added in V6 */
    tokenActiveParams: number;
}

export type RiskTier = "low" | "moderate" | "high" | "critical";

// ============================================================
// Read-Only Client (no wallet required)
// ============================================================

/**
 * Aegiz SDK client for reading on-chain AI threat data.
 *
 * Works without a wallet — use for querying risk scores,
 * reputations, and model stats.
 *
 * @example
 * ```ts
 * const client = new AegizClient("https://api.devnet.solana.com");
 * const rep = await client.getWalletReputation(walletPubkey);
 * ```
 */
export class AegizClient {
    public connection: Connection;
    public programId: PublicKey;

    constructor(
        rpcOrConnection: string | Connection = MAINNET_RPC,
        programId: PublicKey = AEGIZ_PROGRAM_ID
    ) {
        this.connection =
            typeof rpcOrConnection === "string"
                ? new Connection(rpcOrConnection, "confirmed")
                : rpcOrConnection;
        this.programId = programId;
    }

    // ── Risk Classification ──

    static classifyRisk(score: number): RiskTier {
        if (score <= 20) return "low";
        if (score <= 40) return "moderate";
        if (score <= 60) return "high";
        return "critical";
    }

    static riskEmoji(tier: RiskTier): string {
        const map: Record<RiskTier, string> = {
            low: "✅",
            moderate: "⚠️",
            high: "❌",
            critical: "🚨",
        };
        return map[tier];
    }

    // ── Wallet Reputation ──

    async getWalletReputation(
        wallet: PublicKey
    ): Promise<WalletReputation | null> {
        const [pda] = getReputationPda(wallet, this.programId);
        const info = await this.connection.getAccountInfo(pda);
        if (!info) return null;
        return this._decodeWalletReputation(info);
    }

    // ── Program Reputation ──

    async getProgramReputation(
        program: PublicKey
    ): Promise<ProgramReputation | null> {
        const [pda] = getProgramReputationPda(program, this.programId);
        const info = await this.connection.getAccountInfo(pda);
        if (!info) return null;
        return this._decodeProgramReputation(info);
    }

    // ── Token Mint Analysis ──

    async getTokenMintAnalysis(
        mint: PublicKey
    ): Promise<TokenMintAnalysis | null> {
        const [pda] = getMintAnalysisPda(mint, this.programId);
        const info = await this.connection.getAccountInfo(pda);
        if (!info) return null;
        const d = info.data.slice(8); // skip 8-byte Anchor discriminator
        const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
        // TokenMintAnalysis layout (state.rs):
        // [0..32)  mint: Pubkey
        // [32..40) first_scanned_slot: u64
        // [40..44) times_scanned: u32
        // [44]     has_mint_authority: bool
        // [45]     has_freeze_authority: bool
        // [46]     same_authority: bool
        // [47]     authority_is_multisig: bool
        // [48..56) supply: u64
        // [56]     decimals: u8
        // [57]     risk_score: u8
        // [58]     bump: u8
        return {
            mint: new PublicKey(d.slice(0, 32)).toBase58(),
            firstScannedSlot: Number(view.getBigUint64(32, true)),
            timesScanned: view.getUint32(40, true),
            hasMintAuthority: d[44] === 1,
            hasFreezeAuthority: d[45] === 1,
            sameAuthority: d[46] === 1,
            authorityIsMultisig: d[47] === 1,
            supply: Number(view.getBigUint64(48, true)),
            decimals: d[56],
            riskScore: d[57],
        };
    }

    // ── Model Stats ──

    async getModelStats(): Promise<ModelStats> {
        const [pda] = getModelPda(this.programId);
        const info = await this.connection.getAccountInfo(pda);
        if (!info) throw new Error("Model account not found");

        const d = info.data.slice(8);
        const view = new DataView(d.buffer, d.byteOffset, d.byteLength);

        // Admin pubkey at offset 0
        const admin = new PublicKey(d.slice(0, 32)).toBase58();
        const modelVersion = Number(view.getBigUint64(32, true));
        const learningRate = view.getFloat32(40, true);
        const correctPredictions = view.getUint32(44, true);
        const totalEvaluated = view.getUint32(48, true);

        // SentinelModel fixed fields layout (after 8-byte discriminator):
        // [0..32)  admin: Pubkey
        // [32..40) model_version: u64
        // [40..44) learning_rate: f32
        // [44..48) correct_predictions: u32
        // [48..52) total_evaluated: u32
        // [52..56) rolling_correct: u32
        // [56..60) rolling_total: u32
        // [60..68) total_training_events: u64
        // [68]     bump: u8
        // [69..72) _padding: [u8; 3]
        // [72..)   weights: [f32; 1500]
        const weightsStart = 72;
        let walletActive = 0;
        let programActive = 0;
        let tokenActive = 0;

        // Wallet NN: weights[0..145)
        for (let i = 0; i < 145; i++) {
            const offset = weightsStart + i * 4;
            if (offset + 4 <= d.length && view.getFloat32(offset, true) !== 0) walletActive++;
        }

        // Program NN: weights[200..345)
        for (let i = 200; i < 345; i++) {
            const offset = weightsStart + i * 4;
            if (offset + 4 <= d.length && view.getFloat32(offset, true) !== 0) programActive++;
        }

        // Token NN: weights[400..545) — added in V6
        for (let i = 400; i < 545; i++) {
            const offset = weightsStart + i * 4;
            if (offset + 4 <= d.length && view.getFloat32(offset, true) !== 0) tokenActive++;
        }

        // Paused flag: weights[1280]
        const pausedOffset = weightsStart + 1280 * 4;
        const paused = pausedOffset + 4 <= d.length
            ? view.getFloat32(pausedOffset, true) === 1.0
            : false;

        return {
            admin,
            modelVersion,
            learningRate,
            correctPredictions,
            totalEvaluated,
            totalTrainingEvents: modelVersion,
            accuracy: totalEvaluated > 0 ? correctPredictions / totalEvaluated : null,
            paused,
            walletActiveParams: walletActive,
            programActiveParams: programActive,
            tokenActiveParams: tokenActive,
        };
    }

    // ── Blacklist ──

    async getBlacklistEntry(
        wallet: PublicKey
    ): Promise<BlacklistEntry | null> {
        const [pda] = getBlacklistPda(wallet, this.programId);
        const info = await this.connection.getAccountInfo(pda);
        if (!info) return null;
        return this._decodeBlacklist(info);
    }

    // ── Program Blacklist ──

    async getProgramBlacklistEntry(
        program: PublicKey
    ): Promise<ProgramBlacklistEntry | null> {
        const [pda] = getProgramBlacklistPda(program, this.programId);
        const info = await this.connection.getAccountInfo(pda);
        if (!info) return null;
        const d = info.data.slice(8);
        const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
        const proofLen = view.getUint32(64, true);
        const proof = new TextDecoder().decode(
            d.slice(68, 68 + Math.min(proofLen, 256))
        );
        const base = 68 + 256;
        const statusByte = d[base + 36];
        return {
            flaggedProgram: new PublicKey(d.slice(0, 32)).toBase58(),
            reporter: new PublicKey(d.slice(32, 64)).toBase58(),
            proof,
            timestamp: Number(view.getBigInt64(base, true)),
            stake: Number(view.getBigUint64(base + 8, true)),
            status:
                statusByte === 0
                    ? "pending"
                    : statusByte === 1
                        ? "confirmed"
                        : "dismissed",
            resolved: d[base + 37] === 1,
            predictedScore: d[base + 38],
            confirmCount: view.getUint16(base + 16, true),
            disputeCount: view.getUint16(base + 18, true),
            confirmStake: Number(view.getBigUint64(base + 20, true)),
            disputeStake: Number(view.getBigUint64(base + 28, true)),
        };
    }

    // ── Reporter Profile ──

    async getReporterProfile(
        reporter: PublicKey
    ): Promise<ReporterProfile | null> {
        const [pda] = getReporterProfilePda(reporter, this.programId);
        const info = await this.connection.getAccountInfo(pda);
        if (!info) return null;
        const d = info.data.slice(8);
        const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
        const tierLabels = ["New", "Trusted", "Expert", "Elite"];
        const confirmedCorrect = view.getUint16(36, true);
        const dismissedIncorrect = view.getUint16(38, true);
        const total = confirmedCorrect + dismissedIncorrect;
        return {
            reporter: new PublicKey(d.slice(0, 32)).toBase58(),
            totalReports: view.getUint16(32, true),
            confirmedCorrect,
            dismissedIncorrect,
            totalRewardsEarned: Number(view.getBigUint64(40, true)),
            reputationTier: d[48],
            joinedSlot: Number(view.getBigUint64(49, true)),
        };
    }

    // ── Quick Risk Check ──

    /**
     * Quick check: is this wallet/program flagged?
     * Returns risk tier without needing a transaction.
     */
    async quickCheck(
        address: PublicKey
    ): Promise<{
        found: boolean;
        type: "wallet" | "program" | "unknown";
        riskScore: number | null;
        tier: RiskTier | null;
        reputation: WalletReputation | ProgramReputation | null;
    }> {
        // Try wallet first
        const walletRep = await this.getWalletReputation(address);
        if (walletRep) {
            const score = walletRep.avgRiskScore ?? 0;
            return {
                found: true,
                type: "wallet",
                riskScore: score,
                tier: AegizClient.classifyRisk(score),
                reputation: walletRep,
            };
        }

        // Try program
        const progRep = await this.getProgramReputation(address);
        if (progRep) {
            return {
                found: true,
                type: "program",
                riskScore: progRep.riskScore,
                tier: AegizClient.classifyRisk(progRep.riskScore),
                reputation: progRep,
            };
        }

        return {
            found: false,
            type: "unknown",
            riskScore: null,
            tier: null,
            reputation: null,
        };
    }

    // ── Decoders ──

    private _decodeWalletReputation(
        info: AccountInfo<Buffer>
    ): WalletReputation {
        const d = info.data.slice(8);
        const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
        const riskHistory: number[] = [];
        for (let i = 0; i < 5; i++) riskHistory.push(d[78 + i]);
        return {
            wallet: new PublicKey(d.slice(0, 32)).toBase58(),
            firstSeenSlot: Number(view.getBigUint64(32, true)),
            totalPredictions: view.getUint32(40, true),
            timesReported: view.getUint16(44, true),
            timesConfirmedScam: view.getUint16(46, true),
            timesCleared: view.getUint16(48, true),
            avgRiskScore:
                view.getUint32(40, true) > 0
                    ? view.getUint32(58, true) / view.getUint32(40, true)
                    : null,
            lastKnownBalance: Number(view.getBigUint64(70, true)),
            minBalanceSeen: Number(view.getBigUint64(78, true)),
            maxBalanceSeen: Number(view.getBigUint64(86, true)),
            drainCount: view.getUint16(94, true),
            tokenInfectionCount: view.getUint16(96, true),
            riskHistory,
            highRiskStreak: d[84],
            deployerProgramCount: d[85],
            autoEscalated: d[86] === 1,
        };
    }

    private _decodeProgramReputation(
        info: AccountInfo<Buffer>
    ): ProgramReputation {
        const d = info.data.slice(8);
        const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
        const riskHistory: number[] = [];
        for (let i = 0; i < 5; i++) riskHistory.push(d[55 + i]);
        return {
            programId: new PublicKey(d.slice(0, 32)).toBase58(),
            firstScannedSlot: Number(view.getBigUint64(32, true)),
            timesScanned: view.getUint32(40, true),
            timesReported: view.getUint16(44, true),
            timesConfirmedScam: view.getUint16(46, true),
            hasUpgradeAuthority: d[48] === 1,
            authorityIsFlagged: d[49] === 1,
            programDataLen: view.getUint32(50, true),
            riskScore: d[54],
            riskHistory,
            highRiskStreak: d[61],
            autoEscalated: d[62] === 1,
            programBalance: d.length > 70 ? Number(view.getBigUint64(63, true)) : 0,
            deployerProgramCount: d.length > 71 ? d[71] : 0,
            deployerDrainCount: d.length > 73 ? view.getUint16(72, true) : 0,
            deployerTokenInfections: d.length > 75 ? view.getUint16(74, true) : 0,
        };
    }

    private _decodeBlacklist(info: AccountInfo<Buffer>): BlacklistEntry {
        const d = info.data.slice(8);
        const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
        const proofLen = view.getUint32(64, true);
        const proof = new TextDecoder().decode(
            d.slice(68, 68 + Math.min(proofLen, 256))
        );
        const base = 68 + 256;
        const statusByte = d[base + 36];
        return {
            flaggedWallet: new PublicKey(d.slice(0, 32)).toBase58(),
            reporter: new PublicKey(d.slice(32, 64)).toBase58(),
            proof,
            timestamp: Number(view.getBigInt64(base, true)),
            stake: Number(view.getBigUint64(base + 8, true)),
            status:
                statusByte === 0
                    ? "pending"
                    : statusByte === 1
                        ? "confirmed"
                        : "dismissed",
            resolved: d[base + 37] === 1,
            predictedScore: d[base + 38],
            confirmCount: view.getUint16(base + 16, true),
            disputeCount: view.getUint16(base + 18, true),
        };
    }
}

// ============================================================
// Transaction Client (wallet required)
// ============================================================

/**
 * Extended client with transaction capabilities.
 * Requires a wallet/signer for on-chain operations.
 *
 * @example
 * ```ts
 * const client = new AegizTransactionClient(provider);
 * const result = await client.predict(targetWallet);
 * ```
 */
export class AegizTransactionClient extends AegizClient {
    public program: Program<any>;

    constructor(
        provider: AnchorProvider,
        programId: PublicKey = AEGIZ_PROGRAM_ID
    ) {
        super(provider.connection, programId);
        this.program = new Program(idl as any, provider);
    }

    /** Predict risk score for a wallet (creates/updates WalletReputation PDA) */
    async predict(
        targetWallet: PublicKey,
        recentTxCount = 0
    ): Promise<PredictionResult> {
        const tx = await (this.program.methods as any)
            .predict(new BN(recentTxCount))
            .accounts({
                user: this.program.provider.publicKey!,
                targetWallet,
            })
            .rpc();

        const txDetails =
            await this.program.provider.connection.getTransaction(tx, {
                commitment: "confirmed",
            });

        const logs = txDetails?.meta?.logMessages || [];
        let riskScore = 50,
            confidence = 0,
            drainDetected = false,
            passiveLearning = false;

        for (const log of logs) {
            const riskMatch = log.match(/Risk:(\d+)/);
            if (riskMatch) riskScore = parseInt(riskMatch[1], 10);
            const confMatch = log.match(/Conf:(\d+)/);
            if (confMatch) confidence = parseInt(confMatch[1], 10);
            if (log.includes("DRAIN")) drainDetected = true;
            if (log.includes("[learned]")) passiveLearning = true;
        }

        return {
            riskScore,
            confidence,
            drainDetected,
            passiveLearning,
            txSignature: tx,
        };
    }

    /** Scan a program for malicious signals */
    async scanProgram(
        targetProgram: PublicKey,
        programData: PublicKey,
        authorityReputation?: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .scanProgram()
            .accounts({
                caller: this.program.provider.publicKey!,
                targetProgram,
                programData,
                authorityReputation: authorityReputation || null,
            })
            .rpc();
    }

    /** Scan a token mint for honeypot/rugpull signals (creates/updates TokenMintAnalysis PDA) */
    async scanTokenMint(
        mint: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .scanTokenMint()
            .accounts({
                caller: this.program.provider.publicKey!,
                mint,
            })
            .rpc();
    }

    /** Scan token accounts for drainer signals */
    async scanTokens(
        targetWallet: PublicKey,
        tokenAccounts: PublicKey[] = []
    ): Promise<string> {
        const remainingAccounts = tokenAccounts.map((pubkey) => ({
            pubkey,
            isWritable: false,
            isSigner: false,
        }));

        return (this.program.methods as any)
            .scanTokens()
            .accounts({
                caller: this.program.provider.publicKey!,
                targetWallet,
            })
            .remainingAccounts(remainingAccounts)
            .rpc();
    }

    /** Get ensemble risk score combining wallet + program + token NNs */
    async ensembleScore(
        walletReputation: PublicKey,
        programReputation?: PublicKey,
        mintAnalysis?: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .ensembleScore()
            .accounts({
                caller: this.program.provider.publicKey!,
                walletReputation,
                programReputation: programReputation || null,
                mintAnalysis: mintAnalysis || null,
            })
            .rpc();
    }

    /** Report a wallet as a scam */
    async reportScam(
        flaggedWallet: PublicKey,
        proof: string,
        stakeLamports = MIN_REPORT_STAKE
    ): Promise<string> {
        return (this.program.methods as any)
            .reportScam(flaggedWallet, proof, new BN(stakeLamports))
            .accounts({ reporter: this.program.provider.publicKey! })
            .rpc();
    }

    /** Report a program as a scam */
    async reportScamProgram(
        flaggedProgram: PublicKey,
        proof: string,
        stakeLamports = MIN_REPORT_STAKE
    ): Promise<string> {
        return (this.program.methods as any)
            .reportScamProgram(flaggedProgram, proof, new BN(stakeLamports))
            .accounts({ reporter: this.program.provider.publicKey! })
            .rpc();
    }

    /** Vote on an existing wallet report */
    async voteOnReport(
        blacklistEntry: PublicKey,
        isConfirm: boolean,
        stakeLamports = MIN_VOTE_STAKE
    ): Promise<string> {
        return (this.program.methods as any)
            .voteOnReport(isConfirm, new BN(stakeLamports))
            .accounts({
                voter: this.program.provider.publicKey!,
                blacklistEntry,
            })
            .rpc();
    }

    /** Vote on an existing program report */
    async voteOnProgramReport(
        blacklistEntry: PublicKey,
        isConfirm: boolean,
        stakeLamports = MIN_VOTE_STAKE
    ): Promise<string> {
        return (this.program.methods as any)
            .voteOnProgramReport(isConfirm, new BN(stakeLamports))
            .accounts({
                voter: this.program.provider.publicKey!,
                blacklistEntry,
            })
            .rpc();
    }

    // ── Admin Methods ──

    /** Admin: confirm a wallet is a scam */
    async confirmScam(
        blacklistEntry: PublicKey,
        targetWallet: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .confirmScam()
            .accounts({
                admin: this.program.provider.publicKey!,
                blacklistEntry,
                targetWallet,
            } as any)
            .rpc();
    }

    /** Admin: confirm a program is a scam */
    async confirmScamProgram(
        targetProgram: PublicKey,
        programData: PublicKey,
        authorityReputation?: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .confirmScamProgram()
            .accounts({
                admin: this.program.provider.publicKey!,
                targetProgram,
                programData,
                authorityReputation: authorityReputation || null,
            } as any)
            .rpc();
    }

    /** Admin: resolve a wallet report */
    async resolveReport(
        blacklistEntry: PublicKey,
        targetWallet: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .resolveReport()
            .accounts({
                admin: this.program.provider.publicKey!,
                blacklistEntry,
                targetWallet,
            } as any)
            .rpc();
    }

    /** Admin: resolve a program report */
    async resolveProgramReport(
        blacklistEntry: PublicKey,
        targetProgram: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .resolveProgramReport()
            .accounts({
                admin: this.program.provider.publicKey!,
                blacklistEntry,
                targetProgram,
            } as any)
            .rpc();
    }

    /** Admin: reward a reporter for correct report */
    async rewardReporter(
        reporter: PublicKey,
        blacklistEntry: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .rewardReporter()
            .accounts({
                admin: this.program.provider.publicKey!,
                reporter,
                blacklistEntry,
            } as any)
            .rpc();
    }

    /** Admin: reward a reporter for correct program report */
    async rewardProgramReporter(
        reporter: PublicKey,
        blacklistEntry: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .rewardProgramReporter()
            .accounts({
                admin: this.program.provider.publicKey!,
                reporter,
                blacklistEntry,
            } as any)
            .rpc();
    }

    /** Admin: set prediction/scan/ensemble fees */
    async setFees(
        predictionFee: number,
        scanProgramFee: number,
        ensembleFee: number,
        scanTokenFee: number
    ): Promise<string> {
        return (this.program.methods as any)
            .setFees(
                new BN(predictionFee),
                new BN(scanProgramFee),
                new BN(ensembleFee),
                new BN(scanTokenFee)
            )
            .accounts({ admin: this.program.provider.publicKey! })
            .rpc();
    }

    /** Admin: reset accuracy counters */
    async resetAccuracy(): Promise<string> {
        return (this.program.methods as any)
            .resetAccuracy()
            .accounts({ admin: this.program.provider.publicKey! })
            .rpc();
    }

    /** Admin: withdraw treasury funds */
    async withdrawTreasury(): Promise<string> {
        return (this.program.methods as any)
            .withdrawTreasury()
            .accounts({ admin: this.program.provider.publicKey! })
            .rpc();
    }

    /** Admin: snapshot current NN weights for rollback */
    async snapshotWeights(): Promise<string> {
        return (this.program.methods as any)
            .snapshotWeights()
            .accounts({ admin: this.program.provider.publicKey! })
            .rpc();
    }

    /** Admin: rollback NN weights to last snapshot */
    async rollbackWeights(): Promise<string> {
        return (this.program.methods as any)
            .rollbackWeights()
            .accounts({ admin: this.program.provider.publicKey! })
            .rpc();
    }

    /** Admin: remove a blacklist entry */
    async removeBlacklistEntry(
        flaggedWallet: PublicKey
    ): Promise<string> {
        return (this.program.methods as any)
            .removeBlacklistEntry(flaggedWallet)
            .accounts({ admin: this.program.provider.publicKey! })
            .rpc();
    }

    /** Admin: emergency pause/unpause the system */
    async emergencyPause(pause: boolean): Promise<string> {
        return (this.program.methods as any)
            .emergencyPause(pause)
            .accounts({ admin: this.program.provider.publicKey! })
            .rpc();
    }

    /**
     * Admin: upload NN weights in chunks.
     * Weight layout: V5 16→8→1 architecture = 145 active params.
     * Full weight array is 1500 floats including reserved regions.
     */
    async uploadWeights(
        weights: number[],
        chunkSize = 200
    ): Promise<string[]> {
        const txIds: string[] = [];
        const totalChunks = Math.ceil(weights.length / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
            const offset = i * chunkSize;
            const chunk = weights.slice(offset, offset + chunkSize);
            const tx = await (this.program.methods as any)
                .updateWeights(offset, chunk)
                .accounts({ admin: this.program.provider.publicKey! })
                .rpc();
            txIds.push(tx);
        }
        return txIds;
    }
}

// ============================================================
// Convenience Exports
// ============================================================

export { idl as AEGIZ_IDL };
export default AegizClient;
