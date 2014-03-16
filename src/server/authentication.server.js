var AUTHENTICATION = (function(authentication){

    var activeSessionExpiry = 3600000;  //An hour   //How long an http session lasts
    var activeSessionExpiryClean = 60000;   //How often to check for expired active session tokens
    var persistentSessionExpiryClean = 60000;  //How often to check for expired persistent tokens
    var persistentSessionExpiry = 2419200000;  //How long a persistent token should last.

    authentication.GROUPS = {PUBLIC:0, ADMINISTRATOR: 3};

    STORAGE.createTableBI("aurora.groups", "groupId", {
        groupId:{name: "Group Id", type: "number"},
        description:{name: "Description", type: "string"}
    }).sendToClients("AURORA_GROUPS", AURORA.DATATYPE.UTF8);

    var usersTableBI = STORAGE.createTableBI("aurora.users", "userId", {
        userId:{name: "User Id", type: "number"},
        firstname:{name: "First Name", type: "string"},
        lastname:{name: "Last Name", type: "string"},
        emailaddress:{name: "Email Address", type: "string"},
        username:{name: "Username", type: "string"},
        password:{name: "Password", type: "password"},
        groupId:{name: "Group Id", type: "number"}
    }).sendToClients("AURORA_USERS", AURORA.DATATYPE.UTF8);

    var persistentSessionsBI = undefined;

    var forcedLogoutE = F.receiverE();
    var logoutCommandE = DATA.httpMessageInE.filterE(function(dataPacket){return dataPacket.data && dataPacket.data.data!=undefined && dataPacket.data.data.token!=undefined && dataPacket.data.command && dataPacket.data.command === AURORA.COMMANDS.UNAUTHENTICATE;}).mapE(function(dataPacket){
        var token = dataPacket.token.split("-")[0];
        return {clientId: dataPacket.clientId, token: token, logout:true};
    });
    var persistentSessionsLogoutE = logoutCommandE.mapE(function(logoutPacket){return [{command: "remove", data: {rowPk: logoutPacket.token}}];});
    
    var tokenAuthenticationE = DATA.httpMessageInE.filterE(function(dataPacket){return dataPacket.data && dataPacket.data.command && dataPacket.data.command === AURORA.COMMANDS.AUTHENTICATE && dataPacket.data.data && dataPacket.data.token;}).mapE(function(dataPacket){
        LOG.create("tokenAuthenticationE 123");
        LOG.create(dataPacket);
        var clientId = dataPacket.clientId;
        var token = dataPacket.token;
        var seriesId = dataPacket.seriesId;
        var persistentTable = persistentSessionsBI.valueNow();
        
        var row = TABLES.UTIL.findRow(persistentTable, token);
        if(row!==false && row.token===token && row.seriesId===seriesId){
            var usersRow = TABLES.UTIL.findRow(usersTableBI.valueNow(), row.userId);
            return {token: token, clientId: clientId, user: {clientId: clientId, userId: usersRow.userId, username: usersRow.username, emailaddress: usersRow.emailaddress, firstname: usersRow.firstname,lastname: usersRow.lastname,groupId: usersRow.groupId}, token: token, seriesId: seriesId};
        }
        else if(seriesId!=undefined && seriesId.length>0){
            //Token Theft Detected!!! Deleting stolen key
            var deleteTokens = TABLES.UTIL.findRows(persistentTable, "seriesId", seriesId);
            if(deleteTokens.length>0){
                LOG.create("Unable AUTH token theft detected.");
                return deleteTokens;    
            }
        }
        else{
            LOG.create("Unable to find matching token!");
        }
        LOG.create("4");
        return undefined;
    });
    
    
    var stolenTokensDeleteSetE = tokenAuthenticationE.filterNotArrayE().mapE(function(arr){
        var changeSet = [];
        for(var index in arr){
            changeSet.push({command: "remove", data: {rowPk: arr[index]}});
        }
        return changeSet;
    });

    var passwordAuthenticationE = DATA.httpMessageInE.filterE(function(dataPacket){return dataPacket.data && dataPacket.data.command && dataPacket.data.command === AURORA.COMMANDS.AUTHENTICATE && dataPacket.data.data && dataPacket.data.data.password}).mapE(function(dataPacket){
        var clientId = dataPacket.clientId;
        var token = dataPacket.token;
        var seriesId = dataPacket.seriesId;
        
        var usersTable = OBJECT.clone(usersTableBI.valueNow());

        var username = dataPacket.data.data.username;
        var password = dataPacket.data.data.password;
        var emailaddress = dataPacket.data.data.emailaddress;

        var useEmail = dataPacket.data.data.username==undefined && dataPacket.data.data.emailaddress!=undefined;
        var useUsername = dataPacket.data.data.username!=undefined;

        var rememberMe = dataPacket.data.data.rememberMe;
        
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

        if(currentUser!=undefined){
            currentUser.clientId = clientId;
            if(!rememberMe){
                DATA.sendToClients({command: AURORA.COMMANDS.AUTHENTICATE, data: {message: "Successfully Logged In!"}, clientIds: [currentUser.clientId]});
            }
            LOG.create("Password Authentication Success");
            return {user: currentUser, token: token, seriesId: seriesId, rememberMe:rememberMe, clientId:clientId};
        }
        else {
            var message = (foundUser===true && currentUser===undefined)?"Incorrect Password":"Unable to find user in database";
            DATA.sendToClients({command: AURORA.COMMANDS.AUTHENTICATE, data: {message:"Unable to find user in database"}, clientIds: [clientId]});
        }
    }).filterUndefinedE();

    var authenticatedUsersE = F.mergeE(passwordAuthenticationE, tokenAuthenticationE.filterArrayE()).filterUndefinedE().mapE(function(packet){
        return OBJECT.extend({}, packet, {expiry: DATE.getTime()+persistentSessionExpiry});
    });  
    
    var persistentSessionUpdateE = authenticatedUsersE.filterE(function(userTokenPair){return userTokenPair.rememberMe===undefined || userTokenPair.rememberMe===true}).mapE(function(userTokenPair){
        var expiry = DATE.getTime()+persistentSessionExpiry;   //Now +1 week    

        var tokenPair = AUTHENTICATION.createNewTokenSeriesPair(authentication.activeUsersTableBI.valueNow(), 10);
        
        changeSet = [{command: "add", data: {rowPk: tokenPair.token, row: {userId: userTokenPair.user.userId, clientId: userTokenPair.clientId, token: tokenPair.token, seriesId: tokenPair.seriesId, expiry: expiry}}}];        
        if(userTokenPair.token!=undefined){
            changeSet.push({command: "remove", data: {rowPk: userTokenPair.token}});
        }
        DATA.sendToClients({command: AURORA.COMMANDS.AUTHENTICATE, data: {message: "Successfully Logged In!", token:tokenPair.token+"-"+tokenPair.seriesId, expiry:expiry}, clientIds: [userTokenPair.clientId]});
        return changeSet;
    }).filterUndefinedE();
    
    
    var expiredTokenClearE = F.timerE(persistentSessionExpiryClean).mapE(function(){
        return [{command: "exec", callback: function(row){
            return (row.expiry<DATE.getTime())?undefined:row;
        }}];
    });  //Clear out the expired tokens once a minute
    persistentSessionsBI = STORAGE.createTableBI("aurora.persistent_sessions", "token", {
        userId:{name: "User Id", type: "number"},
        seriesId:{name: "Series Id", type: "string"},
        token:{name: "Token", type: "string"},//, unique: true
        clientId:{name: "Client Id", type:"string"},    //TODO: Change this to a list of C
        expiry:{name: "Expiry", type:"number"}
    }, F.mergeE(persistentSessionsLogoutE, stolenTokensDeleteSetE, persistentSessionUpdateE, expiredTokenClearE)).sendToClients("AURORA_PERSISTENT_SESSIONS", AURORA.DATATYPE.UTF8);

    var httpTokenUpdateE = DATA.httpMessageInE.filterE(function(dataPacket){return dataPacket.command!=undefined && dataPacket.token!=undefined && dataPacket.seriesId!=undefined && dataPacket.command === AURORA.COMMANDS.UPDATE_TOKEN;}).mapE(function(dataPacket){
        return {token: dataPacket.token, seriesId: dataPacket.seriesId};
    });
    
    
    var activeSessionExpiryCleanE = F.timerE(activeSessionExpiryClean).mapE(function(){
        return {cleanExpiry: true};
    });
    

    var httpAddConnectionE = DATA.httpMessageInE.filterE(function(websocketPacket){        
        return websocketPacket.command === AURORA.COMMANDS.AUTH.NEW_CONNECTION;
    }).mapE(function(websocketPacket){
        return websocketPacket.data;
    });
    
    var httpDropConnectionE = DATA.httpMessageInE.filterE(function(websocketPacket){
        return websocketPacket.data && websocketPacket.command && websocketPacket.command === AURORA.COMMANDS.AUTH.DROP_CONNECTION;
    }).mapE(function(websocketPacket){
        return {logout: "logout", clientId: websocketPacket.data};
    });
    
    
    
    
    



    var activeSessionTable = TABLES.parseTable("sessionTable", "token", [], {token:{name:"Token", type: "string"},userId:{name:"User Id", type: "number"},seriesId:{name:"Series Id", type: "number"},instances:{name:"Instances", type: "array"},expiry:{name:"Expiry", type: "datetime"}});
   //{token:{name:"Token", type: "string"},seriesId:{name:"Series Id", type: "string"},userId:{name:"User Id", type: "number"},clientIds: {name: "Client Id", type: "array"}}
    var activeSessionTableE = F.mergeE(activeSessionExpiryCleanE, httpTokenUpdateE, httpAddConnectionE, httpDropConnectionE, authenticatedUsersE, logoutCommandE, forcedLogoutE).collectE({table: activeSessionTable, clientMap: {}}, function(updateCommand, state){
        var sessionTable = state.table;
        var clientMap = state.clientMap;   
        LOG.create("Updating Active Sessions table");
       if(updateCommand.clientId && updateCommand.token){
           clientMap[updateCommand.clientId] = updateCommand.token;
       }
       
       if(updateCommand.cleanExpiry!==undefined){
            var deleteSet = [];
            for(var rowIndex in sessionTable.data){
                if(sessionTable.data[rowIndex].instances.length==0 && sessionTable.data[rowIndex].expiry<DATE.getTime()){
                    deleteSet.push(sessionTable.data[rowIndex].token);
                }
                
            }
            for(var index in deleteSet){
                TABLES.UTIL.removeRow(sessionTable, deleteSet[index]);
            }
        }
        //A new token has been received
        else if(updateCommand.token && updateCommand.seriesId){
            var row = TABLES.UTIL.findRow(sessionTable, updateCommand.token);
            if(!row){
                var instances = updateCommand.clientId===undefined?[]:[updateCommand.clientId];
                TABLES.UTIL.addRow(sessionTable, updateCommand.token, {token: updateCommand.token, seriesId: updateCommand.seriesId, userId: (updateCommand.user?updateCommand.user.userId:undefined), instances: instances, expiry: (DATE.getTime()+activeSessionExpiry)});
            }
            else{
                if(updateCommand.clientId && !ARRAYS.contains(row.instances, updateCommand.clientId)){
                    row.instances.push(updateCommand.clientId);
                }
                if(updateCommand.user){
                    row.userId = updateCommand.user.userId;    
                }
                row.expiry = DATE.getTime()+activeSessionExpiry;
                clientMap[updateCommand.clientId] = updateCommand.token;
            }
        }
        //Logout Command Received
        else if(updateCommand.logout){   
            if(updateCommand.clientId && updateCommand.token){
                var row = TABLES.UTIL.findRow(sessionTable, updateCommand.token);  
                if(row){
                    ARRAYS.remove(row.instances, updateCommand.clientId);        
                    if(row.instances.length===0){
                        TABLES.UTIL.removeRow(sessionTable, updateCommand.token); 
                    }
                }
                else{
                    LOG.create("Unable To Logout cannot find token "+updateCommand.token);
                }
            }
            else if(updateCommand.token){
                TABLES.UTIL.removeRow(sessionTable, updateCommand.token);    
            }
            else if(updateCommand.userId){
                var userRows = TABLES.UTIL.findRows(sessionTable, "userId", updateCommand.userId);    
                for(var index in userRows){
                    TABLES.UTIL.removeRow(sessionTable, userRows[index].token);
                }
            }
        }
        if(TABLES.UTIL.isTable(updateCommand) && updateCommand.applyId){
            sessionTable.tableMetaData.applyId = updateCommand.applyId;
        } 
      //  LOG.create("Updating Active Sessions Table for "+updateCommand.clientId)
       // LOG.create(clientMap);
        LOG.create(sessionTable.data);
        return {table: sessionTable, clientMap: clientMap};
    })
    
    var activeClientIdsB = activeSessionTableE.mapE(function(state){return state.clientMap;}).startsWith({});
    var activeSessionTableB = activeSessionTableE.mapE(function(state){return state.table;}).startsWith(activeSessionTable);
    
    //activeSessionTableB.print();
    
    /*
    //A list of current user tokens, to be used by the http server to allocate new ones.
    activeSessionTableB.liftB(function(activeSessionsTable){
        if(good()){
            return chooseSignal();
        }
        return tables.UTIL.extractColumn(activeSessionsTable, "token");
    }).sendToClients("AURORA_TOKENS", AURORA.DATATYPE.UTF8);
    */
    
    //Active Users Table
    authentication.activeUsersTableBI = F.liftB(function(activeUsersDataTable){
        if(!good()){
            return chooseSignal();
        }
        var activeUsersDataTable = OBJECT.clone(activeUsersDataTable);
        for(var rowIndex in activeUsersDataTable.data){
            if(activeUsersDataTable.data[rowIndex]["userId"]==undefined){
                activeUsersDataTable.data[rowIndex]["userId"] = 0;
                activeUsersDataTable.data[rowIndex]["groupId"] = 1;
            }
        }
        return activeUsersDataTable;
    },TABLES.joinB(activeSessionTableB, usersTableBI,"userId", undefined, ["userId","groupId"]));//TABLES.joinB(TABLES.joinB(TABLES.joinB(DATA.auroraConnectionsTableB, DATA.clientDataSourceUsageTableB, "clientId"), activeSessionTableB, "clientId"), usersTableBI,"userId", undefined, ["userId","groupId"]));
//},TABLES.joinB(TABLES.joinB(TABLES.joinB(DATA.auroraConnectionsTableB, DATA.clientDataSourceUsageTableB, "clientId"), activeSessionTableB, "clientId"), usersTableBI,"userId", undefined, ["userId","groupId"]));


    F.liftBI(function(activeUsersTable){
        //TABLES.UTIL.printTable(activeUsersTable);
        return activeUsersTable;
    }, function(newTable){
        for(var rowPk in newTable.rowMetaData){
            if(newTable.rowMetaData[rowPk]&&newTable.rowMetaData[rowPk].deleted===true){
                var rowIndex = TABLES.UTIL.findRowIndex(newTable, rowPk);
                forcedLogoutE.sendEvent({clientId: newTable.data[rowIndex].clientId, logout:true});
            }
        }
        //TODO: fix this, so that the table shows a working result. forcedLogoutE.sendEvent({applyId: newTable.tableMetaData.applyId});
        return [newTable];
    }, authentication.activeUsersTableBI).sendToClients("AURORA_ACTIVE_USERS", AURORA.DATATYPE.UTF8);


    authentication.dataPermissionsBI = STORAGE.createTableBI("aurora.datapermissions", "dataSource", {
        dataSource:{name: "Data Source", type: "string"},
        groups:{name: "Groups", type: "map"},
        users:{name: "Users", type: "map"}
    }).sendToClients("AURORA_DATAPERMISSIONS", AURORA.DATATYPE.UTF8);
    

    authentication.clientCanWrite = function(clientId, dataSource, write){
        authentication.clientCanRead(clientId, dataSource, true);
    }
    authentication.clientCanRead = function(clientId, dataSource, write){
        var table = authentication.activeUsersTableBI.valueNow();
        var clientMap = activeClientIdsB.valueNow();
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
        
        var rowIndex = TABLES.UTIL.findRowIndex(permissionTable, dataSource);
    
        if(permissionTable.data[rowIndex].dataSource===dataSource && permissionTable.data[rowIndex].groups && permissionTable.data[rowIndex].groups[groupId+""]!==undefined){
            if((permissionTable.data[rowIndex].groups[groupId+""]==="R" && write!==true) || (permissionTable.data[rowIndex].groups[groupId+""]==="RW")){ //|| permissionTable.data[rowIndex].permission==="RW"){
                //LOG.create("Group Access Granted to object "+dataSource);
                return true;
            }
        }
        if(permissionTable.data[rowIndex].dataSource===dataSource && (permissionTable.data[rowIndex].users && permissionTable.data[rowIndex].users[userId+""]!==undefined)){
            if((permissionTable.data[rowIndex].users[userId+""]==="R" && write!==true) || (permissionTable.data[rowIndex].users[userId+""]==="RW")){ //|| permissionTable.data[rowIndex].permission==="RW"){
                //LOG.create("User Access Granted to object "+v);
                return true;
            }
        }
        return false;
    };

    
    return authentication;
})(AUTHENTICATION || {});

