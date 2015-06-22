var MYSQL = (function(mysql){
	
	var mysql_lib = require('mysql');
	
	var pool = mysql_lib.createPool({
	  host     : '',
	  user     : '',
	  password : '',
	  database : ''
	});

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

	return mysql;
}(MYSQL || {}));