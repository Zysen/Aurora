var TABLES = (function(tables){
	tables.COMMANDS = {GET_ROWS:0, SET_ROW:1, DELETE_ROW:2, ADD_ROW:3, UPDATE_RESPONSE:4, GET_COLUMNS:5, CHANGE_SET:6};
	
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
		tables.metaTagZebraStyle = {None: 0, Horizontal: 1, Vertical: 2, Both: 3};
		
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
			if(defaultColumns!==undefined){
				for(var columnId in defaultColumns){
					TABLES.UTIL.addColumn(table, columnId, defaultColumns[columnId].name, defaultColumns[columnId].type, defaultColumns[columnId].key);
				}
			}
			
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
					if(table.columnMetaData[key] === undefined){
						var column_meta =OBJECT.clone(columnMetaDataDef);
						column_meta.id = key;
						column_meta.name = key.replaceAll('_', ' ').toProperCase();
						column_meta.dataType = typeof value;
						switch(column_meta.dataType){
						case "number":
							column_meta.defaultValue = 0;
							break;
						case "string":
							column_meta.defaultValue = '';
							break;
						case "boolean":
							column_meta.defaultValue = false;
							break;
						default:
							column_meta.defaultValue = undefined;
							break;
						}
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
			
			if(table.columnMetaData.length > 0 && table.columnMetaData[primaryKey]===undefined){
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
                return SIGNALS.chooseSignal();
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
                return SIGNALS.chooseSignal();
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
			
			return F.liftBI(function(table1, table2){
				if(!good()){
					return SIGNALS.chooseSignal();
				}
				
				table1Columns = table1.columnMetaData;
				table2Columns = table2.columnMetaData;
				
				sourceTable1 = table1;
				sourceTable2 = table2;
				
				var newTable = OBJECT.clone(table1);
				newTable.tableMetaData.id ="("+table1.tableMetaData.id+"+"+table2.tableMetaData.id+")";
				newTable.data = [];

				var table2NewColumns = OBJECT.clone(table2.columnMetaData);
				OBJECT.remove(table2NewColumns, joinColumn);
				OBJECT.extend(newTable.columnMetaData, table2NewColumns);

				for(var row1Index in table1.data){
					for(var row2Index in table2.data){
						if(table1.data[row1Index][joinColumn]===table2.data[row2Index][joinColumn]){
							var table2Row = OBJECT.clone(table2.data[row2Index]);
							OBJECT.remove(table2Row, joinColumn);
							newTable.data[newTable.data.length] = OBJECT.extend(OBJECT.clone(table1.data[row1Index]), table2Row);//.splice(table2indexColumn, 1)
						}
					}
				}
				return newTable;
			}, function(newTable, oldTable){
				var leftTable = OBJECT.clone(sourceTable1);
				var rightTable = OBJECT.clone(sourceTable2);
				
				//log("Table Upwards for "+newTable.tableMetaData.id);
				var newTablePrimaryColumn = newTable.tableMetaData.primaryKey;
				var diffs = TABLES.UTIL.diff(newTable, oldTable, joinColumn);
				
				for(var diffIndex in diffs){							//For each detected different cell
					var diff = diffs[diffIndex];
					if(diff.column===newTable.tableMetaData.primaryKey){
						log("Cannot change primary key value in table "+newTable.tableMetaData.id);
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
					return SIGNALS.chooseSignal();
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
					return SIGNALS.chooseSignal();
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
		 * A fast single direction table filter.
		 * Filters a tableB by calling the supplied filter callback for each row in table.
		 * @param tableB
		 * @param filterCallback (rowData, rowIndex) - function called for each row. Function should return false to filter out, true to not.
		 * @returns tableB
		 */ 
		tables.filterRowsB = function(tableB, filterCallback){
			
			return tableB.liftB(function(table){
				if(!good()){
					return SIGNALS.chooseSignal();
				}
				
				// Fast clone table before we remove rows.
				var data = table.data;
				var cellMetaData = table.cellMetaData;
				var rowMetaData = table.rowMetaData;
				
				table.data = [];
				table.cellMetaData = [];
				table.rowMetaData = {};
				
				var new_table = OBJECT.clone(table);
				
				table.data = data;
				table.cellMetaData = cellMetaData;
				table.rowMetaData = rowMetaData;
				
				for(var rowIndex=0; rowIndex < table.data.length; rowIndex++){
					
					if(filterCallback(table.data[rowIndex], rowIndex)){
						
						// Add the row to the output
						var rowPk = table.data[rowIndex][table.tableMetaData.primaryKey];
						if(table.rowMetaData[rowPk] !== undefined){
							new_table.rowMetaData[rowPk] = OBJECT.clone(table.rowMetaData[rowPk]);
						}
						
						if(table.cellMetaData[rowIndex] !== undefined){
							new_table.cellMetaData.push(OBJECT.clone(table.cellMetaData[rowIndex]));
						}else{
							new_table.cellMetaData.push({});
						}
						
						new_table.data.push(OBJECT.clone(table.data[rowIndex]));
					}
				}
				
				return new_table;
			});
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
					return SIGNALS.chooseSignal();
				}
				
				// Store pointer to source table so we can use on upwards transform.
				sourceTable = table;
				
				// Clone table before we remove rows.
				var newTable =OBJECT.clone(table);
				filterRows = [];
				
				// Collect rowPks of rows to remove
				// Remove rows from data and meta data
				var original_row_index = 0;
				for(var rowIndex = 0; rowIndex < newTable.data.length; rowIndex++){
					var rowPk = newTable.data[rowIndex][newTable.tableMetaData.primaryKey];
					if(!filterCallback(newTable.data[rowIndex], original_row_index)){
						
						newTable.data.splice(rowIndex, 1);
						newTable.cellMetaData.splice(rowIndex, 1);
						OBJECT.delete(newTable.rowMetaData, rowPk);
						
						filterRows.push(rowPk);
						rowIndex--;
					}
					original_row_index++;
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
					
					if(origRowIndex !== false){
						upwardsClone.data[origRowIndex] =OBJECT.clone(modifiedTable.data[rowIndex]);
						upwardsClone.cellMetaData[origRowIndex] =OBJECT.clone(modifiedTable.cellMetaData[rowIndex]);
						upwardsClone.rowMetaData[rowPk] =OBJECT.clone(modifiedTable.rowMetaData[rowPk]);
					}
				}
				
				// Insert any new rows
				// Fix for 10066
				for(var rowIndex in modifiedTable.data){
					var rowPk = modifiedTable.data[rowIndex][sourceTable.tableMetaData.primaryKey];
					var rowMeta = TABLES.UTIL.getRowMetaData(modifiedTable, rowPk, false);
					if(rowMeta !== undefined && rowMeta.newRow === true) {
						var newRowIndex = upwardsClone.data.length;
						upwardsClone.data[newRowIndex] = OBJECT.clone(modifiedTable.data[rowIndex]);
						upwardsClone.cellMetaData[newRowIndex] = OBJECT.clone(modifiedTable.cellMetaData[rowIndex]);
						upwardsClone.rowMetaData[rowPk] = OBJECT.clone(modifiedTable.rowMetaData[rowPk]);
					}
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
			var newColumnMetaData = {};
			var columnNumber = 0;
			
			for(var rowIndex in table.data){	//Make sure that there is rowMetaData. After rotation rowMeta becomes columnMeta, and TableWidget wont render if there is no column meta data.
				var pk = table.data[rowIndex][table.tableMetaData.primaryKey];
				if(table.rowMetaData[pk]===undefined){
					TABLES.UTIL.getRowMetaData(table, pk, true);
				}
			}
			
			for(var columnIndex in table.columnMetaData){
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
				if(columnIndex=="rotatePk"){
					continue;
				}
				for(var rowIndex in table.data){
					var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);

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
						OBJECT.remove(newColumnMetaData[rowId], "rotatePk");
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
					return table;
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
		
		tables.sortBI=function(tableBI, column, unSortOnSet){
			unSortOnSet = (unSortOnSet === undefined) ? true : unSortOnSet;
			var sourceTable = undefined;
			return F.liftBI(function(table){
				if(!good()){
					return SIGNALS.chooseSignal();
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
				if(!unSortOnSet){
					return [tab];
				}
				
				var table = OBJECT.clone(tab);
				var newData = [];
				var newCellMetaData = [];
				
				for(var rowIndex in sourceTable.data){
					var rowPk = TABLES.UTIL.findRowPk(sourceTable, rowIndex);
					for(var newRowIndex in table.data){
						var newRowPk = TABLES.UTIL.findRowPk(table, newRowIndex);
						if(rowPk===newRowPk){
							newData.push(table.data[newRowIndex]);
							newCellMetaData.push(table.cellMetaData[newRowIndex]);
							break;
						}
					}
				}
				
				for(var newRowIndex in table.data){
					var newRowPk = TABLES.UTIL.findRowPk(table, newRowIndex);
					var newRowMeta = TABLES.UTIL.getRowMetaData(table, newRowPk, false);
					if(newRowMeta && newRowMeta.newRow){
						newData.push(table.data[newRowIndex]);
						newCellMetaData.push(table.cellMetaData[newRowIndex]);
					}
				}
				
				table.data = newData;
				table.cellMetaData = newCellMetaData;
				return [table];
			}, tableBI);
		};
		
		/**
		 * Combines multiple columns into a single column.
		 * Data from the columns is placed into an object in the new column.
		 * 
		 * @param tableBI - table to operate on
		 * @param fromColumns - Array of columns to collapse
		 * @param intoColumn - (String) name of column to collapse data into. Column should not already exist.
		 */ 
		tables.collapseColumnsBI = function(tableBI, fromColumns, intoColumn){
			
			if(!fromColumns.length){
				throw 'fromColumns should be array';
			}
			
			return F.liftBI(function(table){
				// Down
				if(!good()){
					return SIGNALS.chooseSignal();
				}
				
				table = OBJECT.clone(table);
				
				// Add new column
				TABLES.UTIL.addColumn(table, intoColumn);
				
				// Combine data from columns into object
				for(var rowIndex in table.data){
					var rowData = table.data[rowIndex];
					var cellData = {};
					var cellMetaData = TABLES.UTIL.getCellMetaData(table, rowIndex, intoColumn, true);
					
					for(var key in fromColumns){
						var columnId = fromColumns[key];
						cellData[columnId] = rowData[columnId];
						
						var cellMetaDataFrom = TABLES.UTIL.getCellMetaData(table, rowIndex, columnId, false);
						if(cellMetaDataFrom !== undefined){
							table.cellMetaData[rowIndex][intoColumn] = jQuery.extend(cellMetaData, cellMetaDataFrom);
						}
					}
					
					rowData[intoColumn] = cellData;
				}
				
				// Remove columns
				for(var key in fromColumns){
					var columnId = fromColumns[key];
					TABLES.UTIL.removeColumn(table, columnId);
				}
				
				return table;
			}, 
			function(table) {
				// Up
				
				// Add back columns
				for(var key in fromColumns){
					var columnId = fromColumns[key];
					TABLES.UTIL.addColumn(table, columnId);
				}
				
				// Extract data from object back into columns
				for(var rowIndex in table.data){
					var rowData = table.data[rowIndex];
					var cellData = rowData[intoColumn];
					var cellMetaData = TABLES.UTIL.getCellMetaData(table, rowIndex, intoColumn, false);
					
					for(var key in fromColumns){
						var columnId = fromColumns[key];
						rowData[columnId] = cellData[columnId];
						
						if(cellMetaData !== undefined){
							if(table.cellMetaData[rowIndex] === undefined){
								table.cellMetaData[rowIndex] = {};
							}
							
							table.cellMetaData[rowIndex][columnId] = OBJECT.clone(cellMetaData);
						}
					}
				}
				
				// Remove added column
				TABLES.UTIL.removeColumn(table, intoColumn);
				
				return [table]
			}, 
			tableBI);
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
						OBJECT.remove(table.cellMetaData[rowIndex][columnIndex], "userChange");
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
			
			tables.UTIL.findRows = function(table, column, value){
                var searchColumn = value==undefined?table.tableMetaData.primaryKey:column;
                var searchValue = value==undefined?column:value;
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
				var pk = table.tableMetaData.primaryKey;
				var l = table.data.length;
				for(var rowIndex=0; rowIndex<l; rowIndex++){
					if(table.data[rowIndex][pk]==rowId){
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
            
            tables.UTIL.getRotatedTableMappings = function(table){
            	var rowIds = Object.keys(table.columnMetaData);
            	
            	var columnIds = {};
            	for(var rowPk in table.rowMetaData){
            		columnIds[table.rowMetaData[rowPk].id] = rowPk;
            	}
            	// Return this back to front on purpose
            	return {rowIds: columnIds, columnIds: rowIds};
            };
            
			/**
			 * Adds a new row to the table
			 * Assigns default values to the data based on columnMetaData's defaultValue.
			 * @param table
			 * @param rowPk - Primary key value of row that is being added
			 * @returns - Index of row added.
			 */
			tables.UTIL.addRows = function(table, rowPk, arr){
				for(var index in arr){
					tables.UTIL.addRow(table, arr[index][rowPk], arr[index]);
				}
				return table;
			};
			tables.UTIL.addRow = function(table, rowPk, newData){
				var rowIndex = TABLES.UTIL.findRowIndex(table, rowPk);
				if(rowIndex !== false){
					//LOG.create('Error, cannot add row. Table already has primary key of ' + rowPk);
					OBJECT.extend(table.data[rowIndex], newData);
					return rowIndex;
				}
				if(newData==undefined){
					var newData = {};
					for(var columnIndex in table.columnMetaData){
						var column_meta_data = table.columnMetaData[columnIndex];
						if(column_meta_data.processor == TABLES.metaTagProcessorType.clientServerPair){		//clientServerPair
							newData[columnIndex] = {server: column_meta_data.defaultValue, client: column_meta_data.defaultValue};
						}else{
							newData[columnIndex] = column_meta_data.defaultValue;
						}
					}
				}
				newData[table.tableMetaData.primaryKey] = rowPk;
				table.data.push(newData);
				return (table.data.length - 1);
			};
			
			tables.UTIL.addColumn = function(table, columnId, columnName, dataType, key){
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
				if(key!==undefined){
					table.columnMetaData[columnId].key = key;
				}
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
				if(table.cellMetaData[rowIndex] !== undefined && table.cellMetaData[rowIndex] !== null && table.cellMetaData[rowIndex][columnIndex] !== undefined){
					cellMetaData = table.cellMetaData[rowIndex][columnIndex];
				}
				return {rowMetaData: table.rowMetaData[TABLES.UTIL.findRowPk(table, rowIndex)] || {}, columnMetaData: table.columnMetaData[columnIndex] || {}, cellMetaData:cellMetaData };
			};
			tables.UTIL.chooseMetaData=function(property, metaData){
				if(metaData.cellMetaData[property]!=undefined){
					return metaData.cellMetaData[property];
				}
				else if(metaData.rowMetaData[property]!==undefined){
					return metaData.rowMetaData[property];
				}
				else if(metaData.columnMetaData[property]!==undefined){
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
				LOG.create("TableID: "+tableId+" "+direction);
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
				console.log("Object.keys tables.shared.js tables.UTIL.diff");
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
						if(row_index !== false){
							var cell_meta = TABLES.UTIL.getCellMetaData(table, row_index, column_id, true);
							if(cell_meta !== undefined){
								if(cell_meta.serverErrors === undefined){
									cell_meta.serverErrors = [];
								}
								cell_meta.serverErrors.push(error.error);
							}
						} else {
							// Row index not found - maybe temp or calculated row, so store errors in rowMeta.
							var row_meta = TABLES.UTIL.getRowMetaData(table, row_pk, true);
							if(row_meta !== undefined){
								if(row_meta.serverErrors === undefined){
									row_meta.serverErrors = [];
								}
								
								// Store column id so we can use it later
								var newError = OBJECT.clone(error.error);
								newError.columnId = column_id;
								row_meta.serverErrors.push(newError);
							}
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
			
			tables.UTIL.extractChangeset = function(table){
				var changeSet = [];
				applyId = table.tableMetaData.applyId;
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
							rowChangeData["$.delete"] = true;
							changeSet.push(rowChangeData);
							continue;
						}
	
	
						// Set type of update it is.
						rowChangeData.mode = isAdd ? SERVER_UPDATE_MODES.ADD : isDeleted ? SERVER_UPDATE_MODES.DELETE : SERVER_UPDATE_MODES.UPDATE; 
						
						// Send individual cells if changed
						for(var columnIndex in table.data[rowIndex]){
							if(columnIndex === table.tableMetaData.primaryKey) {
								continue;
							}
							
							var metaData = TABLES.UTIL.getMetaDataSet(table, rowIndex, columnIndex);
							if(metaData.cellMetaData.userChange === true){
								// If adding convert rowPk to something server understands
								changeRowMapping.push(rowIndex);
								rowChangeData[columnIndex] = row[columnIndex];
							}
						}
						changeSet.push(rowChangeData);
					}
				}
				return changeSet;
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
	
	return tables;
})(TABLES || {});


