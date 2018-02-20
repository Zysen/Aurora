var OBJECT = (function(){
	function deepDiff(ob1, ob2, reportAncestors, path, diffs){
		path = path || [];
		diffs = diffs || [];
		reportAncestors = reportAncestors || false;
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
				var subDiffs = deepDiff(ob1[key], ob2[key], reportAncestors, [].concat(path).concat([key]), []);
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
	}
	return {
		deepDiff:deepDiff
	};
}());


