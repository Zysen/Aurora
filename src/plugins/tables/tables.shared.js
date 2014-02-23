var TABLES = (function(tables){
	var validators = {
		trueValidator: function(){return true;}
	};

	var columnMetaDataDef = {name:undefined, foreignKey: false, readonly:false, sortable:true, dataType:"string", defaultValue:""};
	var rowMetaDataDef = {name:undefined, defaultValue:""};
	var cellMetaDataDef = {};
	
	
	var tableDef = {
		tableMetaData: {id:undefined, primaryKey:"index", canSelect:true, readonly:false, sortable:true, visible:true, horizontalOrientation: true, headingStyle: 1, canAdd: true, canDelete: true},
		columnMetaData:{},
		rowMetaData:{},
		cellMetaData:[],
		data:[]
	};
	
	var rendererStateDef = {readonly: false, disabled: false, errored: false, options:undefined};
	
	// Error defines
	// Overall error format -
	// errors:[ {table:[{error, message}, ...]}, {index: rowPk, columnId:[{error, message}, ...], columnId:[{error, message}, ...]} ]
	
	var tableMetaErrorDef = {table:[]};			// a row's cell errors are added as  {index: rowPk, columnId:[{error, message}, ...] into this object. See rowCellMetaErrorDef
	var rowCellMetaErrorDef = {index: -1};		// cell errors are added as columnId:[{error, message}, ...] into this object.
	var metaErrorDef = {error: 0, message: ''};
	
	var changeDef = {rowPk:-1, columnIndex:-1, value:undefined};
	
	// Must start at 1.
	var temp_id_counter = 1;
	
	//return {
		
		// Meta data constants
		// -------------------
		tables.metaTagDisabled= 'disabled';
		tables.metaTagError= 'error';
		tables.metaTagReadOnly= 'readonly';
		tables.metaTagRendererOptions= 'rendererOptions';
		tables.metaTagProcessor= 'processor';
		tables.metaTagProcessorType= {clientServerPair: 'clientServerPair'};
		
		tables.metaTagHeadingStyle= {None: 0, Horizontal: 1, Vertical: 2};
		
		// Temp Pk functions
		// -----------------
		
		// Added row pk identifier
		tables.tempPkPrefix= 'temp';
		
		/**
		 * @returns Temporary primary key for rows added to a table.
		 */
		tables.getNewPk= function(){
			return this.tempPkPrefix + (temp_id_counter++);
		};
		
		// Table structure definitions
		// ---------------------------
		tables.changeDefinition= changeDef;
		tables.columnMetaDataDefinition= columnMetaDataDef;
		tables.rowMetaDataDefinition= rowMetaDataDef;
		tables.cellMetaDataDefinition= cellMetaDataDef;
		tables.tableDefinition= tableDef;
		tables.rendererStateDefinition=rendererStateDef;
		
		/**
		 * Formats object into a table data structure.
		 * Columns are automatically created
		 * @param tableId
		 * @param primaryKey
		 * @param data
		 * @returns
		 */
		tables.parseTable = function(tableId, primaryKey, data, defaultColumns){
			var table = OBJECT.clone(tableDef);
			table.tableMetaData.primaryKey = primaryKey;
			table.tableMetaData.id = tableId;
			if(defaultColumns!=undefined){
				for(var columnId in defaultColumns){
					TABLES.UTIL.addColumn(table, columnId, defaultColumns[columnId].name, defaultColumns[columnId].type);
				}
			}
			else if(data.length>0){
			    for(var columnId in data[0]){
			        TABLES.UTIL.addColumn(table, columnId);
			    }
			}
			else{
			    LOG.create("Unable to parse table, not enough information to create columns;");
			}
			table.columnMetaData[primaryKey].readonly = true;
			// If data isn't array make into a array
			if(!(data instanceof Array)) {
				data = [data];
			}
			// Array will become rows of data
			for(var i=0;i<data.length;i++){
				var row = {};
				table.data.push(row);
				var rowPk = undefined;
				for(var key in data[i]){
					var value = data[i][key];
					
					// Store data in row
					row[key] = value;
					
					// Create column from key
					if(table.columnMetaData[key] == undefined){
						var column_meta =OBJECT.clone(columnMetaDataDef);
						column_meta.id = key;
						column_meta.name = key.replaceAll('_', ' ').ucFirst();
						column_meta.dataType = typeof value;
						table.columnMetaData[key] = column_meta;
					}
					if(key==primaryKey){
						rowPk = value;
					}
					
				}
				if(rowPk){
					table.rowMetaData[rowPk] = OBJECT.extend({}, TABLES.rowMetaDataDefinition, {id:rowPk, name: rowPk});
				}
			}
			if(table.columnMetaData.length > 0 && table.columnMetaData[primaryKey]==undefined){
				LOG.create("Error - Specified primary key does NOT exist in the data set. The widgets will likley have trouble displaying this table");
			}
			return table;
		};
		
		tables.create=function(table, tableMetaData, columnMetaData, rowMetaData, cellMetaData, data){
			var table =OBJECT.clone(tableDef);
			
			table.tableMetaData = tableMetaData ||OBJECT.clone(table.tableMetaData);
			table.columnMetaData = columnMetaData ||OBJECT.clone(table.columnMetaData);
			table.rowMetaData = rowMetaData ||OBJECT.clone(table.rowMetaData);
			table.cellMetaData = cellMetaData ||OBJECT.clone(table.cellMetaData);
			
			table.data =OBJECT.clone(data);
			
			return table;
		};
		tables.createBI=function(table, tableMetaData, columnMetaData, rowMetaData, cellMetaData, data){
			return F.liftBI(function(){}, function(){}, F.zeroE().startsWith(TABLES.create(table, tableMetaData, columnMetaData, rowMetaData, cellMetaData, data)));
		};
		tables.render=function(table){
			var html = table.tableMetaData.id+"<br /><table class=\"testTable\"><tr>";
			
			for(var columnId in table.columnMetaData){
				var column = table.columnMetaData[columnId];
				html+="<th>"+columnId+"</th>";
			}
			html+="</tr>";
			for(var rowIndex in table.data){
				var rowId = table.data[rowIndex][table.tableMetaData.primaryKey];
				html+="<tr>";
				for(var columnId in table.data[rowIndex]){
					var dataCell = table.data[rowIndex][columnId];
					html+="<td>"+dataCell+"</td>";
				}
				html+="</tr>";
			}
			html += "</table>";
			return html;
		};
		tables.joinB = function(table1B, table2B, joinColumn, newPk, includeColumns){
		    
		    return F.liftB(function(table1, table2){
		        if(!good()){
                return chooseSignal();
            }
    		    var newTable = OBJECT.clone(table1);
    		    for(var columnIndex in table2.columnMetaData){
    		        if(columnIndex!=joinColumn && (includeColumns==undefined || ARRAYS.contains(includeColumns, columnIndex))){
    		            TABLES.UTIL.addColumn(newTable, table2.columnMetaData[columnIndex].id, table2.columnMetaData[columnIndex].name, table2.columnMetaData[columnIndex].dataType);
    		        }
    		    }
    		    if(newPk!=undefined){
    		        newTable.tableMetaData.primaryKey = newPk;
    		    }

    		    for(var rowIndex in newTable.data){
    		        for(var rowIndex2 in table2.data){    
    		          if(newTable.data[rowIndex][joinColumn]===table2.data[rowIndex2][joinColumn]){
    		              for(var columnIndex in table2.data[rowIndex2]){
    		                  if(newTable.columnMetaData[columnIndex] || includeColumns==undefined){
    		                      newTable.data[rowIndex][columnIndex] = OBJECT.clone(table2.data[rowIndex2][columnIndex]);
    		                  }
    		              }
    		              break;
    		          }
    		        }
    		    }
    		    return newTable;
		    }, table1B, table2B);
		};
		tables.outerJoinB = function(table1B, table2B, joinColumn, newPk){
		  return F.liftB(function(joinedTable){
		      if(!good()){
                return chooseSignal();
            }
		      var innerTable = OBJECT.clone(joinedTable);
	        var otherTable = table2B.valueNow();
	        var newRows = [];
	        for(var rowIndex in otherTable.data){
	            var found = false;
	          for(var rowIndex2 in innerTable.data){
	              if(otherTable.data[rowIndex][joinColumn]===innerTable.data[rowIndex2][joinColumn]){found = true;break;}
	          }
	          if(!found){
	              newRows.push(otherTable.data[rowIndex]);
	          }
	        }
	        for(var index in newRows){
	            innerTable.data.push(newRows[index]);
	        }
	        return innerTable;
	       }, tables.joinB(table1B, table2B, joinColumn, newPk));
		};
		
		
		
		tables.leftJoin = function(table1BI, table2BI, joinColumn, joinDescriptor){				
			var sourceTable1 = undefined;
			var sourceTable2 = undefined;
			var oldTable = undefined;
			
			return F.liftBI(function(table1, table2){
			    if(!good()){
			        return chooseSignal();
			    }
				table1Columns = table1.columnMetaData;
				table2Columns = table2.columnMetaData;
				
				sourceTable1 = table1;
				sourceTable2 = table2;
				
				var newTable =OBJECT.clone(table1);
				newTable.tableMetaData.id ="("+table1.tableMetaData.id+"+"+table2.tableMetaData.id+")";
				LOG.create("Table Downwards for "+newTable.tableMetaData.id);
				newTable.data = [];
				
				if(joinDescriptor!=undefined){
					//newTable.tableMetaData.id = joinDescriptor;
				}

				var table2NewColumns =OBJECT.clone(table2.columnMetaData);
				OBJECT.delete(table2NewColumns, joinColumn);
				OBJECT.extend(newTable.columnMetaData, table2NewColumns);

				for(var row1Index in table1.data){
					for(var row2Index in table2.data){
						if(table1.data[row1Index][joinColumn]===table2.data[row2Index][joinColumn]){
							var table2Row =OBJECT.clone(table2.data[row2Index]);
							OBJECT.delete(table2Row, joinColumn);
							newTable.data[newTable.data.length] = OBJECT.extend(OBJECT.clone(table1.data[row1Index]), table2Row);//.splice(table2indexColumn, 1)
						}
					}
				}
				oldTable = newTable;
				return newTable;
			}, function(newTable){
				var leftTable =OBJECT.clone(sourceTable1);
				var rightTable =OBJECT.clone(sourceTable2);
				
				
				LOG.create("Table Upwards for "+newTable.tableMetaData.id);
				var newTablePrimaryColumn = newTable.tableMetaData.primaryKey;
				var diffs = TABLES.UTIL.diff(newTable, oldTable, joinColumn);
				
				for(var diffIndex in diffs){							//For each detected different cell
					var diff = diffs[diffIndex];
					if(diff.column===newTable.tableMetaData.primaryKey){
						LOG.create("Cannot change primary key value in table "+newTable.tableMetaData.id);
						continue;
					}
					//Left Table
					TABLES.UTIL.updateCell(leftTable, leftTable.tableMetaData.primaryKey, diff.primaryKeyValue, diff.column, diff.oldValue, diff.newValue);					
					//Right Table
					if(newTable.columnMetaData[diff.column].foreignKey){
						TABLES.UTIL.updateCell(rightTable, joinColumn, diff.joinColumnValue, diff.column, diff.oldValue, diff.newValue);
					}
					else{
						var newFkValue = TABLES.UTIL.getValue(rightTable, diff.column, diff.newValue, joinColumn);
						var oldFkValue = newTable.data[diff.row][joinColumn];
						if(newFkValue!=undefined){
							//TABLES.UTIL.updateCell(rightTable, joinColumn, diff.joinColumnValue, joinColumn, diff.oldValue, newFkValue);
							TABLES.UTIL.updateCell(leftTable, leftTable.tableMetaData.primaryKey, diff.primaryKeyValue, joinColumn, oldFkValue,  newFkValue);
						}
					}
				}
				for(var rowIndex in newTable.rowMetaData){
                    leftTable.rowMetaData[rowIndex] = OBJECT.extend(leftTable.rowMetaData[rowIndex] || {}, newTable.rowMetaData[rowIndex] || {}, TABLES.rowMetaDataDefinition);				    
				}
				if(newTable.tableMetaData.applyId!=undefined){
				    leftTable.tableMetaData.applyId = newTable.tableMetaData.applyId;
				}
				return [leftTable, rightTable];
			}, table1BI, table2BI);
		};
		/**
		 * Checks for user priviledge level and flags the table as readonly if < 15
		 * 
		 * @param tableBI
		 * @returns
		 */
		tables.checkTablePermissionsBI=function(tableBI, userPriviledgeB){			
			return F.liftBI(function(table, userPriviledge){
				if(!good()){
					return chooseSignal();
				}
				var newTable =OBJECT.clone(table);
				TABLES.UTIL.checkTablePermissions(newTable, userPriviledge);
				return newTable;
			}, function(table){
				return [table, undefined];
			}, tableBI, userPriviledgeB);
		};
		/**
		 * Looks for changed cells in a table and flags every cell in that row as changed. This is required for some back end objects..
		 * 
		 * @param tableBI
		 * @returns
		 */
		tables.sendWholeRowBI = function(tableBI){			
			return F.liftBI(function(table){
				if(!good()){
					return chooseSignal();
				}
				return table;
			}, function(table){
				var newTable =OBJECT.clone(table);
				for(var rowIndex in newTable.data){
					var rowPk = TABLES.UTIL.findRowPk(newTable, rowIndex);
					var found = false;
					for(var columnIndex in newTable.cellMetaData[rowIndex]){
						if(newTable.cellMetaData[rowIndex][columnIndex].userChange){
							found = true;
							break;
						}
					}
					if(found){
						for(var columnIndex in newTable.data[rowIndex]){
							if(newTable.cellMetaData[rowIndex][columnIndex]==undefined){
								newTable.cellMetaData[rowIndex][columnIndex] = jQuery({}, TABLES.cellMetaDataDefinition);
							}
							newTable.cellMetaData[rowIndex][columnIndex].userChange = true;
						}
					}
				}

				return [newTable];
			}, tableBI);
		};
		/**
		 * Filters a tableBI by calling the supplied filter callback for each row in table.
		 * Filtered rows are added back to table on upwards transform.
		 * 
		 * @param tableBI
		 * @param filterCallback - function called for each row. Function should return false to filter out, true to not.
		 * @returns
		 */
		tables.filterRowsBI = function(tableBI, filterCallback){
			
			var sourceTable = undefined;
			var filterRows = undefined;
			
			return F.liftBI(function(table){
				if(!good()){
					return chooseSignal();
				}
				
				// Store pointer to source table so we can use on upwards transform.
				sourceTable = table;
				
				// Clone table before we remove rows.
				var newTable =OBJECT.clone(table);
				filterRows = [];
				
				// Collect rowPks of rows to remove
				for(var rowIndex in newTable.data){
					var rowPk = newTable.data[rowIndex][newTable.tableMetaData.primaryKey];
					if(!filterCallback(newTable.data[rowIndex])){
						filterRows.push(rowPk);
					}
				}
				
				// Remove rows from data and meta data
				filterRows.reverse();
				for(var index in filterRows){
					var rowPk = filterRows[index];					
					var rowIndex = TABLES.UTIL.findRowIndex(table, rowPk);
					newTable.data.splice(rowIndex, 1);
					newTable.cellMetaData.splice(rowIndex, 1);
					OBJECT.delete(newTable.rowMetaData, rowPk);
				}

				return newTable;
			}, function(modifiedTable){
				
				// Clone table before we add back removed rows
				var upwardsClone =OBJECT.clone(modifiedTable);
				
				// Insert rows that were removed
				// Note that this will overwrite data from modifiedTable, but that's ok cause we add that back in next code block
				for(var index in filterRows){
					var rowPk = filterRows[index];					
					var rowIndex = TABLES.UTIL.findRowIndex(sourceTable, rowPk);
					
					upwardsClone.data[rowIndex] =OBJECT.clone(sourceTable.data[rowIndex]);
					upwardsClone.cellMetaData[rowIndex] =OBJECT.clone(sourceTable.cellMetaData[rowIndex]);
					upwardsClone.rowMetaData[rowPk] =OBJECT.clone(sourceTable.rowMetaData[rowPk]);
				}
				
				// Insert changes from modifiedTable
				// Looks up original position of each row to reinsert into table.
				for(var rowIndex in modifiedTable.data){
					
					var rowPk = modifiedTable.data[rowIndex][sourceTable.tableMetaData.primaryKey];
					var origRowIndex = TABLES.UTIL.findRowIndex(sourceTable, rowPk);
					
					upwardsClone.data[origRowIndex] =OBJECT.clone(modifiedTable.data[rowIndex]);
					upwardsClone.cellMetaData[origRowIndex] =OBJECT.clone(modifiedTable.cellMetaData[rowIndex]);
					upwardsClone.rowMetaData[rowPk] =OBJECT.clone(modifiedTable.rowMetaData[rowPk]);
				}
				return [upwardsClone];

			}, tableBI);
		};
		tables.debug = function(tableBI){
			return F.liftBI(TABLES.UTIL.printTable, function(table){
				return [TABLES.UTIL.printTable(table, 1)];
			}, tableBI);
		};
		tables.rotate=function(table){
			var newRowMetaData = {};
			var newCellMetaData = [];
			var newData = [];
			var columnNumber = 0;
			for(var columnIndex in table.columnMetaData){
				//LOG.create("Rotating: columnIndex- "+columnIndex);
				for(var rowIndex in table.data){
					var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);
					if(newData[columnNumber]==undefined){
						newData[columnNumber] = {};
					}
						
					newData[columnNumber][rowPk] =OBJECT.clone(table.data[rowIndex][columnIndex]);
					
					
					if(newRowMetaData[columnNumber]==undefined){
						newRowMetaData[columnNumber] =OBJECT.clone(table.columnMetaData[columnIndex]);
						newRowMetaData[columnNumber]["rotatePk"] = columnNumber;
					}

					if(table.cellMetaData[rowIndex] && table.cellMetaData[rowIndex][columnIndex]){
						if(newCellMetaData[columnNumber]==undefined){
							newCellMetaData[columnNumber] = {};
						}
						newCellMetaData[columnNumber][rowPk] =OBJECT.clone(table.cellMetaData[rowIndex][columnIndex]);
					}
				}
				columnNumber++;
			}
			var newTable = TABLES.create(table,OBJECT.clone(table.tableMetaData),OBJECT.clone(table.rowMetaData), newRowMetaData, newCellMetaData, newData);
			return newTable;	
		};
		tables.rotateReverse=function(table){
			var newRowMetaData = {};
			var newColumnMetaData = {};
			var newCellMetaData = [];
			var newData = [];
			
			var columnNumber = 0;
			for(var columnIndex in table.columnMetaData){
				for(var rowIndex in table.data){
					var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);
					
					//LOG.create("rowPk: "+rowPk+" rowIndex: "+rowIndex);
					
					var rowId = table.rowMetaData[rowPk].id;
					if(newData[columnNumber]==undefined){
						newData[columnNumber] = {};
					}
					newData[columnNumber][rowId] =OBJECT.clone(table.data[rowIndex][columnIndex]);
					
					if(newCellMetaData[columnNumber]==undefined){
						newCellMetaData[columnNumber] = {};
					}
					
					if(table.cellMetaData[rowIndex]!=undefined && table.cellMetaData[rowIndex][columnIndex]!=undefined){
						newCellMetaData[columnNumber][rowId] =OBJECT.clone(table.cellMetaData[rowIndex][columnIndex]);
					}
					
					if(newColumnMetaData[rowId]==undefined && table.rowMetaData[rowPk]!=undefined){
						newColumnMetaData[rowId] =OBJECT.clone(table.rowMetaData[rowPk]);
						OBJECT.delete(newColumnMetaData[rowId], "rotatePk");
					}
				}				
				columnNumber++;
			}
			var newTable = TABLES.create(table,OBJECT.clone(table.tableMetaData), newColumnMetaData,OBJECT.clone(table.columnMetaData), newCellMetaData, newData);
			return newTable;	
		};
		tables.rotateBI = function(tableBI){
			var sourceTable = undefined;
			return F.liftBI(function(table){
				if(!good()){
					return SIGNALS.NOT_READY;
				}
				sourceTable = table;

				var newTable = TABLES.rotate(table);

				//New table might not have a column with unique values, so generate one.
				TABLES.UTIL.addColumn(newTable, 'rotatePk', 'rotatePk', 'int');
				for(var rowIndex in newTable.data){
					newTable.data[rowIndex]["rotatePk"] = rowIndex;
					
					var cell_meta = TABLES.UTIL.getCellMetaData(newTable, rowIndex, 'rotatePk', true);
					cell_meta.visible = false;
				}
				newTable.tableMetaData.primaryKey = "rotatePk";
				newTable.columnMetaData["rotatePk"].visible = false;

				newTable = TABLES.UTIL.cleanUserChange(newTable);
				return newTable;
			}, function(table){
				//Calculated primary key column is removed, in this many steps due to primaryKeys swapping around/
				var newTable = TABLES.rotateReverse(table);
				newTable = TABLES.UTIL.removeRow(newTable, "rotatePk");
				newTable = TABLES.UTIL.removeRow(newTable, newTable.tableMetaData.primaryKey);
				newTable.tableMetaData.primaryKey = sourceTable.tableMetaData.primaryKey;	
				return [newTable];
			}, tableBI);
		};
		tables.sortBI=function(tableBI, column){
			var sourceTable = undefined;
			return F.liftBI(function(table){
				if(!good()){
					return SIGNALS.NOT_READY;
				}
				sourceTable = table;
				var sortObj = {};
				for(var rowIndex in table.data){
					var sortVal = table.data[rowIndex][column];
					//sortArray[sortVal] = (sortArray[sortVal]==undefined)?1:sortArray[sortVal]+1;
					if(sortObj[table.data[rowIndex][column]]==undefined){
						sortObj[table.data[rowIndex][column]] = [rowIndex];
					}
					else{
						sortObj[table.data[rowIndex][column]].push(rowIndex);
					}
					
				}
				sortObj = sortObject(sortObj);
				
				var newData = [];
				var newCellMetaData = [];
				
				for(var sortIndex in sortObj){
					for(var index in sortObj[sortIndex]){
						var rowIndex = sortObj[sortIndex][index];
						newData.push(table.data[rowIndex]);
						newCellMetaData.push(table.cellMetaData[rowIndex]);
					}
				}
				table.data = newData;
				table.cellMetaData = newCellMetaData;
				return table;
			},
			function(tab){
				var table =OBJECT.clone(tab);
				var newData = [];
				var newCellMetaData = [];
				
				for(var rowIndex in sourceTable.data){
					var rowPk = TABLES.findRowPk(sourceTable, rowIndex);
					for(var newRowIndex in table.data){
						var newRowPk = TABLES.findRowPk(table, newRowIndex);
						if(rowPk===newRowPk){
							newData.push(table.data[newRowIndex]);
							newCellMetaData.push(table.cellMetaData[newRowIndex]);
							break;
						}
					}
				}
				table.data = newData;
				table.cellMetaData = newCellMetaData;
				return [table];
			}, tableBI);
		};
		
		
		
		if(tables.UTIL==undefined){
			tables.UTIL = {};
		}
		//UTIL:{
			/**
			 * Checks for user priviledge level and flags the table as readonly if < 15
			 * 
			 * @param tableBI
			 * @returns
			 */
			tables.UTIL.checkTablePermissions = function(table, userPriviledge){
				if(userPriviledge<15){
					table.tableMetaData.readonly = true;
				}
				return table;
			};
			tables.UTIL.extractColumn = function(table, column){
			    if(good()){
                    return SIGNALS.chooseSignal();
                }
                var column = [];
                for(var rowIndex in table.data){
                    column.push(table.data[rowIndex][column]);
                }
                return column;
			};
			tables.UTIL.setColumnOrder = function(table, newColumnOrder){
				if(!newColumnOrder instanceof Array){
					LOG.create("Error - TABLES.UTIL.setColumnOrder expects an array as second argument "+typeof(newColumnOrder)+" given");
					return table;
				}
				var newColumnMetaData = {};
				for(var index in newColumnOrder){
					var newColumnIndex = newColumnOrder[index];
					if(table.columnMetaData[newColumnIndex]==undefined){
						LOG.create("Error - Column order change requested with a column index that does not exist: "+newColumnIndex);
						continue;
					}
					newColumnMetaData[newColumnIndex] = table.columnMetaData[newColumnIndex];
				}
				for(var index in table.columnMetaData){
					if(newColumnMetaData[index]==undefined){
						newColumnMetaData[index] = table.columnMetaData[index];
					}
				}
				
				table.columnMetaData = newColumnMetaData;

				return table;
			};
			tables.UTIL.cleanUserChange = function(table){
				for(var columnIndex in table.columnMetaData){
					OBJECT.delete(table.columnMetaData[columnIndex], "userChange");
				}
				
				for(var rowPk in table.rowMetaData){
					OBJECT.delete(table.rowMetaData[rowPk], "userChange");
				}
				
				for(var rowIndex in table.cellMetaData){
					for(var columnIndex in table.cellMetaData[rowIndex]){
						OBJECT.delete(table.cellMetaData[rowIndex][columnIndex], "userChange");
					}
				}
				return table;
			};
			tables.UTIL.findRow = function(table, rowPk){
				for(var rowIndex in table.data){
					if(table.data[rowIndex][table.tableMetaData.primaryKey]==rowPk){
						return table.data[rowIndex];
					}
				}
				return false;
			};
			
			tables.UTIL.findRows = function(table, rowPk, value){
                var searchColumn = value==undefined?table.tableMetaData.primaryKey:rowPk;
                var searchValue = value==undefined?rowPk:value;
                var rows = [];
                for(var rowIndex in table.data){
                    if(table.data[rowIndex][searchColumn]==searchValue){
                        rows.push(table.data[rowIndex]);
                    }
                }
                return rows;
            };
			
			tables.UTIL.findRowPk = function(table, rowIndex){
				return table.data[rowIndex][table.tableMetaData.primaryKey];
			};
			
			tables.UTIL.findRowMetaWithId= function(table, rowId){
				for(var rowPk in table.rowMetaData){
					if(table.rowMetaData[rowPk].id && table.rowMetaData[rowPk].id===rowId){
						return table.rowMetaData[rowPk];
					}
				}
				return undefined;
			};
			
			tables.UTIL.findRowIndex = function(table, rowId){
				for(var rowIndex in table.data){
					if(table.data[rowIndex][table.tableMetaData.primaryKey]==rowId){
						return rowIndex;
					}
				}
				return false;
			};
	       tables.UTIL.eachRow = function(table, rowCb){
              for(var rowIndex in table.data){
                  rowCb(table.data[rowIndex], rowIndex);
              }  
            };
			
			/**
			 * Adds a new row to the table
			 * Assigns default values to the data based on columnMetaData's defaultValue.
			 * @param table
			 * @param rowPk - Primary key value of row that is being added
			 * @returns - Index of row added.
			 */
			tables.UTIL.addRow = function(table, rowPk, newData){
				
				if(TABLES.UTIL.findRow(table, rowPk) !== false){
					LOG.create('Error, cannot add row. Table already has primary key of ' + rowPk);
					return false;
				}
				if(newData==undefined){
					var newData = {};
					for(var columnIndex in table.columnMetaData){
						newData[columnIndex] = table.columnMetaData[columnIndex].defaultValue;
					}
				}
				newData[table.tableMetaData.primaryKey] = rowPk;
				table.data.push(newData);
				return (table.data.length - 1);
			};
			
			tables.UTIL.addColumn = function(table, columnId, columnName, dataType){
				// If column doesn't exist, create it
				
				if(!tables.UTIL.isTable(table)){
				    LOG.create("Error, unable to add column. Object is not a table");
				    LOG.create(table);
				    return;
				}
				
				if(table.columnMetaData[columnId] == undefined){
					table.columnMetaData[columnId] = OBJECT.extend({}, TABLES.columnMetaDataDefinition);
					
					for(var rowIndex in table.data){
						table.data[rowIndex][columnId] = undefined;
					}
				}
				
				// Always set this
				table.columnMetaData[columnId].dataType = dataType || 'string';
				table.columnMetaData[columnId].name = columnName === undefined ? columnId : columnName;
				table.columnMetaData[columnId].id = columnId;
				return table;
			};
			
			tables.UTIL.updateRow = function(table, searchRowPk, newRow){
				var rowIndex = tables.UTIL.findRowIndex(table, searchRowPk);
				for(var columnId in newRow){
					table.data[rowIndex][columnId] = OBJECT.clone(newRow[columnId]);
				}
				return table;
			};
			
			tables.UTIL.removeRow = function(table, searchRowPk){
				OBJECT.delete(table.rowMetaData, searchRowPk);
				for(var rowIndex in table.data){
					var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);
					if(rowPk==searchRowPk){
						OBJECT.delete(table.data, rowIndex);
						OBJECT.delete(table.cellMetaData, rowIndex);		// Must call this even if no cell meta data so that array stays in order.
					}
				}
				return table;
			};
			
			tables.UTIL.isTable = function (table){
				return table.tableMetaData!=undefined && table.rowMetaData!=undefined && table.columnMetaData!=undefined && table.data!=undefined;
			};
			
			tables.UTIL.removeColumn = function(table, columnId){
				
				if(table==undefined){
					LOG.create("RemoveColumn Table is undefined");
				}
				OBJECT.delete(table.columnMetaData, columnId);
				
				for(var rowIndex in table.data){
					OBJECT.delete(table.data[rowIndex], columnId);
					if(table.cellMetaData[rowIndex]==undefined){
						OBJECT.delete(table.cellMetaData[rowIndex], columnId);
					}
				}
				for(var rowPk in table.rowMetaData){
					if(table.rowMetaData[rowPk]!=undefined){
						OBJECT.delete(table.rowMetaData[rowPk], columnId);
					}
				}
				return table;
			};
			
			/**
			 * Gets the row meta data for a rowPk.
			 * If create is true, create the row meta data if it doesn't already exist.
			 * 
			 * @param table
			 * @param rowPk
			 * @param create - (optional) if true will create the meta data if it doesn't exist.
			 * @returns
			 */
			tables.UTIL.getRowMetaData = function(table, rowPk, create){
				if(table === undefined || table.rowMetaData === undefined){
					return undefined;
				}
				
				if(table.rowMetaData[rowPk] === undefined && create === true){
					table.rowMetaData[rowPk] = OBJECT.extend({}, TABLES.rowMetaDataDefinition);
				}
				
				return table.rowMetaData[rowPk];
			};
			
			/**
			 * Gets the row meta data for a temporary rowPk.
			 * If create is true, create the row meta data if it doesn't already exist.
			 * 
			 * @param table
			 * @param rowPk
			 * @param create - (optional) if true will create the meta data if it doesn't exist.
			 * @returns
			 */
			tables.UTIL.getTempRowMetaData = function(table, rowPk, create){
				if(table === undefined){
					return undefined;
				}
				
				if(table.tempRowMetaData === undefined){
					if(create === true){
						table.tempRowMetaData = {};
					}else{
						return undefined;
					}
				}
				
				if(table.tempRowMetaData[rowPk] === undefined && create === true){
					table.tempRowMetaData[rowPk] = OBJECT.extend({}, TABLES.rowMetaDataDefinition);
				}
				
				return table.tempRowMetaData[rowPk];
			};

			/**
			 * Gets the cell meta data for a row index and column.
			 * 
			 * @param table
			 * @param rowIndex
			 * @param columnId 
			 * @param create - (optional) if true will create the cell meta data if it doesn't exist.
			 * @returns
			 */
			tables.UTIL.getCellMetaData = function(table, rowIndex, columnId, create){
				if(table === undefined || table.cellMetaData === undefined){
					return undefined;
				}
				
				if(table.cellMetaData[rowIndex] === undefined){
					if(create){
						table.cellMetaData[rowIndex] = {};
					}else{
						return undefined;
					}
				}
				
				if(table.cellMetaData[rowIndex][columnId] === undefined){
					if(create){
						table.cellMetaData[rowIndex][columnId] = OBJECT.extend({}, TABLES.cellMetaDataDefinition);
					}else{
						return undefined;
					}
				}
				
				return table.cellMetaData[rowIndex][columnId];
			};
			
			/**
			 * Sets a render option on a cell. Optionaly combines existing render options from column, and row
			 * @param table
			 * @param rowIndex
			 * @param columnId
			 * @param option
			 * @param value
			 * @param combineColumnOptions
			 * @param combineRowOptions
			 * @returns - nothing.
			 */
			tables.UTIL.setCellMetaDataRendererOption = function(table, rowIndex, columnId, option, value, combineColumnOptions, combineRowOptions){
				
				var meta = TABLES.UTIL.getCellMetaData(table, rowIndex, columnId, true);
				if(meta === undefined){
					return;
				}
				
				if(meta[TABLES.metaTagRendererOptions] === undefined){
					
					meta[TABLES.metaTagRendererOptions] = {};
					
					if(combineColumnOptions === true){
						meta[TABLES.metaTagRendererOptions] = OBJECT.extend(meta[TABLES.metaTagRendererOptions], table.columnMetaData[columnId][TABLES.metaTagRendererOptions]);
					}
					
					if(combineRowOptions === true){
						var row_pk = TABLES.UTIL.findRowPk(table, rowIndex);
						if(row_pk !== undefined){
							meta[TABLES.metaTagRendererOptions] = OBJECT.extend(meta[TABLES.metaTagRendererOptions], table.rowMetaData[row_pk][TABLES.metaTagRendererOptions]);
						}
					}
				}
				
				meta[TABLES.metaTagRendererOptions][option] = value;
			};
			
			tables.UTIL.getMetaDataSet = function(table, rowIndex, columnIndex){
				var cellMetaData = {};
				if(table.cellMetaData[rowIndex] && table.cellMetaData[rowIndex][columnIndex]){
					cellMetaData = table.cellMetaData[rowIndex][columnIndex];
				}
				return {rowMetaData: table.rowMetaData[TABLES.UTIL.findRowPk(table, rowIndex)] || {}, columnMetaData: table.columnMetaData[columnIndex] || {}, cellMetaData:cellMetaData };
			};
			tables.UTIL.chooseMetaData=function(property, metaData){
				if(metaData.cellMetaData[property]!=undefined){
					return metaData.cellMetaData[property];
				}
				else if(metaData.rowMetaData[property]!=undefined){
					return metaData.rowMetaData[property];
				}
				else if(metaData.columnMetaData[property]!=undefined){
					return metaData.columnMetaData[property];
				}
				
				return undefined;
			};
			tables.UTIL.printTable=function(table, dir){
				if(table==SIGNALS.NOT_READY){
					return SIGNALS.NOT_READY;
				}
				direction = dir==undefined?"down":"up";
				LOG.create("////////// Table DEBUG \\\\\\\\\\\\\\\\\\\\\\\\"+direction+"))");
				var tableId = table.tableMetaData.id || "";
				LOG.create("TableID: "+tableId)+" "+direction;
				//LOG.create("Number of Rows "+table.data.length);
				//LOG.create(table.columnMetaData);

				LOG.create("TableMetaData");
				LOG.create(table.tableMetaData);
				
				LOG.create("ColumnMetaData");
				for(var columnIndex in table.columnMetaData){
					LOG.create(columnIndex+": "+OBJECT.toString(table.columnMetaData[columnIndex]));
				}
				
				LOG.create("RowMetaData");
				for(var rowIndex in table.rowMetaData){
					LOG.create(rowIndex+": "+OBJECT.toString(table.rowMetaData[rowIndex]));
				}
				
				LOG.create("CellMetaData");
				for(var rowIndex in table.cellMetaData){
					LOG.create(rowIndex+": "+OBJECT.toString(table.cellMetaData[rowIndex]));
				}
				
				LOG.create("Data");
				for(var rowIndex in table.data){
					LOG.create(rowIndex+": "+OBJECT.toString(table.data[rowIndex]));
				}
				LOG.create("**********************************\n");
				return table;
			};
			tables.UTIL.diff=function(table1, table2, idColumn){
				if(table1.data.length!=table2.data.length || Object.keys(table1.columnMetaData).length!=Object.keys(table2.columnMetaData).length){
					LOG.create("Tables do not match, unable to run diff");
					return [];
				}
				var diffs = [];
				for(var rowIndex in table1.data){
					for(var columnIndex in table1.data[rowIndex]){
						var cell1 = table1.data[rowIndex][columnIndex];
						var cell2 = table2.data[rowIndex][columnIndex];
						if(cell1!==cell2){
							diffs.push({primaryKeyValue: table1.data[rowIndex][table1.tableMetaData.primaryKey],row: rowIndex, column: columnIndex, newValue: cell1, oldValue: cell2, joinColumnValue: table1.data[rowIndex][idColumn]});
						}
					}
				}
				return diffs;
			};
			tables.UTIL.updateCell = function(table, joinColumn, joinColumnValue, valueColumn, oldValue, newValue){
				if(valueColumn===table.tableMetaData.primaryKey){
					return;
				}
				for(var rowIndex in table.data){
					if(table.data[rowIndex][joinColumn]===joinColumnValue && table.columnMetaData[valueColumn]!=undefined && table.data[rowIndex][valueColumn]===oldValue){
						//LOG.create("ACTUALLY UPDATING CELL");
						table.data[rowIndex][valueColumn] = newValue;
					}
				}
			};
			tables.UTIL.getValue = function(table, indexColumn, searchIndexValue, returnValueColumn){
				for(var rowIndex in table.data){
					if(table.data[rowIndex][indexColumn]===searchIndexValue){
						return table.data[rowIndex][returnValueColumn];
					}
				}
			};
			
			/**
			 * Extracts errors out of a table's meta data so that it can be inject again later.
			 * DO NOT MODIFY this function as it matches the server C error format.
			 * 
			 * @param table
			 * @returns Array of errors in format [{type: "table", error:{}}, {type: "row", rowPk: rowPk, error:{}}, {type: "cell", rowPk: rowPk, columnId: columnId, error:{}}]
			 * 
			 */
			tables.UTIL.extractServerErrors = function(table){
				if(table === undefined){
					return [];
				}
				
				var output = new Array();
				
				// Get any table errors
				if(table.tableMetaData.serverErrors && table.tableMetaData.serverErrors.length){
					
					for(var i=0; i<table.tableMetaData.serverErrors.length; i++){
						output.push({type: "table", error: table.tableMetaData.serverErrors[i]});
					}
				}
				
				// Get any temp row errors
				if(table.tempRowMetaData !== undefined){
					for(var row_pk in table.tempRowMetaData){
						var row_meta = table.tempRowMetaData[row_pk];
						if(row_meta.serverErrors && row_meta.serverErrors.length){
							
							for(var i=0; i<row_meta.serverErrors.length; i++){
								output.push({type: "row", rowPk: row_pk, error: row_meta.serverErrors[i]});
							}
						}
					}
				}
				
				// Get any row errors
				for(var row_pk in table.rowMetaData){
					var row_meta = table.rowMetaData[row_pk];
					if(row_meta.serverErrors && row_meta.serverErrors.length){
						
						for(var i=0; i<row_meta.serverErrors.length; i++){
							output.push({type: "row", rowPk: row_pk, error: row_meta.serverErrors[i]});
						}
					}
				}
				
				// Get any cell errors
				for(var row_index in table.cellMetaData){
					for(var column_id in table.cellMetaData[row_index]){
						
						var row_pk = TABLES.UTIL.findRowPk(table, row_index);
						var cell_meta = table.cellMetaData[row_index][column_id];
						if(cell_meta.serverErrors && cell_meta.serverErrors.length){
							
							for(var i=0; i<cell_meta.serverErrors.length; i++){
								output.push({type: "cell", rowPk: row_pk, columnId: column_id, error: cell_meta.serverErrors[i]});
							}
						}
					}
				}
				
				return output;
			};
			
			 /**
		     * Creates an error tag and prepends it to the passed container.
		     * It is important to call DOM.tidyErroredTags() after all error tags have been added.
		     */
		    tables.UTIL.createErroredTag = function(container, message){
		    	var jcontainer = jQuery(container);
		    	
		    	// DIV container is required for Firefox because you cannot set position:absolute directly inside a <td>
		    	var jdiv_container = jQuery('<div>', {'class':'errored_tag'});		
		    	var jdiv_tag = jQuery('<div>', {'class':'errored_tag_container'});
		    	jdiv_container.append(jdiv_tag);
		    	
		    	var jdiv_message = jQuery('<div>', {'class':'errored_tag_message'});
		    	jdiv_tag.append(
		    			jdiv_message,
		    			jQuery('<div>', {'class':'errored_tag_tag'})
		    			);
		    	
		    	jdiv_message.append(jQuery('<span>', {'class':'errored_tag_message_text', text:message}));
		    	
		    	jdiv_container.mouseover(function(){
		    		jdiv_message.removeAttr('style');
		    		jdiv_message.css('box-shadow', '1px 1px 5px #666666');
		    		jdiv_tag.removeAttr('style');
		    		jdiv_tag.css('z-index', 10);
		    	});
		    	
		    	jdiv_container.mouseout(function(){
		    		jdiv_tag.removeAttr('style');
		    		jdiv_message.removeAttr('style');
		    		
		    		DOM.tidyErroredTags();
		    	});
		    	
		    	jcontainer.prepend(jdiv_container);
		    };
			
			/**
			 * Injects server errors into a table's meta data.
			 * This is used to combine server errors created by AviatSetError
			 * DO NOT MODIFY this function as it matches the server C error format.
			 * 
			 * @param table
			 * @param serverErrors - Expected format [{type: "table", error:{}}, {type: "row", rowPk: rowPk, error:{}}, {type: "cell", rowPk: rowPk, columnId: columnId, error:{}}]
			 * @returns
			 */
			tables.UTIL.injectServerErrors = function(table, serverErrors){
				if(table === undefined || serverErrors === undefined || !serverErrors.length){
					return;
				}			
				
				for(var i=0; i<serverErrors.length; i++){
					var error = serverErrors[i];
					
					switch(error.type){
					case 'table':
						
						if(table.tableMetaData.serverErrors === undefined){
							table.tableMetaData.serverErrors = [];
						}
						table.tableMetaData.serverErrors.push(error.error);
						
						break;
					case 'row':
						
						var row_pk = error.rowPk;
						var row_meta = undefined;
						
						// Handle server temp rows differently from normal rows
						if(TABLES.UTIL.isServerTempPk(row_pk)){
							
							// Convert pk to local pk
							row_pk = TABLES.UTIL.convertServerTempPkToTempPk(row_pk);
							if(row_pk === false){
								continue;
							}
							
							// Store in temp row meta data
							row_meta = TABLES.UTIL.getTempRowMetaData(table, row_pk, true);
						}else{
							row_meta = TABLES.UTIL.getRowMetaData(table, row_pk, true);
						}
						
						if(row_meta !== undefined){
							if(row_meta.serverErrors === undefined){
								row_meta.serverErrors = [];
							}
							row_meta.serverErrors.push(error.error);
						}
						
						
						break;
					case 'cell':
						
						var row_pk = error.rowPk;
						var column_id = error.columnId;
						var row_index = TABLES.UTIL.findRowIndex(table, row_pk);
						var cell_meta = TABLES.UTIL.getCellMetaData(table, row_index, column_id, true);
						if(cell_meta !== undefined){
							if(cell_meta.serverErrors === undefined){
								cell_meta.serverErrors = [];
							}
							cell_meta.serverErrors.push(error.error);
						}
						
						break;
					}
				}
				
			};
			
			/**
			 * Formats a table with a message for when a table has no data in it.
			 * @param table
			 * @param message
			 * @returns
			 */
			tables.UTIL.setTableNoDataMessage = function(table, message){
				table.tableMetaData.primaryKey = 'index';
				table.tableMetaData.canSelect = false;
				table.tableMetaData.canAdd = false;
				table.tableMetaData.canDelete = false;
				table.tableMetaData.readonly = true;
				table.tableMetaData.emptyMessage = message;
				
				TABLES.UTIL.addColumn(table, 'index', '');
				table.columnMetaData['index'].visible = false;
				return table;
			};
			
			/**
			 * Takes a tempoary rowPk and formats it into version that we can send to the server.
			 * @param rowPk
			 * @returns
			 */
			tables.UTIL.convertTempPkToServerTempPk = function(rowPk){
				var rowPkString = new String(rowPk); 
				if(rowPkString.indexOf(TABLES.tempPkPrefix) === -1){
					LOG.create("Error, Not a temp RowPk - " + rowPk);
					return false;
				}
				
				var rowPkInt = parseInt(rowPkString.replace(TABLES.tempPkPrefix, ""));
				if(isNaN(rowPkInt)){
					LOG.create("Error, Not a valid temp RowPk - " + rowPk);
					return false;
				}
				
				return rowPkInt * -1;
			};
			
			/***
			 * Checks if a rowPk is a server temp Pk
			 * @returns
			 */
			tables.UTIL.isServerTempPk = function(rowPk){
				var rowPkInt = parseInt(rowPk);
				if(isNaN(rowPkInt) || rowPk >= 0){
					return false;
				}
				
				return true;
			};
			
			/**
			 * Takes a server formated rowPk and converts it back into tempoary rowPk 
			 * @param rowPk
			 * @returns
			 */
			tables.UTIL.convertServerTempPkToTempPk = function(rowPk){
				if(!TABLES.UTIL.isServerTempPk(rowPk)){
					LOG.create("Error, Not a valid server RowPk - " + rowPk);
				}
				var rowPkInt = parseInt(rowPk);
				rowPkInt *= -1;
				
				return TABLES.tempPkPrefix + rowPkInt;
			};
			
			tables.UTIL.createCellMeta = function(table, rowIndex, columnIndex, metaData){				
				if(table.cellMetaData[rowIndex]==undefined){
					table.cellMetaData[rowIndex] = {};
				}
				if(table.cellMetaData[rowIndex][columnIndex]==undefined){
					table.cellMetaData[rowIndex][columnIndex] = OBJECT.clone(tables.cellMetaDataDefinition);
				}
				if(metaData!=undefined){
					OBJECT.extend(table.cellMetaData[rowIndex][columnIndex], metaData);
				}
				
			};
		//}
		
	//};
	
	
	/**
		 * Creates an string error message from an array of server errors.
		 */
		tables.extractServerErrorMessage = function(serverErrors){
			var errors = [];
			
			if(serverErrors !== undefined && serverErrors.length){
				for(var i=0; i<serverErrors.length; i++){
					var error = serverErrors[i];
					if((error.message !== undefined) && (error.message.length > 0)){
						// Ensure we don't have duplicate messages
						if(errors.indexOf(error.message) === -1){
							errors.push(error.message);
						}
					}
				}
			}
		  
			return errors.join(', ');
		};
	
	/**
     * Removes overlaps in error tags.
     */
    tables.tidyErroredTags = function(){
    	// Adjust tags so they don't overlap each other
    	jQuery('.errored_tag_container').each(function() {
    		
    		var jtarget = jQuery(this);
    	    var bounds = jtarget.offset();
    	    bounds.right = bounds.left + jtarget.outerWidth();
    	    bounds.bottom = bounds.top + jtarget.outerHeight();
    	    
    	    var max_overlap = 0;
    	    jQuery('.errored_tag_container').not(jtarget).each(function() {
    	    	
    	    	var jother = jQuery(this);
    	    	var pos = jother.offset();
    	    	
    	    	if(pos.left >= bounds.left && pos.left <= bounds.right
    	    			&& pos.top >= bounds.top && pos.top <= bounds.bottom){
    	    		
    	    		// Overlap found, see if largest
    	    		var overlap = (bounds.right - pos.left);
    	    		if(overlap > max_overlap){
    	    			max_overlap = overlap;
    	    		}
    	    	}
    	    	
    	    });
    		
    	    // Adjust width of target tag so it doesn't overlap
    	    if(max_overlap > 0){
    	    	jtarget.css('max-width', jtarget.outerWidth() - (max_overlap + 10));
    	    }
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
	 * @returns object {}
	 */
	tables.changeSetMerge = function(tableSourceB, changeE, applyE, clearE, addE, deleteE, emptyE, undoColumnE, deleteColumnE){
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
				applyE.mapE(function(){return SIGNALS.APPLY_STATES.APPLYING;}),
				applyResultE.mapE(function(value){
					return value ? SIGNALS.APPLY_STATES.SUCCESS : SIGNALS.APPLY_STATES.ERROR;
				}));
		// Handle general set errors
		// -------------------------
		// Create an event for any set ERROR
		var set_errorE = tableSourceB.changes().filterE(function(val){
			 SIGNALS.isSetErrored(val);
			 return true;
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
			return OBJECT.extend(value, {command: 'source'});
		});
		
		var command_changeE = changeE.mapE(function(value){
			return OBJECT.extend(value, {command: 'change'});
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
							if(rowData[columnIndex] == state.changeset[rowPk][columnIndex].value){
								// Value is same as server, remove from changeset
								OBJECT.delete(state.changeset[rowPk], columnIndex);
								
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
											OBJECT.delete(state.changeset[rowPk], columnIndex);
											
										}else{
											// Create an error
											var cellMeta = TABLES.UTIL.getCellMetaData(newVal, rowIndex, columnIndex, true);
											cellMeta.serverErrors = new Array();
											cellMeta.serverErrors.push(SIGNALS.newError("Failed to set value on device RowIndex: "+rowIndex+" ColIndex:"+columnIndex, 0));
										}
									}
								}
							}
						}
						
						// If no cells in row changeset then remove row
						if(Object.keys(state.changeset[rowPk]).length == 0){
							OBJECT.delete(state.changeset, rowPk);
						}
						
					}else{
						
						// Row not found in table, but exists in changeset
						// 1) It has been deleted from server
						// 2) It is a locally added row
						
						// Is row an add?
						if((rowPk + '').indexOf(TABLES.tempPkPrefix) != -1){
							// Yes - added row
							
							// If response to apply, check that row applied without any error
							if(isApplyResponse){
								
								// Check if we got an error for this row
								if(applyingRow && !hasTableError){
									var tempRowMeta = TABLES.UTIL.getTempRowMetaData(newVal, rowPk);
									if(tempRowMeta === undefined || tempRowMeta.serverErrors === undefined || tempRowMeta.serverErrors.length === 0){
										// No errors so row must have applied successfully - remove from changeset
										OBJECT.delete(state.changeset, rowPk);
									}
								}
							}
							
						}else{
							// No - must be deleted from source - remove from changeset
							OBJECT.delete(state.changeset, rowPk);
						}
					}
				}
				
				if(isApplyResponse){
					// Extract any errors from the server and cache them.
					state.errors = TABLES.UTIL.extractServerErrors(newVal);
					
					// Reset applyId so we don't process response again
					applyResultE.sendEvent(state.errors.length === 0);
				}
				break;
			case 'change':
				// Update changeset with change 
				// Compare change to source data
				var removeErrors = false;
				var source_row_data = TABLES.UTIL.findRow(sourceB.valueNow(), newVal.rowPk);
				if(source_row_data == false || source_row_data[newVal.columnIndex] != newVal.value){
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
					OBJECT.delete(state.changeset[newVal.rowPk], newVal.columnIndex);
					
					// If no cells in row changeset then remove row
					if(Object.keys(state.changeset[newVal.rowPk]).length == 0){
						OBJECT.delete(state.changeset, newVal.rowPk);
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
					OBJECT.delete(state.changeset, rowPk);
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
							if(arrayContains(newVal.value, error.rowPk, false)){
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
						OBJECT.delete(state.changeset[rowPk], newVal.value[index]);
						if(Object.keys(state.changeset[rowPk]).length == 0){
							OBJECT.delete(state.changeset, rowPk);
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
							if(arrayContains(newVal.value, error.columnId, false)){
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
				state.changeset[rowPk][source_pk_column] = OBJECT.extend({}, TABLES.changeDefinition, {value: rowPk});
				
				// Fill columns of new row with default column values;
				for(var columnIndex in source_col_meta){
					
					if(columnIndex != source_pk_column){
						state.changeset[rowPk][columnIndex] = OBJECT.extend({}, TABLES.changeDefinition, {value: source_col_meta[columnIndex].defaultValue});
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
						OBJECT.delete(state.changeset, rowPk);
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
							if(arrayContains(newVal.value, error.rowPk, false)){
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
			var output =OBJECT.clone(source_table);	
			var pk_column = output.tableMetaData.primaryKey;
			
			// Apply changeset to output
			// -------------------------
			
			//Remove meta data for items removed from changeset
			for(var rowPk in output.rowMetaData){
				if(output.rowMetaData[rowPk].userChange!=undefined && output.rowMetaData[rowPk].userChange && state.changeset[rowPk]==undefined){
					OBJECT.delete(output.rowMetaData[rowPk], "userChange");
					var rowIndex = TABLES.UTIL.findRowIndex(output, rowPk);
					for(var columnIndex in output.cellMetaData[rowIndex]){
						if(output.cellMetaData[rowIndex][columnIndex].userChange){
							OBJECT.delete(output.cellMetaData[rowIndex][columnIndex], "userChange");
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
					output.rowMetaData[rowPk] = OBJECT.extend({}, TABLES.rowMetaDataDefinition);
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
							output.cellMetaData[row_index][columnIndex] = OBJECT.extend({}, TABLES.cellMetaDataDefinition);
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

	
	return tables;
})(TABLES || {});


