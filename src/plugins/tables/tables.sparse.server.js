var TABLES = (function(tables, dataManager, mysql){
	
	tables.getSparseTable = function(tableName, plugin, channelId, description, insertCB, updateCB, deleteCB){
		var channelE = dataManager.getCommandChannelE(plugin, channelId, description || tableName);								//2 Way data channel
		var getRows = function(channelE, packet){
			mysql.query("SELECT * FROM "+tableName+";", function(err, data){
				if(err!==undefined){
					console.log("Error", err);
				}
				else{
					//console.log(data);
					channelE.send(tables.COMMANDS.GET_ROWS, data, packet.clientId);
				}
			});
		};
		
		channelE.filterCommandsE(tables.COMMANDS.GET_ROWS).mapE(function(packet){
			//console.log("GET ROWS");
			var request = JSON.parse(packet.data.toString());
			//console.log("Query", request);
			getRows(channelE, packet);
		});
		
		var columnsB = channelE.filterCommandsE(tables.COMMANDS.GET_COLUMNS).mapE(function(packet){
			var request = JSON.parse(packet.data.toString());
			var recR = F.receiverE();
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
							channelE.send(tables.COMMANDS.GET_COLUMNS,columns, packet.clientId);
							recR.sendEvent(columns);
						}
					});
				}
			});
			return recR;
		}).switchE().printE("COLUMNS").startsWith(SIGNALS.NOT_READY);
		
		var primaryKeyB = columnsB.liftB(function(columns){
			console.log("COlumns", columns);
			if(!good(columns)){return columns;}
			for(var columnName in columns){
				if(columns[columnName].key!==undefined && columns[columnName].key.primary){
					return columnName;
				}
			}
		});
		
		channelE.filterCommandsE(tables.COMMANDS.CHANGE_SET).mapE(function(packet){
			var rowPkColumn = primaryKeyB.valueNow();
			var columns = columnsB.valueNow();
			var request = JSON.parse(packet.data.toString());
			for(var changeIndex in request.changeset){
				var change = request.changeset[changeIndex];
				if(Object.keys(change).length===1 && change[rowPkColumn]!==undefined){	
					deleteCB(tableName, rowPkColumn, change[rowPkColumn], function(err, data){
						if(err!==undefined){
							console.log("Error", err, q);
						}
						else{
							getRows(channelE, packet);
						}
					});
				}
				else if(change[rowPkColumn]===undefined){
					insertCB(tableName, rowPkColumn, change, columns, function(err, data){
						if(err!==undefined){
							//console.log("Error", err, q);
						}
						else{
							//console.log("Success!", q);
							getRows(channelE, packet);
						}
					});
				}
				else {	
					updateCB(tableName, rowPkColumn, change, columns, function(err, data){
						if(err!==undefined){
							console.log("Error", err, q);
						}
						else{
							getRows(channelE, packet);
						}
					});		
				}
			}
			channelE.send(tables.COMMANDS.UPDATE_RESPONSE, {applyId: request.applyId, errors:[]}, packet.clientId);
		});
	};
	
return tables;
}(TABLES || {}, DATA, MYSQL));