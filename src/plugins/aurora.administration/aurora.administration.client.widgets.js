var ADMINISTRATION = (function(administration, widgets){
	if(administration.WIDGETS==undefined){
		administration.WIDGETS = {};
	}
	if(administration.RENDERERS==undefined){
		administration.RENDERERS = {};
	}
	
	widgets.register("UserDataSourcesTable", TABLES.WIDGETS.basicReadTableWidget("AURORA_USERDATASOURCES"));
	widgets.register("DataSourcesTable", TABLES.WIDGETS.basicReadTableWidget("AURORA_DATASOURCES"));
	widgets.register("DataSourcesAdminTable", TABLES.WIDGETS.basicReadTableWidget("AURORA_DATASOURCESADMIN"));
	
	
	widgets.register("SettingsManagementConfig", TABLES.WIDGETS.basicTableWidget("AURORA_SETTINGS"));
	widgets.register("PageManagement", TABLES.WIDGETS.basicTableWidget("AURORA_PAGES"));
	//widgets.register("UserManagement", TABLES.WIDGETS.basicTableWidget("AURORA_USERS"));	//administration.WIDGETS.UserManagement = 
	widgets.register("UserManagement", function(instanceId, data, purgeData){
        var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
        return {
            build:function(){
                return tableWidget.build();
            },
            load:function(){                                
                var modifiedDataTableBI = F.liftBI(function(newTable, groupsTable){
                    if(!good()){
                        return chooseSignal();
                    }
                    var table = OBJECT.clone(newTable);
                    table.columnMetaData["userId"].visible = false;
                    if(table.rowMetaData["0"]==undefined){
                        table.rowMetaData["0"] = OBJECT.clone(TABLES.rowMetaDataDefinition);
                    }
                    table.rowMetaData["0"].readonly = true;
                    table.rowMetaData["0"].visible = false;
                    
                    var groupsOptions = {};
                    for(var rowIndex in groupsTable.data){
                        groupsOptions[groupsTable.data[rowIndex]["description"]]=groupsTable.data[rowIndex]["groupId"];
                    }
                    table.columnMetaData["groupId"].dataType = "List";
                    table.columnMetaData["groupId"].name = "Group";
                    table.columnMetaData["groupId"].rendererOptions = {options: groupsOptions};
                    return table;
                },function(table){
                    return [table, undefined];
                }, DATA.requestB(instanceId, "AURORA_USERS"), DATA.requestB(instanceId, "AURORA_GROUPS"));
                tableWidget.load(modifiedDataTableBI);
            },
            destroy:function(){
                DATA.release(instanceId, "AURORA_USERS");
                DATA.release(instanceId, "AURORA_GROUPS");
                tableWidget.destroy();
            }
        };
    });
    
    
	widgets.register("GroupManagement", function(instanceId, data, purgeData){
        var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
        return {
            build:function(){
                return tableWidget.build();
            },
            load:function(){
                var modifiedDataTableBI = F.liftBI(function(newTable){
                    if(!good()){
                        return chooseSignal();
                    }
                    var table = OBJECT.clone(newTable);
                    var visibleColumns = ["description"];
                    for(var columnId in table.columnMetaData){
                        if(!ARRAYS.contains(visibleColumns, columnId)){
                            table.columnMetaData[columnId].visible = false;
                        }
                    }
                    table.rowMetaData["1"].readonly = true;
                    table.rowMetaData["3"].readonly = true;
                    return table;
                },function(table){
                    if(table.rowMetaData["1"] && table.rowMetaData["1"].deleted && table.rowMetaData["1"].deleted==true){
                        table.rowMetaData["1"].deleted = false;
                    }
                    if(table.rowMetaData["3"] && table.rowMetaData["3"].deleted && table.rowMetaData["3"].deleted==true){
                        table.rowMetaData["3"].deleted = false;
                    }
                    return [table];
                }, DATA.requestB(instanceId, "AURORA_GROUPS"));
                
                tableWidget.load(modifiedDataTableBI);
            },
            destroy:function(){
                DATA.release(instanceId, "AURORA_GROUPS");
                tableWidget.destroy();
            }
        };
    });
	
	widgets.register("SettingsManagement", function(instanceId, data, purgeData){
		var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
		return {
			build:function(){
				return tableWidget.build();
			},
			load:function(){
				var modifiedDataTableBI = F.liftBI(function(newTable){
					if(!good()){
						return chooseSignal();
					}
					var table = OBJECT.clone(newTable);
					table.tableMetaData.canAdd = false;
					table.tableMetaData.canDelete = false;
					var visibleColumns = ["description", "value"];
					for(var columnId in table.columnMetaData){
						if(!ARRAYS.contains(visibleColumns, columnId)){
							table.columnMetaData[columnId].visible = false;
						}
					}
					for(var rowIndex in table.data){
						var type = table.data[rowIndex]["type"].toLowerCase();
						if(type=="list"){
							LOG.create("widgets.renderers.List");
							//LOG.create(widgets.renderers.List);//widgets.renderers.List
							TABLES.UTIL.createCellMeta(table, rowIndex, "value", {renderer: "list", rendererOptions: {options: table.data[rowIndex]["metaData"]}});
						}
						else{
							TABLES.UTIL.createCellMeta(table, rowIndex, "value", {dataType: table.data[rowIndex]["type"]});
						}
					}
					table.columnMetaData.description.readonly = true;
					//TABLES.UTIL.printTable(table);
					return table;
				},function(table){
					return [table];
				}, DATA.requestB(instanceId, "AURORA_SETTINGS"));
				
				tableWidget.load(modifiedDataTableBI);
			},
			destroy:function(){
				DATA.release(instanceId, "AURORA_SETTINGS");
				tableWidget.destroy();
			}
		};
	});
	
	return administration;
})(ADMINISTRATION || {}, WIDGETS);


