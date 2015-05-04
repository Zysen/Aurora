var MOD_REWRITE = (function(mod_rewrite){
    var rules = {};
    HTTP.addPreRequestCallback(function(request){
        for(var pattern in rules){
            var matches = request.url.pathname.match(pattern);
            if(matches!==null && matches.length>0){
                var replace = rules[pattern];
                replace = replace.replaceAll("$1", matches[1]);
                
                /*
                var replace = rules[pattern];
                for(var i=1;i<=matches.length;i++){
                    replace = replace.replaceAll("$"+i, matches[i-1]);
                }
                */
                
                //LOG.create("Rewriting URL: "+request.url.pathname+" to "+replace);
                request.url.pathname = replace;
                request.url.path = replace+request.url.search;
                request.url.href = replace+request.url.search;
                return request;
            }
        }
    });
    mod_rewrite.addRule = function(expression, replace){
        rules[expression] = replace;
    };
    
    mod_rewrite.addRules = function(ruleset){
        OBJECT.extend(rules, ruleset);
    };

    return mod_rewrite;
}(MOD_REWRITE || {}));