const test = require('node:test'), assert = require('node:assert/strict');
const B = require('./balbok.js');

test('늘리기: 최저=1, 최고=10, 가운데는 비례', () => {
  const r = { min: 1, max: 7 };
  assert.equal(B.scale(1, r), 1);
  assert.equal(B.scale(7, r), 10);
  assert.equal(B.scale(4, r), 6);        // 1+0.5*9=5.5 → 6
});
test('늘리기: 범위 밖 값은 1~10으로 자른다', () => {
  assert.equal(B.scale(-3, { min: 0, max: 5 }), 1);
  assert.equal(B.scale(20, { min: 0, max: 5 }), 10);
});
test('늘리기: 변화가 거의 없으면 5, 범위가 없으면 이론 범위(0~9.9)', () => {
  assert.equal(B.scale(2, { min: 2, max: 2.3 }), 5);
  assert.equal(B.scale(0), 1);
  assert.equal(B.scale(9.9), 10);
});
test('range: 숫자만 모아 최저·최고, 비면 null', () => {
  assert.deepEqual(B.range([3, 1.5, 9, NaN, 'x']), { min: 1.5, max: 9 });
  assert.equal(B.range([]), null);
});
test('옛 mood와 새 점수는 오간다', () => {
  assert.deepEqual([1, 3, 5, 6, 8, 10].map(B.moodFromScore), [-2, -1, 0, 0, 1, 2]);
  assert.deepEqual([-2, -1, 0, 1, 2].map(B.scoreFromMood), [1, 3, 5, 8, 10]);
});
test('기록 가능 날짜: 오늘부터 7일 전까지, 미래·2020년 이전 불가', () => {
  assert.ok(B.canRecord('2026-11-04', '2026-11-04'));
  assert.ok(B.canRecord('2026-11-04', '2026-10-28'));
  assert.ok(!B.canRecord('2026-11-04', '2026-10-27'));
  assert.ok(!B.canRecord('2026-11-04', '2026-11-05'));
  assert.ok(!B.canRecord('2026-11-04', '2026-02-30'));
});
test('toRow: 점수·분류·메모를 저장 줄로, mood도 함께', () => {
  const row = B.toRow('u1', '2026-11-04', { score: 6, tags: ['기분', '돈', '없는분류'], memo: ' 거래처 연락 ' });
  assert.deepEqual(row, { user_id: 'u1', day: '2026-11-04', mood: 0, score: 6, memo: '거래처 연락', tag: '돈,기분' });
});
test('toRow: 분류를 다 골라도 20자 이하, 메모는 40자로 자른다', () => {
  const row = B.toRow('u1', '2026-11-04', { score: 10, tags: B.TAGS, memo: '가'.repeat(60) });
  assert.equal(row.tag, '건강,돈,기분,사랑,일,쉼'); assert.ok(row.tag.length <= 20);
  assert.equal(row.memo.length, 40);
});
test('toRow: 점수가 없거나 틀리면, 날짜가 틀리면 null', () => {
  assert.equal(B.toRow('u', '2026-11-04', { score: 0 }), null);
  assert.equal(B.toRow('u', '2026-11-04', { score: 5.5 }), null);
  assert.equal(B.toRow('u', '2026-11-04', null), null);
  assert.equal(B.toRow('u', '2019-12-31', { score: 5 }), null);
});
test('fromRow: 새 기록은 그대로, 옛 체크인은 어림 점수+legacy', () => {
  assert.deepEqual(B.fromRow({ score: 7, mood: 1, tag: '돈,일', memo: null }), { score: 7, tags: ['돈', '일'], memo: '', legacy: false });
  assert.deepEqual(B.fromRow({ score: null, mood: 2, tag: '몸', memo: '굿' }), { score: 10, tags: ['몸'], memo: '굿', legacy: true });
  assert.equal(B.fromRow({ score: null, mood: null }), null);
  assert.equal(B.fromRow(null), null);
});
test('저장했다 읽으면 같은 기록', () => {
  const rec = { score: 8, tags: ['사랑', '쉼'], memo: '좋은 하루' };
  const back = B.fromRow(B.toRow('u', '2026-11-04', rec));
  assert.deepEqual(back, { score: 8, tags: ['사랑', '쉼'], memo: '좋은 하루', legacy: false });
});
