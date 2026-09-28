import test from 'node:test';
import assert from 'node:assert/strict';
import { createTriviaRound, TRIVIA_BY_LEVEL, type TriviaLevel } from '../lib/bible-trivia';

for (const level of Object.keys(TRIVIA_BY_LEVEL) as TriviaLevel[]) {
  test(`${level}: 30 distinct questions with exactly one correct choice`, () => {
    const pool = TRIVIA_BY_LEVEL[level];
    assert.equal(pool.length, 30);
    assert.equal(new Set(pool.map(q => q.question)).size, 30);
    for (const q of pool) {
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      assert.equal(q.choices.filter(c => c === q.answer).length, 1);
    }
  });

  test(`${level}: rounds vary questions and answer positions without mutating the pool`, () => {
    const original = JSON.stringify(TRIVIA_BY_LEVEL[level]);
    let seed = 1234;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const positions = new Set<number>();
    const questions = new Set<string>();
    const orders = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const round = createTriviaRound(level, random);
      assert.equal(round.length, 8);
      assert.equal(new Set(round.map(q => q.question)).size, 8);
      orders.add(round.map(q => q.question).join('|'));
      for (const q of round) {
        const source = TRIVIA_BY_LEVEL[level].find(item => item.question === q.question)!;
        assert.equal(q.answer, source.answer);
        assert.deepEqual([...q.choices].sort(), [...source.choices].sort());
        positions.add(q.choices.indexOf(q.answer));
        questions.add(q.question);
      }
    }
    assert.equal(positions.size, 4);
    assert.equal(questions.size, 30);
    assert.ok(orders.size > 1);
    assert.equal(JSON.stringify(TRIVIA_BY_LEVEL[level]), original);
  });
}
