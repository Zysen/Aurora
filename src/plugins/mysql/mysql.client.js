var MYSQL = (function(mysql, widgets, dataManager){
	
	widgets.register("MysqlDatabasesTable", function(instanceId, data, purgeData){
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
                    table.columnMetaData.port.defaultValue = 3306;
                    table.columnMetaData.status.readonly = true;
                    table.columnMetaData.databaseId.visible = false;
                    return table;
                },function(table){
                    return [table];
                }, DATA.requestB(instanceId,"mysql", mysql.CHANNELS.DATABASE_TABLE));
                
                tableWidget.load(modifiedDataTableBI);
            },
            destroy:function(){
                DATA.release(instanceId, "mysql", mysql.CHANNELS.DATABASE_TABLE);
                tableWidget.destroy();
            }
        };
    });
    
    widgets.register("MysqlTable", function(instanceId, data, purgeData) {
		var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {});
		return {
		    build : function() {
		    	return tableWidget.build();
		    },
		    load : function() {
		    	var sparseTable = TABLES.sparseTable(instanceId, data.plugin, data.channelId);
		    	tableWidget.load(sparseTable.tableBI);//TABLES.sortBI(modifiedTableBI, "ID")
		    },
		    destroy : function() {
			    tableWidget.destroy();
		    }
		};
	});
	
	return mysql;
}(MYSQL || {}, WIDGETS, DATA));