 // Convert date object into friendly string
  Date.prototype.toShortString=function(){
      if(this!==null){
              var vDay = ((this.getDate())<10)?'0'+(this.getDate()):(this.getDate()),
                      oMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                      vMonth = oMonths[this.getMonth()],
                      vYear = this.getFullYear().toString(),
                      hours = this.getHours(),
                      minutes = this.getMinutes(),
                      seconds = this.getSeconds(),
                      milliseconds = this.getMilliseconds();
                      
              var timestr = (hours>0||minutes>0||seconds>0||milliseconds>0)?(" "+hours+":"+minutes+":"+seconds+"."+milliseconds):"";                         
              return vDay+' '+vMonth+' '+vYear+timestr;
      } else {
              return '[Invalid Date]';
      }
  };
  Date.prototype.toSQL=function(){
      var vDay = ((this.getDate())<10)?'0'+(this.getDate()):(this.getDate()),
          nMonth = (this.getMonth()+1),
          vMonth = (nMonth<10)?'0'+nMonth:nMonth,
          vYear = this.getFullYear().toString(),
          vHours = ((this.getHours())<10)?'0'+(this.getHours()):(this.getHours()),
          vMinutes = ((this.getMinutes())<10)?'0'+(this.getMinutes()):(this.getMinutes()),
          vSeconds = ((this.getSeconds())<10)?'0'+(this.getSeconds()):(this.getSeconds());
              
      return vDay+'/'+vMonth+'/'+vYear+' '+vHours+':'+vMinutes+':'+vSeconds;
  };
  
  Date.numberOfDays = function(year, month) {
	  var d = new Date(year, month + 1, 0); 	// Gets the last day of the current month by going to next month, and setting day to 0.
	  return d.getDate();
  };
  

var DATE = (function(date){
    date.getTime = function(){
        var d = new Date();
        //var offset = d.getTimezoneOffset()*60000;
        return d.getTime();//+offset;
    };
    
    date.getLocalOffSet = function(){
        return (new Date()).getTimezoneOffset()*60000;
    };
    
    return date;
}(DATE || {}));
