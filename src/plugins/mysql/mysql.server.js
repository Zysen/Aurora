var MYSQL = (function(mysql){
	
	var mysql_lib = require('mysql');
	
	var pool = mysql_lib.createPool({
	  host     : '192.168.1.81',
	  user     : 'stormcloud',
	  password : 'sc',
	  database : 'stormcloud'
	});
	
//var pool = {getConnection:function(){}};



mysql.flashQuery = function(user, password, database, query, cb){
	var connection = mysql.createConnection({
	  host     : 'localhost',
	  user     : user,
	  password : password,
	  database : database
	});
	connection.connect();
	connection.query(query, cb);
	connection.end();
};











	mysql.query = function(queryString, cb){
		pool.getConnection(function(err, connection) {
			if(err){
				console.log(err);
				cb(err,undefined);
				return;
			}
			connection.escape(queryString);
			connection.query(queryString, function(err, rows) {
			    connection.release();
			    if(err){
					console.log(err,undefined);
					cb(err);
			    }else{
			    	cb(undefined,rows);
			    }
			});
		});
	};
	
	mysql.queryE = function(queryString, delay){	
		var outE = F.receiverE();
		setInterval(function(){
			mysql.query(queryString, function(rows){
				outE.sendEvent(rows);
			});
		}, delay);
		return outE.filterRepeatsE();
	};
	
	var statusUpdateR = F.receiverE();
	var statusUpdateE = statusUpdateR.mapE(function(update){
		return [{command: "update", rowPk: update.databaseId, row: {status: update.status}}];
	});
	
	var mysqlDatabasesBI = STORAGE.createTableBI("mysql.databases", "databaseId", {
        databaseId:{name: "databaseId", type: "string"},
        host:{name: "Host", type: "string"},
        port:{name: "Port", type: "number"},
        name:{name: "Database Name", type: "string"},
        username:{name: "Username", type: "string"},
        password:{name: "Password", type: "string"},
        status:{name: "Status", type: "string"},
    }, statusUpdateE, ["status"]);
	mysql.mysqlDatabasesBI = mysqlDatabasesBI;
	//mysqlDatabasesBI.propertyB("data").printB("mysqlDatabasesBI");

	var last = undefined;
	var connectionPoolsB = F.liftB(function(mysqlDatabases, state){
		if(!good(mysqlDatabases)){
			return mysqlDatabases;
		}
		var removeDatabases = Object.keys(state.databases); 
		for(var rowIndex in mysqlDatabases.data){
			(function(database){
				var key = database.databaseId+"_"+database.host+"_"+database.port+"_"+database.name+"_"+database.username+"_"+database.password;
				ARRAY.remove(removeDatabases, key);
				if(state.databases[key]===undefined){
					console.log("Connecting to "+database.name+" "+database.host);
					state.databases[key] = {};
					statusUpdateR.sendEvent({databaseId:database.databaseId, status: "Connecting"});
					state.databases[key].pool = mysql_lib.createPool({
					  host     : database.host,
					  user     : database.username,
					  password : database.password,
					  database : database.name,
					  port	   : database.port 
					});
					state.databases[key].pool.getConnection(function(err, connection) {
						if(err){
							var status = err+"";
							OBJECT.remove(state, database.databaseId);
						}
						else{
							var status = "Connected";
							state.databases[key].connection = connection;
							state.databases[key].status = status;
							connection.query("show tables", function(err, rows){
								if(!err){
									for(var index in rows){
										var channelId = parseInt((database.databaseId+1)+((index+"").padLeft(4, "0")));
										var tableName = rows[index]["Tables_in_"+database.name];
										mysql.getTable(tableName, "mysql", channelId, tableName+" Table");
									}
								}
							});
						}	
						statusUpdateR.sendEvent({databaseId:database.databaseId, status: status});
					});
				}	
			}(mysqlDatabases.data[rowIndex]));
		}
		
		for(var index in removeDatabases){
			var key = removeDatabases[index];
			(function(k){
				state.databases[k].pool.end(function(){
					OBJECT.remove(state.databases, k);
				});
			}(key));
		}
		return state;
	}, TABLES.UTIL.filterColumnsBI(mysqlDatabasesBI, ["status"]).filterRepeatsB(), F.constantB({databases: {}}));

	mysqlDatabasesBI.sendToClients("mysql", mysql.CHANNELS.DATABASE_TABLE, "Mysql Databases");

	var queryChannelE = DATA.getChannelE("mysql", mysql.CHANNELS.QUERY, "Mysql Query", "getChannelE");	
	
	queryChannelE.mapE(function(packet){
		mysql.query(packet.data.toString(), function(err, rows){
			queryChannelE.send(rows, packet.connection);
		});
	});
	

	return mysql;
}(MYSQL || {}));