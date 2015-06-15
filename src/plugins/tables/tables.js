	/*
	//Receive From Server during SET
		errors:[
			{
				"rowErrors":"ERROR_TEXT",
				"index":"ERROR_TEXT",
				"username":"ERROR_TEXT",
				"firstname":"ERROR_TEXT",
				"lastname":"ERROR_TEXT",
				"groupId":"ERROR_TEXT"
			},
			{
				"rowErrors":"ERROR_TEXT",
				"index":"ERROR_TEXT",
				"username":"ERROR_TEXT",
				"firstname":"ERROR_TEXT",
				"lastname":"ERROR_TEXT",
				"groupId":"ERROR_TEXT"
			},
		],
		
		
		//Receive From Server during GET
		tableMetaData: {id:undefined, name:undefined, primaryKey:"userid", readonly:false},
		columnMetaData:{
			"index":{name:undefined,foreignKey: false, readonly:false, dataType:"int", defaultValue:""]},
			"username":{name:undefined,foreignKey: false, readonly:false, dataType:"int", defaultValue:""]},
			"firstname":{name:undefined,foreignKey: false, readonly:false, dataType:"int", defaultValue:""]},
			"lastname":{name:undefined,foreignKey: false, readonly:false, dataType:"int", defaultValue:""]},
			"groupId":{name:undefined,foreignKey: false, readonly:false, dataType:"int", defaultValue:""]}
		},
		
		rowMetaData:{
			2:{name:undefined, readonly:false, dataType:undefined, defaultValue:""},
			3:{name:undefined, readonly:false, dataType:undefined, defaultValue:""}
		
		cellMetaData:[
			{
				"userid":{readonly:false, dataType:undefined, defaultValue:""},
				"username":{readonly:false, dataType:undefined, defaultValue:""},
				"firstname":{readonly:false, dataType:undefined, defaultValue:""},
				"lastname":{readonly:false, dataType:undefined, defaultValue:""},
				"groupId":{readonly:false, dataType:undefined, defaultValue:""}
			},
			{
				"userid":{readonly:false, dataType:undefined, defaultValue:""},
				"username":{readonly:false, dataType:undefined, defaultValue:""},
				"firstname":{readonly:false, dataType:undefined, defaultValue:""},
				"lastname":{readonly:false, dataType:undefined, defaultValue:""},
				"groupId":{readonly:false, dataType:undefined, defaultValue:""}
			},
		],
		
		data:[
			{
				"userid":2,
				"username":"jhalse",
				"firstname":"Jono",
				"lastname":"Halse",
				"groupId":3
			},
			{
				"userid":3,
				"username":"dvevar",
				"firstname":"David",
				"lastname":"Vevar",
				"groupId":3
			}
		]
		
		
		
		
		
		
		//In Javascript
		
		tableMetaData: {id:undefined, name:undefined, primaryKey:"userid", validator:validators.trueValidator, readonly:false, sortable:true, visible:true, error:"", userChange: true},
		columnMetaData:{
			"index":{id:undefined, name:undefined,foreignKey: false,  validator:validators.trueValidator, renderer: renderers.defaultRenderer, readonly:false, visible:true, sortable:true, width:undefined, dataType:"int", defaultValue:"", error:"ERROR_TEXT"]},
			"username":{id:undefined, name:undefined,foreignKey: false,  validator:validators.trueValidator, renderer: renderers.defaultRenderer, readonly:false, visible:true, sortable:true, width:undefined, dataType:"string", defaultValue:"", error:"ERROR_TEXT"]},
			"firstname":{id:undefined, name:undefined,foreignKey: false,  validator:validators.trueValidator, renderer: renderers.defaultRenderer, readonly:false, visible:true, sortable:true, width:undefined, dataType:"string", defaultValue:"", error:"ERROR_TEXT"]},
			"lastname":{id:undefined, name:undefined,foreignKey: false,  validator:validators.trueValidator, renderer: renderers.defaultRenderer, readonly:false, visible:true, sortable:true, width:undefined, dataType:"string", defaultValue:"", error:"ERROR_TEXT"]},
			"groupId":{id:undefined, name:undefined,foreignKey: false,  validator:validators.trueValidator, renderer: renderers.defaultRenderer, readonly:false, visible:true, sortable:true, width:undefined, dataType:"int", defaultValue:"", error:"ERROR_TEXT"]}
		},
		
		rowMetaData:{
			2:{id:undefined, name:undefined, validator:validators.trueValidator, renderer: renderers.defaultRenderer, visible:true, readonly:false, dataType:undefined, defaultValue:"", error:"ERROR_TEXT", userChange: true},
			3:{id:undefined, name:undefined, validator:validators.trueValidator, renderer: renderers.defaultRenderer, visible:true, readonly:false, dataType:undefined, defaultValue:"", error:"ERROR_TEXT", userChange: false}
		},
		
		cellMetaData:[
			{
				"userid":{id:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""},
				"username":{id:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""},
				"firstname":{id:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""},
				"lastname":{id:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""},
				"groupId":{id:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""}
			},
			{
				"userid":{id:undefined, name:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""},
				"username":{id:undefined, name:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""},
				"firstname":{id:undefined, name:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""},
				"lastname":{id:undefined, name:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""},
				"groupId":{id:undefined, name:undefined, renderer: renderers.defaultRenderer, validator:validators.trueValidator, readonly:false, dataType:undefined, defaultValue:"", error:""}
			},
		],
		
		data:[
			{
				"userid":2,
				"username":"jhalse",
				"firstname":"Jono",
				"lastname":"Halse",
				"groupId":3
			},
			{
				"userid":3,
				"username":"dvevar",
				"firstname":"David",
				"lastname":"Vevar",
				"groupId":3
			}
		]
	}
	*/

var TABLES = (function(tables){
	var validators = {
		trueValidator: function(){return true;}
	};

	var columnMetaDataDef = {name:undefined, foreignKey: false, readonly:false, sortable:true, dataType:"string", defaultValue:""};
	var rowMetaDataDef = {name:undefined, defaultValue:""};
	var cellMetaDataDef = [];
	
	
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
	
	return {
		
		// Meta data constants
		// -------------------
		metaTagDisabled: 'disabled',
		metaTagError: 'error',
		metaTagReadOnly: 'readonly',
		metaTagRendererOptions: 'rendererOptions',
		metaTagProcessor: 'processor',
		metaTagProcessorType: {clientServerPair: 'clientServerPair'},
		
		metaTagHeadingStyle: {None: 0, Horizontal: 1, Vertical: 2},
		metaTagZebraStyle: {None: 0, Horizontal: 1, Vertical: 2, Both: 3},
		
		// Temp Pk functions
		// -----------------
		
		// Added row pk identifier
		tempPkPrefix: 'temp',
		
		/**
		 * @returns Temporary primary key for rows added to a table.
		 */
		getNewPk: function(){
			return this.tempPkPrefix + (temp_id_counter++);
		},
		
		// Table structure definitions
		// ---------------------------
		changeDefinition: changeDef,
		columnMetaDataDefinition: columnMetaDataDef,
		rowMetaDataDefinition: rowMetaDataDef,
		cellMetaDataDefinition: cellMetaDataDef,
		tableDefinition: tableDef,
		rendererStateDefinition: rendererStateDef,
		
		/**
		 * Formats object into a table data structure.
		 * Columns are automatically created
		 * @param tableId
		 * @param primaryKey
		 * @param data
		 * @returns
		 */
		formatData: function(tableId, primaryKey, data){			
			var table = OBJECT.clone(tableDef);
			table.tableMetaData.primaryKey = primaryKey;
			table.tableMetaData.id = tableId;
			
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
						var column_meta = OBJECT.clone(columnMetaDataDef);
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
				table.rowMetaData[rowPk] = jQuery.extend({}, TABLES.rowMetaDataDefinition, {id:rowPk, name: rowPk});
			}
			if(table.columnMetaData.length > 0 && table.columnMetaData[primaryKey]==undefined){
				log("Error - Specified primary key does NOT exist in the data set. The widgets will likley have trouble displaying this table");
			}
			return table;
		},
		
		create:function(table, tableMetaData, columnMetaData, rowMetaData, cellMetaData, data){
			var table = OBJECT.clone(tableDef);
			
			table.tableMetaData = tableMetaData || OBJECT.clone(table.tableMetaData);
			table.columnMetaData = columnMetaData || OBJECT.clone(table.columnMetaData);
			table.rowMetaData = rowMetaData || OBJECT.clone(table.rowMetaData);
			table.cellMetaData = cellMetaData || OBJECT.clone(table.cellMetaData);
			
			table.data = OBJECT.clone(data);
			
			return table;
		},
		createBI:function(table, tableMetaData, columnMetaData, rowMetaData, cellMetaData, data){
			return F.liftBI(function(){}, function(){}, F.zeroE().startsWith(TABLES.create(table, tableMetaData, columnMetaData, rowMetaData, cellMetaData, data)));
		},
		render:function(table){
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
		},
		leftJoin: function(table1BI, table2BI, joinColumn, joinDescriptor){				
			var sourceTable1 = undefined;
			var sourceTable2 = undefined;
			
			return F.liftBI(function(table1, table2){
				table1Columns = table1.columnMetaData;
				table2Columns = table2.columnMetaData;
				
				sourceTable1 = table1;
				sourceTable2 = table2;
				
				var newTable = OBJECT.clone(table1);
				newTable.tableMetaData.id ="("+table1.tableMetaData.id+"+"+table2.tableMetaData.id+")";
				newTable.data = [];
				
//				if(joinDescriptor!=undefined){
//					newTable.tableMetaData.id = joinDescriptor;
//				}

				var table2NewColumns = OBJECT.clone(table2.columnMetaData);
				OBJECT.remove(table2NewColumns, joinColumn);
				jQuery.extend(newTable.columnMetaData, table2NewColumns);

				for(var row1Index in table1.data){
					for(var row2Index in table2.data){
						if(table1.data[row1Index][joinColumn]===table2.data[row2Index][joinColumn]){
							var table2Row = OBJECT.clone(table2.data[row2Index]);
							OBJECT.remove(table2Row, joinColumn);
							newTable.data[newTable.data.length] = jQuery.extend(OBJECT.clone(table1.data[row1Index]), table2Row);//.splice(table2indexColumn, 1)
						}
					}
				}
				return newTable;
			}, function(newTable, oldTable){
				var leftTable = OBJECT.clone(sourceTable1);
				var rightTable = OBJECT.clone(sourceTable2);
				
				log("Table Upwards for "+newTable.tableMetaData.id);
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
		},
		/**
		 * Checks for user priviledge level and flags the table as readonly if < 15
		 * 
		 * @param tableBI
		 * @returns
		 */
		checkTablePermissionsBI:function(tableBI, userPriviledgeB){			
			return F.liftBI(function(table, userPriviledge){
				if(!good()){
					return chooseSignal();
				}
				var newTable = OBJECT.clone(table);
				TABLES.UTIL.checkTablePermissions(newTable, userPriviledge);
				return newTable;
			}, function(table){
				return [table, undefined];
			}, tableBI, userPriviledgeB);
		},
		/**
		 * Looks for changed cells in a table and flags every cell in that row as changed. This is required for some back end objects..
		 * 
		 * @param tableBI
		 * @returns
		 */
		sendWholeRowBI:function(tableBI){			
			return F.liftBI(function(table){
				if(!good()){
					return chooseSignal();
				}
				return table;
			}, function(table){
				var newTable = OBJECT.clone(table);
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
		},
		/**
		 * Filters a tableBI by calling the supplied filter callback for each row in table.
		 * Filtered rows are added back to table on upwards transform.
		 * 
		 * @param tableBI
		 * @param filterCallback - function called for each row. Function should return false to filter out, true to not.
		 * @returns
		 */
		filterRowsBI:function(tableBI, filterCallback){
			
			var sourceTable = undefined;
			var filterRows = undefined;
			
			return F.liftBI(function(table){
				if(!good()){
					return chooseSignal();
				}
				
				// Store pointer to source table so we can use on upwards transform.
				sourceTable = table;
				
				// Clone table before we remove rows.
				var newTable = OBJECT.clone(table);
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
					OBJECT.remove(newTable.rowMetaData, rowPk);
				}

				return newTable;
			}, function(modifiedTable){
				
				// Clone table before we add back removed rows
				var upwardsClone = OBJECT.clone(modifiedTable);
				
				// Insert rows that were removed
				// Note that this will overwrite data from modifiedTable, but that's ok cause we add that back in next code block
				for(var index in filterRows){
					var rowPk = filterRows[index];					
					var rowIndex = TABLES.UTIL.findRowIndex(sourceTable, rowPk);
					
					upwardsClone.data[rowIndex] = OBJECT.clone(sourceTable.data[rowIndex]);
					upwardsClone.cellMetaData[rowIndex] = OBJECT.clone(sourceTable.cellMetaData[rowIndex]);
					upwardsClone.rowMetaData[rowPk] = OBJECT.clone(sourceTable.rowMetaData[rowPk]);
				}
				
				// Insert changes from modifiedTable
				// Looks up original position of each row to reinsert into table.
				for(var rowIndex in modifiedTable.data){
					
					var rowPk = modifiedTable.data[rowIndex][sourceTable.tableMetaData.primaryKey];
					var origRowIndex = TABLES.UTIL.findRowIndex(sourceTable, rowPk);
					
					upwardsClone.data[origRowIndex] = OBJECT.clone(modifiedTable.data[rowIndex]);
					upwardsClone.cellMetaData[origRowIndex] = OBJECT.clone(modifiedTable.cellMetaData[rowIndex]);
					upwardsClone.rowMetaData[rowPk] = OBJECT.clone(modifiedTable.rowMetaData[rowPk]);
				}
				return [upwardsClone];

			}, tableBI);
		},
		debug: function(tableBI){
			return F.liftBI(TABLES.UTIL.printTable, function(table){
				return [TABLES.UTIL.printTable(table, 1)];
			}, tableBI);
		},
		rotate:function(table){
			var newRowMetaData = {};
			var newCellMetaData = [];
			var newData = [];
			var columnNumber = 0;
			for(var columnIndex in table.columnMetaData){
				//log("Rotating: columnIndex- "+columnIndex);
				for(var rowIndex in table.data){
					var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);
					if(newData[columnNumber]==undefined){
						newData[columnNumber] = {};
					}
						
					newData[columnNumber][rowPk] = OBJECT.clone(table.data[rowIndex][columnIndex]);
					
					
					if(newRowMetaData[columnNumber]==undefined){
						newRowMetaData[columnNumber] = OBJECT.clone(table.columnMetaData[columnIndex]);
						newRowMetaData[columnNumber]["rotatePk"] = columnNumber;
					}

					if(table.cellMetaData[rowIndex] && table.cellMetaData[rowIndex][columnIndex]){
						if(newCellMetaData[columnNumber]==undefined){
							newCellMetaData[columnNumber] = {};
						}
						newCellMetaData[columnNumber][rowPk] = OBJECT.clone(table.cellMetaData[rowIndex][columnIndex]);
					}
				}
				columnNumber++;
			}
			var newTable = TABLES.create(table, OBJECT.clone(table.tableMetaData), OBJECT.clone(table.rowMetaData), newRowMetaData, newCellMetaData, newData);
			return newTable;	
		},
		rotateReverse:function(table){
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
					
					//log("rowPk: "+rowPk+" rowIndex: "+rowIndex);
					
					var rowId = table.rowMetaData[rowPk].id;
					if(newData[columnNumber]==undefined){
						newData[columnNumber] = {};
					}
					newData[columnNumber][rowId] = OBJECT.clone(table.data[rowIndex][columnIndex]);
					
					if(newCellMetaData[columnNumber]==undefined){
						newCellMetaData[columnNumber] = {};
					}
					
					if(table.cellMetaData[rowIndex]!=undefined && table.cellMetaData[rowIndex][columnIndex]!=undefined){
						newCellMetaData[columnNumber][rowId] = OBJECT.clone(table.cellMetaData[rowIndex][columnIndex]);
					}
					
					if(newColumnMetaData[rowId]==undefined && table.rowMetaData[rowPk]!=undefined){
						newColumnMetaData[rowId] = OBJECT.clone(table.rowMetaData[rowPk]);
						OBJECT.remove(newColumnMetaData[rowId], "rotatePk");
					}
				}				
				columnNumber++;
			}
			var newTable = TABLES.create(table, OBJECT.clone(table.tableMetaData), newColumnMetaData, OBJECT.clone(table.columnMetaData), newCellMetaData, newData);
			return newTable;	
		},
		rotateBI: function(tableBI){
			var sourceTable = undefined;
			return F.liftBI(function(table){
				if(!good()){
					return chooseSignal();
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
		},
		sortBI:function(tableBI, column){
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
		},
		
		UTIL:{
			/**
			 * Checks for user priviledge level and flags the table as readonly if < 15
			 * 
			 * @param tableBI
			 * @returns
			 */
			checkTablePermissions:function(table, userPriviledge){
				if(!good()){
					log('Error, checkTablePermissions has been passed arguments that are not good.');
				}
				
				if(userPriviledge<15){
					table.tableMetaData.readonly = true;
				}
				return table;
			},
			setColumnOrder: function(table, newColumnOrder){
				if(!newColumnOrder instanceof Array){
					log("Error - TABLES.UTIL.setColumnOrder expects an array as second argument "+typeof(newColumnOrder)+" given");
					return table;
				}
				var newColumnMetaData = {};
				for(var index in newColumnOrder){
					var newColumnIndex = newColumnOrder[index];
					if(table.columnMetaData[newColumnIndex]==undefined){
						log("Error - Column order change requested with a column index that does not exist: "+newColumnIndex);
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
			},
			cleanUserChange: function(table){
				for(var columnIndex in table.columnMetaData){
					OBJECT.remove(table.columnMetaData[columnIndex], "userChange");
				}
				
				for(var rowPk in table.rowMetaData){
					OBJECT.remove(table.rowMetaData[rowPk], "userChange");
				}
				
				for(var rowIndex in table.cellMetaData){
					for(var columnIndex in table.cellMetaData[rowIndex]){
						OBJECT.remove(table.cellMetaData[rowIndex][columnIndex], "userChange");
					}
				}
				return table;
			},
			findRow: function(table, rowPk){
				for(var rowIndex in table.data){
					if(table.data[rowIndex][table.tableMetaData.primaryKey]==rowPk){
						return table.data[rowIndex];
					}
				}
				return false;
			},
			
			findRowPk: function(table, rowIndex){
				return table.data[rowIndex][table.tableMetaData.primaryKey];
			},
			
			findRowMetaWithId: function(table, rowId){
				for(var rowPk in table.rowMetaData){
					if(table.rowMetaData[rowPk].id && table.rowMetaData[rowPk].id===rowId){
						return table.rowMetaData[rowPk];
					}
				}
				return undefined;			},
			
			findRowIndex: function(table, rowId){
				for(var rowIndex in table.data){
					if(table.data[rowIndex][table.tableMetaData.primaryKey]==rowId){
						return rowIndex;
					}
				}
				return false;
			},
			
			/**
			 * Adds a new row to the table
			 * Assigns default values to the data based on columnMetaData's defaultValue.
			 * @param table
			 * @param rowPk - Primary key value of row that is being added
			 * @returns - Index of row added.
			 */
			addRow: function(table, rowPk){
				
				if(TABLES.UTIL.findRow(table, rowPk) !== false){
					log('Error, cannot add row. Table already has primary key of ' + rowPk);
					return false;
				}
				
				var newData = {};
				for(var columnIndex in table.columnMetaData){
					
					var column_meta_data = table.columnMetaData[columnIndex];
					if(column_meta_data.processor == TABLES.metaTagProcessorType.clientServerPair){		//clientServerPair
						newData[columnIndex] = {server: column_meta_data.defaultValue, client: column_meta_data.defaultValue};
					}else{
						newData[columnIndex] = column_meta_data.defaultValue;
					}					
				}
				newData[table.tableMetaData.primaryKey] = rowPk;
				table.data.push(newData);
				return (table.data.length - 1);
			},
			
			addColumn: function(table, columnId, columnName, dataType){
				
				// If column doesn't exist, create it
				if(table.columnMetaData[columnId] === undefined){
					table.columnMetaData[columnId] = jQuery.extend({}, TABLES.columnMetaDataDefinition);
					
					for(var rowIndex in table.data){
						table.data[rowIndex][columnId] = undefined;
					}
				}
				
				// Always set this
				table.columnMetaData[columnId].dataType = dataType || 'string';
				table.columnMetaData[columnId].name = columnName === undefined ? columnId : columnName;
				table.columnMetaData[columnId].id = columnId;
				return table;
			},
			
			removeRow: function(table, searchRowPk){
				OBJECT.remove(table.rowMetaData, searchRowPk);
				for(var rowIndex in table.data){
					var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);
					if(rowPk==searchRowPk){
						OBJECT.remove(table.data, rowIndex);
						OBJECT.remove(table.cellMetaData, rowIndex);		// Must call this even if no cell meta data so that array stays in order.
					}
				}
				return table;
			},
			
			removeColumn: function(table, columnId){
				
				if(table==undefined){
					log("RemoveColumn Table is undefined");
				}
				OBJECT.remove(table.columnMetaData, columnId);
				
				for(var rowIndex in table.data){
					OBJECT.remove(table.data[rowIndex], columnId);
					if(table.cellMetaData[rowIndex] !== undefined){
						OBJECT.remove(table.cellMetaData[rowIndex], columnId);
					}
				}
				for(var rowPk in table.rowMetaData){
					if(table.rowMetaData[rowPk] !== undefined){
						OBJECT.remove(table.rowMetaData[rowPk], columnId);
					}
				}
				return table;
			},

			
			/**
			 * Gets the row meta data for a rowPk.
			 * If create is true, create the row meta data if it doesn't already exist.
			 * 
			 * @param table
			 * @param rowPk
			 * @param create - (optional) if true will create the meta data if it doesn't exist.
			 * @returns
			 */
			getRowMetaData : function(table, rowPk, create){
				if(table === undefined || table.rowMetaData === undefined){
					return undefined;
				}
				
				if(table.rowMetaData[rowPk] === undefined && create === true){
					table.rowMetaData[rowPk] = jQuery.extend({}, TABLES.rowMetaDataDefinition);
				}
				
				return table.rowMetaData[rowPk];
			},
			
			/**
			 * Gets the row meta data for a temporary rowPk.
			 * If create is true, create the row meta data if it doesn't already exist.
			 * 
			 * @param table
			 * @param rowPk
			 * @param create - (optional) if true will create the meta data if it doesn't exist.
			 * @returns
			 */
			getTempRowMetaData : function(table, rowPk, create){
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
					table.tempRowMetaData[rowPk] = jQuery.extend({}, TABLES.rowMetaDataDefinition);
				}
				
				return table.tempRowMetaData[rowPk];
			},

			/**
			 * Gets the cell meta data for a row index and column.
			 * 
			 * @param table
			 * @param rowIndex
			 * @param columnId 
			 * @param create - (optional) if true will create the cell meta data if it doesn't exist.
			 * @returns
			 */
			getCellMetaData : function(table, rowIndex, columnId, create){
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
						table.cellMetaData[rowIndex][columnId] = jQuery.extend({}, TABLES.cellMetaDataDefinition);
					}else{
						return undefined;
					}
				}
				
				return table.cellMetaData[rowIndex][columnId];
			},
			
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
			setCellMetaDataRendererOption : function(table, rowIndex, columnId, option, value, combineColumnOptions, combineRowOptions){
				
				var meta = TABLES.UTIL.getCellMetaData(table, rowIndex, columnId, true);
				if(meta === undefined){
					return;
				}
				
				if(meta[TABLES.metaTagRendererOptions] === undefined){
					
					meta[TABLES.metaTagRendererOptions] = {};
					
					if(combineColumnOptions === true){
						meta[TABLES.metaTagRendererOptions] = jQuery.extend(meta[TABLES.metaTagRendererOptions], table.columnMetaData[columnId][TABLES.metaTagRendererOptions]);
					}
					
					if(combineRowOptions === true){
						var row_pk = TABLES.UTIL.findRowPk(table, rowIndex);
						if(row_pk !== undefined){
							meta[TABLES.metaTagRendererOptions] = jQuery.extend(meta[TABLES.metaTagRendererOptions], table.rowMetaData[row_pk][TABLES.metaTagRendererOptions]);
						}
					}
				}
				
				meta[TABLES.metaTagRendererOptions][option] = value;
			},
			
			getMetaDataSet: function(table, rowIndex, columnIndex){
				var cellMetaData = {};
				if(table.cellMetaData[rowIndex] && table.cellMetaData[rowIndex][columnIndex]){
					cellMetaData = table.cellMetaData[rowIndex][columnIndex];
				}
				return {rowMetaData: table.rowMetaData[TABLES.UTIL.findRowPk(table, rowIndex)] || {}, columnMetaData: table.columnMetaData[columnIndex] || {}, cellMetaData:cellMetaData };
			},
			chooseMetaData:function(property, metaData){
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
			},
			printTable:function(table, dir){
				if(table==SIGNALS.NOT_READY){
					return SIGNALS.NOT_READY;
				}
				direction = dir==undefined?"down":"up";
				log("////////// Table DEBUG \\\\\\\\\\\\\\\\\\\\\\\\"+direction+"))");
				var tableId = table.tableMetaData.id || "";
				log("TableID: "+tableId+" "+direction);
				//log("Number of Rows "+table.data.length);
				//log(table.columnMetaData);

				log("TableMetaData");
				log(table.tableMetaData);
				
				log("ColumnMetaData");
				for(var columnIndex in table.columnMetaData){
					log(columnIndex+": "+objectToString(table.columnMetaData[columnIndex]));
				}
				
				log("RowMetaData");
				for(var rowIndex in table.rowMetaData){
					log(rowIndex+": "+objectToString(table.rowMetaData[rowIndex]));
				}
				
				log("CellMetaData");
				for(var rowIndex in table.cellMetaData){
					log(rowIndex+": "+objectToString(table.cellMetaData[rowIndex]));
				}
				
				log("Data");
				for(var rowIndex in table.data){
					log(rowIndex+": "+objectToString(table.data[rowIndex]));
				}
				log("**********************************\n");
				return table;
			},
			diff:function(table1, table2, idColumn){
				console.log("Object.keys tables.js diff");
				if(table1.data.length!=table2.data.length || Object.keys(table1.columnMetaData).length!=Object.keys(table2.columnMetaData).length){
					log("Tables do not match, unable to run diff");
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
			},
			updateCell:function(table, joinColumn, joinColumnValue, valueColumn, oldValue, newValue){
				if(valueColumn===table.tableMetaData.primaryKey){
					return;
				}
				for(var rowIndex in table.data){
					if(table.data[rowIndex][joinColumn]===joinColumnValue && table.columnMetaData[valueColumn]!=undefined && table.data[rowIndex][valueColumn]===oldValue){
						//log("ACTUALLY UPDATING CELL");
						table.data[rowIndex][valueColumn] = newValue;
					}
				}
			},
			getValue: function(table, indexColumn, searchIndexValue, returnValueColumn){
				for(var rowIndex in table.data){
					if(table.data[rowIndex][indexColumn]===searchIndexValue){
						return table.data[rowIndex][returnValueColumn];
					}
				}
			},
			
			/**
			 * Extracts errors out of a table's meta data so that it can be inject again later.
			 * DO NOT MODIFY this function as it matches the server C error format.
			 * 
			 * @param table
			 * @returns Array of errors in format [{type: "table", error:{}}, {type: "row", rowPk: rowPk, error:{}}, {type: "cell", rowPk: rowPk, columnId: columnId, error:{}}]
			 * 
			 */
			extractServerErrors : function(table){
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
			},
			
			/**
			 * Injects server errors into a table's meta data.
			 * This is used to combine server errors created by AviatSetError
			 * DO NOT MODIFY this function as it matches the server C error format.
			 * 
			 * @param table
			 * @param serverErrors - Expected format [{type: "table", error:{}}, {type: "row", rowPk: rowPk, error:{}}, {type: "cell", rowPk: rowPk, columnId: columnId, error:{}}]
			 * @returns
			 */
			injectServerErrors : function(table, serverErrors){
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
				
			},
			
			/**
			 * Formats a table with a message for when a table has no data in it.
			 * @param table
			 * @param message
			 * @returns
			 */
			setTableNoDataMessage : function(table, message){
				table.tableMetaData.primaryKey = 'index';
				table.tableMetaData.canSelect = false;
				table.tableMetaData.canAdd = false;
				table.tableMetaData.canDelete = false;
				table.tableMetaData.readonly = true;
				table.tableMetaData.emptyMessage = message;
				
				TABLES.UTIL.addColumn(table, 'index', '');
				table.columnMetaData['index'].visible = false;
				return table;
			},
			
			/**
			 * Takes a tempoary rowPk and formats it into version that we can send to the server.
			 * @param rowPk
			 * @returns
			 */
			convertTempPkToServerTempPk : function(rowPk){
				var rowPkString = new String(rowPk); 
				if(rowPkString.indexOf(TABLES.tempPkPrefix) === -1){
					log("Error, Not a temp RowPk - " + rowPk);
					return false;
				}
				
				var rowPkInt = parseInt(rowPkString.replace(TABLES.tempPkPrefix, ""));
				if(isNaN(rowPkInt)){
					log("Error, Not a valid temp RowPk - " + rowPk);
					return false;
				}
				
				return rowPkInt * -1;
			},
			
			/***
			 * Checks if a rowPk is a server temp Pk
			 * @returns
			 */
			isServerTempPk : function(rowPk){
				var rowPkInt = parseInt(rowPk);
				if(isNaN(rowPkInt) || rowPk >= 0){
					return false;
				}
				
				return true;
			},
			
			/**
			 * Takes a server formated rowPk and converts it back into tempoary rowPk 
			 * @param rowPk
			 * @returns
			 */
			convertServerTempPkToTempPk : function(rowPk){
				if(!TABLES.UTIL.isServerTempPk(rowPk)){
					log("Error, Not a valid server RowPk - " + rowPk);
				}
				var rowPkInt = parseInt(rowPk);
				rowPkInt *= -1;
				
				return TABLES.tempPkPrefix + rowPkInt;
			}
		}
		
	};
})(TABLES || {});
