Number.prototype.formatAsTime = function() {
	var secs = Math.floor(this);
	if (secs < 0) {
		return "Indefinite";
	} else if (secs === 0) {
		return "0s";
	}
	var days = Math.floor(secs / 86400);
	var hours = Math.floor((secs % 86400) / 3600);
	var minutes = Math.floor((secs % 3600) / 60);
	var seconds = Math.floor(secs % 60);
	var str = "";
	if (days > 0) {
		str += days + "d ";
	}
	if (hours > 0) {
		str += hours + "h ";
	}
	if (minutes > 0) {
		str += minutes + "m ";
	}
	if (seconds > 0) {
		str += seconds + "s";
	}
	return str;
};
Number.prototype.tidyDecimal = function(n) {
	return Math.abs(this.toFixed(n));
};
Number.prototype.toEm = function() {
	return (this/12).tidyDecimal(3);
};