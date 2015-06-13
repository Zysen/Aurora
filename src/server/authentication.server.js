var AUTHENTICATION = (function(authentication, http, aurora){
    DATA.httpMessageInE = F.zeroE();

    var activeSessionExpiry = 120000;//30000;  //120000===2 minutes         //3600000 === An hour   //How long an http session lasts
    var sessionExpiryClean = 30000;   //How often to check for expired session tokens
    var persistentSessionExpiry = 2419200000;  //How long a persistent token should last.
    
    var customLoginReceiverE = F.receiverE();
    authentication.customLogin = function(token, seriesId, userId, groupId, rememberMe, clientId, connection){
    	//console.log({user: {userId:userId, groupId:groupId}, token: token, seriesId: seriesId, rememberMe:rememberMe, clientId:clientId, connection: connection});
        customLoginReceiverE.sendEvent({user: {userId:userId, groupId:groupId}, token: token, seriesId: seriesId, rememberMe:rememberMe, clientId:clientId, connection: connection});
    };

    authentication.GROUPS = {PUBLIC:0, ADMINISTRATOR: 1};

    STORAGE.createTableBI("aurora.groups", "groupId", {
        groupId:{name: "Group Id", type: "number"},
        description:{name: "Description", type: "string"}
    }).sendToClients(aurora.CHANNEL_ID, aurora.CHANNELS.GROUPS);

    var usersTableBI = STORAGE.createTableBI("aurora.users", "userId", {
        userId:{name: "User Id", type: "number"},
        firstname:{name: "First Name", type: "string"},
        lastname:{name: "Last Name", type: "string"},
        emailaddress:{name: "Email Address", type: "string"},
        username:{name: "Username", type: "string"},
        password:{name: "Password", type: "password"},
        groupId:{name: "Group Id", type: "number"}
    }).sendToClients(aurora.CHANNEL_ID, aurora.CHANNELS.USERS);

    var passwordLoginE = http.userAuthenticationE.filterE(function(packet){return packet.data.command===AURORA.COMMANDS.AUTHENTICATE && packet.data.data.password!==undefined;}).mapE(function(dataPacket){
        var clientId = dataPacket.clientId;
        var token = dataPacket.token;
        var seriesId = dataPacket.seriesId;
        var username = dataPacket.data.data.username;
        var password = dataPacket.data.data.password;
        var emailaddress = dataPacket.data.data.emailaddress;
        var useEmail = dataPacket.data.data.username==undefined && dataPacket.data.data.emailaddress!=undefined;
        var useUsername = dataPacket.data.data.username!=undefined;
        var rememberMe = dataPacket.data.data.rememberMe;
        
        var usersTable = OBJECT.clone(usersTableBI.valueNow());
        
        var foundUser = false;
        var currentUser = undefined;
        for(var rowIndex in usersTable.data){
            var userValid = ((useEmail && usersTable.data[rowIndex]["emailaddress"].toLowerCase()===emailaddress.toLowerCase()) || (useUsername && usersTable.data[rowIndex]["username"]===username));
            var passwordValid = usersTable.data[rowIndex]["password"]!=undefined && usersTable.data[rowIndex]["password"]===password;
            if(userValid && passwordValid){
                currentUser = usersTable.data[rowIndex];
                break;
            }
            else if(userValid && !passwordValid){
                foundUser = true;
            }
        }
        if(currentUser!==undefined){
            LOG.create("Password Authentication Success");
            return {user: currentUser, token: token, seriesId: seriesId, rememberMe:rememberMe, clientId:clientId, connection: dataPacket.connection};
        }
        else{
            return {connection: dataPacket.connection, message: (foundUser===true && currentUser===undefined)?"Incorrect Password":"Unable to find user in database"};
        }
    }).mapE(function(packet){
        if(packet.user!==undefined){
            packet.connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.AUTHENTICATE, data: {message:"Successfully Logged In!"}}));
            return packet;
        }
        else if(packet.message!==undefined){
            packet.connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.AUTHENTICATE, data: {message:packet.message}}));
        }
    }).filterUndefinedE();
    //HTTP and WebSocket Logout Event
    authentication.logoutE = F.mergeE(http.httpRequestE.filterE(function(packet){return packet.url.pathname==="/logout";}), http.userAuthenticationE.filterE(function(packet){return packet.command===AURORA.COMMANDS.UNAUTHENTICATE;}));    
    var expiredSessionsCleanE = F.timerE(sessionExpiryClean).mapE(function(){return {cleanExpiry: true};});
    var sessionTableUpE = F.receiverE();
    try{
    	var sessionTable = TABLES.parseTable("sessionTable", "token", JSON.parse(fs.readFileSync(__dirname+"/data/aurora.sessions.json", 'utf8')), {token:{name:"Token", type: "string"},userId:{name:"User Id", type: "number"},groupId:{name:"Group Id", type: "number"},seriesId:{name:"Series Id", type: "number"},instances:{name:"Instances", type: "array"},expiry:{name:"Expiry", type: "datetime"},persistent:{name:"persistent", type: "boolean"}});    
    }
    catch(e){
    	var sessionTable = TABLES.parseTable("sessionTable", "token", [], {token:{name:"Token", type: "string"},userId:{name:"User Id", type: "number"},groupId:{name:"Group Id", type: "number"},seriesId:{name:"Series Id", type: "number"},instances:{name:"Instances", type: "array"},expiry:{name:"Expiry", type: "datetime"},persistent:{name:"persistent", type: "boolean"}});    
    }
    var sessionTableStateE = F.mergeE(authentication.logoutE.tagE("LOGOUT"), HTTP.newTokenE.tagE("NEW_TOKEN"), expiredSessionsCleanE.tagE("EXPIRED_CLEAN"), sessionTableUpE.tagE("TABLE_UP"), F.mergeE(customLoginReceiverE, passwordLoginE).tagE("PASSWORD_LOGIN"), http.wsConnectionOpenE.tagE("CONNECTION_OPEN"), http.wsConnectionCloseE.tagE("CONNECTION_CLOSE")).collectE({sessionTable: sessionTable, clientMap:{}}, function(taggedPacket, state){
        //Todo maintain a clientId to token map.
        //Use this to close properly.
    	var sessionTable = state.sessionTable;
        var clientMap = state.clientMap;
        var update = taggedPacket.value;
       // console.log(taggedPacket.tag+"1 "+sessionTable.data.length);
        switch(taggedPacket.tag){
            case "TABLE_UP":{
                //TODO: rebuild clientMap;
                return {sessionTable: update, clientMap: state.clientMap};
            }
            case "EXPIRED_CLEAN":{
                var deletePks = [];
                for(var rowIndex=sessionTable.data.length-1;rowIndex>=0;rowIndex--){
                    if(sessionTable.data[rowIndex].instances.length===0 && sessionTable.data[rowIndex].expiry<DATE.getTime()){
                        for(var index in sessionTable.data[rowIndex].instances){
                            OBJECT.remove(clientMap, sessionTable.data[rowIndex].instances[index]);
                        }
                        TABLES.UTIL.removeRow(sessionTable, sessionTable.data[rowIndex].token);
                    }
                }
                break;
            }
            case "NEW_TOKEN":{      //New HTTP Token created
                //var row = TABLES.UTIL.findRow(sessionTable, update.token);    //!row && 
                if(update.seriesId!==undefined && update.clientId===undefined){         
                    TABLES.UTIL.addRow(sessionTable, update.token, {token: update.token, seriesId: update.seriesId, instances:[], persistent:false, expiry: DATE.getTime()+activeSessionExpiry});
                }
                break;
            }
            case "LOGOUT":{   
            	TABLES.UTIL.removeRow(sessionTable, update.token);
                break;
            }
            case "PASSWORD_LOGIN":{
                var row = TABLES.UTIL.findRow(sessionTable, update.token);
                if(row && update.user){                      //User Login
                	//console.log(row);
                	row.userId = update.user.userId;
                    row.groupId = update.user.groupId;
                    row.persistent = update.rememberMe;
                    row.expiry = DATE.getTime()+(update.rememberMe?persistentSessionExpiry:activeSessionExpiry);
                    if(update.connection && update.clientId){
                    	update.connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.UPDATE_TOKEN, data: {cookie:row.token+"-"+row.seriesId, token: row.token, expiry: row.expiry, groupId:row.groupId}}));
                    }
                }
                break;
            }
            case "CONNECTION_OPEN":{
                var row = TABLES.UTIL.findRow(sessionTable, update.token);
                if(row && row.seriesId===update.seriesId){
                    if(!ARRAYS.contains(row.instances, update.clientId)){
                        row.instances.push(update.clientId);    
                    }
                    //var tokenPair = AUTHENTICATION.createNewTokenSeriesPair(sessionTable, 10, update.seriesId);
                   // row.token = tokenPair.token;
                   // row.expiry = DATE.getTime()+(row.persistent?persistentSessionExpiry:activeSessionExpiry);
                    
                    //for(var index in row.instances){
                      //  clientMap[row.instances[index]] = row.token;
                    //}
                    //TODO: Should this token re create happen on each HTTP request? What does this mean for http security?
                    //TODO: Add longer expiry if remember me login has happened.      
                    
                    //update.connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.UPDATE_TOKEN, data: {message: "Successfully Logged In!", cookie:row.token+"-"+row.seriesId, token: row.token, expiry: row.expiry, groupId:row.groupId}}));   
                }
                else if(update.seriesId!==undefined){   //Invalid token, possible token theft.
                    var deleteTokens = TABLES.UTIL.findRows(sessionTable, "seriesId", update.seriesId);
                    if(deleteTokens.length>0){  //Theft Assumed, deleting all tokens with that seriesId
                        LOG.create("Token Theft Assumed!!!, Deleting all tokens that relate to this seriesId");
                        for(var index in deleteTokens){
                            TABLES.UTIL.removeRow(sessionTable, deleteTokens[index].token);
                        }
                    }
                    else{
                        update.connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.AUTH.TOKEN_INVALID}));   //Legitimate Old Token Attempt
                    }
                }
                else{
                     LOG.create("TODO: Connection open case 3");
                }
                break;
            }
            case "CONNECTION_CLOSE":{       //Connection closed
                var row = TABLES.UTIL.findRow(sessionTable, clientMap[update.clientId]);
                if(row){                  
                    ARRAYS.remove(row.instances, update.clientId);
                }
                OBJECT.remove(clientMap, update.clientId);
                break;
            }
            default:{
                LOG.create("Session table updater, unhandled TAG");
            }
        }
        return {sessionTable:sessionTable, clientMap: clientMap};
    });
    
    authentication.sessionTableE = sessionTableStateE.mapE(function(state){return state.sessionTable;});
    authentication.sessionTableB = authentication.sessionTableE.startsWith(SIGNALS.NOT_READY);
    authentication.clientMapB = sessionTableStateE.mapE(function(state){return state.clientMap;}).startsWith(SIGNALS.NOT_READY);;
    
    F.liftBI(function(table){
        return table;
    }, function(table){
        sessionTableUpE.sendEvent(table);
    }, authentication.sessionTableB).sendToClients(aurora.CHANNEL_ID, aurora.CHANNELS.SESSIONS);
    
    /*
    authentication.sessionTableE.calmE(1000).mapE(function(){
    	var table = authentication.sessionTableB.valueNow();
        var newTable = [];
        for(var rowIndex in table.data){
            if(table.data[rowIndex].persistent===true){
                var cpy = OBJECT.clone(table.data[rowIndex]);
                cpy.instances = [];
                newTable.push(cpy);
            }
        }
        //LOG.create("Writing sessions to file");
        try{
            fs.writeFileSync(__dirname+"/data/aurora.sessions.json", JSON.stringify(newTable), 'utf8');
        }
        catch(e){
        	console.log(e);
        }
    });
    */
    authentication.dataPermissionsBI = STORAGE.createTableBI("aurora.datapermissions", "key", {
        key:{name: "Key", type: "string"},
        pluginId:{name: "Plugin", type: "int"},
        channelId:{name: "Channel", type: "int"},
        groups:{name: "Groups", type: "map"}
    }).sendToClients(aurora.CHANNEL_ID, aurora.CHANNELS.DATA_PERMISSIONS, "Data Permissions");
   // users:{name: "Users", type: "boolean"}

    authentication.clientCanWrite = function(clientId, dataSource, write){
        authentication.clientCanRead(clientId, dataSource, true);
    };
     

     authentication.createNewTokenSeriesPair = function(sessions, size, seriesId){
        //Find a unique token and a unique seriesId
        do{
            var token = crypto.randomBytes(size).toString("hex");
        }while(TABLES.UTIL.findRow(sessions, token)!==false);
        if(seriesId===undefined){
            do{
                var seriesId = crypto.randomBytes(size).toString("hex");
                var found=false;
                for(var rowIndex=0;rowIndex<sessions.data.length;rowIndex++){
                    if(sessions.data[rowIndex].seriesId===seriesId){
                        found = true;
                        break;
                    }
                }
            }while(found===true);
        }
        return {token: token, seriesId: seriesId};
    };
    
    
    authentication.clientCanRead = function(clientId, dataSource, write){
    return true;
        var table = authentication.sessionTableB.valueNow();
        var clientMap = authentication.clientMapB.valueNow();
        var token = clientMap[clientId];
        write = write==undefined?false:write;
        
        var userRow = TABLES.UTIL.findRow(table, token);
        //LOG.create(userRow);
        if(!userRow){
            LOG.create("ClientCanRead: Unable to find user "+clientId+", "+token);
        }
        
        var userId = userRow.userId;
        var groupId = userRow.groupId;
        var permissionTable = authentication.dataPermissionsBI.valueNow();      

        //This is a better idea, but its not the pk //var rowIndex = TABLES.UTIL.findRowIndex(permissionTable, dataSource);
        
        var permRows = TABLES.UTIL.findRows(permissionTable, "dataSource", dataSource);
        var permRow = permRows[0];
        if(permRows.length>0 && permRow.groups[groupId+""]!==undefined && ((permRow.groups[groupId+""]==="R" && write!==true) || (permRow.groups[groupId+""]==="RW"))){
            return true;
        }
        if(permRows.length>0 && permRow.users && permRow.users[userId+""]!==undefined && ((permRow.users[userId+""]==="R" && write!==true) || (permRow.users[userId+""]==="RW"))){
            return true;
        }
        return false;
    };

    return authentication;
})(AUTHENTICATION || {}, HTTP, AURORA);

