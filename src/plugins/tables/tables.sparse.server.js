var TABLES = (function(tables, dataManager, mysql){
	
	tables.getSparseTable = function(tableName, plugin, channelId, description, type, insertCB, updateCB, deleteCB, getColumnsCB, getRowsCB){
		var channelE = dataManager.getCommandChannelE(plugin, channelId, description || tableName, type || "getSparseTable");								//2 Way data channel
		var getRows = function(channelE, packet){
			var request = JSON.parse(packet.data.toString());
			getRowsCB(tableName, request, function(data, count){
				channelE.send(tables.COMMANDS.GET_ROWS, data, packet.clientId);
				channelE.send(tables.COMMANDS.GET_COUNT, {count:count}, packet.clientId);
			});
		};
		
		channelE.filterCommandsE(tables.COMMANDS.GET_ROWS).mapE(function(packet){
			console.log("GET ROWS");
			var request = JSON.parse(packet.data.toString());
			getRows(channelE, packet);
		});
		
		var columnsB = channelE.filterCommandsE(tables.COMMANDS.GET_COLUMNS).mapE(function(packet){
			console.log("GET COLUMNS");
			var request = JSON.parse(packet.data.toString());
			var recR = F.receiverE();
			getColumnsCB(tableName, function(columns){
				channelE.send(tables.COMMANDS.GET_COLUMNS,columns, packet.clientId);
				recR.sendEvent(columns);
			});
			return recR;
		}).switchE().startsWith(SIGNALS.NOT_READY);
		
		var primaryKeyB = columnsB.liftB(function(columns){
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