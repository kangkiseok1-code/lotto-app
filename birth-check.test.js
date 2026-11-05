const test=require('node:test'),assert=require('node:assert/strict');
const {msg}=require('./birth-check.js');
test('정상 값은 빈 문구',()=>{ assert.equal(msg(1986,9,17,8,30),''); assert.equal(msg(1986,9,17,null,null),''); assert.equal(msg('1990','5','15','',''),''); });
test('월 13은 막는다',()=>assert.match(msg(1986,13,17,8,30),/월/));
test('일 32는 막는다',()=>assert.match(msg(1986,9,32),/일/));
test('시 24·분 60은 막는다',()=>{ assert.match(msg(1986,9,17,24,0),/시/); assert.match(msg(1986,9,17,8,60),/분/); });
test('연도 범위',()=>assert.match(msg(1800,1,1),/해/));
test('비어 있으면 입력 요청',()=>assert.match(msg(null,1,1),/입력/));
