var MYSQL = (function(mysql, aurora){	
	mysql.CHANNEL_ID = "mysql";
	mysql.CHANNELS = {DATABASE_TABLE:0, QUERY:1};
	return mysql;
}(MYSQL || {}, AURORA));
