var DOM = (function(dom){
	dom.get = function(domId){
		return document.getElementById(domId);
	};
	dom.parse = function(html){
    	var element = this.createDiv();
    	element.innerHTML = html;
    	return element.children;
    };
    dom.create = function(type, id, className, innerHTML){
    	var element = document.createElement(type);
    	if(id!=undefined){
    		element.id = id;
    	}
    	if(className!=undefined){
    		element.className = className;
    	}
    	if(innerHTML!=undefined){
    		element.innerHTML = innerHTML;
    	}
    	return element;
    };
    dom.createAndAppend = function(parentElement, type, id, className, innerHTML){
        var element = dom.create(type, id, className, innerHTML);
        parentElement.appendChild(element);
        return element;
    };
    dom.elementIsDescendant = function(parent, child){
	  	var node = child.parentNode;
	    while (node != null) {
	        if (node == parent) {
	            return true;
	        }
	        node = node.parentNode;
	    }
	    return false;
	};
	dom.remove = function(element){
		element.parentNode.removeChild(element);
	};
	dom.stopEventBubble = function(e){
		 var evt = e ? e:window.event;
		 if (evt.stopPropagation)    evt.stopPropagation();
		 if (evt.cancelBubble!=null) evt.cancelBubble = true;
	};
	dom.findParentNodeWithTag = function(element, tag){
	    if(element==undefined||element==null)
	        return undefined; 
	    else if(element.tagName && element.tagName.toUpperCase() == tag.toUpperCase())
	        return element;
	    return this.findParentNodeWithTag(element.parentNode, tag);    
	};
	dom.div = function(child){
        var newDiv = this.create("div");
        newDiv.appendChild(child);
        return newDiv;
    };
    dom.getElementsByClassName = function(class_name, elm) {
        var docList = elm.getElementsByTagName('*');
        var matchArray = [];
        /*Create a regular expression object for class*/
        var re = new RegExp("(?:^|\\s)"+class_name+"(?:\\s|$)");
        for (var i = 0; i < docList.length; i++) {
            if (re.test(docList[i].className) ) {
                matchArray.push(docList[i]);
            }                                                  
        }
        return matchArray;
    };
    
    
	return dom;
}(DOM || {}));
