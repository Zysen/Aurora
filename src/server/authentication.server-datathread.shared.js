var AUTHENTICATION = (function(authentication){
    authentication.createNewTokenSeriesPair = function(persistenSessions, size, seriesId){
        //Find a unique token and a unique seriesId
        do{
            var token = crypto.randomBytes(size).toString("hex");
        }while(TABLES.UTIL.findRow(persistenSessions, token)!=false);
        if(seriesId==undefined){
            do{
                var seriesId = crypto.randomBytes(size).toString("hex");
                var found=false;
                for(var rowIndex=0;rowIndex<persistenSessions.data.length;rowIndex++){
                    if(persistenSessions.data[rowIndex].seriesId===seriesId){
                        found = true;
                        break;
                    }
                }
            }while(found===true);
        }
        return {token: token, seriesId: seriesId};
    };
    return authentication;
}(AUTHENTICATION || {}));   