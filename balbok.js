/* balbok.js — 운세 체크인 달력의 계산 (화면 없음, 노드에서도 시험 가능)
 *
 * 발복점수(1~10): 서버가 준 원점수(0~9.9)를 '그 사람의 그해 최저~최고'에 맞춰 1~10으로 늘린다.
 *   Balbok.range(원점수들)          → { min, max }
 *   Balbok.scale(원점수, range)     → 1~10 정수 (range 없으면 이론 범위 0~9.9, 변화가 거의 없으면 5)
 * 하루 기록(내 점수 1~10 + 분류 + 한 줄 메모): 저장 표 daily_checkins 한 줄 = 하루.
 *   옛 체크인 앱은 mood(-2~2)만 쓰므로 새 기록도 mood를 함께 채워 호환한다.
 *   Balbok.toRow / fromRow / cleanRec / canRecord
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Balbok = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAGS = ['건강', '돈', '기분', '사랑', '일', '쉼'];
  var MAX_BACK = 7;          // 오늘 포함 지난 7일까지 기록·수정 (옛 체크인과 같음)
  var MEMO_MAX = 40, TAG_MAX = 20;
  var FULL = { min: 0, max: 9.9 };   // 원점수의 이론 범위(천간 1+지지 2, 가중치 합 3.3)
  var MIN_SPAN = 0.5;                // 이보다 변화가 작으면 늘리지 않고 가운데(5)로 둔다

  function range(vals) {
    var mn = Infinity, mx = -Infinity;
    for (var i = 0; i < vals.length; i++) { var v = vals[i]; if (typeof v !== 'number' || !isFinite(v)) continue; if (v < mn) mn = v; if (v > mx) mx = v; }
    return mn === Infinity ? null : { min: mn, max: mx };
  }
  function scale(raw, rng) {
    rng = rng || FULL;
    if (!(rng.max - rng.min >= MIN_SPAN)) return 5;
    var s = Math.round(1 + (raw - rng.min) / (rng.max - rng.min) * 9);
    return Math.max(1, Math.min(10, s));
  }

  function moodFromScore(s) { return Math.max(-2, Math.min(2, Math.round((s - 5.5) / 2.25))) || 0; }   // || 0 : -0 방지
  function scoreFromMood(m) { return [1, 3, 5, 8, 10][m + 2]; }
  function validScore(v) { return typeof v === 'number' && v % 1 === 0 && v >= 1 && v <= 10; }
  function validMood(v) { return typeof v === 'number' && v % 1 === 0 && v >= -2 && v <= 2; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dkey(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function validKey(k) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
    var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return dkey(d.getFullYear(), d.getMonth() + 1, d.getDate()) === k && k >= '2020-01-01';
  }
  function addDays(k, n) { var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return dkey(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  function canRecord(todayKey, key) { return validKey(key) && key <= todayKey && key >= addDays(todayKey, -MAX_BACK); }

  function encodeTags(tags) { return TAGS.filter(function (t) { return (tags || []).indexOf(t) >= 0; }).join(','); }
  function decodeTags(s) { return s ? String(s).split(',').map(function (x) { return x.trim(); }).filter(Boolean) : []; }

  // 화면 입력 → 저장 가능한 기록. 값이 틀리면 null
  function cleanRec(rec) {
    if (!rec || !validScore(rec.score)) return null;
    var memo = String(rec.memo || '').trim().slice(0, MEMO_MAX);
    return { score: rec.score, tags: TAGS.filter(function (t) { return (rec.tags || []).indexOf(t) >= 0; }), memo: memo };
  }
  function toRow(userId, key, rec) {
    var r = cleanRec(rec); if (!r || !validKey(key)) return null;
    var tag = encodeTags(r.tags);
    return { user_id: userId, day: key, mood: moodFromScore(r.score), score: r.score, memo: r.memo || null, tag: tag && tag.length <= TAG_MAX ? tag : null };
  }
  // 저장 표 한 줄 → 화면 기록. 점수가 없는 옛 체크인(mood만)은 mood로 어림한 점수에 legacy 표시
  function fromRow(r) {
    if (!r) return null;
    if (validScore(r.score)) return { score: r.score, tags: decodeTags(r.tag), memo: r.memo || '', legacy: false };
    if (validMood(r.mood)) return { score: scoreFromMood(r.mood), tags: decodeTags(r.tag), memo: r.memo || '', legacy: true };
    return null;
  }

  return { TAGS: TAGS, MAX_BACK: MAX_BACK, MEMO_MAX: MEMO_MAX, FULL: FULL, range: range, scale: scale,
    moodFromScore: moodFromScore, scoreFromMood: scoreFromMood, validScore: validScore, dkey: dkey, validKey: validKey,
    addDays: addDays, canRecord: canRecord, encodeTags: encodeTags, decodeTags: decodeTags, cleanRec: cleanRec, toRow: toRow, fromRow: fromRow };
});
