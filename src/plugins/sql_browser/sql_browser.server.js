SQL_BROWSER = (function(sqlbrowser, mysql, aurora){
	aurora.pluginsLoadedE.onceE().mapE(function(){
		console.log("Plugins Have loaded");
		//mysql.getTable("markers", "sql_browser", sqlbrowser.CHANNELS.EXAMPLE_TABLE, "Markers SQL Table");
		//mysql.getTable("overlays", "sql_browser", sqlbrowser.CHANNELS.EXAMPLE_TABLE2, "Overlays SQL Table");
	});
	return sqlbrowser;
}(SQL_BROWSER || {}, MYSQL, AURORA));
