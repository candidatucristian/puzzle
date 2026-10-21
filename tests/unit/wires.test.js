import test from "node:test";
import assert from "node:assert/strict";
import {WIRE_NOTES,WIRE_BIRDS,WIRES_WORD,PICTURE,wireY} from "../../src/levels/wires/puzzle.js";
import {LEVEL_METADATA,LEGACY_LEVEL_IDS} from "../../src/levels/metadata.js";
import {PLACES} from "../../src/shared/house.js";
import {ProgressStore} from "../../src/core/ProgressStore.js";

test("Room IV's painting holds the original FACADE clue and retires the crossing",()=>{
  assert.deepEqual(WIRE_NOTES,["D","F","A","C","E"]);
  assert.deepEqual(WIRE_BIRDS.map(b=>b.pos),[1,2,3,2,0,4]);
  assert.equal(WIRES_WORD,"FACADE");
  assert.equal(LEVEL_METADATA.find(l=>l.id==="wires").code,WIRES_WORD);
  assert.equal(LEVEL_METADATA.some(l=>l.id==="crossing"),false);
  assert.deepEqual(PLACES.find(p=>p.key==="Room4").holds,["sequence","wires","station"]);
  assert.equal(PLACES.filter(p=>p.holds.includes("wires")).length,1);
  for(const b of WIRE_BIRDS) {
    const x=b.x*PICTURE.width,y=wireY(b.pos,x);
    assert.ok(y>36&&y<PICTURE.height);
    for(let w=1;w<5;w++)assert.ok(wireY(w-1,x)>wireY(w,x),"wires must never cross");
  }
});

test("retiring GO preserves identities in old numeric progress",()=>{
  for(const [lastPlayed,expected] of [["rally","rally"],["crossing","flags"]]) {
    const original=LEGACY_LEVEL_IDS.indexOf(lastPlayed),values=new Map([
      ["puzzleProgressSchema","2"],["puzzleUnlockedLevel",String(original)],
    ]);
    const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
    const progress=new ProgressStore(storage,LEVEL_METADATA,{legacyLevelIds:LEGACY_LEVEL_IDS});
    assert.equal(progress.state.lastPlayedLevelId,expected);
    assert.deepEqual(progress.state.completedLevelIds,
      LEGACY_LEVEL_IDS.slice(0,original).filter(id=>id!=="crossing"));
    assert.equal(progress.state.completedLevelIds.includes(expected),false);
    assert.equal(progress.canAccess(LEVEL_METADATA.findIndex(l=>l.id===expected)),true);
  }
});

test("modern progress keeps house keys and unrelated completed puzzles",()=>{
  const values=new Map([["puzzleProgress",JSON.stringify({version:3,
    completedLevelIds:["sequence","crossing","station"],unlockedLevelIds:["sequence","crossing","station"],
    lastPlayedLevelId:"crossing",keys:["Room4","Room5"],usedKeys:["Room4"],visitedPlaces:["Room4"],
  })]]);
  const progress=new ProgressStore({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},LEVEL_METADATA);
  assert.deepEqual(progress.state.completedLevelIds,["sequence","station"]);
  assert.deepEqual(progress.state.keys,["Room4","Room5"]);
  assert.deepEqual(progress.state.usedKeys,["Room4"]);
  assert.deepEqual(progress.state.visitedPlaces,["Room4"]);
  assert.equal(progress.state.completedLevelIds.includes("wires"),false);
});
