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
		},
		
		getColumnsCB: function(tableName, doneCB){
			mysql.query("select TABLE_NAME,COLUMN_NAME,CONSTRAINT_NAME, REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME from INFORMATION_SCHEMA.KEY_COLUMN_USAGE where TABLE_NAME = '"+tableName+"';", function(err, keyData){
				if(err!==undefined){
					console.log("Error", err);
				}
				else{
					mysql.query("SHOW COLUMNS FROM "+tableName+";", function(err, data){
						if(err!==undefined){
							console.log("Error", err);
						}
						else{
							var keys = {};
							for(var index in keyData){
								keys[keyData[index].COLUMN_NAME] = {table: keyData[index].REFERENCED_TABLE_NAME, column: keyData[index].REFERENCED_COLUMN_NAME, primary: keyData[index].CONSTRAINT_NAME==="PRIMARY"};
							}
								
							var columns = {};
							for(var index in data){
								var column = data[index];
								var type = (column.Type.startsWith("int")?"number":(column.Type.startsWith("varchar")?"string":column.Type));
								columns[column.Field] = {name: column.Field, type: type};
								if(keys[column.Field]){
									columns[column.Field].key = keys[column.Field];
								}
							}
							doneCB(columns);
						}
					});
				}
			});
		},
		
		getRowsCB: function(tableName, query, doneCB){
			var filterStr = "";
			var first = true;
			for(var column in query.filters){
				if(first){
					first = false;
					filterStr+=" WHERE ";
				}
				else{
					filterStr+=" AND ";
				}
				var val = query.filters[column];
				filterStr+="`"+column+"` LIKE '%"+val+"%'";
			}	
			console.log("SELECT * FROM `"+tableName+"`"+filterStr+" LIMIT "+query.start+","+query.length+";");
			mysql.query("SELECT * FROM `"+tableName+"`"+filterStr+" LIMIT "+query.start+","+query.length+";", function(err, data){
				if(err!==undefined){
					console.log("Error", err);
				}
				else{
					mysql.query("SELECT COUNT(*) FROM `"+tableName+"`"+filterStr+";", function(err, count){			//Query Cache should make this not too bad.
						if(err!==undefined){
							console.log("Error", err);
						}
						else{
							doneCB(data, count[0]["COUNT(*)"]);
						}
					});
				}
			});
		}
	};

	mysql.getTable = function(tableName, plugin, channelID, description, type){
		//console.log("mysql.getTable "+tableName);
		tables.getSparseTable(tableName, plugin, channelID, description, (type || "getTable"), mysql.sparseTables.insertCB, mysql.sparseTables.updateCB, mysql.sparseTables.deleteCB, mysql.sparseTables.getColumnsCB, mysql.sparseTables.getRowsCB);
	};
	
	return mysql;
}(MYSQL || {}, DATA, TABLES));
