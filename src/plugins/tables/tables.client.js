var TABLES = (function(tables, widgets){
	
	// Helper Functions
	// ================
	if(tables.tableWidget === undefined){
		tables.tableWidget = {};
	}

	if(tables.WIDGETS === undefined){
		tables.WIDGETS = {tableWidget: tables.tableWidget};
	}	
	
	tables.WIDGETS.basicTableWidget = function(objectName, primaryKey, tableMetaData, columnMetaData, rowMetaData, cellMetaData){
		return (function(instanceId, data, purgeData){
			var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
			
			objectName = objectName!=undefined?objectName:data.source;
			return {
				build:function(){
					return tableWidget.build();
				},
				load:function(){
					var modifiedDataTableBI = F.liftBI(function(table){
						if(!good()){
							return chooseSignal();
						}
						if(!TABLES.UTIL.isTable(table)){
						    try{
						      table = TABLES.parseTable(objectName, primaryKey, table); 
						    }catch(e){LOG.create("Error, Unable to parse data as a table.");return;}
						}
						//LOG.create(table);
						if(tableMetaData!=undefined){
						    table.tableMetaData = OBJECT.extend(table.tableMetaData, tableMetaData);
						}
						if(columnMetaData!=undefined){
                            table.columnMetaData = OBJECT.extend(table.columnMetaData, columnMetaData);
                        }
                        if(rowMetaData!=undefined){
                            table.rowMetaData = OBJECT.extend(table.rowMetaData, rowMetaData);
                        }
                        if(cellMetaData!=undefined){
                            table.cellMetaData = OBJECT.extend(table.cellMetaData, cellMetaData);
                        }
						
						return table;
					},function(table){
						return [table];
					}, DATA.requestTableBI(instanceId, objectName));

					tableWidget.load(modifiedDataTableBI);
				},
				destroy:function(){
					DATA.release(instanceId, objectName);
					tableWidget.destroy();
				}
			};
		});
	};
	widgets.register("BasicTable", tables.WIDGETS.basicTableWidget());
	
	tables.WIDGETS.chunkedBasicTable = function(objectName, primaryKey, tableMetaData, columnMetaData, rowMetaData, cellMetaData){
        return (function(instanceId, data, purgeData){
            var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
            
            objectName = objectName!=undefined?objectName:data.source;
            return {
                build:function(){
                    return tableWidget.build();
                },
                load:function(){
                    var modifiedDataTableBI = F.liftBI(function(table){
                        if(!good()){
                            return chooseSignal();
                        }
                        if(!TABLES.UTIL.isTable(table)){
                            try{
                                if(table instanceof Array){
                                    ARRAYS.arrayCut(table, 0);    //Remove the types row
                                }
                                else{
                                    OBJECT.remove(table, "$.types");
                                    table = [table];
                                }
                                table = TABLES.parseTable(objectName, primaryKey, table); 
                            }catch(e){LOG.create("Error, Unable to parse data as a table.");LOG.create(e);return;}
                        }
                        
                        if(tableMetaData!=undefined){
                            table.tableMetaData = OBJECT.extend(table.tableMetaData, tableMetaData);
                        }
                        if(columnMetaData!=undefined){
                            table.columnMetaData = OBJECT.extend(table.columnMetaData, columnMetaData);
                        }
                        if(rowMetaData!=undefined){
                            table.rowMetaData = OBJECT.extend(table.rowMetaData, rowMetaData);
                        }
                        if(cellMetaData!=undefined){
                            table.cellMetaData = OBJECT.extend(table.cellMetaData, cellMetaData);
                        }
                        
                        return table;
                    },function(table){
                        return [table];
                    }, DATA.requestChunkedB(instanceId, objectName));

                    tableWidget.load(modifiedDataTableBI);
                },
                destroy:function(){
                    DATA.release(instanceId, objectName);
                    tableWidget.destroy();
                }
            };
        });
    };
    widgets.register("ChunkedBasicTable", tables.WIDGETS.chunkedBasicTable());
	
	
    tables.WIDGETS.basicReadTableWidget = function(objectName){
	   return new tables.WIDGETS.basicTableWidget(objectName, {readonly: true});
	};
	
	
	
	
	/**
	 * Instantiates and returns a widget renderer based on the meta data provided (.renderer).
	 * If widget renderer cannot be found a string widget renderer is returned.
	 */
	tables.tableWidget.chooseRenderer = function(instanceId, metaData, rowPk, columnId){
		var renderer_id = instanceId + '_' + rowPk + '_' + columnId + '_renderer';
			
		var renderer = TABLES.UTIL.chooseMetaData('renderer', metaData);
		if(renderer!==undefined){
			return new renderer(renderer_id);
		}
		var dataType = TABLES.UTIL.chooseMetaData('dataType', metaData);
		if(dataType===undefined || WIDGETS.renderers[dataType]===undefined){
			dataType="string";
		}
		return new WIDGETS.renderers[dataType](renderer_id);
	};
	
	/**
	 * Creates the DOM table that the table widget is rendered into.
	 * @param [toolbarWidget] (Object) Optional toolbar widget object. If provided is added to the DOM.
	 * @returns DOM element
	 */ 
	tables.tableWidget.createDOMTable = function(instanceId, toolbarWidget){

		var jcontainer = jQuery('<div>', {id: instanceId});
		
		var jtable_error = jQuery('<div>', {id: instanceId + '_table_error'});
		jcontainer.append(jtable_error);
		
		var jtable = jQuery('<table>', {id: instanceId + '_table'});
		jtable.addClass('config');
		jtable.addClass('TableWidget');
		
		var jempty_message = jQuery('<div>', {id: instanceId + '_empty_message'});
		jempty_message.append(jQuery('<h3>', {'class':'info'}));
		jempty_message.hide();
		
		if(toolbarWidget !== undefined){
			jcontainer.append(toolbarWidget.build());
			jtable_error.addClass('page_toolbar_content');
			jtable.addClass('page_toolbar_content');
			jempty_message.addClass('page_toolbar_content');
		}
		
		jcontainer.append(jtable);
		jcontainer.append(jempty_message);
		return jcontainer.get(0);	
	};

	/**
	 * Behaviour that sets up the table based on table meta data.
	 * Adds header row, change indicator row / column etc (only occurs once)
	 * Only common table widget setup should be done in this function.
	 * @param instanceId - id of the table widget
	 * @param tableB - (Behaviour) table data 
	 * @returns Behaviour containing table data unmodified from tableB.
	 */
	tables.tableWidget.setupTableB = function(instanceId, tableB){
		var is_setup = false;
		
		return tableB.liftB(function(sourceTable){
			if(!good()){
				return chooseSignal();
			}else if(is_setup){
				return sourceTable;
			}			
			
			// Build table header
			// ==================
			var domTable = DOM.get(instanceId+"_table");
			
			// Create row for column headings
			var headerRow = DOM.create("tr", domTable.id+"_header");
			headerRow.appendChild(DOM.create("td", undefined, 'spacer_cell changeIndicator'));			// Spacer for row change indicator column
			domTable.appendChild(headerRow);
			
			// Create row for column change indicators
			var columnChangeRow = DOM.create("tr", instanceId+"_columnChangeIndicator");
			columnChangeRow.appendChild(DOM.create("td", undefined, 'spacer_cell changeIndicator'));		// Spacer for row change indicator column
			domTable.appendChild(columnChangeRow);
			
			// If not horizontal headings, hide header row
			if(sourceTable.tableMetaData.headingStyle !== TABLES.metaTagHeadingStyle.Horizontal){
				jQuery(headerRow).hide();
				
				// Add additional spacer cell for heading if vertical
				if(sourceTable.tableMetaData.headingStyle === TABLES.metaTagHeadingStyle.Vertical){
					headerRow.appendChild(DOM.create("td", undefined, 'spacer_cell'));
					columnChangeRow.appendChild(DOM.create("td", undefined, 'spacer_cell'));
				}
			}
			else{
				jQuery(headerRow).show();
			}
			
			// If horizontal orientation or readonly table, hide column change indicator row
			if(sourceTable.tableMetaData.horizontalOrientation !== false || sourceTable.tableMetaData.readOnly==true){
				jQuery(columnChangeRow).hide();
			}
			else{
				jQuery(columnChangeRow).show();
			}
			
			// TODO: Need to move this to second render
	    	var jtable = jQuery(domTable);
			// Set data highlight selection on table
			if(sourceTable.tableMetaData.canSelect === false && jtable.hasClass("noSelection")){
				jtable.removeClass("noSelection");
			}else if(sourceTable.tableMetaData.canSelect === true && !jtable.hasClass("noSelection")){
				jtable.addClass("noSelection");
			}
			
			is_setup = true;
			return sourceTable;
		});
	};
	
	/**
	 * Handles changesets combining source data with modified data.
	 * Also collects POST response server errors for a table, and re-applys them to following GET updates.
	 * Removes server errors from cell if user modifies cell, or undoes changes.
	 * Expects data to be formatted according to the table data structure. See TABLES object for details of structure.
	 * 
	 * @param tableSourceB - table{meta, data}
	 * @param changeE - {rowPk, columnIndex, value}
	 * @param applyE - {id: id of table apply, rowPks: [rowPks]} optional rowPks if applying only a selection or rows.
	 * @param clearE - [rowPk, ...]
	 * @param addE (optional) event with no value.
	 * @param deleteE (optional) - [rowPk, ...]
	 * @param showErrorsFunc (optional) function returns true if we allows errors
	 * @returns object {}
	 */
	tables.tableWidget.changeSetMerge = function(tableSourceB, changeE, applyE, clearE, addE, deleteE, emptyE, undoColumnE, deleteColumnE, showErrorsFunc){
		
		addE = addE || F.zeroE();
		deleteE = deleteE || F.zeroE();
		emptyE = emptyE|| F.zeroE();	
		
		undoColumnE = undoColumnE || F.zeroE();	
		deleteColumnE = deleteColumnE || F.zeroE();	

		// Filter data so it is always good
		// --------------------------------
		// Filter out all errors from source table
		var sourceB = tableSourceB.filterNotGoodB();
		
		// Filter initial SIGNALS.NOT_READY from sourceB
		var sourceE = sourceB.changes().filterNotGoodE();
		
		// Apply
		// -----
		var applyInfoDefault = {id: -1};
		var applyResultE = F.receiverE();
		var applyResetE = applyResultE.mapE(function(){return applyInfoDefault;});
		var applyInfoB = F.mergeE(applyResetE, applyE.mapE(function(value){
			value.timeStamp = new Date().getTime();
			return value;
		})).startsWith(applyInfoDefault);
		
		var applyEventE = F.mergeE(
				applyE.mapE(function(){return AURORA.APPLY_STATES.APPLYING;}),
				applyResultE.mapE(function(value){
					return value ? AURORA.APPLY_STATES.SUCCESS : AURORA.APPLY_STATES.ERROR;
				}));
		
		// Handle general set errors
		// -------------------------
		// Create an event for any set ERROR
		var set_errorE = tableSourceB.changes().filterE(function(value){
			 return SIGNALS.isSetErrored(value);
		});
		
		// Combine last source data with error
		var errored_sourceE = set_errorE.mapE(function(error){
			var table = sourceB.valueNow();
			if(!good(table)){
				return SIGNALS.NOT_READY;
			}
			
			// Check for updates for this node
			var apply_id = applyInfoB.valueNow().id;
			if(apply_id < 0 || error.applyId === undefined || error.applyId != apply_id){
				return SIGNALS.NOT_READY;
			}
			
			// Set error as a table error
			if(table.tableMetaData.serverErrors === undefined){
				table.tableMetaData.serverErrors = [];
			}
			table.tableMetaData.applyId = apply_id;
			table.tableMetaData.serverErrors.push(error);
			
			return table;
		}).filterNotGoodE();
		
		// Commands to update changeset and error cache
		// --------------------------------------------
		var command_sourceE = F.mergeE(sourceE, errored_sourceE).mapE(function(value){
			return jQuery.extend(value, {command: 'source'});
		});
		
		var command_changeE = changeE.mapE(function(value){
			return jQuery.extend(value, {command: 'change'});
		});
		
		var command_clearE = clearE.mapE(function(value){
			return {command: 'clear', value: value};
		});
		
		var command_addE = addE.mapE(function(){
			return {command: 'add'};
		});
		
		var command_deleteE = deleteE.mapE(function(value){
			return {command: 'delete', value: value};
		});
		
		var command_emptyE = emptyE.mapE(function(){
			return {command: 'empty'};
		});
		
		var command_undoColumnE = undoColumnE.mapE(function(value){
			return {command: 'undoColumn', value: value};
		});
		
		var command_deleteColumnE = deleteColumnE.mapE(function(value){
			return {command: 'deleteColumn', value: value};
		});
		
		var command_setE = F.mergeE(command_sourceE, command_changeE, command_clearE, command_addE, command_deleteE, command_emptyE, command_undoColumnE, command_deleteColumnE);
		
		// Process commands
		var initial_data = {changeset: {}, errors: []};
		var changeSetE = command_setE.collectE(initial_data, function(newVal, state){
			// Check table is ready
			if(!good(sourceB.valueNow())){
				return state;
			}
			
			switch(newVal.command){
			case 'empty':
				// Empty both changeset and errors
				state.changeset = {};
				state.errors = [];
				break;
				
			case 'source':
				
				// Is source a response to an apply for this node?
				var isApplyResponse = false;
				var hasTableError = false;
				var applyInfo = applyInfoB.valueNow();
				var applyId = applyInfo.id;
				var applyRowPks = applyInfo.rowPks;
				if(applyId > 0 && newVal.tableMetaData.applyId !== undefined && newVal.tableMetaData.applyId == applyId){
					// Yes this is a response to an apply.
					isApplyResponse = true;
					
					// Do we have a table error?
					if(newVal.tableMetaData.serverErrors !== undefined && newVal.tableMetaData.serverErrors.length > 0){
						hasTableError = true;
					}
					
				}
				
				// Compare changeset to new source data
				// If changeset value === server value remove from changeset
				// If an apply response and changeset value !== server value, create an error for each field that wasn't set.
				for(var rowPk in state.changeset){
					
					// If response to an apply - check we were applying this row
					var applyingRow = false;
					if(isApplyResponse){
						if(applyRowPks === undefined){
							applyingRow = true;
						}else{
							for(var i in applyRowPks){
								if(applyRowPks[i] == rowPk){
									applyingRow = true;
									break;
								}
							}
						}
					}
					
					// Find row index
					var rowIndex = TABLES.UTIL.findRowIndex(newVal, rowPk);
					if(rowIndex !== false){
						var rowData = newVal.data[rowIndex];
							
						for(var columnIndex in state.changeset[rowPk]){
							
							// Compare each cell value in changeset to source
							if(OBJECT.equals(rowData[columnIndex], state.changeset[rowPk][columnIndex].value)){
								// Value is same as server, remove from changeset
								OBJECT.remove(state.changeset[rowPk], columnIndex);
								
								// If not a response to an apply, remove any server error for this cell because it now matches the server
								if(!isApplyResponse){
									for(var i=0; i<state.errors.length; i++){
										var error = state.errors[i];
										
										switch(error.type){
										case 'cell':
											if(error.rowPk == rowPk && error.columnId == columnIndex){
												state.errors.splice(i, 1);
												i--;
											}
											break;
										}
									}
								}
								
							}else if(isApplyResponse){
								// Value is not the same after an apply
								var metaDataSet = TABLES.UTIL.getMetaDataSet(newVal, rowIndex, columnIndex);
								
								// Check we got an error for this cell
								if(applyingRow && !hasTableError){
									
									var serverErrors = TABLES.UTIL.chooseMetaData("serverErrors", metaDataSet);
									if(serverErrors === undefined || serverErrors.length === 0){
										// No error
										
										// If a client server pair, remove from changeset because we can't really compare client value to server
										// because they are expected to be different
										var csPair = TABLES.UTIL.chooseMetaData(TABLES.metaTagProcessor, metaDataSet); //clientServerPair
										if(csPair == TABLES.metaTagProcessorType.clientServerPair){
											OBJECT.remove(state.changeset[rowPk], columnIndex);
											
										}else{
											// Create an error
											var cellMeta = TABLES.UTIL.getCellMetaData(newVal, rowIndex, columnIndex, true);
											cellMeta.serverErrors = new Array();
											cellMeta.serverErrors.push(new ERROR(0, "Failed to set value on device"));
										}
									}
								}
							}
						}
						// If no cells in row changeset then remove row
						if(Object.keys(state.changeset[rowPk]).length == 0){
							OBJECT.remove(state.changeset, rowPk);
						}
						
					}else{
						
						// Row not found in table, but exists in changeset
						// 1) It has been deleted from server
						// 2) Or it is a locally added row
						
						// Is row an add?
						if((rowPk + '').indexOf(TABLES.tempPkPrefix) != -1){
							// Yes - added row
							
							// If response to apply, check that row applied without any error
							if(isApplyResponse){
								
								// Check if we got an error for this row
								if(applyingRow){
									var tempRowMeta = TABLES.UTIL.getTempRowMetaData(newVal, rowPk);
									if(tempRowMeta === undefined || tempRowMeta.serverErrors === undefined || tempRowMeta.serverErrors.length === 0){
										// No errors so row must have applied successfully - remove from changeset
										OBJECT.remove(state.changeset, rowPk);
									}
								}
							}
							
						}else{
							// No - must be deleted from source - remove from changeset
							OBJECT.remove(state.changeset, rowPk);
						}
					}
				}
				
				if(isApplyResponse){
					// Extract any errors from the server and cache them.
					state.errors = TABLES.UTIL.extractServerErrors(newVal);
					
					// Reset applyId so we don't process response again
					if (showErrorsFunc === undefined || showErrorsFunc(newVal)){
						applyResultE.sendEvent(state.errors.length === 0);
					}
					else {
						applyResultE.sendEvent(true);
					}
				}
				break;
			case 'change':
				// Update changeset with change 
				
				// Compare change to source data
				var removeErrors = false;
				var source_row_data = TABLES.UTIL.findRow(sourceB.valueNow(), newVal.rowPk);
				if(source_row_data == false || !OBJECT.equals(source_row_data[newVal.columnIndex], newVal.value)){
					if(state.changeset[newVal.rowPk] === undefined){
						state.changeset[newVal.rowPk] = {};
					}
					
					// Is newVal.value any different to current change?
					if(state.changeset[newVal.rowPk][newVal.columnIndex] !== undefined 
							&& state.changeset[newVal.rowPk][newVal.columnIndex].value != newVal.value){
						// Yes - Remove errors
						removeErrors = true;
					}
					
					state.changeset[newVal.rowPk][newVal.columnIndex] = newVal;
					
				}else if(state.changeset[newVal.rowPk] !== undefined){
					// Value is same as source, remove from changeset
					OBJECT.remove(state.changeset[newVal.rowPk], newVal.columnIndex);
					// If no cells in row changeset then remove row
					if(Object.keys(state.changeset[newVal.rowPk]).length == 0){
						OBJECT.remove(state.changeset, newVal.rowPk);
					}
					
					removeErrors = true;
				}
				
				if(removeErrors){
					// Find the row and column that changed and remove server error, if any
					// Also remove any table error
					for(var i=0; i<state.errors.length; i++){
						var error = state.errors[i];
						
						switch(error.type){
						case 'table':
							state.errors.splice(i, 1);
							i--;
							break;
						case 'row':
							if(error.rowPk == newVal.rowPk){
								state.errors.splice(i, 1);
								i--;
							}
							break;
						case 'cell':
							if(error.rowPk == newVal.rowPk && error.columnId == newVal.columnIndex){
								state.errors.splice(i, 1);
								i--;
							}
							break;
						}
					}
				}
				
				break;
			case 'clear':
				
				// Remove supplied rows from changeset
				for(var index in newVal.value){
					var rowPk = newVal.value[index];
					OBJECT.remove(state.changeset, rowPk);
				}
				
				// Clear any errors on supplied rows
				// Also remove any table error
				if(newVal.value.length){
					for(var i=0; i<state.errors.length; i++){
						var error = state.errors[i];
						
						switch(error.type){
						case 'table':
							state.errors.splice(i, 1);
							i--;
							break;
						case 'row':
						case 'cell':
							if(ARRAYS.contains(newVal.value, error.rowPk, false)){
								state.errors.splice(i, 1);
								i--;
							}
							break;
						}
					}
				}
				
				break;
			case 'undoColumn':
				// Remove all specific columns from changeset
				for(var rowPk in state.changeset){
					for(var index in newVal.value){
						
						// Remove change
						OBJECT.remove(state.changeset[rowPk], newVal.value[index]);
						if(Object.keys(state.changeset[rowPk]).length == 0){
							OBJECT.remove(state.changeset, rowPk);
						}
					}
				}
				
				// Remove errors if any
				if(newVal.value.length){
					for(var i=0; i<state.errors.length; i++){
						var error = state.errors[i];
						
						switch(error.type){
						case 'table':
							state.errors.splice(i, 1);
							i--;
							break;
						case 'row':
							// TODO: not sure what to do about row errors
							break;
						case 'cell':
							if(ARRAYS.contains(newVal.value, error.columnId, false)){
								state.errors.splice(i, 1);
								i--;
							}
							break;
						}
					}
				}
				
				break;
			case 'deleteColumn':
				// Remove specific columnns from table
				LOG.create("ServerUserDataMerge: caught deleteColumn event. This function is not yet supported.");
				break;
			case 'add':
				
				var rowPk = TABLES.getNewPk();
				var source_table = sourceB.valueNow();
				var source_col_meta = source_table.columnMetaData;
				var source_pk_column = source_table.tableMetaData.primaryKey;
				
				// Create new row in changeset
				state.changeset[rowPk] = {};
				state.changeset[rowPk][source_pk_column] = jQuery.extend({}, TABLES.changeDefinition, {value: rowPk});
				
				// Fill columns of new row with default column values;
				for(var columnIndex in source_col_meta){
					
					if(columnIndex != source_pk_column){
						state.changeset[rowPk][columnIndex] = jQuery.extend({}, TABLES.changeDefinition, {value: source_col_meta[columnIndex].defaultValue});
					}
				}
				
				break;
			case 'delete':
				
				var source_table = sourceB.valueNow();
				var source_pk_column = source_table.tableMetaData.primaryKey;
				
				// Mark rows as deleted, if added row remove from changeset
				for(var index in newVal.value){
					var rowPk = newVal.value[index];
					if((rowPk + '').startsWith(TABLES.tempPkPrefix)){
						OBJECT.remove(state.changeset, rowPk);
					}else{
						if(state.changeset[rowPk] == undefined){
							state.changeset[rowPk] = {};
						}
		
						state.changeset[rowPk][source_pk_column] = {deleted:true};
					}
				}
				
				// Clear any errors on supplied rows
				// Also remove any table error
				if(newVal.value.length){
					for(var i=0; i<state.errors.length; i++){
						var error = state.errors[i];
						
						switch(error.type){
						case 'table':
							state.errors.splice(i, 1);
							i--;
							break;
						case 'row':
						case 'cell':
							if(ARRAYS.contains(newVal.value, error.rowPk, false)){
								state.errors.splice(i, 1);
								i--;
							}
							break;
						}
					}
				}
				
				break;
			};
			return state;
		});
		
		var changedTableB = changeSetE.mapE(function(state){
			var source_table = sourceB.valueNow();
			if(!good(source_table)){
				return SIGNALS.NOT_READY;
			}
			
			// Clone source so we don't mess things up
			var output = OBJECT.clone(source_table);	
			var pk_column = output.tableMetaData.primaryKey;
			
			// Apply changeset to output
			// -------------------------
			
			//Remove meta data for items removed from changeset
			for(var rowPk in output.rowMetaData){
				if(output.rowMetaData[rowPk].userChange!=undefined && output.rowMetaData[rowPk].userChange && state.changeset[rowPk]==undefined){
					OBJECT.remove(output.rowMetaData[rowPk], "userChange");
					var rowIndex = TABLES.UTIL.findRowIndex(output, rowPk);
					for(var columnIndex in output.cellMetaData[rowIndex]){
						if(output.cellMetaData[rowIndex][columnIndex].userChange){
							OBJECT.remove(output.cellMetaData[rowIndex][columnIndex], "userChange");
						}
					}
				}
			}
			
			// Look for client server pair, and construct pair with server value.
			for(var rowIndex in output.data){
				for(var columnIndex in output.data[rowIndex]){
					
					if(columnIndex == output.tableMetaData.primaryKey){
						continue;
					}
					
					var metaDataSet = TABLES.UTIL.getMetaDataSet(output, rowIndex, columnIndex);
					
					var csPair = TABLES.UTIL.chooseMetaData(TABLES.metaTagProcessor, metaDataSet);//clientServerPair
					var value = output.data[rowIndex][columnIndex];
					if(csPair == TABLES.metaTagProcessorType.clientServerPair){
						if(value.client === undefined && value.server === undefined){
							output.data[rowIndex][columnIndex] = {client: undefined, server: value};
						}else{
							LOG.create('Client Server Pair passed in server data.');
						}
					}
				}
			}
			
			for(var rowPk in state.changeset){
				
				// Get output row for changeset row
				var output_row = TABLES.UTIL.findRow(output, rowPk);
				
				// Check row exists
				var addRow = false;
				if(!output_row){
					// Is row an add or has it been deleted from source?
					if((rowPk + '').indexOf(TABLES.tempPkPrefix) == -1){
						// Row doesn't exists in source, and is not an add - ignore changes
						continue;
					}else{
						addRow = true;
					}
				}
				
				// Update row meta data
				// --------------------
				if(output.rowMetaData[rowPk] == undefined){
					output.rowMetaData[rowPk] = jQuery.extend({}, TABLES.rowMetaDataDefinition);
				}
				
				output.rowMetaData[rowPk].userChange = true;
				
				// If row is deleted, update row meta data
				if(state.changeset[rowPk][pk_column] && state.changeset[rowPk][pk_column].deleted){
					output.rowMetaData[rowPk].deleted = true;
				}else{
				
					// Apply data from changeset to output
					// -----------------------------------
					var row_index = TABLES.UTIL.findRowIndex(output, rowPk);
					
					if(row_index === false){
						// Row doesn't exist
						if(addRow === false){
							LOG.create("Error, merge changset doesn't have a row and is not an add. Shouldn't get into this state");
							continue;
						}else{
							// Create row data for added row
							row_index = TABLES.UTIL.addRow(output, rowPk);
							
							// Check row was added
							if(row_index === false){
								continue;
							}
							
							// Get created row
							output_row = output.data[row_index];
							output.rowMetaData[rowPk].newRow = true;
						}
					}
					
					if(output.cellMetaData[row_index] == undefined){
						output.cellMetaData[row_index] = {};
					}
					
					for(var columnIndex in state.changeset[rowPk]){
						if(columnIndex == output.tableMetaData.primaryKey){
							continue;
						}
						
						var metaDataSet = TABLES.UTIL.getMetaDataSet(output, row_index, columnIndex);
						output.columnMetaData[columnIndex].userChange = true;
						var csPair = TABLES.UTIL.chooseMetaData(TABLES.metaTagProcessor, metaDataSet);//clientServerPair
						
						if(csPair == TABLES.metaTagProcessorType.clientServerPair){
							output_row[columnIndex].client = state.changeset[rowPk][columnIndex].value;	
						}
						else{
							// Update cell data from changeset
							output_row[columnIndex] = state.changeset[rowPk][columnIndex].value;
						}
						// Update cell meta data
						if(output.cellMetaData[row_index][columnIndex] == undefined){
							output.cellMetaData[row_index][columnIndex] = jQuery.extend({}, TABLES.cellMetaDataDefinition);
						}
						output.cellMetaData[row_index][columnIndex].userChange = true;
						
						if(addRow){
							output.cellMetaData[row_index][columnIndex].newCell = true;
						}
					}
				}
			}
			
			// Apply cached server errors
			// --------------------------
			// If table data has any server errors, remove the server errors.
			// Reasons for this are:
			// 1) Errors may not be for this node, i.e. they are a response to another widget's apply operation. 
			// 2) Errors may differ from the cache due to user interaction modifying the cache.
			if(output.tableMetaData.serverErrors !== undefined){
				delete output.tableMetaData['serverErrors'];
			}
			
			for(var row_pk in output.rowMetaData){
				if(output.rowMetaData[row_pk].serverErrors !== undefined){
					delete output.rowMetaData[row_pk]['serverErrors'];
				}
			}
			
			for(var row_index in output.cellMetaData){
				for(var column_id in output.cellMetaData[row_index]){
					if(output.cellMetaData[row_index][column_id].serverErrors !== undefined){
						delete output.cellMetaData[row_index][column_id]['serverErrors'];
					}
				}
			}
			
			// Inject cached server errors into table data
			TABLES.UTIL.injectServerErrors(output, state.errors);
			
			return output;
		}).startsWith(SIGNALS.NOT_READY);
		
		return {changedTableB: changedTableB, applyEventE: applyEventE};
	};
	
	/**
	 * Behaviour that runs table, row and cell validators, as well as table logic.
	 * This would typically be used after a changeSetMerge.
	 * @param tableB - (Behaviour) table data 
	 * @returns Behaviour containing table data modified by the validators and table logic.
	 */
	tables.tableWidget.validateDataB = function(tableDataB){
		
		return tableDataB.liftB(function(sourceTable){
			if(!good()){
				return SIGNALS.NOT_READY;
			}
			
			// Table
			// -----
			if(sourceTable.tableMetaData.tableLogic !== undefined){
				console.log(sourceTable);
				sourceTable.tableMetaData.tableLogic(sourceTable);
			}
			
			if(sourceTable.tableMetaData.tableValidator !== undefined){
				var validatorResult = sourceTable.tableMetaData.tableValidator(sourceTable);
				if(validatorResult !== true){
					sourceTable.tableMetaData.localError = validatorResult;
				}
			}
			
			// Row and Cell
			// ------------
			for(var rowIndex in sourceTable.data){
				var row = sourceTable.data[rowIndex];
				var rowPk = row[sourceTable.tableMetaData.primaryKey];
				var rowMetaData = sourceTable.rowMetaData[rowPk];
				
				// Only run validation and logic on visible rows
				if(rowMetaData === undefined || rowMetaData.visible !== false){
					
					// Biz logic
					if(sourceTable.tableMetaData.rowLogic !== undefined){
						var dataLength = sourceTable.data.length;
						sourceTable.tableMetaData.rowLogic(rowIndex, rowPk, row, sourceTable);
						
						if(dataLength !== sourceTable.data.length){
							LOG.create('Error, rowLogic should not add or remove rows. It should only process the existing data for the passed rowIndex');
						}
					}
					
					// Only validate rows that have user changes
					if(rowMetaData !== undefined && rowMetaData.userChange === true){
						
						// Row validation
						if(sourceTable.tableMetaData.rowValidator !== undefined){
							var validatorResult = sourceTable.tableMetaData.rowValidator(sourceTable.data[rowIndex], sourceTable.rowMetaData[rowPk], sourceTable.cellMetaData[rowIndex]);
							if(validatorResult !== true){
								rowMetaData.localError = validatorResult;
							}
						}
					}
					
					// Cell validation
					for(var columnIndex in sourceTable.data[rowIndex]){
						
						var metaData = TABLES.UTIL.getMetaDataSet(sourceTable, rowIndex, columnIndex);
						var validator = TABLES.UTIL.chooseMetaData('cellValidator', metaData);						
						if(validator !== undefined){
							var validatorResult = validator(sourceTable.data[rowIndex][columnIndex], metaData);
							if(validatorResult !== true){
								TABLES.UTIL.getCellMetaData(sourceTable, rowIndex, columnIndex, true).localError = validatorResult;
							}
						}
					}
				}
			}
			
			return sourceTable;
		});
	};
		
	/**
	 * Renders the table. 
	 * Creates and updates, columns, rows, cells and renderers as needed.
	 * @param instanceId - id of table widget
	 * @param tableB - (Behaviour) table data 
	 * @returns Object containing:
	 * renderedB - (Behaviour) containing {total_error_count, rowStatePks} rowStatePks is an array of primary keys for each row displayed in the DOM.
	 * anyValueChangedE - (Event) containing cellState of the changed cell.
	 * anyFocusEventE - (Event) containing cellState of the changed cell.
	 */ 
	tables.tableWidget.renderTable = function(instanceId, tableB){
		
		var domTable = DOM.get(instanceId+"_table");
		
		// Selection Handling
		// ==================
		var selectedE = F.receiverE();
		
		// Listen for a table focus
		jQuery(domTable).click(function(event){		
			
			// Find closest cell
			var jtd = jQuery(event.target).closest('td, th');
			if(jQuery(domTable).has(jtd)){
				selectedE.sendEvent({target: jtd, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey});
			}	
		});
	   
		// Listen for a document mouse up (table defocus)
		jQuery(document).on('mouseup.' + instanceId, function (event){
			var jtable = jQuery(domTable);
			if (!jtable.is(event.target) && jtable.has(event.target).length === 0){
				selectedE.sendEvent({target: undefined, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey});
		    }
		});
		
		// Selection State
		// ===============
		// Note: This is outside the FRP tree for a reason: 
		// tableStateB relies on this as an input, but also needs to modify it without it causing a loop.
		var selections = []; 
		
		var get_sorted_dom_table_rows = function(){
			
			var sorted = [];
			for(var index in selections){
				var jrow = jQuery('#' + selections[index]);
				var row_index = jrow.prevAll().length;
				sorted.push({index: row_index, jrow: jrow});
			}
			
			sorted.sort(function(a, b){
				return a.index - b.index;
			});
			
			return sorted;
		};
		
		var add_selection = function(id){
			if(selections.indexOf(id) === -1){
				selections.push(id);
			}
		};
		
		var selectedB = selectedE.mapE(function(event){
			if(event.target === undefined){
				// Deselect all
				// ------------
				selections = []; 
			}else{
				var table = tableB.valueNow();
				if(!table.tableMetaData.canSelect){
					
					// Selection not supported
					// -----------------------
					if(selections.length){
						selections = []; 
					}
					
				}else if(table.tableMetaData.horizontalOrientation){
					
					// Select rows
					// -----------
					var jrow = event.target.closest('tr');
					var id = jrow.attr('id');
					if(id && event.shiftKey && selections.length > 0){
						
						// Range selection
						var jrow_index = jrow.prevAll().length;
						var jrows_data = get_sorted_dom_table_rows();
						var min = jrows_data[0];
						var max = jrows_data[jrows_data.length - 1];
						
						if(jrow_index < min.index){
							jrow.nextUntil(min.jrow).each(function(index, element){
								add_selection(jQuery(element).attr('id'));
							});
						}else if(jrow_index > max.index){
							jrow.prevUntil(max.jrow).each(function(index, element){
								add_selection(jQuery(element).attr('id'));
							});
						}
						
						add_selection(id);
						
					}else if(id && event.ctrlKey){
						
						// Toggle selection
						var index = selections.indexOf(id);
						if(index === -1){
							selections.push(id);
						}else{
							selections.splice(index, 1);
						}
						
					}else if(id){
						// single select
						selections = [id];
					}		
					
				}else{
					
					// Select columns
					// --------------
					
					
				}
			}
			return selections;
		}).filterRepeatsE().startsWith([]);
		
		// Table State
		// ===========
				
		// Create, update or delete state for table, each column, row and cell
		// Each state is marked as dirty if updated.
		var tableStateB = F.liftB(function(sourceTable, selected, state){
			if(!good()){
				return SIGNALS.NOT_READY;
			}
			
			// Overall state
			// -------------
			state.isErrorsDirty = false;
			state.rowSelectionsByRowPk = [];
			
			// Table state
			// -----------
			
			// Reset state
			state.tableState.isStateDirty = false;
			
			// Set horizontalOrientation
			if(state.tableState.horizontalOrientation === undefined){
				state.tableState.horizontalOrientation = sourceTable.tableMetaData.horizontalOrientation;
			}else if(state.tableState.horizontalOrientation !== sourceTable.tableMetaData.horizontalOrientation){
				LOG.create("Table widget doesn't support dynamic horizontalOrientation");
			}
			
			// Set heading style
			if(state.tableState.headingStyle === undefined){
				state.tableState.headingStyle = sourceTable.tableMetaData.headingStyle;
			}else if(state.tableState.headingStyle !== sourceTable.tableMetaData.headingStyle){
				LOG.create("Table widget doesn't support dynamic headingStyle");
			}
			
			// Set zebra style
			if(state.tableState.zebraStyle === undefined){
				state.tableState.zebraStyle = sourceTable.tableMetaData.zebraStyle || TABLES.metaTagZebraStyle.None;
			}else if(sourceTable.tableMetaData.zebraStyle !== undefined && state.tableState.zebraStyle !== sourceTable.tableMetaData.zebraStyle){
				LOG.create("Table widget doesn't support dynamic zebraStyle");
			}
			
			// Check table errors
			var error = sourceTable.tableMetaData.serverErrors !== undefined ? 
					DATA.UTIL.extractServerErrorMessage(sourceTable.tableMetaData.serverErrors) : sourceTable.tableMetaData.localError;
			if(state.tableState.error !== error){
				state.tableState.error = error;
				state.tableState.isStateDirty = true;
				state.isErrorsDirty = true;
			}
			
			// Check table readonly
			if(state.tableState.readonly !== sourceTable.tableMetaData.readonly){
				state.tableState.readonly = sourceTable.tableMetaData.readonly;
				state.tableState.isStateDirty = true;
			}
			if(state.tableState.showSendError !== sourceTable.tableMetaData.showSendError){
				state.tableState.showSendError = sourceTable.tableMetaData.showSendError;
				state.tableState.isStateDirty = true;
			}

			// Check empty message
			var emptyMessage = sourceTable.data.length === 0 ? sourceTable.tableMetaData.emptyMessage : undefined; 
			if(state.tableState.emptyMessage !== emptyMessage){
				state.tableState.emptyMessage = emptyMessage;
				state.tableState.isStateDirty = true;
			}
			
			// Column states
			// -------------
			// 1st loop through existing column states, and remove those that are no longer needed 
			var removedColumnIds = new Array();
			for(var columnId in state.columnState){
				var columnMetaData = sourceTable.columnMetaData[columnId];
				var columnState = state.columnState[columnId];
				
				if(columnMetaData === undefined || columnMetaData.visible === false){
					// Shouldn't be a column, but there is - remove it and clean up
					
					// Remove dom element
					jQuery(columnState.domCell).remove();
					columnState.domCell = undefined;
					
					// Remove column state
					OBJECT.remove(state.columnState, columnId);
					
					// Record so we can remove cell
					removedColumnIds.push(columnId);
				}
			}
			
			// 2nd create or update column states
			var c = -1;
			for(var columnIndex in sourceTable.columnMetaData){
				
				var columnMetaData = sourceTable.columnMetaData[columnIndex];
				var columnState = state.columnState[columnIndex];
				
				if(columnMetaData.visible !== false){
					// There should be a column
					c++;
					
					if(columnState === undefined){
						// No column state, create state and dom element
						columnState = {};
						state.columnState[columnIndex] = columnState;
						columnState.domId = domTable.id+"_header_" + String(columnIndex).makeDomIdSafe();
						columnState.domCell = DOM.create("th", columnState.domId);
						columnState.isDomDirty = true;
					}else{
						// Column state exists - reset flags
						columnState.isDomDirty = false;
						columnState.isDataDirty = false;
						columnState.isStyleDirty = false;
					}
					
					// Compare meta data against state
					if(columnState.name !== columnMetaData.name){
						columnState.name = columnMetaData.name;
						columnState.isDataDirty = true;
					}
					
					// Handle width
					if(columnState.width !== columnMetaData.width){
						columnState.width = columnMetaData.width;
						columnState.isStyleDirty = true;
					}
					
					// Calculate class for column header
					var classes = ["TableWidget_horizontalTableHeading"];
										
					if(columnMetaData.headingStyles !== undefined && columnMetaData.headingStyles.length){
						classes = classes.concat(columnMetaData.headingStyles);
					}
					
					if(columnMetaData.styles !== undefined && columnMetaData.styles.length){
						classes = classes.concat(columnMetaData.styles);
					}
					
					if((state.tableState.zebraStyle === TABLES.metaTagZebraStyle.Vertical ||
							state.tableState.zebraStyle === TABLES.metaTagZebraStyle.Both)
						&& (c % 2 === 0)){
						classes.push('odd');
					}
					
					if(!OBJECT.equals(columnState.classes, classes)){
						columnState.classes = classes;
						columnState.isStyleDirty = true;
					}
				}
			}
			
			// Row states
			// ----------
			
			// 1st loop through existing row states, and remove those that are no longer needed 
			for(var rowPk in state.rowState){
				var rowState = state.rowState[rowPk];
				var removeRowState = false;
				
				// Is row still in table data?
				var rowIndex = TABLES.UTIL.findRowIndex(sourceTable, rowPk);
				if(rowIndex === false){
					// Row no longer found in data - remove row state
					removeRowState = true;
				}else{
					// Check if row is still visible
					var rowMetaData = sourceTable.rowMetaData[rowPk];
					if(rowMetaData !== undefined && rowMetaData.visible === false){
						// Row no longer visible - remove row state
						removeRowState = true;
					}
				}
				
				if(removeRowState){
					// Clean up row state objects
					
					// If selected remove from selections object.
					var selected_index = selections.indexOf(rowState.domId);
					if(selected_index > -1){
						selections.splice(selected_index, 1);
					}
					
					// Remove dom element
					jQuery(rowState.domRow).remove();
					rowState.domRow = undefined;
					
					// Remove row state
					OBJECT.remove(state.rowState, rowPk);
					
					// Find what row index the pk mapped to
					if(rowIndex === false){
						for(var rowIndexN in state.rowStatePks){
							if(state.rowStatePks[rowIndexN] == rowPk){
								rowIndex = rowIndexN;
								break;
							}
						}
					}
					
					// Remove rowPK from state.rowStatePks
					if(rowIndex !== false){
						OBJECT.remove(state.rowStatePks, rowIndex);
					}
				}
			}
			
			// 2nd clean up rowStatePks
			// TODO: shouldn't need this step - bug in above code
			var removePks = new Array();
			for(var rowIndex in state.rowStatePks){
				var rowPk = state.rowStatePks[rowIndex];
				if(TABLES.UTIL.findRowIndex(sourceTable, rowPk) === false){
					// PK is no longer here so remove
					removePks.push(rowIndex);
				}
			}
			
			for(var i in removePks){
				var rowIndex = removePks[i];
				delete state.rowStatePks[rowIndex];
			}
			
			// 3nd create or update row states
			var r = -1;
			for(var rowIndex in sourceTable.data){
				var row = sourceTable.data[rowIndex];
				var rowPk = row[sourceTable.tableMetaData.primaryKey];
				var rowState = state.rowState[rowPk];
				var rowMetaData = sourceTable.rowMetaData[rowPk];
				
				if(rowMetaData === undefined || rowMetaData.visible !== false){
					// There should be a row
					r++;
					
					if(rowState === undefined){
						// No row state, create state and dom element
						rowState = {};
						state.rowState[rowPk] = rowState;
						rowState.domId = instanceId + "_" + String(rowPk).makeDomIdSafe();
						rowState.domRow = DOM.create("tr", rowState.domId);
						rowState.errorCount = 0;
						rowState.isDomDirty = true;
						
						// Add cell for change indicator
						rowState.domRow.appendChild(DOM.create("td", instanceId + "_" + String(rowPk + "_changeIndicator").makeDomIdSafe(), "changeIndicator"));
						
						// If vertical headings add cell for heading (tableState.headingStyle is not dynamic)
						if(state.tableState.headingStyle === TABLES.metaTagHeadingStyle.Vertical){
							rowState.domRowHeading = DOM.create("th", undefined);
							rowState.domRow.appendChild(rowState.domRowHeading);
						}
						
					}else{
						// Row state exists - reset flags
						rowState.isDomDirty = false;
						rowState.isDataDirty = false;
						rowState.isStateDirty = false;
						rowState.isStyleDirty = false;
						rowState.errorCount = 0;
					}
					
					// Check row is still in same position		
					if(state.rowStatePks[rowIndex] !== rowPk){
						state.rowStatePks[rowIndex] = rowPk;
						rowState.isDomDirty = true;
					}
					
					// Check row name
					if(sourceTable.tableMetaData.headingStyle === TABLES.metaTagHeadingStyle.Vertical && rowState.name !== rowMetaData.name){
						rowState.name = rowMetaData.name;
						rowState.isDataDirty = true;
					}
					
					// Check row userChange
					if(rowState.userChange !== (rowMetaData !== undefined ? rowMetaData.userChange : false)){
						rowState.userChange = (rowMetaData !== undefined ? rowMetaData.userChange : false);
						rowState.isDataDirty = true;
					}
					
					// Check row deleted
					if(rowState.deleted !== (rowMetaData !== undefined ? rowMetaData.deleted : false)){
						rowState.deleted = (rowMetaData !== undefined ? rowMetaData.deleted : false);
						rowState.isDataDirty = true;
					}
					
					// Check row error
					var error = undefined; 
					if(rowMetaData !== undefined){
						error = rowMetaData.serverErrors !== undefined ? DATA.UTIL.extractServerErrorMessage(rowMetaData.serverErrors) : rowMetaData.localError;
					}
					
					if(rowState.error !== error){
						rowState.error = error;
						rowState.isStateDirty = true;
						state.isErrorsDirty = true;
					}
					
					// Check row selection
					rowState.selected = selections.indexOf(rowState.domId) > -1;
					if(rowState.selected){
						state.rowSelectionsByRowPk.push(rowPk);
					}
					
					// Calculate classes for row
					var classes = new Array();
					
					if(rowState.error){
						classes.push('erroredRow');
					}
					
					if(rowMetaData !== undefined && rowMetaData.styles !== undefined && rowMetaData.styles.length){
						classes = classes.concat(rowMetaData.styles);
					}
					
					if((state.tableState.zebraStyle === TABLES.metaTagZebraStyle.Horizontal ||
							state.tableState.zebraStyle === TABLES.metaTagZebraStyle.Both)
							&& (r % 2 === 0)){
						classes.push('odd');
					}
					
					if(state.tableState.horizontalOrientation && rowState.selected){
						classes.push('TablesSelectedRow');
					}
					
					if(!OBJECT.equals(rowState.classes, classes)){
						rowState.classes = classes;
						rowState.isStyleDirty = true;
					}
					
					// Calculate classes for header
					if(state.tableState.headingStyle === TABLES.metaTagHeadingStyle.Vertical){
						var classes = ["TableWidget_verticalTableHeading"];
						if(rowMetaData !== undefined && rowMetaData.headingStyles !== undefined && rowMetaData.headingStyles.length){
							classes = classes.concat(rowMetaData.headingStyles);
						}
						
						if(!OBJECT.equals(rowState.headingClasses, classes)){
							rowState.headingClasses = classes;
							rowState.isStyleDirty = true;
						}
					}
					
					if(error !== undefined){
						rowState.errorCount++;
					}
				}
			}
			
			// Cell states
			// -----------
			// 1st loop through existing cell states, and collect those that are no longer needed 
			var cellStatesToRemove = new Array();
			for(var rowPk in state.cellState){
				
				var rowIndex = TABLES.UTIL.findRowIndex(sourceTable, rowPk);
				if(rowIndex === false){
					// Row no longer exists, remove cells
					
					for(var columnId in state.cellState[rowPk]){
						
						// Collect cells to clean up
						var cellState = state.cellState[rowPk][columnId];
						cellStatesToRemove.push(cellState);
						
						// Remove cell state reference
						OBJECT.remove(state.cellState[rowPk], columnId);
					}
					
					// Remove row object from cellState
					OBJECT.remove(state.cellState, rowPk);
					
				}else if(removedColumnIds.length > 0){
					// Row exists but there are columns to be removed
					
					for(var columnId in removedColumnIds){
						// Collect cells to clean up
						var cellState = state.cellState[rowPk][columnId];
						cellStatesToRemove.push(cellState);
								
						// Remove cell state reference
						OBJECT.remove(state.cellState[rowPk], columnId);
					}
				}
			}
			
			// 2nd clean up removed cell states.
			for(var i=0; i<cellStatesToRemove.length; i++){
				// Clean up cell state object
				var cellState = cellStatesToRemove[i];
				
				// Destroy renderer
				if(cellState.renderer.destroy !== undefined){
					cellState.renderer.destroy();
					cellState.renderer = undefined;
				}else{
					LOG.create("Error, renderer does not have a destroy method");
				}
				
				// Remove dom element
				jQuery(cellState.domCell).remove();
				cellState.domCell = undefined;
				
				// Remove events - TODO: check if we need to do something in flapjax
				cellState.updateEventE = undefined;
				cellState.focusEventE = undefined;
			}
			
			// 3rd create or update cell states
			var r = -1;
			for(var rowIndex in sourceTable.data){
				
				// If rowStatePk then we need to display row
				if(state.rowStatePks[rowIndex] !== undefined){
					
					r++;
					var row = sourceTable.data[rowIndex];
					var rowPk = row[sourceTable.tableMetaData.primaryKey];
					var rowState = state.rowState[rowPk];
					
					if(state.cellState[rowPk] === undefined){
						state.cellState[rowPk] = {};
					}
					
					// Quick check to see if any cell has an error
					var rowHasError = false;
					for(var columnId in state.columnState){
						if(sourceTable.cellMetaData[rowIndex] && sourceTable.cellMetaData[rowIndex][columnId]
						&& (sourceTable.cellMetaData[rowIndex][columnId].serverErrors || sourceTable.cellMetaData[rowIndex][columnId].localError)){
							rowHasError = true;
							break;
						}
					}
					
					if(rowHasError && state.tableState.headingStyle === TABLES.metaTagHeadingStyle.Vertical){
						if(rowState.headingClasses.indexOf('error') === -1){
							rowState.headingClasses.push('error');
							rowState.isStyleDirty = true;
						}
					}
					
					// Loop required columns
					var c = -1;
					for(var columnId in state.columnState){
						
						c++;
						var cellState = state.cellState[rowPk][columnId];
						var metaData = TABLES.UTIL.getMetaDataSet(sourceTable, rowIndex, columnId);
						
						if(cellState === undefined){
							// No cell state, create state and dom element
							cellState = {};
							state.cellState[rowPk][columnId] = cellState;
							
							cellState.domId = instanceId + "_" + String(rowPk + "_" + columnId).makeDomIdSafe();
							cellState.domCell = DOM.create("td", cellState.domId);
							cellState.isDomDirty = true;
							
							// Setup renderer
							cellState.renderer = TABLES.tableWidget.chooseRenderer(instanceId, metaData, rowPk, columnId);
							cellState.domCell.appendChild(cellState.renderer.build());
							cellState.renderer.load();
							
							// Setup events
							var metaB = F.constantB({rowPk: rowPk, columnIndex: columnId});
							var updateEventB = F.liftB(function(value, meta){
								return jQuery.extend({}, meta, {value: value});
							}, cellState.renderer.getValueE().startsWith(SIGNALS.NOT_READY), metaB);
							
							cellState.updateEventE = updateEventB.changes();
							
							var focusEventE = F.mergeE(cellState.renderer.getBlurE().mapE(function(){return false;}), cellState.renderer.getFocusE().mapE(function(){return true;}));
							var focusEventB = F.liftB(function(value, meta){
								return jQuery.extend({}, meta, {value: value});
							}, focusEventE.startsWith(false), metaB);
							
							cellState.focusEventE = focusEventB.changes();
							
						}else{
							// Cell state exists - reset flags
							cellState.isDomDirty = false;
							cellState.isDataDirty = false;
							cellState.isStateDirty = false;
							cellState.isStyleDirty = false;
						}
						
						var readonlyAdd = metaData.cellMetaData.newCell === true ? TABLES.UTIL.chooseMetaData('readonlyAdd', metaData) : undefined;
						var readonly = (readonlyAdd !== undefined) ? readonlyAdd : (TABLES.UTIL.chooseMetaData('readonly', metaData) || state.tableState.readonly || false);
						var visible = metaData.cellMetaData.visible;
						var disabled = TABLES.UTIL.chooseMetaData('disabled', metaData);
						var deleted = TABLES.UTIL.chooseMetaData('deleted', metaData);
						var error = metaData.cellMetaData.serverErrors !== undefined ? 
								DATA.UTIL.extractServerErrorMessage(metaData.cellMetaData.serverErrors) : metaData.cellMetaData.localError;
						var rendererOptions = jQuery.extend({}, metaData.columnMetaData.rendererOptions, metaData.rowMetaData.rendererOptions, metaData.cellMetaData.rendererOptions);
						
						// Compare meta data against state
						if(cellState.readonly !== readonly){
							cellState.readonly = readonly;
							cellState.isStateDirty = true;
						}
						
						if(cellState.visible !== visible){
							cellState.visible = visible;
							cellState.isStateDirty = true;
						}
						
						if(cellState.disabled !== disabled){
							cellState.disabled = disabled;
							cellState.isStateDirty = true;
						}
						
						if(cellState.deleted !== deleted){
							cellState.deleted = deleted;
							cellState.isStateDirty = true;
						}
						
						if(cellState.error !== error){
							cellState.error = error;
							cellState.isStateDirty = true;
							state.isErrorsDirty = true;
						}
						
						if(!OBJECT.equals(cellState.rendererOptions, rendererOptions)){
							cellState.rendererOptions = rendererOptions;
							cellState.isStateDirty = true;
						}
						
						var value = sourceTable.data[rowIndex][columnId];
						if(cellState.value !== value){
							cellState.value = value;
							cellState.isDataDirty = true;
						}
						
						// Calculate classes for cell	
						var classes = new Array();
						if(metaData.columnMetaData.styles !== undefined){
							classes = classes.concat(metaData.columnMetaData.styles);
						}
						
						if(metaData.rowMetaData.styles !== undefined){
							classes = classes.concat(metaData.rowMetaData.styles);
						}
						
						if(metaData.cellMetaData.styles !== undefined){
							classes = classes.concat(metaData.cellMetaData.styles);
						}
						
						if(state.tableState.zebraStyle === TABLES.metaTagZebraStyle.Vertical && (c % 2 === 0)){
							classes.push('odd');
						}else if(state.tableState.zebraStyle === TABLES.metaTagZebraStyle.Horizontal && (r % 2 === 0)){
							classes.push('odd');
						}else if(state.tableState.zebraStyle === TABLES.metaTagZebraStyle.Both){
							if(r % 2 === 0 && c % 2 === 0){
								classes.push('odd_both');
							}else if(r % 2 === 0 || c % 2 === 0){
								classes.push('odd');
							}
						}
						
						if(state.tableState.horizontalOrientation && rowState.selected){
							classes.push('TablesSelectedCell');
						}
						
						if(rowHasError || rowState.error){
							classes.push('error');
						}
						
						if(!OBJECT.equals(cellState.classes, classes)){
							cellState.classes = classes;
							cellState.isStyleDirty = true;
						}
						
						// Update error count in row state
						if(error !== undefined){
							rowState.errorCount++;
						}
					}
				}
			}
			
			return state;
		}, tableB, selectedB, F.constantB({cellState:{}, rowState:{}, columnState:{}, tableState:{}, rowStatePks:{}}));
		
		// Create change event handlers
		var rowStatePksB = tableStateB.liftB(function(state){
			if(!good()){
				return SIGNALS.NOT_READY;
			}
			
			return state.rowStatePks;
		});
		
		var rowStatePksChangedE = F.mergeE(F.oneE(rowStatePksB.valueNow()), rowStatePksB.changes()).filterRepeatsE();
		
		//This event catches changes from every renderer on the table
		var anyValueChangedE = rowStatePksChangedE.snapshotE(tableStateB).mapE(function(state){
			if(!good()){
				return F.zeroE();
			}
			
			var updateEvents = new Array();
			for(var rowPk in state.rowState){
				for(var columnId in state.columnState){
					var cellState = state.cellState[rowPk][columnId];
					updateEvents.push(cellState.updateEventE);
				}
			}
			
			return F.mergeE.apply(this, updateEvents);
		}).switchE().filterUndefinedE();
		
		
		
		// This event catches any focus change for every renderer on the table
		var anyFocusEventE = rowStatePksChangedE.snapshotE(tableStateB).mapE(function(state){
			if(!good()){
				return F.zeroE();
			}
			
			var focusEvents = new Array();
			for(var rowPk in state.rowState){
				for(var columnId in state.columnState){
					var cellState = state.cellState[rowPk][columnId];
					focusEvents.push(cellState.focusEventE);
				}
			}
			
			return F.mergeE.apply(this, focusEvents);
		}).switchE().filterUndefinedE();
		
		// Do selection for focus changes
		anyFocusEventE.filterE(function(focus){
			return focus.value === true;
		}).mapE(function(focus){
			var cell_id = "#" + instanceId + "_" + String(focus.rowPk + "_" + focus.columnIndex).makeDomIdSafe();
			var jtd = jQuery(cell_id);
			if(jQuery(domTable).has(jtd)){
				selectedE.sendEvent({target: jtd, shiftKey: false, ctrlKey: false});
			}
		});
		
		// Table Render
	    // ============
		var secondRenderB = tableStateB.liftB(function(state){
			if(!good()){
				return SIGNALS.NOT_READY;
			}
			
			// Count up all errors so we can update page toolbar
			var total_error_count = 0;
			
			// Update table
			// ------------
			if(state.tableState.isStateDirty){
				
				// Remove any existing table error if any
				if(!jQuery('#' + instanceId + '_table_error').is(':empty')){
					jQuery('#' + instanceId + '_table_error').find('.errored_tag').remove();
					jQuery('#' + instanceId + '_table_error').css('margin-top', 0);
				}
				
				// Display table error if any
				if(state.tableState.error !== undefined && state.tableState.showSendError !== false){
					DOM.createErroredTag(jQuery('#' + instanceId + '_table_error'), state.tableState.error);
					jQuery('#' + instanceId + '_table_error').css('margin-top', 50);
				}
				
				// Update empty message
				var jTable = jQuery(domTable);
				var jEmptyMessage = jQuery('#' + instanceId + '_empty_message');
				if(state.tableState.emptyMessage !== undefined && state.tableState.showSendError !== false){
					jEmptyMessage.show();
					jEmptyMessage.find('h3').html(state.tableState.emptyMessage);
					jTable.find('.changeIndicator').hide();
				}else{
					jEmptyMessage.hide();
					jTable.find('.changeIndicator').show();
				}
			}
			
			// Sum up errors
			if(state.tableState.error !== undefined){
				if (state.tableState.showSendError !== false) {
					total_error_count++;
				}
			}
			
			// Update columns
			// --------------
			var jheader = jQuery("#" + domTable.id + "_header");
			var columnOrderDirty = false;
			var columnStateLast = undefined;
			for(var columnIndex in state.columnState){
				var columnState = state.columnState[columnIndex];
				
				// Insert or reorder columns
				if(columnState.isDomDirty){
					columnOrderDirty = true;
					if(columnStateLast === undefined){
						jheader.find('.spacer_cell').last().after(columnState.domCell);
					}else{
						jQuery('#' + columnStateLast.domId).after(columnState.domCell);
					}
				}
				
				// Update column
				if(columnState.isDataDirty){
					jQuery(columnState.domCell).html(columnState.name);
				}
				
				if(columnState.isStyleDirty){
					
					// If headings are visible, then style them. Else style will be applied to first row of data
					if(columnState.width !== undefined && state.tableState.headingStyle === TABLES.metaTagHeadingStyle.Horizontal){
						jQuery(columnState.domCell).css('min-width', columnState.width);
					}
					
					// Update classes
					jQuery(columnState.domCell).removeClass().addClass(columnState.classes.join(' '));
				}
				
				columnStateLast = columnState;
			}
			
			// Update rows
			// -----------
			
			// Get row indices in order
			var rowIndices = Object.keys(state.rowStatePks);
			
			var rowOrderDirty = false;
			var rowStateLast = undefined;
			for(var i in rowIndices){
				
				var rowIndex = rowIndices[i];
				var rowPk = state.rowStatePks[rowIndex];
				var rowState = state.rowState[rowPk];
				
				// Insert or reorder row
				if(rowState.isDomDirty){
					rowOrderDirty = true;
					if(rowStateLast === undefined){
						jQuery("#" + instanceId + "_columnChangeIndicator").after(rowState.domRow);
					}else{
						jQuery('#' + rowStateLast.domId).after(rowState.domRow);
					}
				}
				
				// Update data
				if(rowState.isDataDirty){
					
					// Update change indicator
					var rowChanged = rowState.userChange === true;
					var rowDeleted = rowState.deleted === true;
					var j_change_indicator_td = jQuery('#' + rowState.domId).find('.changeIndicator');

					if(!rowDeleted && rowChanged && !j_change_indicator_td.hasClass('modified')){
						// Not deleted, changed, and no indicator - add indicator
						j_change_indicator_td.addClass('modified');
						j_change_indicator_td.append(jQuery('<div>', {'class':'TableWidget_modified_row'}));
					}else if((rowDeleted || !rowChanged) && j_change_indicator_td.hasClass('modified')){
						// Deleted or not changed, and indicator - remove indicator
						j_change_indicator_td.removeClass('modified');
						j_change_indicator_td.find('.TableWidget_modified_row').remove();
					}
					
					if(rowDeleted && !j_change_indicator_td.hasClass('deleted')){
						// Deleted and no indicator - add indicator
						j_change_indicator_td.addClass('deleted');
						j_change_indicator_td.append(jQuery('<div>', {'class':'TableWidget_deleted_row'}));
					}else if(!rowDeleted && j_change_indicator_td.hasClass('deleted')){
						// Not deleted and indicator - remove indicator
						j_change_indicator_td.removeClass('deleted');
						j_change_indicator_td.find('.TableWidget_deleted_row').remove();
					}
					
					// Update row header
					if(rowState.name !== undefined){
						jQuery('#' + rowState.domId).find('th').html(rowState.name);
					}
				}
				
				// Update state
				if(rowState.isStateDirty){
					
					var j_row = jQuery('#' + rowState.domId);
					var j_change_indicator_td = j_row.find('.changeIndicator');
					
					// Remove any existing row error if any
					j_change_indicator_td.find('.errored_tag').remove();
					
					// Add row error if any
					if(rowState.error !== undefined){
						DOM.createErroredTag(j_change_indicator_td, rowState.error);
					}
				}
				
				// Update classes
				if(rowState.isStyleDirty){
					jQuery(rowState.domRow).removeClass().addClass(rowState.classes.join(' '));
					
					if(state.tableState.headingStyle === TABLES.metaTagHeadingStyle.Vertical){
						jQuery(rowState.domRowHeading).removeClass().addClass(rowState.headingClasses.join(' '));
					}
				}
				
				rowStateLast = rowState;
			}
			
			
			// Update cells
			// ------------
			
			for(var i in rowIndices){
				var rowIndex = rowIndices[i];
				var rowPk = state.rowStatePks[rowIndex];
				var rowState = state.rowState[rowPk];
				
				// Loop through cells in column order
				var cellStateLast = undefined;
				for(var columnId in state.columnState){
					
					var cellState = state.cellState[rowPk][columnId];
					
					// Insert or reorder cell
					if(cellState.isDomDirty){
						if(cellStateLast === undefined){
							if(state.tableState.headingStyle === TABLES.metaTagHeadingStyle.Vertical){
								jQuery('#' + rowState.domId).find('th').after(cellState.domCell);
							}else{
								jQuery('#' + rowState.domId).find('.changeIndicator').after(cellState.domCell);
							}
						}else{
							jQuery('#' + cellStateLast.domId).after(cellState.domCell);
						}
					}
					
					// Update cell
					if(cellState.isStateDirty){
						
						// Remove existing error tag if any
						if(cellState.renderer.isErrored()){
							// Remove old error tag
							jQuery("#"+cellState.domId).find('.errored_tag').remove();
						}
						
						// If local or server error, display error
						if(cellState.error !== undefined && cellState.readonly !== true){
							DOM.createErroredTag(jQuery("#"+cellState.domId), cellState.error);
						}
						
						// Set renderer state
						var rendererState = {
								readonly: cellState.readonly, 
								disabled: cellState.disabled || cellState.deleted || false, 
								errored: cellState.error !== undefined, 
								options: cellState.rendererOptions || undefined
								};
						
						cellState.renderer.setState(rendererState);
					}
					
					// Update data, also set if state changed.
					if(cellState.isStateDirty || cellState.isDataDirty){
						cellState.renderer.setValue(cellState.value);
					}
					
					// Update classes
					if(cellState.isStyleDirty){
						jQuery(cellState.domCell).removeClass().addClass(cellState.classes.join(' '));
					}
					
					// If column headings are invisible style the first row. Else style will be applied to column header
					if(i == 0 && state.tableState.headingStyle !== TABLES.metaTagHeadingStyle.Horizontal){
						var columnState = state.columnState[columnId];
						if(columnState.isStyleDirty && columnState.width !== undefined){
							jQuery(cellState.domCell).css('min-width', columnState.width);
						}
					}
					
					cellStateLast = cellState;
				}
				
				// Sum up errors
				if (state.tableState.showSendError !== false) {
					total_error_count += rowState.errorCount;
				}
				
				var j_change_indicator_td = jQuery('#' + rowState.domId).find('.changeIndicator');
				j_change_indicator_td.toggleClass("error", rowState.errorCount > 0);
			}
			
			if(state.isErrorsDirty){
				DOM.tidyErroredTags();
			}
			
			return {total_error_count: total_error_count, rowStatePks: state.rowStatePks};
		});
		
		var rowSelectionsByRowPkB = tableStateB.liftB(function(state){
			if(!good()){
				return [];
			}
			return state.rowSelectionsByRowPk;
		});
		
		return {
			renderedB: secondRenderB, 
			rowSelectionsByRowPkB: rowSelectionsByRowPkB,
			anyValueChangedE: anyValueChangedE, 
			anyFocusEventE: anyFocusEventE
			};
	};
	
	// =======
	// Widgets
	// =======
	if(tables.WIDGETS === undefined){
		tables.WIDGETS = {};
	}
	
	/**
	 * Default table widget with apply, clear, add and remove buttons.
	 * Useful for displaying table data
	 */
	tables.WIDGETS.tableWidget = function(instanceId, data){
		var widgetDef = WIDGETS.get("PageToolbarWidget");
		var toolbarWidget = new widgetDef(instanceId);
		toolbarWidget.setDeleteDisabled(true);
		toolbarWidget.setUndoDisabled(true);
		toolbarWidget.setApplyDisabled(true);
		toolbarWidget.setFeedbackDefault();
		
		
		return {
			build:function(){
				return TABLES.tableWidget.createDOMTable(instanceId, toolbarWidget);
			},
			
			load: function(tableBI){
				toolbarWidget.setDeleteDisabled(true);
				toolbarWidget.setUndoDisabled(true);
				toolbarWidget.setApplyDisabled(true);
				toolbarWidget.setFeedbackDefault();
				toolbarWidget.setErrorCount(0);
				toolbarWidget.load();
				var domTable = DOM.get(instanceId+"_table");
				
				var tableGoodB = tableBI.filterNotGoodB();
				// First Render
				// ============
				var toolbar_setupB = tableBI.liftB(function(sourceTable){
					if(!good()){
						return chooseSignal();
					}
					console.log("sourceTable");
					console.log(sourceTable);
					// If no adding or deleting, remove options from toolbar
					toolbarWidget.toggleAddOption(sourceTable.tableMetaData.canAdd);
					toolbarWidget.toggleDeleteOption(sourceTable.tableMetaData.canDelete);
					// If table is readonly set hide toolbar options
					var readonly = sourceTable.tableMetaData.readonly || false;				
					toolbarWidget.toggleToolbarOptions(!readonly);
			    	return sourceTable;
				});
				var firstRenderB = TABLES.tableWidget.setupTableB(instanceId, toolbar_setupB);
				
				// Merged data
				// ===========
				var applyIdE = F.receiverE();
				var changeValueE = F.receiverE();
				var undoE = F.receiverE();
				var deleteE = F.receiverE();
 
				// Combine local changes with server data
				var changesetMerge = TABLES.tableWidget.changeSetMerge(
						firstRenderB, 
						changeValueE, 
						applyIdE, 
						undoE, 
						toolbarWidget.getAddClickE(), 
						deleteE, undefined, undefined, undefined,  function (table) {
							return table.tableMetaData === undefined || table.tableMetaData.showSendError !== false;
						});//,
						//F.zeroE()
						//undoColumnsE, 
						//deleteColumnsE);

				var mergedDataB = changesetMerge.changedTableB;
				var applyEventE = changesetMerge.applyEventE;
				
				// Server Response Handling
				// ========================
				
				// Show apply status in page toolbar
				applyEventE.mapE(function(applyState){
					if(applyState === AURORA.APPLY_STATES.APPLYING){
						// We are updating server and waiting for response
						toolbarWidget.setFeedbackUpdating();
						
					}else if(applyState === AURORA.APPLY_STATES.SUCCESS){
						// Server update was successful
						toolbarWidget.setFeedbackSuccess();
						
					}else if(applyState === AURORA.APPLY_STATES.ERROR){
						// Server update was not successful
						toolbarWidget.setFeedbackError();
					}
					
				});
				
				// Validation and Biz Logic
				// ========================
				var validatedDataB = TABLES.tableWidget.validateDataB(mergedDataB);
								
				// Table Render
				// ============
				var render_output = tables.tableWidget.renderTable(instanceId, validatedDataB);
				
				// Get output data from render
				var secondRenderB = render_output.renderedB;
				var anyValueChangedE = render_output.anyValueChangedE;
				var anyFocusEventE = render_output.anyFocusEventE;
				var rowSelectionsByRowPkB = render_output.rowSelectionsByRowPkB;
				
				// Pass events up to mergeset
				anyValueChangedE.mapE(function(value){
					changeValueE.sendEvent(value);
				});
				
				// Update page toolbar with count of errors in table
				secondRenderB.liftB(function(value){
					toolbarWidget.setErrorCount(value.total_error_count);
				});
				
				// Inform page we are loaded.
				secondRenderB.changes().filterE(function(value){ return good(); }).onceE().mapE(function(){
					UI.widgetLoaded();
					toolbarWidget.update();
				});
				// Apply
			    // =====				
				var changeSetB = validatedDataB.liftB(function(table){
					if(!good()){
						return SIGNALS.NOT_READY;
					}
					var rowChanges = {};
					var columnChanges = {};
					for(var index in table.rowMetaData){
						if(table.rowMetaData[index].userChange){
							rowChanges[index] = true;
						}
					}
					
					for(var rowIndex in table.cellMetaData){
						for(var columnIndex in table.cellMetaData[rowIndex]){
							if(table.cellMetaData[rowIndex][columnIndex].userChange){
								var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);
								rowChanges[rowPk] = true;
								columnChanges[columnIndex] = true;
							}
						}
					}
					return {rowChanges:rowChanges, columnChanges: columnChanges};
				});
				
				var rowChangeSetB = changeSetB.liftB(function(changeSet){
					if(!good()){
						return SIGNALS.NOT_READY;
					}
					return changeSet.rowChanges;
				});
				
				var columnChangeSetB = changeSetB.liftB(function(changeSet){
					if(!good()){
						return SIGNALS.NOT_READY;
					}
					return changeSet.columnChanges;
				});
				
				var cleanB = rowChangeSetB.liftB(function(changeSet){
					if(!good()){
						return SIGNALS.NOT_READY;
					}
					return Object.keys(changeSet).length==0;
				});
				
				
				// Update apply button and UI.userChanges based on if there are any user changes at all.
				cleanB.liftB(function(clean){
					if(!good()){
						return SIGNALS.NOT_READY;
					}
					UI.userChanges(instanceId, !clean);
					toolbarWidget.setApplyDisabled(clean);
					
					return clean;
				});
				
				toolbarWidget.getApplyClickE().snapshotE(validatedDataB).mapE(function(sourceTable){
					var newTable = OBJECT.clone(sourceTable);
										
					// Create unique id used to check set response
					var apply_id = new Date().getTime();
					applyIdE.sendEvent({id: apply_id});
					newTable.tableMetaData.applyId = apply_id;
					
					// Set changes
					tableBI.set(newTable);
				});
				var toolbar_state_selected_rowsB = F.liftB(function(selectedRows){
					if(!good(selectedRows)){
						return SIGNALS.NOT_READY;
					}		
					var changeSet = rowChangeSetB.valueNow();
					jQuery(".TablesSelectedRow").each(function(index, value){
						var id = value.id.replace(instanceId+"_", "");
						if(!ARRAYS.contains(selectedRows, id, false)){
							jQuery("#"+instanceId+"_"+id).removeClass("TablesSelectedRow");
							jQuery("#"+instanceId+"_"+id).find('td, th').removeClass("TablesSelectedCell");
						}
					});
			    	var changeMatch = false;
			    	
			    	for(var index in selectedRows){
			    		var selectedRow = selectedRows[index];
			    		if(!jQuery("#"+instanceId+"_"+selectedRow).hasClass("TablesSelectedRow")){
			    			jQuery("#"+instanceId+"_"+selectedRow).addClass("TablesSelectedRow");
			    			
			    			// Add selection also to <td> because of IE 10 redraw bug.
			    			jQuery("#"+instanceId+"_"+selectedRow).find('td, th').toggleClass("TablesSelectedCell", true);
			    		}
			    		if(good(changeSet) && changeSet[selectedRow]!=undefined){
			    			changeMatch = true;
			    		}
			    	}
		    		return {delete_disabled: (selectedRows.length==0), undo_disabled: (!changeMatch)};
			    }, rowSelectionsByRowPkB);
				
			    
				// Undo and Delete
				// ===============
				
			    // Update delete and undo on the page toolbar
				toolbar_state_selected_rowsB.liftB(function(value){
			    	if(!good()){
			    		return SIGNALS.NOT_READY;
			    	}
			    	toolbarWidget.setDeleteDisabled(value.delete_disabled); 
		    		toolbarWidget.setUndoDisabled(value.undo_disabled);
			    });
				var undoSetE = toolbarWidget.getUndoClickE().snapshotE(tableGoodB).filterE(function(table){return good(table) && table.tableMetaData.horizontalOrientation;});
				undoSetE.snapshotE(rowSelectionsByRowPkB).mapE(function(value){
					undoE.sendEvent(value);
				});

				var deleteSetE = toolbarWidget.getDeleteClickE().snapshotE(tableGoodB).filterE(function(table){return good(table) && table.tableMetaData.horizontalOrientation;});
				deleteSetE.snapshotE(rowSelectionsByRowPkB).mapE(function(value){
					deleteE.sendEvent(value);
				});
			},
			
			destroy: function(){
				
			}
		};
	};
	

	/**
	 * Table widget that does not contain a page toolbar.
	 * Instead all changes are applied (sent back up the tableBI) on user change.
	 * Only table logic is run on server data. No validators.
	 */
	tables.WIDGETS.applyOnChangeTableWidget = function(instanceId, data){

		return {
			build:function(){
				return TABLES.tableWidget.createDOMTable(instanceId);
			},
			
			load: function(tableBI){
				
				// First Render
				// ============
				var firstRenderB = TABLES.tableWidget.setupTableB(instanceId, tableBI);
				

				// Biz Logic (no validation on user change performed).
				// =========
				var validatedDataB = TABLES.tableWidget.validateDataB(firstRenderB);
				
				// Table Render
				// ============
				var second_render = tables.tableWidget.renderTable(instanceId, validatedDataB);
				
				// Get output data from render
				var secondRenderB = second_render.renderedB;
				var anyValueChangedE = second_render.anyValueChangedE;
				var anyFocusEventE = second_render.anyFocusEventE;
				
				// Inform page we are loaded.
				secondRenderB.changes().filterE(function(value){ return good(); }).onceE().mapE(function(){
					UI.widgetLoaded();
				});
				
				// Apply
				// =====
				anyValueChangedE.mapE(function(change){
					var new_table = OBJECT.clone(validatedDataB.valueNow());
					if(!good(new_table)){
						return;
					}
					
					// Find row
					var row_index = TABLES.UTIL.findRowIndex(new_table, change.rowPk);
					if(!row_index){
						return;
					}
					
					// Set data and update meta data
					new_table.data[row_index][change.columnIndex] = change.value;
					
					var cell_meta = TABLES.UTIL.getCellMetaData(new_table, row_index, change.columnIndex, true);
					cell_meta.userChange = true;
					
					var row_meta = TABLES.UTIL.getRowMetaData(new_table, change.rowPk, true);
					row_meta.userChange = true;
					
					new_table.columnMetaData[change.columnIndex].userChange = true;
					
					// Create unique id used to check set response
					var apply_id = new Date().getTime();
					new_table.tableMetaData.applyId = apply_id;
					
					// Send changes
					tableBI.set(new_table);					
				});
			},
			
			destroy: function(){
			}
		};
	};
	
	
	return tables;
})(TABLES || {}, WIDGETS);