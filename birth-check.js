/* birth-check.js — 생년월일시 입력값 검사(순수 함수). 문제가 있으면 안내 문구를, 괜찮으면 '' 를 돌려준다.
 * 시·분은 비워 두면(null/'') 모름으로 본다. 분석 앱·체크인 달력이 같은 파일을 쓴다. */
(function(root){
  function msg(y,mo,d,h,min){
    var n=function(v){ return v===null||v===undefined||v===''?null:Number(v); };
    y=n(y); mo=n(mo); d=n(d); h=n(h); min=n(min);
    if(!y||!mo||!d) return '생년월일(연·월·일)을 입력해주세요';
    if(!Number.isInteger(y)||y<1900||y>2100) return '태어난 해는 1900~2100 사이로 입력해주세요';
    if(!Number.isInteger(mo)||mo<1||mo>12) return '월은 1~12 사이로 입력해주세요';
    if(!Number.isInteger(d)||d<1||d>31) return '일은 1~31 사이로 입력해주세요';
    if(h!==null&&(!Number.isInteger(h)||h<0||h>23)) return '시는 0~23 사이로 입력해주세요 (모르면 비워 두세요)';
    if(min!==null&&(!Number.isInteger(min)||min<0||min>59)) return '분은 0~59 사이로 입력해주세요';
    return '';
  }
  var api={msg:msg}; if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.BirthCheck=api;
})(typeof window!=='undefined'?window:this);
