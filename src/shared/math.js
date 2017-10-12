var MATH = (function(math){
    math.isNumber=function(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    };
    return math;
}(MATH || {}));

