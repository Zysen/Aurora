var AUTHENTICATION = (function(authentication, widgets, aurora, cookies){
    
    /*function getCookie(cname){
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++){
          var c = ca[i].trim();
          if (c.indexOf(name)==0){
              return c.substring(name.length,c.length);
          }
        }
        return "";
    }
    */
    
    //Invalid token reset
    aurora.sendToClientE.filterE(function(packet){   //TODO: Should the onceE be there?
       return packet.command===AURORA.COMMANDS.AUTH.TOKEN_INVALID;
    }).mapE(function(){ //The presented token is now invalid. Delete it and reconnect.     
        document.cookie="sesh=false; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
        location.reload(true);
    });
    
    //Send Authentication token to server
    aurora.authTokenRequestE = aurora.connectionStatusE.filterE(function(packet){   //TODO: Should the onceE be there?
       return packet.data===aurora.STATUS.CONNECTED && cookies.getCookie("sesh")!=undefined;
    }).onceE().mapE(function(){
       LOG.create("Sending Auth Token");
       aurora.sendToServer({command: aurora.COMMANDS.AUTHENTICATE, data: {token: cookies.getCookie("sesh")}});
    }).mapE(function(){
        DATA.reregisterAll();
    });
    
    //TODO: Link up with http server, to enable a session across all requests. Probably give the webserver a copy of the sessions table. 
    
    
    //Receive Authentication token from server.
    aurora.currentUserB = aurora.sendToClientE.filterE(function(message){
        return message.command===aurora.COMMANDS.UPDATE_TOKEN && message.data.token!=undefined;
    }).mapE(function(messagePacket){
        aurora.token = messagePacket.data.token;
        if(messagePacket.data.expiry!==undefined){
            var date = new Date();
            date.setTime(messagePacket.data.expiry);    //TODO: Apply timezone offset   -(date.getTimezoneOffset()*60000)
            document.cookie="sesh="+messagePacket.data.cookie+"; expires="+date.toGMTString()+"; path=/";      //Thu, 18 Dec 2013 12:00:00 GMT
        }
        else{
            document.cookie="sesh="+messagePacket.data.cookie+"; path=/"; 
        }
        console.log(document.cookie);
        return {userId: messagePacket.data.userId, groupId: messagePacket.data.groupId};
    }).startsWith({userId: -1, groupId: 1});
    
    widgets.register("LoginForm", function(instanceId, data, purgeData){
        var container = DOM.create("div");
        var emailInputContainer = DOM.createAndAppend(container, "div");
        var emailInput = DOM.createAndAppend(emailInputContainer, "input");
        emailInput.placeholder = "Email Address";
        var usernameInputContainer = DOM.createAndAppend(container, "div");
        var usernameInput = DOM.createAndAppend(usernameInputContainer, "input");
        usernameInput.placeholder = "Username";
        var passwordInputContainer = DOM.createAndAppend(container, "div");
        var passwordInput = DOM.createAndAppend(passwordInputContainer, "input");
        passwordInput.placeholder = "Password";
        passwordInput.type = "password";
        var rememberMeCont = DOM.createAndAppend(container, "div");
        var rememberMeLabel = DOM.createAndAppend(rememberMeCont, "span", undefined, undefined, "Remember Me? ");
        var rememberMe = DOM.createAndAppend(rememberMeCont, "input");
        rememberMe.type = "checkbox";
        rememberMe.label = "Remember Me?";
        
        var serverMessages = DOM.createAndAppend(container, "div");
        var button = DOM.createAndAppend(container, "button", undefined, undefined, "Login");
        
        return {
            build:function(){
                return container;
            },
            load:function(){
            	aurora.currentUserB.liftB(function(currentUser){
            		return good(currentUser)&&(currentUser.groupId===undefined||currentUser.groupId===1);
            	}).domDisplayB(container);
            	
                var usernameB = F.extractValueB(usernameInput);
                var passwordB = F.extractValueB(passwordInput);
                var emailB = F.extractValueB(emailInput);
                var rememberMeB = F.extractValueE(rememberMe).mapE(function(){LOG.create(rememberMe.checked);return rememberMe.checked;}).startsWith(false);
                
                var formDataB = F.liftB(function(username, password,emailaddress, rememberMe){
                	var formData = {password:CRYPTO.md5(password),rememberMe:rememberMe};
                    if(emailaddress!=undefined && emailaddress.length>0){
                        formData.emailaddress = emailaddress;
                    }
                    if(username!=undefined && username.length>0){
                        formData.username = username;
                    }
                    return formData;
                }, usernameB,passwordB,emailB, rememberMeB);
                F.clicksE(button).snapshotE(formDataB).mapE(function(formData){
                    AURORA.sendToServer({command: AURORA.COMMANDS.AUTHENTICATE, data: formData});
                });
                
                AURORA.sendToClientE.filterE(function(message){
                    return message.command===AURORA.COMMANDS.AUTHENTICATE;
                }).mapE(function(messagePacket){
                    serverMessages.innerHTML = messagePacket.data.message;
                });
            },
            destroy:function(){
                DOM.remove(container);
            }
        };
    });

    widgets.register("ActiveUsers", function(instanceId, data, purgeData){
        var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
        return {
            build:function(){
                return tableWidget.build();
            },
            load:function(){
                /*
                var modifiedDataTableBI = F.liftBI(function(table){
                    if(!good()){
                        return chooseSignal();
                    }
                    var newTable = OBJECT.clone(table);
                    var visibleColumns = ["token", "seriesId", "firstname", "lastname", "username", "emailaddress", "description", "instances", "userId", "expiry"]; //, "instances"  //, "dataSources"
                    newTable.tableMetaData.canDelete = true;
                    newTable.tableMetaData.canAdd = false;
                    for(var columnIndex in newTable.columnMetaData){
                        if(!ARRAYS.contains(visibleColumns, columnIndex)){
                            newTable.columnMetaData[columnIndex].visible = false;
                        }
                        newTable.columnMetaData[columnIndex].readonly=true;
                    }
                    TABLES.UTIL.setColumnOrder(newTable, visibleColumns); 
                    newTable.columnMetaData["userId"].visible = false;
                    newTable.columnMetaData["description"].name = "Group";
                    return newTable;
                },function(table){
                    return [table];
                }, TABLES.leftJoin(DATA.requestB(instanceId, "AURORA_ACTIVE_USERS"), TABLES.leftJoin(DATA.requestB(instanceId, "AURORA_USERS"), DATA.requestB(instanceId, "AURORA_GROUPS"), "groupId"), "userId"));
                */
               
                var modifiedDataTableBI = F.liftBI(function(table){
                    if(!good()){
                        return chooseSignal();
                    }
                    var newTable = OBJECT.clone(table);
                    newTable.tableMetaData.readonly = true;
                    //newTable.columnMetaData.expiry.renderer = WIDGETS.renderers.TimestampDiff;
                    newTable.columnMetaData.expiry.dataType = "TimestampDiff";
                    return newTable;
                },function(table){
                    return [table];
                }, DATA.requestB(instanceId, "AURORA_SESSIONS"));
               tableWidget.load(modifiedDataTableBI);
            },
            destroy:function(){
                DATA.release(instanceId, "AURORA_SESSIONS");
                //DATA.release(instanceId, "AURORA_USERS");
                //DATA.release(instanceId, "AURORA_GROUPS");
                tableWidget.destroy();
            }
        };
    });
    
    
    widgets.register("DataSourcesPermissionTable", function(instanceId, data, purgeData){
        var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
        
        var findRow = function(table, column, match){
          for(var rowIndex in table.data){
              if(table.data[rowIndex][column]===match){
                  return table.data[rowIndex];
              }
          }  
        };
        
        
        return {
            build:function(){
                return tableWidget.build();
            },
            load:function(){
                var modifiedDataTableBI = F.liftBI(function(table, dataSources, groups){
                    if(!good()){
                        return chooseSignal();
                    }
                    var newTable = OBJECT.clone(table);
                    TABLES.UTIL.eachRow(newTable, function(row, rowIndex){
                        if(row.groupId===3 && (row.dataSource==="AURORA_DATASOURCES" || row.dataSource==="AURORA_USERS" || row.dataSource==="AURORA_GROUPS" || row.dataSource==="AURORA_DATAPERMISSIONS")){
                            newTable.rowMetaData[row.permissionId].disabled = true;
                        }
                    });
                    var groupOptions = {keyMap: {}, valueMap: {"R":"R", "RW":"RW"}};                
                    for(var rowIndex in groups.data){
                        groupOptions.keyMap[groups.data[rowIndex]["groupId"]] = groups.data[rowIndex]["description"];
                    }
                    newTable.columnMetaData["groups"].rendererOptions = groupOptions;
                    newTable.columnMetaData["users"].rendererOptions = {valueMap: {"R":"R", "RW":"RW"}};
                    
                    return newTable;
                },function(table){
                    var newTable = OBJECT.clone(table);
                    TABLES.UTIL.eachRow(newTable, function(row, rowIndex){
                        if(row.groupId===3 && (row.dataSource==="AURORA_DATASOURCES" || row.dataSource==="AURORA_USERS" || row.dataSource==="AURORA_GROUPS" || row.dataSource==="AURORA_DATAPERMISSIONS")){
                            OBJECT.remove(newTable.rowMetaData[row.permissionId], "userChange");
                            OBJECT.remove(newTable.rowMetaData[row.permissionId], "deleted");
                        }
                    });
                    return [newTable, undefined, undefined];                                  
                }, DATA.requestB(instanceId, "AURORA_DATAPERMISSIONS"), DATA.requestB(instanceId, "AURORA_DATASOURCES"), DATA.requestB(instanceId, "AURORA_GROUPS"));
                
                tableWidget.load(modifiedDataTableBI);
            },
            destroy:function(){
                DATA.release(instanceId, "AURORA_DATAPERMISSIONS");
                DATA.release(instanceId, "AURORA_DATASOURCES");
                DATA.release(instanceId, "AURORA_GROUPS");
                tableWidget.destroy();
            }
        };
    });
    /*
    widgets.register("PersistentSessionsTable", function(instanceId, data, purgeData){
        var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
        return {
            build:function(){
                return tableWidget.build();
            },
            load:function(){
                var modifiedDataTableBI = F.liftBI(function(table){
                    if(!good()){
                        return chooseSignal();
                    }
                    table.tableMetaData.canAdd = false;
                    table.tableMetaData.canDelete = true;
                    table.columnMetaData["description"].name = "Group";
                    var visibleColumns = ["firstname", "lastname", "username", "emailaddress", "description", "token", "seriesId", "expiry"];
                    for(var columnIndex in table.columnMetaData){
                        if(!ARRAYS.contains(visibleColumns, columnIndex)){
                             table.columnMetaData[columnIndex].visible= false;
                        }
                        table.columnMetaData[columnIndex].readonly=true;
                    }
                    TABLES.UTIL.setColumnOrder(table, visibleColumns); 
                    return table;
                },function(table){
                    return [table];
                }, TABLES.leftJoin(DATA.requestB(instanceId, "AURORA_PERSISTENT_SESSIONS"), TABLES.leftJoin(DATA.requestB(instanceId, "AURORA_USERS"), DATA.requestB(instanceId, "AURORA_GROUPS"), "groupId"), "userId"));
                tableWidget.load(modifiedDataTableBI);
            },
            destroy:function(){
                DATA.release(instanceId, "AURORA_PERSISTENT_SESSIONS");
                DATA.release(instanceId, "AURORA_USERS");
                DATA.release(instanceId, "AURORA_GROUPS");
                tableWidget.destroy();
            }
        };
    });
    */
    widgets.register("Logout", function(instanceId, data, purgeData){
        return {
            build:function(){},
            load:function(){
               F.liftB(function(connected, authTokenSent){
                   if(good(connected) && connected===true){
                      LOG.create("LOgging Out");
                      AURORA.sendToServer({command: AURORA.COMMANDS.UNAUTHENTICATE, data: {command: AURORA.COMMANDS.UNAUTHENTICATE,token: getCookie("sesh")}}); 
                      document.cookie = 'sesh=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                   }
               },aurora.connectedB, aurora.authTokenRequestE.startsWith(SIGNALS.NOT_READY));
            },
            destroy:function(){}
        };
    });
    
    return authentication;
}(AUTHENTICATION || {}, WIDGETS, AURORA, COOKIES));




