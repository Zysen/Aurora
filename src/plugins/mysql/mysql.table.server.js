var MYSQL = (function(mysql, dataManager, tables){	
	
	mysql.sparseTables = {
		insertCB: function(tableName, primaryColumn, change, columns, doneCB){
			var q = "INSERT INTO `"+tableName+"` (";
			var first = true;
			for(var keyName in change){
				if(keyName===primaryColumn){continue;}
				if(change[keyName]===undefined || change[keyName]===null){continue;}
				if(!first){q+=",";}
				q+= "`"+keyName+"`";
				first = false;
			}
			q+=") VALUES (";
			first = true;
			for(var keyName in change){
				if(keyName===primaryColumn){continue;}
				if(change[keyName]===undefined || change[keyName]===null){continue;}
				if(!first){q+=",";}
				if(columns[keyName].type==="point"){
					console.log("Point", change[keyName]);
					if(change[keyName].x===undefined){
						q+="POINT(0,0)";
					}
					else{
						q+= "POINT("+change[keyName].x+","+change[keyName].y+")";
					}
				}
				else{
					var str = typeof(change[keyName])==="string";
					q+= (str?"'":"")+change[keyName]+(str?"'":"");
				}
				first = false;
			}
			q+=");";
			mysql.query(q, doneCB);
		},
		
		updateCB: function(tableName, primaryColumn, change, columns, doneCB){
			var q = "UPDATE `"+tableName+"` SET ";
			first = true;
			for(var keyName in change){
				if(keyName===primaryColumn){continue;}
				if(change[keyName]===null){continue;}
				if(!first){q+=",";}
				if(columns[keyName].type==="point"){
					q+= "`"+keyName+"`= POINT("+change[keyName].x+","+change[keyName].y+")";
				}
				else{
					var str = typeof(change[keyName])==="string";
					q+= "`"+keyName+"`=" +(str?"'":"")+change[keyName]+(str?"'":"");
				}
				first = false;
			}
			q+=" WHERE `"+primaryColumn+"`="+change[primaryColumn]+" LIMIT 1;";
			console.log("Query "+q);
			mysql.query(q, doneCB);	
		},
		
		deleteCB: function(tableName, primaryColumn, deleteId, doneCB){
			mysql.query("DELETE FROM `"+tableName+"` WHERE `"+primaryColumn+"`="+deleteId+" LIMIT 1;", doneCB);
		}
	};
	
	mysql.getTable = function(tableName, plugin, channelID, description){
		tables.getSparseTable(tableName, plugin, channelID, description, mysql.sparseTables.insertCB, mysql.sparseTables.updateCB, mysql.sparseTables.deleteCB);
	};
	
	return mysql;
}(MYSQL || {}, DATA, TABLES));
