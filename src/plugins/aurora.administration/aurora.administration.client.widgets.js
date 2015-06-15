var ADMINISTRATION = (function(administration, widgets, aurora){
	if(administration.WIDGETS==undefined){
		administration.WIDGETS = {};
	}
	if(administration.RENDERERS==undefined){
		administration.RENDERERS = {};
	}
	widgets.register("SettingsManagementConfig", TABLES.WIDGETS.basicTableWidget("AURORA_SETTINGS"));
	widgets.register("PageManagement", TABLES.WIDGETS.basicTableWidget("AURORA_PAGES"));
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
                }, DATA.requestB(instanceId, aurora.CHANNEL_ID, aurora.CHANNELS.USERS), DATA.requestB(instanceId, aurora.CHANNEL_ID, aurora.CHANNELS.GROUPS));
                tableWidget.load(modifiedDataTableBI);
            },
            destroy:function(){
                DATA.release(instanceId, aurora.CHANNEL_ID, aurora.CHANNELS.USERS);
                DATA.release(instanceId, aurora.CHANNEL_ID, aurora.CHANNELS.GROUPS);
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
                    for(var columnId in table.columnMetaData){
                        table.columnMetaData[columnId].visible = false;
                    }
                    table.columnMetaData["description"].visible = true;
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
                }, DATA.requestB(instanceId,aurora.CHANNEL_ID, aurora.CHANNELS.GROUPS));
                
                tableWidget.load(modifiedDataTableBI);
            },
            destroy:function(){
                DATA.release(instanceId, aurora.CHANNEL_ID, aurora.CHANNELS.GROUPS);
                tableWidget.destroy();
            }
        };
    });
	
	return administration;
})(ADMINISTRATION || {}, WIDGETS, AURORA);


