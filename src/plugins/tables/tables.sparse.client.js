var TABLES = (function(tables, widgets, aurora, dataManager, binary){
	// Helper Functions
	// ================
	var numRowsVisible = 20;
	tables.sparseTable = function(instanceId, pluginId, objectId){
		var objectName = "MyTable";
		
		var channelE = dataManager.getCommandChannelE(instanceId, pluginId, objectId); 			
		
		//channelE.keysE().printE("Channel E in sparse Table");
		
		var getColumnsE = channelE.filterCommandsE(tables.COMMANDS.GET_COLUMNS).propertyE("data").tagE("getColumns");
		var getRowsE = channelE.filterCommandsE(tables.COMMANDS.GET_ROWS).propertyE("data").tagE("getRows");
		var updateResponseE = channelE.filterCommandsE(tables.COMMANDS.UPDATE_RESPONSE).propertyE("data").tagE("updateResponse");

		var getCountE = channelE.filterCommandsE(tables.COMMANDS.GET_COUNT).propertyE("data").mapE(function(p){return binary.arrayBufferToObject(p);}).propertyE("count");

		var tableStateE = F.mergeE(getRowsE, updateResponseE, getColumnsE).collectE({}, function(packet, state){
			//console.log("TableState "+packet.tag);			
			packet.value = binary.arrayBufferToObject(packet.value);
			//console.log(packet);
			if(packet.tag==="getRows" && state.table!==undefined){		
				//console.log("GET ROWS CLIENT");
				var pks = [];
				for(var index in state.table.data){
					pks.push(state.table.data[index][state.table.tableMetaData.primaryKey]);
				}
				for(var index in pks){
					TABLES.UTIL.removeRow(state.table, pks[index]);
				}
				//console.log(table.data);
				tables.UTIL.addRows(state.table, state.primaryKey, packet.value);
				OBJECT.remove(state.table.tableMetaData, "applyId");
			}
			else if(packet.tag==="getColumns"){
				//console.log("Columns", packet.value);
				
				for(var columnName in packet.value){
					if(packet.value[columnName].key!==undefined && packet.value[columnName].key.primary){
						state.primaryKey = columnName;
					}
				}
				if(state.primaryKey===undefined){
					console.log("Error - Cannot find primary key");
				}

				state.table = TABLES.parseTable(objectName, state.primaryKey, [], packet.value);    
				channelE.send(tables.COMMANDS.GET_ROWS, {start: 0, length: numRowsVisible});
			}
			else if(packet.tag==="updateResponse"){
				//console.log("updateResponse");
				state.table.tableMetaData.applyId = packet.value.applyId;
				TABLES.UTIL.injectServerErrors(state.table, {});
			}
			//console.log(state);
			return state;
		});
		var rowPkB = tableStateE.propertyE("primaryKey").startsWith(SIGNALS.NOT_READY);
		var tableDataB = tableStateE.propertyE("table").startsWith(SIGNALS.NOT_READY);

		var tableBI = F.liftBI(function(tableState){
			return tableState;
		}, function(table){
			//console.log("Table UP", table);
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
					//console.log("rowChangeData", rowChangeData);
					changeSet.push(rowChangeData);
					//channelE.send(isAdd?tables.COMMANDS.ADD_ROW:tables.COMMANDS.SET_ROW, {applyId: table.tableMetaData.applyId, changes: rowChangeData});
				}
			}
			//console.log("tables.COMMANDS.CHANGE_SET ", changeSet);
			channelE.send(tables.COMMANDS.CHANGE_SET, {applyId: table.tableMetaData.applyId, changeset: changeSet});
				
			return [undefined];
		}, tableDataB);		
		
		channelE.send(tables.COMMANDS.GET_COLUMNS, {});

		return {tableBI: tableBI, channelE:channelE, countE:getCountE};
		 //{GET_ROWS:0, SET_ROW:1, DELETE_ROW:2, ADD_ROW:3};
	};

	widgets.register("SparseTable", function(instanceId, data, purgeData) {
		var container = DOM.create("div");
		var toolbar = DOM.createAndAppend(container, "div");
		var rowCount = DOM.createAndAppend(toolbar, "div", undefined, "tableRowCountText");
		var positionControls = DOM.createAndAppend(toolbar, "div");
		var previousButton = DOM.createAndAppend(positionControls, "button", undefined, undefined, "Previous");
		var nextButton = DOM.createAndAppend(positionControls, "button", undefined, undefined, "Next");
		var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {});
		return {
		    build : function() {
		    	container.appendChild(tableWidget.build());
		    	return container;
		    },
		    load : function() {
		    	
		    	var sparseTable = tables.sparseTable(instanceId, data.plugin, data.channelId);
		    	var sparseTableBI = sparseTable.tableBI;
		    	var channelE = sparseTable.channelE;
		    	var tableRowCountB = sparseTable.countE.startsWith(SIGNALS.NOT_READY);
		    			    
		    	
		    	
		    	var queryR = F.receiverE();
		    	var queryE = queryR.filterRepeatsE();
		    	var queryB = queryE.startsWith({});

		    	var currentPositionB = F.liftB(function(delta, state){ 	
		    		
		    		var count = (!good(tableRowCountB.valueNow()))?Number.MAX_SAFE_INTEGER:tableRowCountB.valueNow();		    		
		    		if(good()){	
		    			if(delta===0){
		    				state.position = 0;
		    			}
		    			else{
			    			state.position = Math.max(0, Math.min(state.position+delta, count));	//This is intentionally writing state to position.
			    		}
			    		return state.position;
		    		}
		    		return chooseSignal();
		    	}, F.mergeE(
		    		F.clicksE(previousButton).mapE(function(){return -numRowsVisible;}),
		    		F.clicksE(nextButton).mapE(function(){return numRowsVisible;}),
		    		queryE.mapE(function(){return 0;})
		    	).startsWith(0), F.constantB({position:0}));
		    	
				var canPreviousB = currentPositionB.gtB(0);
				canPreviousB.liftB(function(canPrevious){
					if(good()){
						previousButton.disabled = !canPrevious;
					}
				});
				
				F.liftB(function(currentPosition, tableRowCount){
					if(good()){
						nextButton.disabled = !(currentPosition<(tableRowCount-numRowsVisible));
					}
				},currentPositionB,tableRowCountB);
				
    	
		    	F.liftBI(function(table, tableRowCount){
		    		if(good()){
		    			var currentPosition = currentPositionB.valueNow();
		    			rowCount.innerHTML = "Showing "+(currentPosition+1)+"-"+Math.min((currentPosition+table.data.length)+1, tableRowCount)+" of "+tableRowCount+" rows.";
		    		}	  
		    		return chooseSignal();  		
		    	}, function(){}, sparseTableBI, tableRowCountB);

		    	
		    	
		    	F.liftB(function(position, query){
		    		channelE.send(tables.COMMANDS.GET_ROWS, {start: position, length: numRowsVisible, filters:query});
		    	}, currentPositionB, queryB);
		    	

		    	var tableLogic = function(table){
		    		var query = {};
		    		for(var column in table.cellMetaData[0]){
		    			if(column!==table.tableMetaData.primaryKey && table.cellMetaData[0][column].userChange===true){
		    				query[column] = table.data[0][column];
		    			}
		    		}
		    		queryR.sendEvent(query);
		    	};

		    	var modifiedTableBI = F.liftBI(function(table){
		    		if(!good()){
		    			return SIGNALS.NOT_READY;
		    		}

		    		table = OBJECT.clone(table);
		    		if(table.data.length>0){
			    		table.tableMetaData.tableLogic = tableLogic;
			    		
			    		//Add search row
			    		TABLES.UTIL.addRow(table, 0);
			    		var rowIndex = TABLES.UTIL.findRowIndex(table, 0);
						var rowClone = OBJECT.clone(table.data[rowIndex]);
						delete table.data[rowIndex];
						table.data.unshift(rowClone);
					}
					
		    		return table;
		    	},function(table){
		    		return [table];
		    	}, sparseTableBI);
		    	
		    	
		    	
		    	
		    	

	  		 	tableWidget.load(modifiedTableBI);//TABLES.sortBI(modifiedTableBI, "ID")
	  		 	
		    },
		    destroy : function() {
			    tableWidget.destroy();
		    }
		};
	});
	
	widgets.register("JobsTable", function(instanceId, data, purgeData) {
		
		
		
		
		var container = DOM.create("div");
		var toolbar = DOM.createAndAppend(container, "div");
		var rowCount = DOM.createAndAppend(toolbar, "div", undefined, "tableRowCountText");
		var positionControls = DOM.createAndAppend(toolbar, "div");
		var showOnMap = DOM.createAndAppend(positionControls, "button", undefined, "flybustersShowOnMapButton", "Show On Map");
		var showOnGraph = DOM.createAndAppend(positionControls, "button", undefined, "flybustersShowOnMapButton", "Show On Graph");
		var previousButton = DOM.createAndAppend(positionControls, "button", undefined, undefined, "Previous");
		var nextButton = DOM.createAndAppend(positionControls, "button", undefined, undefined, "Next");
		var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {});
		
		var mapContainer = DOM.createAndAppend(toolbar, "div", "flybustersMap", "flybustersMap", "Map");
		
		return {
		    build : function() {
		    	container.appendChild(tableWidget.build());
		    	return container;
		    },
		    load : function() {
		    	
		    	var mysqlQueryChannelE = DATA.getChannelE(instanceId, "mysql", MYSQL.CHANNELS.QUERY);
		    	
		    	var sparseTable = tables.sparseTable(instanceId, data.plugin, data.channelId);
		    	var sparseTableBI = sparseTable.tableBI;
		    	var channelE = sparseTable.channelE;
		    	var tableRowCountB = sparseTable.countE.startsWith(SIGNALS.NOT_READY);

		    	var queryR = F.receiverE();
		    	var queryE = queryR.filterRepeatsE();
		    	var queryB = queryE.startsWith({});

		    	F.clicksE(showOnMap).blindE(1000).snapshotE(queryB).mapE(function(query){
		    		var filterStr = "";
					var first = true;
					for(var column in query){
						if(first){
							first = false;
						}
						var val = query[column];
						filterStr+=" AND `"+column+"` LIKE '%"+val+"%'";
					}	
		    		mysqlQueryChannelE.send("SELECT `title`,`surname`,`address`,`suburb`,`booked_jobs`.Insect,`booked_jobs`.`Date` FROM `booked_jobs` LEFT JOIN `Customers` ON `booked_jobs`.CustomerID=`Customers`.ID WHERE `surname` IS NOT NULL"+filterStr+" LIMIT 1000;");
		    	});
		    	
		    	
		    	function geocodeAddress(geocoder, address, resultsMap) {
				  geocoder.geocode({'address': address}, function(results, status) {
				    if (status === google.maps.GeocoderStatus.OK) {
				      resultsMap.setCenter(results[0].geometry.location);
				      var marker = new google.maps.Marker({
				        map: resultsMap,
				        position: results[0].geometry.location
				      });
				    } else {
				      console.log('Geocode was not successful for the following reason: ' + status);
				    }
				  });
				}
		    	
		    	mysqlQueryChannelE.mapE(function(packet){
		    		var data = binary.arrayBufferToObject(packet);
		    		console.log(data.length);
		    		mapContainer.style.display = "block";
		    		mapContainer.innerHTML = "";
		    		
		    		 var map = new google.maps.Map(document.getElementById('flybustersMap'), {
					    center: {lat: -34.397, lng: 150.644},
					    zoom: 8
					  });
					  
					  var geocoder = new google.maps.Geocoder();
					  for(var index in data){
					  	 geocodeAddress(geocoder, data[index].address+", "+data[index].suburb, map);
					  }
		    	});
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	

		    	var currentPositionB = F.liftB(function(delta, state){ 	
		    		
		    		var count = (!good(tableRowCountB.valueNow()))?Number.MAX_SAFE_INTEGER:tableRowCountB.valueNow();		    		
		    		if(good()){	
		    			if(delta===0){
		    				state.position = 0;
		    			}
		    			else{
			    			state.position = Math.max(0, Math.min(state.position+delta, count));	//This is intentionally writing state to position.
			    		}
			    		return state.position;
		    		}
		    		return chooseSignal();
		    	}, F.mergeE(
		    		F.clicksE(previousButton).mapE(function(){return -numRowsVisible;}),
		    		F.clicksE(nextButton).mapE(function(){return numRowsVisible;}),
		    		queryE.mapE(function(){return 0;})
		    	).startsWith(0), F.constantB({position:0}));
		    	
				var canPreviousB = currentPositionB.gtB(0);
				canPreviousB.liftB(function(canPrevious){
					if(good()){
						previousButton.disabled = !canPrevious;
					}
				});
				
				F.liftB(function(currentPosition, tableRowCount){
					if(good()){
						nextButton.disabled = !(currentPosition<(tableRowCount-numRowsVisible));
					}
				},currentPositionB,tableRowCountB);
				
    	
		    	F.liftBI(function(table, tableRowCount){
		    		if(good()){
		    			var currentPosition = currentPositionB.valueNow();
		    			rowCount.innerHTML = "Showing "+(currentPosition+1)+"-"+Math.min((currentPosition+table.data.length)+1, tableRowCount)+" of "+tableRowCount+" rows.";
		    		}	  
		    		return chooseSignal();  		
		    	}, function(){}, sparseTableBI, tableRowCountB);

		    	
		    	
		    	F.liftB(function(position, query){
		    		channelE.send(tables.COMMANDS.GET_ROWS, {start: position, length: numRowsVisible, filters:query});
		    	}, currentPositionB, queryB);
		    	

		    	var tableLogic = function(table){
		    		var query = {};
		    		for(var column in table.cellMetaData[0]){
		    			if((column==="Operator" || column==="Booked By") && table.data[0][column]==0){
		    				continue;
		    			}
		    			if(column!==table.tableMetaData.primaryKey && table.cellMetaData[0][column].userChange===true){
		    				query[column] = table.data[0][column];
		    			}
		    		}
		    		queryR.sendEvent(query);
		    	};





				var operatorsTableBI = tables.sparseTable(instanceId, "mysql", 30005).tableBI.liftB(function(table){
					if(!good()){
						return chooseSignal();
					}
					var list = {"Anyone":0};
					for(var rowIndex in table.data){
						list[table.data[rowIndex].Operator] = table.data[rowIndex].ID;
					}
					return list;
				});
				var bookingStaffTableBI = tables.sparseTable(instanceId, "mysql", 30009).tableBI.liftB(function(table){
					if(!good()){
						return chooseSignal();
					}
					var list = {"Anyone":0};
					for(var rowIndex in table.data){
						list[table.data[rowIndex]["Staff Name"]] = table.data[rowIndex].ID;
					}
					return list;
				});

		    	var modifiedTableBI = F.liftBI(function(table, operatorsTable, bookingStaffTable){
		    		if(!good()){
		    			return SIGNALS.NOT_READY;
		    		}
console.log(table);
		    		table = OBJECT.clone(table);
		    		if(table.data.length>0){
			    		table.tableMetaData.tableLogic = tableLogic;
			    		
			    		//Add search row
			    		TABLES.UTIL.addRow(table, 0);
			    		var rowIndex = TABLES.UTIL.findRowIndex(table, 0);
						var rowClone = OBJECT.clone(table.data[rowIndex]);
						delete table.data[rowIndex];
						table.data.unshift(rowClone);
					}
					else{
						TABLES.UTIL.addRow(table, 0);
					}
					
					
					table.tableMetaData.canAdd=false;
					table.tableMetaData.canDelete = false;
					table.columnMetaData.ID.visible = false;
					
					for(var rowIndex in table.data){
						if(rowIndex>0){
							for(var column in table.columnMetaData){							
								TABLES.UTIL.getCellMetaData(table, rowIndex, column, true).readonly = true;
							}
						}
						if(table.data[rowIndex].Date){
							table.data[rowIndex].Date = table.data[rowIndex].Date.replaceAll("T11:00:00.000Z", "").replaceAll("T12:00:00.000Z", "");
						}
						if(table.data[rowIndex].Time){
							table.data[rowIndex].Time = table.data[rowIndex].Time.replaceAll("1899-12-29T", "").replaceAll("1899-12-30T", "").replaceAll(":00.000Z", "");
						}
						
						
					}

					table.columnMetaData.Operator.renderer = WIDGETS.renderers.SelectInput;
					table.columnMetaData.Operator.rendererOptions = {list: operatorsTable};
					table.columnMetaData.Operator.defaultValue = Object.keys(operatorsTable)[0];
					table.data[0].Operator = 0;
					table.data[0]["Booked By"] = 0;
					
					table.columnMetaData["Booked By"].renderer = WIDGETS.renderers.SelectInput;
					table.columnMetaData["Booked By"].rendererOptions = {list: bookingStaffTable};
					
		    		return table;
		    	},function(table){
		    		return [table];
		    	}, sparseTableBI, operatorsTableBI, bookingStaffTableBI);
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	
		    	

	  		 	tableWidget.load(modifiedTableBI);//TABLES.sortBI(modifiedTableBI, "ID")
	  		 	
		    },
		    destroy : function() {
			    tableWidget.destroy();
		    }
		};
	});

return tables;
}(TABLES || {}, WIDGETS, AURORA, DATA, BINARY));