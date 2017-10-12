String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
String.prototype.endsWith = function(suffix) {
    if (this.length < suffix.length) {
        return false;
    }
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.replaceAll = function (find, replace) {
    var str = this;
    return str.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
};


String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

String.prototype.startsWith = function (str){
  return this.indexOf(str) == 0;
};
String.prototype.trim = String.prototype.trim || function() {
	return this.replace(/^\s+|\s+$/,"");
};
  String.prototype.trimFullStops = function() {
          return this.replace(/^\.+|\.+$/,"");
  };
  String.prototype.replaceNewLine = function() {
          return this.replace(/(\r\n|\r|\n)/g, "<br />");
  };
  String.prototype.replaceBreaks = function() {
          return this.replace(/<br \/>|<br\/>/g, "\n");
  };
  //String Trim to length or first Stop(.)
  String.prototype.short = function(nLen) {
          var nFSPos=this.indexOf('.');
          return (this.length>nLen)?((nFSPos>-1)&&(nFSPos<nLen+1)&&(nFSPos>3))?this.split('.')[0].trim()+'':this.substring(0,nLen).trim()+'':this;
  };

  String.prototype.ucFirst = function() {
    // NOTE: I'm not sure it make sense to lowerCase the remainder of the string? -RC
    return this.substring(0, 1).toUpperCase() + this.substring(1);  //.toLowerCase();
  };

  String.prototype.titleCaseTableKeys = function() {
    var parts = this.split(/[-_]/);
    for (var i = 0; i < parts.length; i++) {
      parts[i] = parts[i].ucFirst();
    }
    return parts.join(" ");
  };

  String.prototype.titleCaseEnumKeys = function() {
    // insert '-' characters between capital letters
    var result = this.replace( /([^A-Z])([A-Z])/g, "$1-$2" );
    // can now use the table key title function
    return result.titleCaseTableKeys();
  };

  //Encode for URL transport
  String.prototype.encode = function() {
          return (this.length>0)?encodeURIComponent(this):this;
  };
  String.prototype.replaceQuotes = function() {
          return this.replace(/"/g,"\\\"");
  };
  //HTML remove tags prototype
  String.prototype.stripTags = function() {
          return this.replace(/<\S[^>]*>/g, "");
  };
  String.prototype.tidyNumeric = function() {
          return Math.abs(this.replace(/[^0-9.]/ig,'').trimFullStops());
  };
  
  String.prototype.left = function(n) {
          return this.substr(0,n);
  };
  String.prototype.right = function(n) {
          return this.substr((this.length-n),this.length);
  };
  
  // Pads a string with zeros on the left. 
  String.prototype.padLeft = function(new_length, character) {
    if(character==undefined){
      character = ' ';
    }
	  	var str = this.valueOf();
	    while (str.length < new_length) {
	        str = character + str;
	    }
	    return str;
  };

  String.prototype.padRight = function(new_length, character) {
    if(character==undefined){
      character = ' ';
    }
      var str = this.valueOf();
      while (str.length < new_length) {
          str = str+character;
      }
      return str;
  };
  
  String.prototype.makeCSSSafe = function() {
	return this.replace(/[^a-z0-9]/g, function(s) {
		var c = s.charCodeAt(0);
		if (c == 32){
			return '-';
		}
		if (c >= 65 && c <= 90){
			return '_' + s.toLowerCase();
		}
		
		return '__' + ('000' + c.toString(16)).slice(-4);
	});
  };
  
  String.prototype.makeDomIdSafe = function() {
	  return this.replace(/[^a-z0-9_]/gi, "").toLowerCase();
  };
  
  String.prototype.clearPunc=function(){
          return this.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ");
  };
  
  String.prototype.trunc = function(n, useWordBoundary){
	var toLong = this.length > n;
	var s_ = toLong ? this.substr(0,n-1) : this;
	s_ = useWordBoundary && toLong ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
	return  toLong ? s_ + '&hellip;' : s_;
};
  
String.prototype.toByteArray = function(){
    var bytes = [];
    for(var i = 0; i < this.length; i++) {
    	bytes.push(this.charCodeAt(i));
        //var char = this.charCodeAt(i);
        //bytes.push(char >>> 8);
        //bytes.push(char & 0xFF);
    }
    return bytes;
};

String.prototype.highlight=function(vWords){
	var oWords = vWords.clearPunc().stripTags().split(' '),vNewPhrase=this;
	oWords.each(function(o){
		vNewPhrase=vNewPhrase.replace(new RegExp("("+o+")","ig"),'<span class="highlight">$1</span>');
	});
	return vNewPhrase;
};
String.fromByteArray = function(b){
	var str = "";
	for(var index in b){
		str+= String.fromCharCode(b[index]);
	}
	return str;
};
String.prototype.highlight=function(vWords){
          var oWords = vWords.clearPunc().stripTags().split(' '),vNewPhrase=this;
          oWords.each(function(o){
                  vNewPhrase=vNewPhrase.replace(new RegExp("("+o+")","ig"),'<span class="highlight">$1</span>');
          });
          return vNewPhrase;
  };
String.prototype.hexStringToBytes = function(){
	var arr = [];
	try{
		for(var i=0;i<this.length-1;i+=2){
			arr.push(parseInt("0x"+this[i]+this[i+1]));
		}
	}
	catch(e){
		console.log("Error, unable to parse Hex String ", e);
	}
	return arr;
};
String.prototype.toHexString = function(){
	var bytes = this.toByteArray();
	var hexStr =  BINARY.byteArrayToHexString(bytes);
	return hexStr;
};

String.prototype.splice = function( idx, s ) {
    return (this.slice(0,idx) + s + this.slice(idx));
};

String.prototype.insert = function(str, pos){
  pos = pos || 0;
    return this.substring(0, pos)+str+(this.substring(pos));
};