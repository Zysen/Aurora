goog.provide("aurora.object");

/**
 * @public
 * @param {Object} ob1 The first object to compare
 * @param {Object} ob2 The second object to compare
 * @param {Array=} path The base path
 * @param {Array=} diffs The collection of differences
 */
aurora.object.deepDiff = function(ob1, ob2, path, diffs){
	path = path || [];
	diffs = diffs || [];
	for(var key in ob1){
		if(typeof(ob1[key])!==typeof(ob2[key])){
			diffs.push({path: path.concat(key), oldValue: ob1[key], newValue: ob2[key]});
		}
		else if(typeof(ob1[key])!=="object"){
			if(ob1[key]!==ob2[key]){
				diffs.push({path: path.concat(key), oldValue: ob1[key], newValue: ob2[key]});
			}
		}
		else if(ob1[key] instanceof Array || ob1[key] instanceof Object){
			var subDiffs = aurora.object.deepDiff(ob1[key], ob2[key], [].concat(path).concat([key]), []);
			if(subDiffs.length>0){
				subDiffs.forEach(function(sub){
					diffs.push(sub);
				});
				diffs.push({path: path.concat(key), oldValue: ob1[key], newValue: ob2[key]});
			}
		}
	}
	for(var key in ob2){
		if(ob1[key]===undefined){
			diffs.push({path: path.concat(key), oldValue: undefined, newValue: ob2[key]});
		}
	}
	return diffs;
};

/**
 * @public
 * @param {Object} ob1 The first object to compare
 * @param {Object} ob2 The second object to compare
 */
aurora.object.equals = function(ob1, ob2){
	return aurora.object.deepDiff(ob1, ob2).length===0;
};


/**
 * @public
 * @param {Object} source The object to clone
 */
aurora.object.clone = function(source){
	if(source===undefined){
		return undefined;
	}
	if(source===null){
		return null;
	}
	if(source instanceof Array) {
		var copy = [];
		for (var i = 0; i < source.length; i++) {
			copy[i] = aurora.object.clone(source[i]);
		}
		return copy;
	}
	else if(typeof(source) === 'function'){
		return undefined;
		//return source.clone();
	}
	else if (source instanceof Object || typeof(source)=="object") {
		var copy = {};
		for (var attr in source) {
			if (source.hasOwnProperty(attr)){copy[attr] = aurora.object.clone(source[attr])};
		}
		return copy;
	}else if(typeof(source) === 'string'){
		return source+"";
	}else if(typeof(source) === 'number'){
		return source+0;
	}else if(typeof(source) === 'boolean'){
		return source;
	}
	else if(typeof(source) === 'undefined'){
		return undefined;
	}
	else{
		console.log("Error during clone, unable to clone data with type "+typeof(source));
	}
};