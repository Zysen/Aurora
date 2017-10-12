Number.prototype.tidyDecimal = function(n) {
	return Math.abs(this.toFixed(n));
};
Number.prototype.toEm = function() {
	return (this / 12).tidyDecimal(3);
};
/**
 * Formats a number as a string in the format: d h m s
 * @returns {String}
 */
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
/**
 * Formats a number with comma separators
 * @returns
 */
Number.prototype.formatWithCommas = function() {
	if (this < 10000) {
		return this.toString();
	}
	var parts = this.toString().split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return parts.join(".");
};
/**
 * Creates a number from two 32 bit unsigned integers
 * @param msn
 * @param lsn
 */
Number.fromSNMPCounter64 = function(msn, lsn) {
	// Note that the bitwise operators and shift operators operate on 32-bit ints.
	// So we use multiplication and addition instead.
	var upper = msn * Math.pow(2, 32);
	var value = upper + lsn;
	return value;
}; 