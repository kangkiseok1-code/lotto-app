/* 자림 색 토큰 읽기 — CSS 변수(jalim-base.css)를 JS에서 같은 값으로 쓰게 한다.
 * 캔버스(fillStyle)·데이터 팔레트처럼 var()가 안 먹는 곳에서 색을 직접 적지 않고 여기서 읽는다.
 *   JT.c('--wood')            → 현재 토큰 값 (예: '#0e8a5f')
 *   JT.oh('목')               → 오행 진한 색,  JT.oh('목','soft') → 파스텔 면,  JT.oh('목','ink') → 파스텔 위 글자색
 * 원본은 jalim-hub/jalim-tokens.js. 앱 폴더의 복사본은 직접 고치지 말고 `node jalim-hub/check-sync.js --fix` 로 맞출 것. */
(function (w) {
  var cache = {};
  var EL = { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' };
  function c(name, fallback) {
    if (cache[name]) return cache[name];
    var v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) {}
    if (v) cache[name] = v;
    return v || fallback || '';
  }
  function oh(han, kind) { var el = EL[han] || han; return c('--' + el + (kind ? '-' + kind : '')); }
  w.JT = { c: c, oh: oh, reset: function () { cache = {}; } };
  if (typeof module === 'object' && module.exports) module.exports = w.JT;
})(typeof window !== 'undefined' ? window : globalThis);
