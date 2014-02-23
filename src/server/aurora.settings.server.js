var AURORA = (function(aurora){
	
	if(aurora.SETTINGS==undefined){
		aurora.SETTINGS = {};
	}
	
	aurora.SETTINGS.STORAGE_ENGINE = AURORA.STORAGE_ENGINES.JSON;
	
	return aurora;
}(AURORA || {}));
