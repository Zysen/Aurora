
var tableTester = (function(){
	
	
	return {
		stopPolling: function(){DATA.stopPolling()},
		
		testChangeSetMerge: function(){
			DATA.stopPolling();
			
			document.body.innerHTML = "<div id=\"content\"></div>";
			var container = jQuery("#content");
			
			var funcDown = function(table){return table;};
			var funcUp = function(table){log("Table has reached the top");};	
			var usersTableBI = TABLES.create("usersTable", "userId", [{id: "userId", foreignKey: false, dataType: 'string'},{id: "username", foreignKey: false, dataType: 'string'},{id: "firstname", foreignKey: false, dataType: 'string'},{id: "lastname", foreignKey: false, dataType: 'string'},{id: "group", foreignKey: true, dataType: 'string'}], [[1, "zysen", "Jay", "Shepherd", "Administrators"],[2, "jhalse", "Jono", "Halse", "Staff"], [3, "dvevar", "David", "Vevar", "Staff"], [4, "some", "guy", "blag", "Staff"], [5, "dfgdf", "dd", "Vevar", "dd"], [6, "hh", "gg", "ff", "Staff"], [7, "ttt", "rr", "gg", "gg"]]);
			
			var changeE = F.receiverE();
			var clearE = F.receiverE();
			var addE = F.receiverE();
			var deleteE = F.receiverE();
			
			
			F.changeSetMerge(TABLES.debug(usersTableBI), changeE, clearE, addE, deleteE).changedTableB.liftB(function(value){
				
				console.log('Changed');
				//TABLES.UTIL.printTable(value.data);
				
				console.log('Changes');
				console.log(value.changes);
				
				console.log(' ');
				console.log(' ');
			});
			
			//deleteE.sendEvent([2,5,6]);
			//clearE.sendEvent([2,5,6]);
			addE.sendEvent();
			addE.sendEvent();
			addE.sendEvent();
			//deleteE.sendEvent(['temp1']);
			//clearE.sendEvent(['temp0']);
			
			changeE.sendEvent(jQuery.extend({}, TABLES.changeDefinition, {rowPk:3, columnIndex:'username',value:'that'}));
			changeE.sendEvent(jQuery.extend({}, TABLES.changeDefinition, {rowPk:'temp1', columnIndex:'username',value:'Hello World'}));
			changeE.sendEvent(jQuery.extend({}, TABLES.changeDefinition, {rowPk:'temp1', columnIndex:'group',value:'Admin'}));
			
			clearE.sendEvent([3]);
		},
		
		
		rotate: function(){
			DATA.stopPolling();
			
			var data = [
				{"col1":"1", "col2":"2", "col3":"3", "col4":"4", "col5":"5", "col6":"6"},
				{"col1":"A", "col2":"B", "col3":"C", "col4":"D", "col5":"E", "col6":"F"},
				{"col1":"G", "col2":"H", "col3":"I", "col4":"J", "col5":"K", "col6":"L"},
				{"col1":"M", "col2":"N", "col3":"O", "col4":"P", "col5":"Q", "col6":"R"}
			];
			
			var firstTable = TABLES.formatData("Alphabet", "col1", data);
			
			var topEvent = F.receiverE();
			
			var firstTableBI = F.liftBI(function(tab){
				
				var table = clone(tab);
				table = TABLES.UTIL.cleanUserChange(table);
				table.tableMetaData.horizontalOrientation = false;
				for(var rowIndex in table.cellMetaData){
					var rowPk = TABLES.UTIL.findRowPk(table, rowIndex);
					OBJECT.remove(table.cellMetaData, "userChange");
				}
				return table;
			}, function(table){
				topEvent.sendEvent(table);
			}, topEvent.startsWith(firstTable));
				
				
			var rotatedTableBI = TABLES.rotateBI(firstTableBI);
			
			
			
				
		//var permissionsTypesTableBI = TABLES.create("permissionsTable", "permissionId", [{id: "permissionId", foreignKey: false, dataType: 'int'},{id: "permissionName", foreignKey: false, dataType: 'string'}], [[1, "view users"], [2, "modify users"], [3, "modify ports"]]);
		//var permissionsTableBI = TABLES.create("userPermissionsTable", "userPermId", [{id: "userPermId", foreignKey: false, dataType: 'int'},{id: "userId", foreignKey: true, dataType: 'int'},{id: "permissionId", foreignKey: true, dataType: 'int'}],[[1, 1, 1],[2, 1, 2],[3, 2, 1], [4, 3, 3]]);
		//
		/*
		var filterUsersBI = TABLES.filterTable(usersTableBI, function(row){
					return row.username=="zysen";
				});*/
		

		//var userPermissionsBI = TABLES.leftJoin(usersTableBI, permissionsTableBI, "userId", "userPermissionsBI");
		//var userPermissionsDefinedBI = TABLES.leftJoin(userPermissionsBI, permissionsTypesTableBI, "permissionId", "userPermissionsDefinedBI");
		/*
		var userPermissionsFilteredBI = TABLES.filterRows(userPermissionsDefinedBI, function(row){
					//log(row.username+" "+(row.username=="jshepherd"));
					return row.username==="jshepherd";
				});*/
				
		/*var modTableBI = F.liftBI(function(table){
			var newTable = clone(table);
			

			newTable.tableMetaData.rowChangeLogic = function(rowData){
						log("Row Specific ChangeLogic initialised");
						if(rowData.firstname=="Jay"){
							rowData.lastname = "Shepherd";
						}
						return rowData;
					};

			newTable.tableMetaData.changeLogic = function(table){
												log("Table Change Logic Initiated");
												for(var rowIndex in table.data){
													for(var columnIndex in table.data[rowIndex]){
														var value = table.data[rowIndex][columnIndex];
														if(value=="Jay"){
															table.data[rowIndex]["lastname"] = "Shepherd";
														}
													}
												}
												return table;
											};
			
		
			
			
			newTable.columnMetaData["firstname"].validator = function(value){
				if(typeof(value)=='string' && value.length>5){
					return true;
				}
				return "Type is not string or length is < 6";
			};
			
			
			newTable.columnMetaData["lastname"].validator = function(value){
				if(typeof(value)=='string' && value.length>0){
					return true;
				}
				return "Type is not string or length is <=0";
			};
			
			
			
			
			
			
			newTable.tableMetaData.validator = function(table){
				for(var rowIndex in table.data){
					for(var columnIndex in table.data[rowIndex]){
						var value = table.data[rowIndex][columnIndex];
						if(value=="Jay"){
							return "Values cannot be equal to 'Jay'";
						}
					}
				}
				return true;
			};

			newTable.tableMetaData.rowValidator = function(row){
								for(var columnIndex in row){
									var value = row[columnIndex];	
									if(typeof(value)=='string' && value.length<4){
										return "String length is < 4 for column "+columnIndex;
									}
								}
								return true;
							};
	
			
			
			return newTable;
		}, function(table){
			return [table];
		}, usersTableBI);
		*/
		
				
		//FILTERS AND LEFT JOIN ARE CURRENTLY BROKEN !!!!!!!!! They do not match the table widgets use of meta data.
		
		var tableWidget1 = TABLES.WIDGETS.tableWidget("tableWidget1", {});
		//var rotatedBI = TABLES.rotate(usersTableBI);
		var tableWidget2 = TABLES.WIDGETS.tableWidget("tableWidget2", {});
		//var tableWidget3 = TABLES.WIDGETS.tableWidget("tableWidget3", {}, TABLES.rotate(rotatedBI));
		
		document.body.style.overflow = 'scroll';
		document.body.innerHTML = "<div id=\"content\"></div>";
		var container = DOM.get("content");
		
		container.appendChild(tableWidget1.build());
		container.appendChild(document.createElement('br'));
		container.appendChild(document.createElement('br'));
		container.appendChild(document.createElement('br'));
		container.appendChild(document.createElement('br'));
		container.appendChild(tableWidget2.build());
		//container.appendChild(document.createElement('br'));
		//container.appendChild(tableWidget3.build());
		//container.appendChild(document.createElement('br'));


		tableWidget1.load(firstTableBI);
		tableWidget2.load(rotatedTableBI);
		//tableWidget3.load();
		
	}};
})(TABLES);