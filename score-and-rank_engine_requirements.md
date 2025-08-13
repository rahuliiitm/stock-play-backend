1. Overview
We need to implement a Contest Result Calculation Engine and a Scoring/Ranking Engine in the backend (NestJS), designed to handle multiple contest types related to financial markets (e.g., stock indexes, sector indexes, commodities).
The system must be:
Customizable – new contest types, scoring rules, and ranking rules can be added without modifying core logic.
Extensible – easily plug in new calculation modules for different financial instruments or rules.
Configurable – admins can define contest parameters, time windows, scoring methods, and ranking methods dynamically.
2. Core Components
2.1 Contest Definition
Contest metadata:
Contest name, description
Asset type (e.g., stock index, sector index, commodity)
Contest start and end times
Market data source configuration
Scoring method (configurable)
Ranking method (configurable)
Rules engine:
Input: Admin-defined JSON/YAML rule definition
Output: Rule execution config for calculation engine
Example:
{
  "contestName": "Gap Up/Gap Down Prediction",
  "asset": "SENSEX",
  "parameters": {
    "threshold": 0.2
  },
  "scoringMethod": "exact_match",
  "rankingMethod": "highest_score"
}
2.2 Result Calculation Engine
Responsible for:
Fetching actual market results from data provider(s) after contest ends.
Processing results according to contest rules.
Outputting a participant-wise raw result dataset.
Requirements:
Support multiple calculation modules:
Gap Up / Gap Down: Compare today's close with tomorrow's open.
Close Positive / Negative: Compare close vs. previous close.
Range Prediction: Compare predicted % move vs. actual % move.
Volatility Prediction: Compare predicted high-low range vs. actual.
Must allow plug-and-play calculation modules via an interface:
interface ContestCalculator {
  calculateResults(contestConfig, participantPredictions, marketData): RawResults[];
}
Raw result format:
[
  { "participantId": 1, "predicted": "Gap Up", "actual": "Gap Down", "isCorrect": false, "errorMargin": 0.5 },
  { "participantId": 2, "predicted": "Gap Down", "actual": "Gap Down", "isCorrect": true, "errorMargin": 0 }
]
2.3 Scoring Engine
Responsible for:
Applying scoring rules to raw results from calculation engine.
Producing a scored dataset.
Requirements:
Configurable scoring per contest:
Exact match = 10 points
Close prediction = 5 points
Error margin penalty = subtract X per % error
Support multiple scoring rule strategies:
interface ScoringStrategy {
  calculateScore(rawResult, scoringParams): number;
}
Allow adding new scoring strategies without modifying core.
Example Scoring Rules:
{
  "exact_match": { "points": 10 },
  "margin_based": { "maxPoints": 10, "penaltyPerPercent": 1 }
}
2.4 Ranking Engine
Responsible for:
Ranking participants based on scored dataset.
Supporting multiple ranking methods:
Highest total score wins
Lowest error wins
Weighted rank (some contests may prioritize certain predictions)
Must allow admin to configure ranking logic via JSON/YAML.
Example Ranking Rules:
{
  "method": "highest_score",
  "tiebreaker": "earliest_submission"
}
3. Default Contest Formats (Starting Set)
Gap Up / Gap Down Prediction
Predict if tomorrow’s opening price will be higher or lower than today’s close.
Positive / Negative Close
Predict if index will end the day green or red.
Range Prediction
Predict tomorrow's high-low range.
Percent Change Prediction
Predict % change between open and close.
4. Execution Task List for Cursor API
Step 1: Project Setup
 Create contest module in NestJS.
 Define TypeORM/Prisma models for:
Contest
ParticipantPrediction
MarketResult
ContestResult
ScoringRule
RankingRule
 Add seed data for default contests.
Step 2: Calculation Engine
 Create ContestCalculator interface.
 Implement default calculators:
Gap Up / Gap Down Calculator
Positive / Negative Close Calculator
Range Prediction Calculator
Percent Change Calculator
 Add service to fetch market data from provider.
Step 3: Scoring Engine
 Create ScoringStrategy interface.
 Implement default scoring strategies:
Exact Match
Margin-Based
 Allow scoring params in contest config.
Step 4: Ranking Engine
 Create RankingStrategy interface.
 Implement:
Highest Score
Lowest Error
Weighted Rank
 Implement tie-breaker logic.
Step 5: Orchestration
 Create BullMQ/Kafka job to:
Trigger calculation after market close.
Run scoring engine.
Run ranking engine.
 Store results in DB.
 Publish rankings to frontend API.
Step 6: Extensibility
 Add mechanism to register new calculators, scoring, and ranking strategies without codebase overhaul.
 Document how to add new contest formats.
Step 7: Deployment
 Dockerize service.
 Deploy to Render/Fly.io.
 Schedule jobs via CRON or external scheduler.



 sample code :


   // contests/engine/contest-type.enum.ts
export enum ContestType {
  GAP_DIRECTION = 'GAP_DIRECTION',      // Nifty opens gap up/down/flat
  CLOSE_DIRECTION = 'CLOSE_DIRECTION',  // Nifty closes +ve / -ve / flat
  PCT_RANGE = 'PCT_RANGE',              // Nifty close % change bucket
  SECTOR_WINNER = 'SECTOR_WINNER',      // Which sector index leads
  MAX_PAIN = 'MAX_PAIN',                // Weekly expiry strike (optional later)
}

// contests/engine/interfaces.ts
import { Contest, ContestEntry, Prediction, MarketBar } from '../entities';

export type RuleConfig = Record<string, any>;

export interface RuleContext {
  contest: Contest;
  entries: ContestEntry[];
  predictions: Prediction[];
  // snapshots captured at lock & settlement
  lockSnapshot?: any;
  settleSnapshot?: any;
  market: {
    getDaily(symbol: string, dateISO: string): Promise<MarketBar | null>;
    getIntraday(symbol: string, fromISO: string, toISO: string): Promise<MarketBar[]>;
  };
}

export interface SettleOutcome {
  predictionId: string;
  correct: boolean;
  score?: number;         // rule-specific score
  notes?: string;
}

export interface ContestRule {
  // (optional) normalize/validate the prediction input before saving
  validatePrediction(input: any, cfg: RuleConfig): { normalized: any };
  // executed at lock time (e.g., capture reference price)
  lockSnapshot(ctx: RuleContext, cfg: RuleConfig): Promise<any>;
  // compute correctness at settlement time
  settle(ctx: RuleContext, cfg: RuleConfig): Promise<SettleOutcome[]>;
  // convert outcomes → points/payouts
  scoring(ctx: RuleContext, outcomes: SettleOutcome[], cfg: RuleConfig): Promise<void>;
}

// contests/engine/registry.ts
import { Injectable } from '@nestjs/common';
import { ContestType } from './contest-type.enum';
import { ContestRule } from './interfaces';
import { GapDirectionRule } from './rules/gap-direction.rule';
import { CloseDirectionRule } from './rules/close-direction.rule';
import { PctRangeRule } from './rules/pct-range.rule';
import { SectorWinnerRule } from './rules/sector-winner.rule';

@Injectable()
export class RuleRegistry {
  private readonly map = new Map<ContestType, ContestRule>();

  constructor(
    gap: GapDirectionRule,
    close: CloseDirectionRule,
    pct: PctRangeRule,
    sector: SectorWinnerRule,
  ) {
    this.map.set(ContestType.GAP_DIRECTION, gap);
    this.map.set(ContestType.CLOSE_DIRECTION, close);
    this.map.set(ContestType.PCT_RANGE, pct);
    this.map.set(ContestType.SECTOR_WINNER, sector);
  }

  get(type: ContestType): ContestRule {
    const rule = this.map.get(type);
    if (!rule) throw new Error(`No rule registered for ${type}`);
    return rule;
  }
}

// contests/engine/rules/gap-direction.rule.ts
import { Injectable } from '@nestjs/common';
import { ContestRule, RuleContext, SettleOutcome } from '../interfaces';

@Injectable()
export class GapDirectionRule implements ContestRule {
  validatePrediction(input: any) {
    const allowed = ['GAP_UP','GAP_DOWN','FLAT'];
    if (!allowed.includes(input)) throw new Error('Invalid prediction');
    return { normalized: input };
  }

  async lockSnapshot(ctx: RuleContext) {
    // capture yesterday close to compare with today open
    const d = new Date(ctx.contest.lockAt);
    d.setDate(d.getDate() - 1);
    const prevDate = d.toISOString().slice(0,10);
    const prev = await ctx.market.getDaily(ctx.contest.instrumentSymbol, prevDate);
    return { prevClose: prev?.closePrice };
  }

  async settle(ctx: RuleContext): Promise<SettleOutcome[]> {
    const dateISO = new Date(ctx.contest.endAt).toISOString().slice(0,10);
    const day = await ctx.market.getDaily(ctx.contest.instrumentSymbol, dateISO);
    if (!day || ctx.lockSnapshot?.prevClose == null) throw new Error('Missing data');

    const open = day.openPrice;
    const prevClose = ctx.lockSnapshot.prevClose;
    const diffPct = (open - prevClose) / prevClose * 100;
    const actual = Math.abs(diffPct) < (ctx.contest.ruleConfig?.flatThresholdPct ?? 0.2)
      ? 'FLAT'
      : (diffPct > 0 ? 'GAP_UP' : 'GAP_DOWN');

    return ctx.predictions.map(p => ({
      predictionId: p.id,
      correct: p.value === actual,
      notes: `actual=${actual}, diffPct=${diffPct.toFixed(2)}`
    }));
  }

  async scoring(ctx: RuleContext, outcomes: SettleOutcome[]) {
    // simple: correct → 10 pts, wrong → 0
    for (const o of outcomes) {
      await ctx.contest.awardPoints(o.predictionId, o.correct ? 10 : 0);
    }
  }
}



// contests/engine/rules/close-direction.rule.ts
import { Injectable } from '@nestjs/common';
import { ContestRule, RuleContext } from '../interfaces';

@Injectable()
export class CloseDirectionRule implements ContestRule {
  validatePrediction(input: any) {
    const allowed = ['POS','NEG','FLAT'];
    if (!allowed.includes(input)) throw new Error('Invalid prediction');
    return { normalized: input };
  }

  async lockSnapshot() { return {}; }

  async settle(ctx: RuleContext) {
    const d = new Date(ctx.contest.endAt).toISOString().slice(0,10);
    const day = await ctx.market.getDaily(ctx.contest.instrumentSymbol, d);
    const changePct = ((day.closePrice - day.prevClose) / day.prevClose) * 100;
    const actual = Math.abs(changePct) < (ctx.contest.ruleConfig?.flatThresholdPct ?? 0.1)
      ? 'FLAT'
      : (changePct > 0 ? 'POS' : 'NEG');

    return ctx.predictions.map(p => ({
      predictionId: p.id,
      correct: p.value === actual,
      notes: `actual=${actual}, changePct=${changePct.toFixed(2)}`
    }));
  }

  async scoring(ctx, outcomes) {
    for (const o of outcomes) await ctx.contest.awardPoints(o.predictionId, o.correct ? 10 : 0);
  }
}


// contests/engine/rules/pct-range.rule.ts
import { Injectable } from '@nestjs/common';
import { ContestRule } from '../interfaces';

@Injectable()
export class PctRangeRule implements ContestRule {
  validatePrediction(input: any, cfg: any) {
    // input like "0-0.5", "0.5-1.0", ">1.5"
    if (typeof input !== 'string') throw new Error('Invalid prediction');
    return { normalized: input };
  }
  async lockSnapshot(){ return {}; }

  async settle(ctx, cfg) {
    const d = new Date(ctx.contest.endAt).toISOString().slice(0,10);
    const day = await ctx.market.getDaily(ctx.contest.instrumentSymbol, d);
    const pct = ((day.closePrice - day.prevClose) / day.prevClose) * 100;
    const actual = this.toBucket(pct, cfg?.buckets ?? [0,0.5,1.0,1.5]); // edges
    return ctx.predictions.map(p => ({ predictionId: p.id, correct: p.value === actual }));
  }

  toBucket(pct: number, edges: number[]): string {
    const ap = Math.abs(pct);
    for (let i = 0; i < edges.length; i++) {
      if (ap <= edges[i]) return (i===0?`0-${edges[i]}`:`${edges[i-1]}-${edges[i]}`);
    }
    return `>${edges[edges.length-1]}`;
  }

  async scoring(ctx, outcomes, cfg) {
    // exact bucket: 20; adjacent: 10
    const edges = cfg?.buckets ?? [0,0.5,1.0,1.5];
    for (const o of outcomes) await ctx.contest.awardPoints(o.predictionId, o.correct ? 20 : 0);
  }
}


// contests/entities/contest.entity.ts
@Entity('contests')
export class Contest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'text' }) name: string;
  @Column({ type: 'text' }) contestType: string; // ContestType
  @Column({ type: 'text' }) instrumentSymbol: string; // e.g., "NIFTY"
  @Column({ type: 'timestamptz' }) startAt: Date;
  @Column({ type: 'timestamptz' }) lockAt: Date;
  @Column({ type: 'timestamptz' }) endAt: Date;
  @Column({ type: 'jsonb', default: {} }) ruleConfig: any;
  @Column({ type: 'text', default: 'UPCOMING' }) status: string;

  // helper for scoring (wire up via service/Repo)
  async awardPoints(predictionId: string, pts: number) {/* implemented in service */}
}

// contests/entities/prediction.entity.ts
@Entity('predictions')
export class Prediction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() contestId: string;
  @Column() userId: string;
  @Column({ type: 'text' }) value: string; // normalized prediction
  @Column({ type: 'text', default: 'PLACED' }) status: string; // PLACED|SETTLED
  @Column({ type: 'numeric', default: 0 }) points: number;
}

// contests/entities/market-bar.entity.ts
@Entity('market_bars')
export class MarketBar {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() symbol: string;          // NIFTY
  @Column({ type: 'date' }) date: string;
  @Column('numeric') openPrice: number;
  @Column('numeric') highPrice: number;
  @Column('numeric') lowPrice: number;
  @Column('numeric') closePrice: number;
  @Column('numeric', { nullable: true }) prevClose: number;
}

// queue/processors/contest.lock.processor.ts
@Processor('contest:lock')
export class ContestLockProcessor {
  constructor(private svc: ContestsService, private registry: RuleRegistry) {}
  @Process()
  async handle(job: Job<{ contestId: string }>) {
    const contest = await this.svc.getContest(job.data.contestId, { withPredictions: true });
    if (contest.status !== 'UPCOMING') return;
    const rule = this.registry.get(contest.contestType as ContestType);
    const lockSnapshot = await rule.lockSnapshot(await this.svc.buildRuleContext(contest), contest.ruleConfig);
    await this.svc.markLocked(contest.id, lockSnapshot);
    this.svc.emitWS('contest_locked', { contestId: contest.id, lockSnapshot });
  }
}

