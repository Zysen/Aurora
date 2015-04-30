
var TABLES = (function(tables){
	
	if(tables.VALIDATORS === undefined){
		tables.VALIDATORS = {};
	}
	
	/**
	 * Validates a numeric value within a range.
	 */
	tables.VALIDATORS.validateNumber = function(range_min, range_max, allow_empty){
		
		return function(field_value, metaData){
			if(field_value === undefined && allow_empty){
				return true;
			}
			
			if((field_value + '').length === 0){
				if(allow_empty){
					return true;
				}else{
					return 'Value is required';
				}
			}
					
			var value = parseFloat(field_value);
			if(isNaN(value)){
				return 'Not a valid number';
			}
			
			if(range_min != undefined && range_max != undefined){
				if(value < range_min || value > range_max){
					return 'Must be within ' + range_min + ' to ' + range_max;
				}
			}else if(range_min != undefined){
				if(value < range_min){
					return 'Must be larger than ' + range_min;
				}
			}else if(range_max != undefined){
				if(value > range_min){
					return 'Must be smaller than ' + range_max;
				}
			}
			
			return true;
		}
	};
		
	return tables;
})(TABLES || {});
