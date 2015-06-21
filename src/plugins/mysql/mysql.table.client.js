var MYSQL = (function(mysql, aurora, dataManager, widgets, tables){	
	widgets.register("MysqlTable", function(instanceId, data, purgeData) {
		console.log("Data", data);
		console.log("args", arguments);
		
		var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {});
		return {
		    build : function() {
			    return tableWidget.build();		
		    },
		    load : function() {
	  		 	tableWidget.load(tables.sparseTableB(instanceId, data.plugin, data.channelId));
		    },
		    destroy : function() {
			    tableWidget.destroy();
		    }
		};
	});
	return mysql;
}(MYSQL || {}, AURORA, DATA, WIDGETS, TABLES));