var TABLES = (function(tables, widgets, aurora, dataManager, binary){
	// Helper Functions
	// ================
	
	tables.sparseTableB = function(instanceId, pluginId, objectId){
		
		var objectName = "MyTable";
		
		var channelE = dataManager.getCommandChannelE(instanceId, pluginId, objectId); 
		var getColumnsE = channelE.filterCommandsE(tables.COMMANDS.GET_COLUMNS).propertyE("data").tagE("getColumns");
		var getRowsE = channelE.filterCommandsE(tables.COMMANDS.GET_ROWS).propertyE("data").tagE("getRows");
		var updateResponseE = channelE.filterCommandsE(tables.COMMANDS.UPDATE_RESPONSE).propertyE("data").tagE("updateResponse");

		var tableStateE = F.mergeE(getRowsE, updateResponseE, getColumnsE).collectE({}, function(packet, state){
			
			packet.value = binary.arrayBufferToObject(packet.value);
			console.log(packet);
			if(packet.tag==="getRows" && state.table!==undefined){		
				tables.UTIL.addRows(state.table, state.primaryKey, packet.value);
				OBJECT.remove(state.table.tableMetaData, "applyId");
			}
			else if(packet.tag==="getColumns"){
				console.log("Columns", packet.value);
				
				for(var columnName in packet.value){
					if(packet.value[columnName].key!==undefined && packet.value[columnName].key.primary){
						state.primaryKey = columnName;
					}
				}
				if(state.primaryKey===undefined){
					console.log("Error - Cannot find primary key");
				}

				state.table = TABLES.parseTable(objectName, state.primaryKey, [], packet.value);    
				channelE.send(tables.COMMANDS.GET_ROWS, {start: 0, end: 10});
			}
			else if(packet.tag==="updateResponse"){
				console.log("updateResponse");
				state.table.tableMetaData.applyId = packet.value.applyId;
				TABLES.UTIL.injectServerErrors(state.table, {});
			}
			console.log(state);
			return state;
		});
		var rowPkB = tableStateE.propertyE("primaryKey").startsWith(SIGNALS.NOT_READY);
		var tableDataB = tableStateE.propertyE("table").startsWith(SIGNALS.NOT_READY);

		var tableBI = F.liftBI(function(tableState){
			return tableState;
		}, function(table){
			console.log("Table UP", table);
			var changeSet = [];
			//applyId = table.tableMetaData.applyId;
			for(var rowIndex in table.data){
				var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);
				var rowMeta = table.rowMetaData[rowPk];
				
				if(rowMeta !== undefined && rowMeta.userChange === true){
					var row = table.data[rowIndex];
					var isDeleted = rowMeta.deleted === true;
					var isAdd = rowMeta.newRow === true;
					var rowChangeData = {};

					if(!isAdd){
						rowChangeData[table.tableMetaData.primaryKey] = rowPk;
					}
					if(isDeleted){
						changeSet.push(rowChangeData);
						continue;
					}
					// Send individual cells if changed
					for(var columnIndex in table.data[rowIndex]){
						if(columnIndex === table.tableMetaData.primaryKey) {
							continue;
						}
						
						var metaData = TABLES.UTIL.getMetaDataSet(table, rowIndex, columnIndex);
						if(metaData.cellMetaData.userChange === true){
							// If adding convert rowPk to something server understands
							//changeRowMapping.push(rowIndex);
							rowChangeData[columnIndex] = row[columnIndex];
						}
					}
					console.log("rowChangeData", rowChangeData);
					changeSet.push(rowChangeData);
					//channelE.send(isAdd?tables.COMMANDS.ADD_ROW:tables.COMMANDS.SET_ROW, {applyId: table.tableMetaData.applyId, changes: rowChangeData});
				}
			}
			console.log("tables.COMMANDS.CHANGE_SET ", changeSet);
			channelE.send(tables.COMMANDS.CHANGE_SET, {applyId: table.tableMetaData.applyId, changeset: changeSet});
				
			return [undefined];
		}, tableDataB);		
		
		channelE.send(tables.COMMANDS.GET_COLUMNS, {});
		
		return tableBI;
		 //{GET_ROWS:0, SET_ROW:1, DELETE_ROW:2, ADD_ROW:3};
	};
	
return tables;
}(TABLES || {}, WIDGETS, AURORA, DATA, BINARY));