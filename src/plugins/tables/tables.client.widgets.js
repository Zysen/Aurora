var TABLES = (function(tablesClass, widgets){
	
	if(tablesClass.WIDGETS === undefined){
		tablesClass.WIDGETS = {};
	}
	
	
	tablesClass.WIDGETS.basicTableWidget = function(objectName, tableMetaData, columnMetaData, rowMetaData, cellMetaData){
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
					}, DATA.requestB(instanceId, objectName));
					
					tableWidget.load(modifiedDataTableBI);
				},
				destroy:function(){
					DATA.release(instanceId, objectName);
					tableWidget.destroy();
				}
			};
		});
	};
	
	widgets.register("BasicTable", tablesClass.WIDGETS.basicTableWidget());
	
	
	tablesClass.WIDGETS.basicReadTableWidget = function(objectName){
	   return new tablesClass.WIDGETS.basicTableWidget(objectName, {readonly: true});
	};
	
	
	
	tablesClass.WIDGETS.tableWidget = function(instanceId, data){
		var toolbarWidget = new tablesClass.WIDGETS.toolbarWidget(instanceId+"_TB", data);
		toolbarWidget.setDeleteDisabled(true);
		toolbarWidget.setUndoDisabled(true);
		toolbarWidget.setApplyDisabled(true);
		toolbarWidget.setFeedbackDefault();
		var valueChangedCooldown = 3000;
		var chooseRenderer = function(metaData, rowPk, columnId){
			var renderer_id = instanceId + '_' + rowPk + '_' + columnId + '_renderer';
				
			var renderer = TABLES.UTIL.chooseMetaData('renderer', metaData);
			if(renderer!==undefined){
				LOG.create("Renderer");
				
				if(typeof(renderer)=="string"){
					renderer = WIDGETS.renderers[renderer];
				}
				
				console.log(renderer);
				return new renderer(renderer_id);
			}
			var dataType = TABLES.UTIL.chooseMetaData('dataType', metaData);
			if(dataType===undefined || WIDGETS.renderers[dataType]===undefined){
				dataType="string";
			}
			return new WIDGETS.renderers[dataType](renderer_id);
		};

		return {
			build:function(){
				var container = document.createElement('div');
				container.id = instanceId;
				
				var jdiv_table_error = jQuery('<div>', {id: instanceId + '_table_error', 'class':'page_toolbar_content'});
				container.appendChild(jdiv_table_error.get(0));
				
				var table = document.createElement('table');
				table.id = instanceId+"_table";
				table.className = "config TableWidget";
				
				container.appendChild(toolbarWidget.build().get(0));
				container.appendChild(table);
				
				var jdiv_empty_message = jQuery('<div>', {id: instanceId + '_empty_message', 'class':'page_toolbar_content'});
				jdiv_empty_message.append(jQuery('<h3>', {'class':'info'}));
				jdiv_empty_message.hide();
				container.appendChild(jdiv_empty_message.get(0));
				
				return container;		
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
				
				// Type of table interaction
				var horizontalOrientationB = tableGoodB.liftB(function(table){
					if(!good()){
						return SIGNALS.NOT_READY;
					}
					
					return table.tableMetaData.horizontalOrientation;
				});
				
				// ============
				// First Render
				// ============
				var firstRenderB = tableBI.liftB(function(sourceTable){
					if(!good()){
						return chooseSignal();
					}
					
					// If no adding or deleting, remove options from toolbar
					toolbarWidget.toggleAddOption(sourceTable.tableMetaData.canAdd);
					toolbarWidget.toggleDeleteOption(sourceTable.tableMetaData.canDelete);
					
					// If table is readonly hide toolbar options
			    	toolbarWidget.toggleToolbarOptions(!sourceTable.tableMetaData.readonly);
			    	
			    	var jtable = jQuery(domTable);
					// Set data highlight selection on table
					if(sourceTable.tableMetaData.canSelect === false && jtable.hasClass("noSelection")){
						jtable.removeClass("noSelection");
					}else if(sourceTable.tableMetaData.canSelect === true && !jtable.hasClass("noSelection")){
						jtable.addClass("noSelection");
					}
					
					// Build the table header
					if(jQuery("#" + domTable.id+"_header").length === 0){
						
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
					}
					
					return sourceTable;
				});
				
				// ===========
				// Merged data
				// ===========
				var applyIdE = F.receiverE();
				var changeValueE = F.receiverE();
				var undoE = F.receiverE();
				var deleteE = F.receiverE();
				// Combine local changes with server data
				var changesetMerge = tablesClass.changeSetMerge(
						firstRenderB, 
						changeValueE, 
						applyIdE, 
						undoE, 
						toolbarWidget.getAddClickE(), 
						deleteE);//,
						//F.zeroE()
						//undoColumnsE, 
						//deleteColumnsE);

				var mergedDataB = changesetMerge.changedTableB;
				var applyEventE = changesetMerge.applyEventE;
				
				// ========================
				// Server Response Handling
				// ========================
				
				// Show apply status in page toolbar
				applyEventE.mapE(function(applyState){
					if(applyState === SIGNALS.APPLY_STATES.APPLYING){
						// We are updating server and waiting for response
						toolbarWidget.setFeedbackUpdating();
						
					}else if(applyState === SIGNALS.APPLY_STATES.SUCCESS){
						// Server update was successful
						toolbarWidget.setFeedbackSuccess();
						
					}else if(applyState === SIGNALS.APPLY_STATES.ERROR){
						// Server update was not successful
						toolbarWidget.setFeedbackError();
						
					}
				});
				
				// ========================
				// Validation and Biz Logic
				// ========================
				var validatedDataB = mergedDataB.liftB(function(sourceTable){
					if(!good()){
						return SIGNALS.NOT_READY;
					}

					// Table
					// -----
					if(sourceTable.tableMetaData.tableLogic !== undefined){
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
								var userChange = metaData.cellMetaData.userChange;
								
								if(validator !== undefined && userChange === true){
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
				
				
				// ===========
				// Table State
				// ===========
				
				// Create, update or delete state for table, each column, row and cell
				// Each state is marked as dirty if updated.
				var tableStateB = F.liftB(function(sourceTable, state){
					if(!good()){
						return SIGNALS.NOT_READY;
					}
					
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
					
					// Check table errors
					var error = sourceTable.tableMetaData.serverErrors !== undefined ? 
							TABLES.extractServerErrorMessage(sourceTable.tableMetaData.serverErrors) : sourceTable.tableMetaData.localError;
					if(state.tableState.error !== error){
						state.tableState.error = error;
						state.tableState.isStateDirty = true;
					}
					
					// Check table readonly
					if(state.tableState.readonly !== sourceTable.tableMetaData.readonly){
						state.tableState.readonly = sourceTable.tableMetaData.readonly;
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
							columnState.domCell.remove();
							columnState.domCell = undefined;
							
							// Remove column state
							OBJECT.delete(state.columnState, columnId);
							
							// Record so we can remove cell
							removedColumnIds.push(columnId);
						}
					}
					
					// 2nd create or update column states
					for(var columnIndex in sourceTable.columnMetaData){
						
						var columnMetaData = sourceTable.columnMetaData[columnIndex];
						var columnState = state.columnState[columnIndex];
						
						if(columnMetaData.visible !== false){
							// There should be a column
							
							if(columnState === undefined){
								// No column state, create state and dom element
								columnState = {};
								state.columnState[columnIndex] = columnState;
								
								var headingClass = "TableWidget_horizontalTableHeading" + (sourceTable.tableMetaData.headingsClassName ? ' ' + sourceTable.tableMetaData.headingsClassName : '');
								columnState.domId = domTable.id+"_header_" + String(columnIndex).makeDomIdSafe();
								columnState.domCell = DOM.create("th", columnState.domId, headingClass);
								columnState.isDomDirty = true;
							}else{
								// Column state exists - reset flags
								columnState.isDomDirty = false;
								columnState.isDataDirty = false;
							}
							
							// Compare meta data against state
							if(columnState.name !== columnMetaData.name){
								columnState.name = columnMetaData.name;
								columnState.isDataDirty = true;
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
							
							// Remove dom element
							rowState.domRow.remove();
							rowState.domRow = undefined;
							
							// Remove row state
							OBJECT.delete(state.rowState, rowPk);
							
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
								OBJECT.delete(state.rowStatePks, rowIndex);
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
					for(var rowIndex in sourceTable.data){
						var row = sourceTable.data[rowIndex];
						var rowPk = row[sourceTable.tableMetaData.primaryKey];
						var rowState = state.rowState[rowPk];
						var rowMetaData = sourceTable.rowMetaData[rowPk];
						
						if(rowMetaData === undefined || rowMetaData.visible !== false){
							// There should be a row
							
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
								
								// If vertical headings add cell for heading
								if(sourceTable.tableMetaData.headingStyle === TABLES.metaTagHeadingStyle.Vertical){
									var headingClass = "TableWidget_verticalTableHeading" + (sourceTable.tableMetaData.headingsClassName ? ' ' + sourceTable.tableMetaData.headingsClassName : '');
									rowState.domRow.appendChild(DOM.create("th", undefined, headingClass));
								}
								
							}else{
								// Row state exists - reset flags
								rowState.isDomDirty = false;
								rowState.isDataDirty = false;
								rowState.isStateDirty = false;
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
								error = rowMetaData.serverErrors !== undefined ? TABLES.extractServerErrorMessage(rowMetaData.serverErrors) : rowMetaData.localError;
							}
							
							if(rowState.error !== error){
								rowState.error = error;
								rowState.isStateDirty = true;
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
								OBJECT.delete(state.cellState[rowPk], columnId);
							}
							
							// Remove row object from cellState
							OBJECT.delete(state.cellState, rowPk);
							
						}else if(removedColumnIds.length > 0){
							// Row exists but there are columns to be removed
							
							for(var columnId in removedColumnIds){
								// Collect cells to clean up
								var cellState = state.cellState[rowPk][columnId];
								cellStatesToRemove.push(cellState);
								
								// Remove cell state reference
								OBJECT.delete(state.cellState[rowPk], columnId);
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
						cellState.domCell.remove();
						cellState.domCell = undefined;
						
						// Remove events - TODO: check if we need to do something in flapjax
						cellState.updateEventE = undefined;
						cellState.focusEventE = undefined;
					}
					
					// 3rd create or update cell states
					for(var rowIndex in sourceTable.data){
						
						// If rowStatePk then we need to display row
						if(state.rowStatePks[rowIndex] !== undefined){
							
							var row = sourceTable.data[rowIndex];
							var rowPk = row[sourceTable.tableMetaData.primaryKey];
							var rowState = state.rowState[rowPk];
							
							if(state.cellState[rowPk] === undefined){
								state.cellState[rowPk] = {};
							}
							
							// Loop required columns
							for(var columnId in state.columnState){
								
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
									cellState.renderer = chooseRenderer(metaData, rowPk, columnId);
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
								}
								
								var readonlyAdd = metaData.cellMetaData.newCell === true ? TABLES.UTIL.chooseMetaData('readonlyAdd', metaData) : undefined;
								var readonly = (readonlyAdd !== undefined) ? readonlyAdd : (TABLES.UTIL.chooseMetaData('readonly', metaData) || state.tableState.readonly || false);
								var visible = metaData.cellMetaData.visible;
								var disabled = TABLES.UTIL.chooseMetaData('disabled', metaData);
								var deleted = TABLES.UTIL.chooseMetaData('deleted', metaData);
								var error = metaData.cellMetaData.serverErrors !== undefined ? 
										TABLES.extractServerErrorMessage(metaData.cellMetaData.serverErrors) : metaData.cellMetaData.localError;
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
								}
								
								
								var json_options = JSON.stringify(rendererOptions);
								if(cellState.jsonRendererOptions !== json_options){
									cellState.jsonRendererOptions = json_options;
									cellState.rendererOptions = rendererOptions;
									cellState.isStateDirty = true;
								}
								
								var value = sourceTable.data[rowIndex][columnId];
								if(cellState.value !== value){
									cellState.value = value;
									cellState.isDataDirty = true;
								}
								
								// Update error count in row state
								if(error !== undefined){
									rowState.errorCount++;
								}
							}
						}
					}
					
					return state;
				}, validatedDataB, F.constantB({cellState:{}, rowState:{}, columnState:{}, tableState:{}, rowStatePks:{}}));
				
				// Create change event handlers
				// TODO: Support column only changes
				
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
				
				// Pass event up to mergeset
				anyValueChangedE.mapE(function(value){
					changeValueE.sendEvent(value);
				});
				
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
				
				// ============
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
						if(state.tableState.error !== undefined){
							TABLES.UTIL.createErroredTag(jQuery('#' + instanceId + '_table_error'), state.tableState.error);
							jQuery('#' + instanceId + '_table_error').css('margin-top', 50);
						}
						
						// Update readonly
						var jTable = jQuery(domTable);
						var jEmptyMessage = jQuery('#' + instanceId + '_empty_message');
						if(state.tableState.readonly === true){
							jTable.removeClass("page_toolbar_content");
				    		jEmptyMessage.removeClass("page_toolbar_content");
				    	}else{
				    		jTable.addClass("page_toolbar_content");
				    		jEmptyMessage.addClass("page_toolbar_content");
				    	}
						
						// Update empty message
						if(state.tableState.emptyMessage !== undefined){
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
						total_error_count++;
					}
					
					// Update columns
					// --------------
					var jheader = jQuery("#" + domTable.id + "_header");
					var columnStateLast = undefined;
					for(var columnIndex in state.columnState){
						var columnState = state.columnState[columnIndex];
						
						// Insert or reorder columns
						if(columnState.isDomDirty){
							if(columnStateLast === undefined){
								jheader.find('.spacer_cell').last().after(columnState.domCell);
							}else{
								jQuery('#' + columnStateLast.domId).after(columnState.domCell);
							}
						}
						
						// Update column
						if(columnState.isDataDirty){
							jQuery('#' + columnState.domId).html(columnState.name);
						}
						
						columnStateLast = columnState;
					}
					
					// Update rows
					// -----------
					
					// Get row indices in order
					var rowIndices = Object.keys(state.rowStatePks);
					
					var rowStateLast = undefined;
					for(var i in rowIndices){
						
						var rowIndex = rowIndices[i];
						var rowPk = state.rowStatePks[rowIndex];
						var rowState = state.rowState[rowPk];
						
						// Insert or reorder row
						if(rowState.isDomDirty){
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
							if(j_row.hasClass("erroredRow")){
								j_change_indicator_td.find('.errored_tag').remove();
								j_row.removeClass("erroredRow");
							}
							
							// Add row error if any
							if(rowState.error !== undefined){
								TABLES.UTIL.createErroredTag(j_change_indicator_td, rowState.error);
								
								// Style whole row as errored.
								j_row.addClass("erroredRow");
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
									TABLES.UTIL.createErroredTag(jQuery("#"+cellState.domId), cellState.error);
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
							
							cellStateLast = cellState;
						}
						
						// Sum up errors
						total_error_count += rowState.errorCount;
						
						var j_change_indicator_td = jQuery('#' + rowState.domId).find('.changeIndicator');
						var j_row = jQuery("#" + rowState.domId);
						
						if(rowState.errorCount > 0 && !j_change_indicator_td.hasClass("error")){
							// Add error class to row's tds if row or any cell has error
							j_row.find("td").addClass("error");							
							
						}else if(rowState.errorCount == 0 && j_change_indicator_td.hasClass("error")){
							// Remove error class from row's tds 
							j_row.find("td").removeClass("error");
						}
					}
					
					// Update page toolbar with count of errors in table
					toolbarWidget.setErrorCount(total_error_count);
					
					if(total_error_count > 0){
						TABLES.tidyErroredTags();
					}
					
					return true;
				});
				
				secondRenderB.changes().filterE(function(value){ return good(); }).onceE().mapE(function(){
					//UI.widgetLoaded();
					toolbarWidget.update();
				});
				
				// =====
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
					/*
					for(var index in table.columnMetaData){
													if(table.columnMetaData[index].userChange){
														return false;
													}
												}*/
					
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
					
					//UI.userChanges(instanceId, !clean);
					toolbarWidget.setApplyDisabled(clean);
					
					return clean;
				});
				
				toolbarWidget.getApplyClickE().snapshotE(validatedDataB).mapE(function(sourceTable){
					
					var newTable =OBJECT.clone(sourceTable);
					newTable.tableMetaData.applyId = new Date().getTime();
					applyIdE.sendEvent({id: newTable.tableMetaData.applyId});
					tableBI.sendEvent(newTable);
					/*
					var apply_id = new Date().getTime();
					applyIdE.sendEvent({id: apply_id});
					
					var changeSetUp = {deleted:[], changed:[], newRows: [], applyId: apply_id};
					
					for(var rowPk in sourceTable.rowMetaData){
						var rowIndex = TABLES.UTIL.findRowIndex(sourceTable, rowPk);
						if(rowPk.contains("temp")){
							changeSetUp.newRows.push(OBJECT.clone(sourceTable.data[rowIndex]));
						}
						else if(sourceTable.rowMetaData[rowPk].userChange==true){
							changeSetUp.changed.push(OBJECT.clone(sourceTable.data[rowIndex]));
						}
						if(sourceTable.rowMetaData[rowPk].deleted==true){
							changeSetUp.deleted.push(OBJECT.clone(sourceTable.data[rowIndex]));
						}
						
					}
					// Set changes
					tableBI.sendEvent(changeSetUp);
					*/
				});
				

				// ==================
				// Selection Handling
				// ==================
				
				var focusedCellE = anyFocusEventE.mapE(function(focusEvent){
			    	if(focusEvent.value === true){
			    		return focusEvent;
			    	}
			    	
			    	return {};
			    });
			    var focusedCellB = focusedCellE.startsWith({});
			    
			    //TODO: factor this into column selection
			    var focusedCellSelectionE = focusedCellE.mapE(function(value){
			    	
			    	var clickedIndex = -1;
			    	var rowStatePks = rowStatePksB.valueNow();
	            	
	            	// Find row index for clickedRowPK, use == because rowPk and clickedRowPK may be different types.
	            	for(var rowIndex in rowStatePks){
	            		if(String(rowStatePks[rowIndex]).makeDomIdSafe() == value.rowPk){
	            			clickedIndex = rowIndex;
	            		}
	            	}
	            	
	            	if(clickedIndex == -1){
	            		return undefined;
	            	}
			    	
			    	return {focused: true, 
	                	clickedIndex: clickedIndex, 
	                	clickedRowPK: value.rowPk, 
	                	columnIndex: value.columnIndex, 
	                	shiftKey: false, 
	                	ctrlKey: false, 
	                	target: undefined, 
	                	cellIndex: undefined};
			    }).filterUndefinedE();
			    
			    
				//Determine Selected Rows - from a click inside of the table
				var tableClickedE = F.clicksE(domTable).filterE(function(){
					var table = tableGoodB.valueNow();
					if(good(table)){
						return table.tableMetaData.canSelect!=false;
					}
					return false;
				}).mapE(function(ev){
					
					var table = tableGoodB.valueNow();
					if(!good(table)){
						return SIGNALS.NOT_READY;
					}
					
					var focusedCell = focusedCellB.valueNow();
					var rowStatePks = rowStatePksB.valueNow();
					
			        DOM.stopEventBubble(ev);
			        var target = (ev.target==undefined)?ev.srcElement:ev.target;
			        //jQuery(target).focus();
			        var cell = DOM.findParentNodeWithTag(target, "td");
			        var row = DOM.findParentNodeWithTag(cell, "tr");
			        var dom_table = DOM.findParentNodeWithTag(row, "table");
		            if(row!=undefined){
		            	var first = cell.id.replace(instanceId+"_", "");
		            	var idSplit = first.split('_');
		            	var clickedRowPK = idSplit[0];
		            	var columnIndex = first.replace(clickedRowPK+"_", "");
		            	var clickedIndex = -1;
		            	
		            	// Find row index for clickedRowPK, use == because rowPk and clickedRowPK may be different types.
		            	for(var rowIndex in rowStatePks){
		            		if(String(rowStatePks[rowIndex]).makeDomIdSafe() == clickedRowPK){
		            			clickedIndex = rowIndex;
		            		}
		            	}
		            	
		                if(clickedIndex<0 || dom_table.rows.length==clickedIndex){
		                    return SIGNALS.NOT_READY;
		                }

		                // Block events for focused renderers
		                var focused = false;
		                if(columnIndex == focusedCell.columnIndex && clickedRowPK == focusedCell.rowPk){
		                	focused = true;
		                }
		                
		                var cellIndex = (table.tableMetaData.horizontalOrientation==false && cell.id.contains("columnChangeIndicatorCell"))?jQuery(cell).index()+1:jQuery(cell).index(); 
		                return {focused: focused, 
		                	clickedIndex: clickedIndex, 
		                	clickedRowPK:clickedRowPK, 
		                	columnIndex:columnIndex, 
		                	shiftKey: ev.shiftKey, 
		                	ctrlKey: ev.ctrlKey, 
		                	target: target, 
		                	cellIndex: cellIndex};
		            }
			        return SIGNALS.NOT_READY;
			    });
			    
			    
			    var tableColumnClickedE = tableClickedE.filterE(function(v){
			    	var table = tableGoodB.valueNow();
			    	if(!good(table)){
						return false;
					}
			    	
			    	return v!=SIGNALS.NOT_READY&&(table.tableMetaData && table.tableMetaData.horizontalOrientation==false);
			    });
			    
			    var tableBlurE = jQuery(document).fj('extEvtE', 'click').mapE(function(x){return SIGNALS.NOT_READY;});  
			    
			    // TODO: Get column selection working again
			    var columnSelectionsE = F.mergeE(tableColumnClickedE, tableBlurE.mapE(function(v){return SIGNALS.NOT_READY;})).collectE([],function(newElement,arr) {
			        if(newElement==SIGNALS.NOT_READY){
			            return [];
			        }

			           // LOG.create("Col");
			        var clickedIndex = newElement.cellIndex;
			        var shiftKey = newElement.shiftKey;
			        var ctrlKey = newElement.ctrlKey;
			        if(ctrlKey){        
			            if(ARRAYS.contains(arr, clickedIndex)){
			                arr = jQuery.grep(arr, function(value) {return value != clickedIndex;});
			            }
			            else {
			                arr[arr.length] = clickedIndex;
			            }
			        }
			        else if(shiftKey){
			            var min = ARRAYS.max(arr);
			            var max = ARRAYS.min(arr);
			            if(clickedIndex<min){
			                for(i=clickedIndex;i<min;i++)
			                    arr[arr.length] = i;    
			            }
			            else if(clickedIndex>max){
			                for(i=max+1;i<=clickedIndex;i++)
			                    arr[arr.length] = i; 
			            }
			        }
			        else{
			            if(arr.length==1&&ARRAYS.contains(arr, clickedIndex)){
			                arr = [];
			            }
			            else{
			                arr = [clickedIndex];
			            }
			        } 
			        return arr;
			    });
			    
			    // Process table row selection
			    var tableSelectionRowIndexE = F.mergeE(focusedCellSelectionE, tableClickedE, tableBlurE);
			    var rowSelectionsE = tableSelectionRowIndexE.collectE({},function(newElement,arr) {
			        if(newElement==SIGNALS.NOT_READY){
			            return []; 
			        }

			           // LOG.create("Col");
			        var clickedIndex = newElement.clickedIndex;
			        var shiftKey = newElement.shiftKey;
			        var ctrlKey = newElement.ctrlKey;
			        if(ctrlKey){        
			            if(ARRAYS.contains(arr, clickedIndex)){
			            	if(newElement.focused === false){
			            		arr = jQuery.grep(arr, function(value) {return value != clickedIndex;});
			            	}
			            }
			            else {
			                arr[arr.length] = clickedIndex;
			            }
			        }
			        else if(shiftKey){
			            var min = ARRAYS.max(arr);
			            var max = ARRAYS.min(arr);
			            if(clickedIndex<min){
			                for(i=clickedIndex;i<min;i++)
			                    arr[arr.length] = i;    
			            }
			            else if(clickedIndex>max){
			                for(i=max+1;i<=clickedIndex;i++)
			                    arr[arr.length] = i; 
			            }
			        }
			        else{
			            if(ARRAYS.contains(arr, clickedIndex)){
			            	if(newElement.focused === false){
			            		arr = [];
			            	}
			            }
			            else{
			                arr = [clickedIndex];
			            }
			        } 
			        return arr;
			    }).filterE(function(v){
			    	var table = tableGoodB.valueNow();
			    	if(!good(table)){
						return false;
					}
			    	
			    	return v!=SIGNALS.NOT_READY&&(table.tableMetaData && table.tableMetaData.horizontalOrientation);
			    });
			    
			    var rowSelectionsB = rowSelectionsE.startsWith([]);
				var rowSelectionsByRowPkB = F.liftB(function(rowSelections, pkSet){
					
					if(!good()){
						return SIGNALS.NOT_READY;
					}
					var table = tableGoodB.valueNow();
					if(!good(table) && table.tableMetaData.horizontalOrientation===false){
						return SIGNALS.NOT_READY;
					}
					
					
					var newArray = new Array();
					for(var index in rowSelections){
						var rowIndex = rowSelections[index];
						var rowPk = pkSet[rowIndex];
						newArray.push(rowPk);
					}
					return newArray;
				}, rowSelectionsB, rowStatePksB);

				var toolbar_state_selected_rowsB = F.liftB(function(selectedRows, changeSet){
					if(!good(selectedRows)){
						return SIGNALS.NOT_READY;
					}			    
					jQuery("#"+domTable.id+" tr").removeClass("TablesSelectedRow");
			    	var changeMatch = false;
			    	
			    	for(var index in selectedRows){
			    		var selectedRow = selectedRows[index];
			    		jQuery("#"+instanceId+"_"+String(selectedRow).makeDomIdSafe()).addClass("TablesSelectedRow");
			    		if(good(changeSet) && changeSet[selectedRow]!=undefined){
			    			changeMatch = true;
			    		}
			    	}

		    		return {delete_disabled: (selectedRows.length==0), undo_disabled: (!changeMatch)};
			    }, rowSelectionsByRowPkB, rowChangeSetB);
				
				
				
				var columnSelectionsB = F.liftB(function(tableState, columnSelection){
					if(!good()){
						return SIGNALS.NOT_READY;
					}
			    	var columnKeyMap = {};
			    	var columnSelections = new Array();
			    	for(var rowIndex in tableState.cellState){
			    		var columnNumber = 0;
			    		for(var columnIndex in tableState.cellState[rowIndex]){
			    			if(columnIndex=="rowPk"){
			    				continue;
			    			}
			    			columnKeyMap[columnNumber] = columnIndex;
			    			columnNumber++;
			    		}
			    		break;
			    	}
			    	for(var index in columnSelection){
			    		var selectedColumnNumber =columnSelection[index]-1;	//-1 is because of the change indicator cell
			    		if(tableState.sourceTable.tableMetaData.headingStyle === TABLES.metaTagHeadingStyle.Vertical){
		    				selectedColumnNumber--;
		    			}				
			    		columnSelections.push(columnKeyMap[selectedColumnNumber]);
			    	}
			    	return columnSelections;
			    }, tableStateB, columnSelectionsE.startsWith(SIGNALS.NOT_READY));
			    
			    
				var toolbar_state_selected_columnsB = F.liftB(function(columnSelections, tableState, columnChangeSet){
			    	if(!(good(columnSelections) && good(tableState))){
			    		return SIGNALS.NOT_READY;
			    	}
			    	jQuery(".TablesSelectedColumn").removeClass("TablesSelectedColumn");
			    	var changeMatch = false;
			    	for(var rowIndex in tableState.cellState){
			    		for(var index in columnSelections){
			    			jQuery("#"+instanceId+"_"+rowIndex+"_"+columnSelections[index]).addClass("TablesSelectedColumn");
			    			if(good(columnChangeSet) && columnChangeSet[columnSelections[index]]!=undefined){
				    			changeMatch = true;
				    		}
			    		}
			    	}
			    	
		    		return {delete_disabled: (columnSelections.length==0), undo_disabled: (!changeMatch)};
			    }, columnSelectionsB, tableStateB, columnChangeSetB);
				
			    columnChangeSetB.liftB(function(columnChangeSet){
			    	if(!good()){
			    		return SIGNALS.NOT_READY;
			    	}
			    	jQuery(".TableWidget_modified_col").removeClass("TableWidget_modified_col");
			    	for(var columnIndex in columnChangeSet){
			    		jQuery("#"+instanceId+"_columnChangeIndicator_"+columnIndex).addClass("TableWidget_modified_col");
			    	}
			    });
			    
			    // ===============
				// Undo and Delete
				// ===============
			    // Update delete and undo on the page toolbar
			    F.ifB(horizontalOrientationB, toolbar_state_selected_rowsB, toolbar_state_selected_columnsB).liftB(function(value){
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
				
//				//var undoColumnsE = toolbarWidget.getUndoClickE().filterE(function(){return good(tableGoodB.valueNow()) && tableGoodB.valueNow().tableMetaData.horizontalOrientation===false}).snapshotE(columnSelectionsB);
//				

				var deleteSetE = toolbarWidget.getDeleteClickE().snapshotE(tableGoodB).filterE(function(table){return good(table) && table.tableMetaData.horizontalOrientation;});
				deleteSetE.snapshotE(rowSelectionsByRowPkB).mapE(function(value){
					deleteE.sendEvent(value);
				});
//				//var deleteColumnsE = toolbarWidget.getDeleteClickE().filterE(function(){return good(tableGoodB.valueNow()) && tableGoodB.valueNow().tableMetaData.horizontalOrientation===false}).snapshotE(columnSelectionsB);

				
				
			},
			destroy: function(){
				
			}
		};
	};
	
	tablesClass.WIDGETS.toolbarWidget = function(instanceId){
		
		// Constants
		// ---------
		/**
		 * The amount of time to show the apply feedback before changing to default.
		 */
		this.feedbackDuration = 10000;
		
		// Update Options
		// --------------
		/**
		 * Forces the page toolbar to redraw, in cases where DOM has not updated.
		 */
		this.update = function(){
			style_updatedE.sendEvent();
		};
		
		// Limit Options
		// -------------
		
		this.toggleAddOption = function(show_hide){
			show_hide = (show_hide === undefined) || show_hide;
			jQuery('#page_toolbar_' + instanceId).find('.add').next('.button_spacer_vertical').toggle(show_hide);
			jQuery('#page_toolbar_' + instanceId).find('.add').toggle(show_hide);
			style_updatedE.sendEvent();
		};
		
		this.toggleDeleteOption = function(show_hide){
			show_hide = (show_hide === undefined) || show_hide;
			jQuery('#page_toolbar_' + instanceId).find('.delete').toggle(show_hide);
			style_updatedE.sendEvent();
		};
		
		this.toggleToolbarOptions = function(show_hide){
			show_hide = (show_hide === undefined) || show_hide;
			jQuery('#page_toolbar_' + instanceId).toggle(show_hide);
			style_updatedE.sendEvent();
		};
		
		// Disable Options
		// ---------------
		this.setAddDisabled = function(disabled){
			if(disabled === undefined){
				disabled = true;
			}
			jQuery('#page_toolbar_' + instanceId).find('.add').toggleClass('disabled', disabled);
		};
		
		this.setUndoDisabled = function(disabled){
			if(disabled === undefined){
				disabled = true;
			}
			jQuery('#page_toolbar_' + instanceId).find('.undo').toggleClass('disabled', disabled);
		};
		
		this.setDeleteDisabled = function(disabled){
			if(disabled === undefined){
				disabled = true;
			}
			jQuery('#page_toolbar_' + instanceId).find('.delete').toggleClass('disabled', disabled);
		};
		
		this.setApplyDisabled = function(disabled){
			if(disabled === undefined){
				disabled = true;
			}
			jQuery('#page_toolbar_' + instanceId).find('.apply').toggleClass('disabled', disabled);
		};
		
		// Error Options
		// -------------
		var style_updatedE = F.receiverE();
		var set_feedbackE = F.receiverE();
		
		this.setErrorCount = function(count){
			if(count > 0){
				jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_errors').show();
				jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_error_count').text('x' + count);
			}else{
				jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_errors').hide();
			}
			
			style_updatedE.sendEvent();
		};
		
		// Feedback Options
		// ----------------
		this.setFeedbackSuccess = function(){
			set_feedbackE.sendEvent('success');
		};
		
		this.setFeedbackError = function(){
			set_feedbackE.sendEvent('error');
		};
		
		this.setFeedbackUpdating = function(){
			set_feedbackE.sendEvent('updating');
		};
		
		this.setFeedbackDefault = function(){
			set_feedbackE.sendEvent('default');
		};
		
		// Button Click Events
		// -------------------
		this.getAddClickE = function(){
			return jQuery('#page_toolbar_' + instanceId).find('.add').fj('clicksE').filterE(function(){
				return !jQuery('#page_toolbar_' + instanceId).find('.add').hasClass('disabled');
			});
		};
		
		this.getUndoClickE = function(){
			return jQuery('#page_toolbar_' + instanceId).find('.undo').fj('clicksE').filterE(function(){
				return !jQuery('#page_toolbar_' + instanceId).find('.undo').hasClass('disabled');
			});
		};
		
		this.getDeleteClickE = function(){
			return jQuery('#page_toolbar_' + instanceId).find('.delete').fj('clicksE').filterE(function(){
				return !jQuery('#page_toolbar_' + instanceId).find('.delete').hasClass('disabled');
			});
		};
		
		this.getApplyClickE = function(){
			return jQuery('#page_toolbar_' + instanceId).find('.apply').fj('clicksE').filterE(function(){
				return !jQuery('#page_toolbar_' + instanceId).find('.apply').hasClass('disabled');
			});
		};
		
		// General Widget
		// --------------
		this.load = function(){
			
			// Set default
			jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_errors').hide();
			
			
			var feedback_do_timeoutE = set_feedbackE.mapE(function(value){
				var do_timeout = false;
				
				// Set style according to what is set
				switch(value){
				case 'updating':
					var jdiv = jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_feedback');
					jdiv.toggleClass('success', false);
					jdiv.toggleClass('error', false);
					jdiv.toggleClass('updating', true);
					break;
				case 'success':
					var jdiv = jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_feedback');
					jdiv.toggleClass('success', true);
					jdiv.toggleClass('error', false);
					jdiv.toggleClass('updating', false);
					do_timeout = true;
					break;
				case 'error':
					var jdiv = jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_feedback');
					jdiv.toggleClass('success', false);
					jdiv.toggleClass('error', true);
					jdiv.toggleClass('updating', false);
					do_timeout = true;
					break;
				default:
					var jdiv = jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_feedback');
					jdiv.toggleClass('success', false);
					jdiv.toggleClass('error', false);
					jdiv.toggleClass('updating', false);
				}
				
				return do_timeout;
			});
			
			// Store feedback state
			var feedback_do_timeoutB = feedback_do_timeoutE.startsWith(false);
			
			// If timeout enabled, wait feedbackDuration then if still feedback_do_timeoutB - go to default.
			var set_to_defaultE = feedback_do_timeoutE.filterFalseE().calmE(this.feedbackDuration).snapshotE(feedback_do_timeoutB).filterFalseE();
			set_to_defaultE.mapE(function(){
				set_feedbackE.sendEvent('default');
			});
			
			var update_eventsE = F.mergeE(jQuery(window).fj('jQueryBind', 'scroll'), style_updatedE, feedback_do_timeoutE);
			update_eventsE.mapE(function(){
				var window_scroll = jQuery(window).scrollTop();
				
				var jtoolbar = jQuery('#page_toolbar_' + instanceId);
				var jparent = jtoolbar.parent();
				if(jparent.length > 0){
					
					var parent_top = jparent.offset().top;
					var parent_height = jparent.outerHeight();
					var toolbar_height = jtoolbar.outerHeight(true);
					
					var offset = window_scroll - parent_top;
					if(offset < 0){
						offset = 0;
					}
					
					if(offset > (parent_height - toolbar_height)){
						offset = Math.max(0, (parent_height - toolbar_height));
					}
					
					// If height of toolbar exceeds content height, make toolbar relative
					var jcontent = jparent.find('.page_toolbar_content');
					if(jcontent.length > 0){
						var content_height = 0;
						
						jcontent.each(function(){
							content_height += jQuery(this).outerHeight();
						});
						
						if(toolbar_height > content_height){
							jtoolbar.css('position', 'relative');
							jtoolbar.css('top', 0);
						}else{
							jtoolbar.css('position', 'absolute');
							jtoolbar.css('top', parent_top + offset);
						}
					}
				}
			});
			
			// Goto 1st error when clicked
			jQuery(".page_toolbar_errors").click(function(){
				var errorTag = jQuery(".errored_tag").first().find(".errored_tag_container").get(0);
				if(errorTag !== undefined){
					errorTag.scrollIntoView(true);
				}
			});
		};
		
		this.build = function(){ 
			var jdiv_container = jQuery('<div>', {'id': 'page_toolbar_' + instanceId, 'class':'page_toolbar_container'});
			
			jdiv_container.append(
					jQuery('<div>', {'class':'button add', title: 'Add'}),
					jQuery('<div>', {'class':'button_spacer_vertical'}),
					jQuery('<div>', {'class':'button undo', title: 'Clear changes'}),
					jQuery('<div>', {'class':'button delete', title: 'Delete'}),
					jQuery('<div>', {'class':'button_spacer_vertical'}),
					jQuery('<div>', {'class': 'page_toolbar_feedback'}).append(
							jQuery('<div>', {'class':'button apply', title: 'Apply changes to device'})
					),
					jQuery('<div>', {'class':'page_toolbar_errors'}).append(
							jQuery('<div>', {'class':'page_toolbar_error_count'})
					)
			);
			
			return jdiv_container;
		};
		
		this.destroy = function(){
	    };
	};
	
	
	return tablesClass;
})(TABLES || {}, WIDGETS);
