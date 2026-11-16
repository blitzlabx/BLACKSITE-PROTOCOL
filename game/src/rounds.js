import { ECONOMY_CONFIG, calculateRoundReward, clampCredits } from './economy.js';

export const GAME_PHASES = {
  MAIN_MENU: 'MAIN_MENU',
  MATCH_INIT: 'MATCH_INIT',
  BUY_PHASE: 'BUY_PHASE',
  ROUND_START: 'ROUND_START',
  ACTIVE_COMBAT: 'ACTIVE_COMBAT',
  OBJECTIVE_OR_ELIMINATION: 'OBJECTIVE_OR_ELIMINATION',
  ROUND_RESULTS: 'ROUND_RESULTS',
  ECONOMY_UPDATE: 'ECONOMY_UPDATE',
  NEXT_ROUND: 'NEXT_ROUND',
  MATCH_OVER: 'MATCH_OVER',
};

export const ROUND_TIMINGS = {
  BUY_PHASE: 12,
  ROUND_START: 0.6,
  ACTIVE_COMBAT: 90,
  ROUND_RESULTS: 4.5,
  ROUNDS_TO_WIN: 5,
  TDM_TARGET_KILLS: 25,
};

export function createMatchState(playerTeam = 'attackers') {
  return {
    phase: GAME_PHASES.MAIN_MENU,
    playerTeam,
    modeId: 'bomb_defusal',
    mapId: 'kilnyard',
    roundDuration: ROUND_TIMINGS.ACTIVE_COMBAT,
    roundsToWin: ROUND_TIMINGS.ROUNDS_TO_WIN,
    roundNumber: 0,
    phaseTimer: 0,
    scores: {
      attackers: 0,
      defenders: 0,
    },
    tdmKills: {
      attackers: 0,
      defenders: 0,
    },
    controlProgress: {
      attackers: 0,
      defenders: 0,
      owner: null,
    },
    lossStreak: {
      attackers: 0,
      defenders: 0,
    },
    lastRoundOutcome: null,
    matchWinner: null,
    killFeed: [],
  };
}

export function startNewMatch(
  matchState,
  playerTeam = matchState.playerTeam,
  { modeId = 'bomb_defusal', mapId = 'kilnyard', roundDuration = 90, roundsToWin = 5 } = {},
) {
  matchState.playerTeam = playerTeam;
  matchState.modeId = modeId;
  matchState.mapId = mapId;
  matchState.roundDuration = roundDuration;
  matchState.roundsToWin = modeId === 'team_deathmatch' ? 1 : roundsToWin;
  matchState.phase = GAME_PHASES.MATCH_INIT;
  matchState.roundNumber = 1;
  matchState.scores.attackers = 0;
  matchState.scores.defenders = 0;
  matchState.tdmKills.attackers = 0;
  matchState.tdmKills.defenders = 0;
  matchState.controlProgress.attackers = 0;
  matchState.controlProgress.defenders = 0;
  matchState.controlProgress.owner = null;
  matchState.lossStreak.attackers = 0;
  matchState.lossStreak.defenders = 0;
  matchState.lastRoundOutcome = null;
  matchState.matchWinner = null;
  matchState.killFeed = [];
  return matchState;
}

export function beginBuyPhase(matchState) {
  matchState.phase = GAME_PHASES.BUY_PHASE;
  matchState.phaseTimer = ROUND_TIMINGS.BUY_PHASE;
  matchState.controlProgress.attackers = 0;
  matchState.controlProgress.defenders = 0;
  matchState.controlProgress.owner = null;
}

export function beginRoundStart(matchState) {
  matchState.phase = GAME_PHASES.ROUND_START;
  matchState.phaseTimer = ROUND_TIMINGS.ROUND_START;
}

export function beginActiveCombat(matchState) {
  matchState.phase = GAME_PHASES.ACTIVE_COMBAT;
  matchState.phaseTimer = matchState.roundDuration || ROUND_TIMINGS.ACTIVE_COMBAT;
}

export function checkRoundWinCondition({
  modeId = 'bomb_defusal',
  attackersAlive,
  defendersAlive,
  spikePlanted,
  spikeDetonated,
  spikeDefused,
  combatTimeRemaining,
  tdmKills,
  controlProgress,
}) {
  if (modeId === 'team_deathmatch') {
    if ((tdmKills?.attackers || 0) >= ROUND_TIMINGS.TDM_TARGET_KILLS) {
      return { winner: 'attackers', reason: 'TARGET ELIMINATIONS REACHED', objectiveCompleted: true };
    }
    if ((tdmKills?.defenders || 0) >= ROUND_TIMINGS.TDM_TARGET_KILLS) {
      return { winner: 'defenders', reason: 'TARGET ELIMINATIONS REACHED', objectiveCompleted: true };
    }
    if (combatTimeRemaining <= 0) {
      const a = tdmKills?.attackers || 0;
      const d = tdmKills?.defenders || 0;
      return { winner: a >= d ? 'attackers' : 'defenders', reason: 'MATCH TIME UP', objectiveCompleted: false };
    }
    return null;
  }

  if (modeId === 'control_zone') {
    if ((controlProgress?.attackers || 0) >= 100) {
      return { winner: 'attackers', reason: 'SECTOR CAPTURED 100%', objectiveCompleted: true };
    }
    if ((controlProgress?.defenders || 0) >= 100) {
      return { winner: 'defenders', reason: 'SECTOR CAPTURED 100%', objectiveCompleted: true };
    }
    if (defendersAlive <= 0) {
      return { winner: 'attackers', reason: 'DEFENDERS CLEARED', objectiveCompleted: false };
    }
    if (attackersAlive <= 0) {
      return { winner: 'defenders', reason: 'ATTACKERS CLEARED', objectiveCompleted: false };
    }
    if (combatTimeRemaining <= 0) {
      const a = controlProgress?.attackers || 0;
      const d = controlProgress?.defenders || 0;
      return { winner: a >= d ? 'attackers' : 'defenders', reason: 'TIME EXPIRED', objectiveCompleted: false };
    }
    return null;
  }

  if (modeId === 'elimination') {
    if (defendersAlive <= 0) {
      return { winner: 'attackers', reason: 'SQUAD ELIMINATED', objectiveCompleted: false };
    }
    if (attackersAlive <= 0) {
      return { winner: 'defenders', reason: 'SQUAD ELIMINATED', objectiveCompleted: false };
    }
    if (combatTimeRemaining <= 0) {
      return {
        winner: attackersAlive > defendersAlive ? 'attackers' : 'defenders',
        reason: 'TIME EXPIRED',
        objectiveCompleted: false,
      };
    }
    return null;
  }

  if (spikeDetonated) {
    return { winner: 'attackers', reason: 'CHARGE DETONATED', objectiveCompleted: true };
  }
  if (spikeDefused) {
    return { winner: 'defenders', reason: 'CHARGE DEFUSED', objectiveCompleted: true };
  }
  if (defendersAlive <= 0) {
    return { winner: 'attackers', reason: 'DEFENDERS ELIMINATED', objectiveCompleted: false };
  }
  if (attackersAlive <= 0 && !spikePlanted) {
    return { winner: 'defenders', reason: 'ATTACKERS ELIMINATED', objectiveCompleted: false };
  }
  if (!spikePlanted && combatTimeRemaining <= 0) {
    return { winner: 'defenders', reason: 'TIME EXPIRED', objectiveCompleted: false };
  }
  return null;
}

export function resolveRoundOutcome(matchState, outcome, actors) {
  matchState.phase = GAME_PHASES.ROUND_RESULTS;
  matchState.phaseTimer = ROUND_TIMINGS.ROUND_RESULTS;

  const winner = outcome.winner;
  const loser = winner === 'attackers' ? 'defenders' : 'attackers';

  matchState.scores[winner] += 1;
  matchState.lossStreak[winner] = 0;
  matchState.lossStreak[loser] = Math.min(
    ECONOMY_CONFIG.MAX_LOSS_STREAK,
    matchState.lossStreak[loser] + 1,
  );

  const winReward = calculateRoundReward(true, 0, outcome.objectiveCompleted);
  const loseReward = calculateRoundReward(false, matchState.lossStreak[loser] - 1, false);

  for (const actor of actors) {
    const reward = actor.team === winner ? winReward : loseReward;
    actor.credits = clampCredits(actor.credits + reward);
  }

  matchState.lastRoundOutcome = {
    roundNumber: matchState.roundNumber,
    winner,
    reason: outcome.reason,
    winReward,
    loseReward,
  };

  const target = matchState.roundsToWin || ROUND_TIMINGS.ROUNDS_TO_WIN;
  if (matchState.scores[winner] >= target) {
    matchState.matchWinner = winner;
  }

  return matchState.lastRoundOutcome;
}

export function advanceAfterRoundResults(matchState) {
  if (matchState.matchWinner) {
    matchState.phase = GAME_PHASES.MATCH_OVER;
    matchState.phaseTimer = 0;
    return matchState.phase;
  }
  matchState.roundNumber += 1;
  matchState.phase = GAME_PHASES.BUY_PHASE;
  matchState.phaseTimer = ROUND_TIMINGS.BUY_PHASE;
  return matchState.phase;
}
