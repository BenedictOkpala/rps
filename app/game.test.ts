import { test } from "node:test";
import assert from "node:assert/strict";
import { canAppeal, LINES, COUNTER, HANDS, initialGame, planRound, playerPointChance, reducer, TIMING, visibleHands, winner } from "./game.ts";
import type { Game } from "./game.ts";
function resolve(state: Game) { while (["SHAKING", "REVEALING", "CHEATING"].includes(state.phase)) state = reducer(state, { type: "TICK" }); return state; }
test("all gesture combinations obey normal rules and only swap losing hands", () => {
  for (const you of HANDS) for (const ai of HANDS) for (const score of [0,1,2,3,4]) for (const allow of [true,false]) {
    const round = planRound(you, ai, score, allow);
    assert.equal(round.original, ai);
    assert.equal(round.cheated, winner(you, ai) === "you" && (score === 4 || !allow));
    assert.equal(round.final, round.cheated ? COUNTER[you] : ai);
    if (score === 4) assert.notEqual(round.outcome, "you");
    if (you === ai) assert.equal(round.outcome, "draw");
  }
});
test("reveal is unscored; swap is visible before exactly one point; repeated actions ignored", () => {
  let s = reducer(initialGame, {type:"CHOOSE", hand:"rock", original:"scissors", allow:false});
  assert.equal(reducer(s, {type:"CHOOSE",hand:"paper",original:"rock",allow:true}),s);
  s = reducer(s,{type:"TICK"}); assert.equal(s.phase,"REVEALING"); assert.equal(s.ai,0); assert.equal(s.round?.original,"scissors");
  s = reducer(s,{type:"TICK"}); assert.equal(s.phase,"CHEATING"); assert.equal(s.ai,0); assert.equal(s.round?.final,"paper");
  s = reducer(s,{type:"TICK"}); assert.equal(s.ai,1); assert.equal(s.phase,"RESOLVED");
  assert.equal(reducer(s,{type:"TICK"}),s);
  s = reducer(s,{type:"COURT"}); assert.equal(s.phase,"COURT"); assert.equal(s.round?.you,"rock"); assert.equal(s.round?.original,"scissors"); assert.equal(s.round?.final,"paper");
  assert.equal(reducer(s,{type:"NEXT",line:"Smart."}),s);
  s = reducer(s,{type:"TICK"}); assert.equal(s.verdict,true); assert.equal(s.ai,1);
  assert.equal(reducer(s,{type:"TICK"}),s);
  s = reducer(s,{type:"NEXT",line:"Smart."}); assert.equal(s.phase,"WAITING_FOR_PLAYER"); assert.equal(s.roundNumber,2);
});
test("draws award nothing; natural wins and allowed points cannot go to court", () => {
  for (const hand of HANDS) {
    const draw = resolve(reducer(initialGame,{type:"CHOOSE",hand,original:hand,allow:false})); assert.equal(draw.you,0); assert.equal(draw.ai,0); assert.equal(reducer(draw,{type:"COURT"}),draw);
    const ai = resolve(reducer(initialGame,{type:"CHOOSE",hand,original:COUNTER[hand],allow:false})); assert.equal(ai.ai,1); assert.equal(ai.round?.cheated,false);
    assert.equal(reducer(ai,{type:"COURT"}),ai);
  }
});
test("player reaches 1, 2, 3, 4 but never 5; AI ends match; court and reset do not corrupt score", () => {
  let s = {...initialGame};
  for (let point=1;point<=4;point++) {
    s=resolve(reducer(s,{type:"CHOOSE",hand:"rock",original:"scissors",allow:true})); assert.equal(s.you,point); assert.equal(s.round?.cheated,false);
    s=reducer(s,{type:"NEXT",line:"Moving on."});
  }
  for (let point=1;point<=5;point++) {
    s=resolve(reducer(s,{type:"CHOOSE",hand:"rock",original:"scissors",allow:true})); assert.equal(s.you,4); assert.equal(s.ai,point); assert.equal(s.round?.cheated,true);
    if(point===5){s=reducer(s,{type:"COURT"});s=reducer(s,{type:"TICK"});assert.equal(s.ai,5);}
    s=reducer(s,{type:"NEXT",line:"Fair game."});
  }
  assert.equal(s.phase,"MATCH_OVER"); assert.deepEqual(reducer(s,{type:"RESET"}),{...initialGame,history:s.history});
});
test("natural fifth point ends the match",()=>{
 const s=resolve(reducer({...initialGame,ai:4},{type:"CHOOSE",hand:"scissors",original:"rock",allow:false}));assert.equal(s.phase,"MATCH_OVER");assert.equal(s.ai,5);
});

test("allowance probability is 10% below four, zero at four, with exact boundaries", () => {
  for (const score of [0, 1, 2, 3, 4]) {
    const expected = score < 4 ? 0.10 : 0;
    assert.equal(playerPointChance(score), expected);
    let wins = 0;
    for (let sample = 0; sample < 10000; sample++) {
      const allow = sample / 10000 < playerPointChance(score);
      if (planRound("rock", "scissors", score, allow).outcome === "you") wins++;
    }
    assert.equal(wins, Math.round(expected * 10000));
  }
});

test("all selected poses reveal together, original remains visible, final persists through appeal", () => {
  for (const hand of HANDS) for (const original of HANDS) {
    let state = reducer(initialGame, { type: "CHOOSE", hand, original, allow: false });
    assert.deepEqual(visibleHands(state), { you: "rock", ai: "rock", hidden: true });
    state = reducer(state, { type: "TICK" });
    assert.deepEqual(visibleHands(state), { you: hand, ai: original, hidden: false });
    assert.equal(state.you + state.ai, 0);
    state = reducer(state, { type: "TICK" });
    const cheats = winner(hand, original) === "you";
    assert.equal(state.phase === "CHEATING", cheats);
    assert.deepEqual(visibleHands(state), { you: hand, ai: cheats ? COUNTER[hand] : original, hidden: false });
    state = resolve(state);
    const finalHands = visibleHands(state);
    if (cheats) {
      state = reducer(state, { type: "COURT" });
      assert.deepEqual(visibleHands(state), finalHands);
      state = reducer(state, { type: "TICK" });
      assert.deepEqual(visibleHands(state), finalHands);
    }
    state = reducer(state, { type: "NEXT", line: "Smart." });
    assert.deepEqual(visibleHands(state), { you: "rock", ai: "rock", hidden: true });
  }
});

test("fast cheat keeps a readable original hold and resolves at the end of the morph", () => {
  assert.ok(TIMING.shake >= 700 && TIMING.shake <= 1000);
  assert.ok(TIMING.reveal - TIMING.pose <= 250);
  assert.ok(TIMING.reveal - TIMING.pose >= 180);
  assert.equal(TIMING.recoil, 0);
  assert.ok(TIMING.morph >= 250 && TIMING.morph <= 350);
  assert.equal(TIMING.cheat, TIMING.morph);
});



for (const [player, original, final] of [
  ["scissors", "paper", "rock"],
  ["rock", "scissors", "paper"],
  ["paper", "rock", "scissors"],
] as const) {
  test(`forced visible cheat: player ${player}, AI ${original} -> ${final}`, () => {
    assert.equal(winner(player, original), "you");
    let state = reducer(initialGame, { type: "CHOOSE", hand: player, original, allow: false });
    assert.equal(state.phase, "SHAKING");
    assert.equal(state.round?.cheated, true);
    assert.equal(state.round?.original, original);
    assert.equal(state.round?.final, final);
    assert.notEqual(original, final);

    state = reducer(state, { type: "TICK" });
    assert.equal(state.phase, "REVEALING");
    assert.deepEqual(visibleHands(state), { you: player, ai: original, hidden: false });
    assert.equal(state.you, 0);
    assert.equal(state.ai, 0);
    assert.equal(state.scored, false);
    assert.equal(reducer(state, { type: "COURT" }), state);

    state = reducer(state, { type: "TICK" });
    assert.equal(state.phase, "CHEATING");
    assert.equal(state.line, "");
    assert.deepEqual(visibleHands(state), { you: player, ai: final, hidden: false });
    assert.equal(state.round?.original, original);
    assert.equal(state.round?.outcome, "ai");
    assert.equal(state.you, 0);
    assert.equal(state.ai, 0);
    assert.equal(state.scored, false);
    assert.equal(reducer(state, { type: "COURT" }), state);
    assert.equal(reducer(state, { type: "CHOOSE", hand: player, original, allow: true }), state);

    state = reducer(state, { type: "TICK" });
    assert.equal(state.phase, "RESOLVED");
    assert.equal(state.scored, true);
    assert.equal(state.ai, 1);
    assert.equal(state.you, 0);
    assert.deepEqual(visibleHands(state), { you: player, ai: final, hidden: false });
    assert.equal(reducer(state, { type: "TICK" }), state);

    state = reducer(state, { type: "COURT" });
    assert.equal(state.phase, "COURT");
    assert.equal(state.round?.original, original);
    assert.equal(state.round?.final, final);
    state = reducer(state, { type: "TICK" });
    assert.equal(state.verdict, true);
    assert.equal(state.ai, 1);
    assert.equal(state.you, 0);
  });
}

test("reported scissors/paper player win occurs only on the deliberate allowance branch", () => {
  for (const allow of [false, true]) {
    const state = resolve(reducer(initialGame, { type: "CHOOSE", hand: "scissors", original: "paper", allow }));
    assert.equal(state.you, Number(allow));
    assert.equal(state.ai, Number(!allow));
    assert.equal(state.round?.cheated, !allow);
    assert.equal(state.round?.final, allow ? "paper" : "rock");
  }
});


test("outcomes choose separate dialogue pools and do not repeat across rounds", () => {
  for (const [original, allow, pool, you, ai] of [
    ["paper", false, "ai", 0, 1], ["scissors", false, "cheat", 0, 1],
    ["scissors", true, "you", 1, 0], ["rock", false, "draw", 0, 0],
  ] as const) {
    let state = resolve(reducer(initialGame, {type:"CHOOSE",hand:"rock",original,allow}));
    assert.equal(state.you,you); assert.equal(state.ai,ai);
    assert.ok(LINES[pool].includes(state.line));
    assert.equal(canAppeal(state),pool === "cheat");
    const previous = state.line;
    state = reducer(state,{type:"NEXT"});
    assert.equal(state.phase,"WAITING_FOR_PLAYER");
    if(pool === "cheat") assert.ok(LINES.carry.includes(state.line));
    state = resolve(reducer(state,{type:"CHOOSE",hand:"rock",original,allow}));
    assert.ok(LINES[pool].includes(state.line)); assert.notEqual(state.line,previous);
  }
});

test("both fifth-point paths preserve scores/hands, promise fairness, and reset cleanly", () => {
  for(const original of ["paper","scissors"] as const) {
    let state = resolve(reducer({...initialGame,you:3,ai:4},{type:"CHOOSE",hand:"rock",original,allow:false}));
    assert.equal(state.phase,"MATCH_OVER"); assert.equal(state.ai,5); assert.equal(state.you,3);
    assert.equal(state.line,"Let's go again. I promise not to cheat.");
    const hands = visibleHands(state);
    assert.equal(canAppeal(state),original === "scissors");
    if(canAppeal(state)) {
      state = reducer(state,{type:"COURT"}); state = reducer(state,{type:"TICK"});
      assert.equal(state.ai,5); state = reducer(state,{type:"NEXT"});
      assert.equal(state.phase,"MATCH_OVER"); assert.deepEqual(visibleHands(state),hands);
      assert.equal(state.line,LINES.end[0]); assert.equal(canAppeal(state),false);
    }
    state = reducer(state,{type:"RESET"});
    assert.deepEqual({...state,history:{}},initialGame);
    assert.deepEqual(visibleHands(state),{you:"rock",ai:"rock",hidden:true});
    assert.equal(playerPointChance(state.you),0.1);
    state = resolve(reducer(state,{type:"CHOOSE",hand:"rock",original:"scissors",allow:false}));
    assert.equal(state.round?.cheated,true); assert.equal(state.ai,1);
    state = reducer(state,{type:"NEXT"});
    state = resolve(reducer({...state,ai:4},{type:"CHOOSE",hand:"rock",original:"paper",allow:false}));
    assert.equal(state.line,LINES.end[1]);
  }
});

test("chesting a final cheated round stays at match-over without opening court", () => {
  let state = resolve(reducer({...initialGame,ai:4},{type:"CHOOSE",hand:"scissors",original:"paper",allow:false}));
  const hands=visibleHands(state);
  state=reducer(state,{type:"NEXT"});
  assert.equal(state.phase,"MATCH_OVER");assert.equal(state.ai,5);assert.equal(state.verdict,false);
  assert.deepEqual(visibleHands(state),hands);assert.equal(canAppeal(state),false);
});
