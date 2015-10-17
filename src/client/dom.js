var DOM = (function(dom){
	dom.isParentOf = function(parent, child){
		if(child===parent){
			return true;
		}
		else if(child===document){
			return false;
		}
		if(this===null || child===null || child.parentNode===undefined || this.isParentOf===undefined){
			return false;
		}
		return this.isParentOf(parent, child.parentNode);
	};
	dom.stopEvent = function(event){
        event.stopPropagation();  
        event.preventDefault();
    };
	dom.isIE = function (){
		var a=navigator.userAgent.toLowerCase();
		return-1!=a.indexOf("msie")?parseInt(a.split("msie")[1]):!1
	};
	dom.get = function(domId){
		var el = document.getElementById(domId);
		if(el===undefined){
			console.log("DOM.get unable to find element "+domId);
		}
		return el;
	};
	dom.parse = function(html){
    	var element = dom.create('div');
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
		if(element != null) {
			element.parentNode.removeChild(element);
		}
	};

	dom.removeChildren = function(element){
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	};
	
	HTMLElement.prototype.removeChildren = function(){
		dom.removeChildren(this);
	};

	dom.stopEventBubble = function(e){
		 var evt = e ? e:window.event;
		 if (evt.stopPropagation) evt.stopPropagation();
		 if (evt.cancelBubble!=null) evt.cancelBubble = true;
		 if (evt.preventDefault!=null) evt.preventDefault();
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
    
    F.EventStream.prototype.stopDomE = function(){
    	return this.mapE(function(e){
    		DOM.stopEventBubble(e);
    		return e;
    	});
    };

    dom.disableHighlight = function (target){
        if(document.all)
            target.onselectstart = handleSelectAttempt;
        target.onmousedown = function(e) {
            var sender = e && e.target || window.event.srcElement;
            if (window.event) {
                event.returnValue = true;
            }
            return true;
        };
    };
    
    /**
     * Creates an error tag and prepends it to the passed container.
     * It is important to call DOM.tidyErroredTags() after all error tags have been added.
     */
    dom.createErroredTag = function(container, message){
    	var jcontainer = jQuery(container);
    	
    	// DIV container is required for Firefox because you cannot set position:absolute directly inside a <td>
    	var jdiv_container = jQuery('<div>', {'class':'errored_tag'});		
    	var jdiv_tag = jQuery('<div>', {'class':'errored_tag_container'});
    	jdiv_container.append(jdiv_tag);
    	
    	var jdiv_message = jQuery('<div>', {'class':'errored_tag_message'});
    	jdiv_tag.append(
    			jdiv_message,
    			jQuery('<div>', {'class':'errored_tag_tag'})
    			);
    	
    	// Check message for special html chars &#
    	var jmessage_span;
    	if(String(message).indexOf('&#') > -1){
    		jmessage_span = jQuery('<span>', {'class':'errored_tag_message_text'}).html(message);
    	} else {
    		jmessage_span = jQuery('<span>', {'class':'errored_tag_message_text', text: message});
    	}
    	
    	jdiv_message.append(jmessage_span);
    	
    	jdiv_container.mouseover(function(){
    		jdiv_message.removeAttr('style');
    		jdiv_message.css('box-shadow', '1px 1px 5px #666666');
    		jdiv_tag.removeAttr('style');
    		jdiv_tag.css('z-index', 10);
    	});
    	
    	jdiv_container.mouseout(function(){
    		jdiv_tag.removeAttr('style');
    		jdiv_message.removeAttr('style');
    		
    		DOM.tidyErroredTags();
    	});
    	
    	jcontainer.prepend(jdiv_container);
    };

    dom.detectBrowser= function(){
	    var ua= navigator.userAgent, tem, 
	    M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
	    if(/trident/i.test(M[1])){
	        tem=  /\brv[ :]+(\d+(\.\d+)?)/g.exec(ua) || [];
	        return 'IE '+(tem[1] || '');
	    }
	    M= M[2]? [M[1], M[2]]:[navigator.appName, navigator.appVersion, '-?'];
	    if((tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
	    return M.join(' ');
	};

    /**
     * Removes overlaps in error tags.
     */
    dom.tidyErroredTags = function(){
    	// Adjust tags so they don't overlap each other
    	jQuery('.errored_tag_container').each(function() {
    		
    		var jtarget = jQuery(this);
    	    var bounds = jtarget.offset();
    	    bounds.right = bounds.left + jtarget.outerWidth();
    	    bounds.bottom = bounds.top + jtarget.outerHeight();
    	    
    	    var max_overlap = 0;
    	    jQuery('.errored_tag_container').not(jtarget).each(function() {
    	    	
    	    	var jother = jQuery(this);
    	    	var pos = jother.offset();
    	    	var height = jother.outerHeight();
    	    	
    	    	if(pos.left >= bounds.left && pos.left <= bounds.right
    	    			&& (pos.top >= bounds.top && pos.top <= bounds.bottom) 
    	    			|| (pos.top + height >= bounds.top && pos.top + height <= bounds.bottom)){
    	    		
    	    		// Overlap found, see if largest
    	    		var overlap = (bounds.right - pos.left);
    	    		if(overlap > max_overlap){
    	    			max_overlap = overlap;
    	    		}
    	    	}
    	    	
    	    });
    		
    	    // Adjust width of target tag so it doesn't overlap
    	    if(max_overlap > 0){
    	    	jtarget.css('max-width', jtarget.outerWidth() - (max_overlap + 10));
    	    }
    	});
    };
    
    /** 
     * Creates a default loading icon and message.
     */
   dom.createLoadingMessage = function(){
    	var jdiv_container = jQuery('<div>', {'class':'loading_tag'});
    	jdiv_container.text('LOADING...');
    	return jdiv_container.get(0);
    };

    dom.WIDGETS = {
		radioGroupWidget: function(groupId, buttons){
			var radioContainer = dom.create('div');
			var count = 1;
			var domElements = [];
			var defaultSelection = undefined;
			for(var index in buttons){
				var label = buttons[index].label;
				var value = buttons[index].value;
				
				var radioElement = dom.create('input');
				radioElement.type = 'radio';
				radioElement.name = groupId;
				radioElement.className = groupId+"_"+count;
				
				if(buttons[index].checked !=undefined  && buttons[index].checked==true){
					radioElement.checked = true;
					defaultSelection = {target: radioElement};
				}
				var labelElement = dom.create('label', undefined, undefined, label);
				labelElement.className = groupId+"_"+count;
				radioContainer.appendChild(radioElement);
				radioContainer.appendChild(labelElement);
				if(count<buttons.length){	//Soacer
					radioContainer.appendChild(dom.create('span', undefined, undefined, "&nbsp;"));
				}
				domElements.push({element: radioElement, label: labelElement});
				count++;
			}
		
			return {
				build: function(){
					return radioContainer;
				},
				load:function(){
					var events = [];
					for(var index in domElements){
						events.push(jQuery(domElements[index].element).fj('jQueryBind', 'change'));
						events.push(F.clicksE(domElements[index].label));
					}
					return F.liftB(function(modeElement, userButtons, elements){
						if(!good()){
							return chooseSignal();
						}
						var elementNum = parseInt(modeElement.target.className.replace(groupId+"_", ""))-1;
						elements[elementNum].element.checked = true;
						return buttons[elementNum].value;
					}, F.mergeE.apply(this, events).startsWith(defaultSelection || SIGNALS.NOT_READY), F.constantB(buttons), F.constantB(domElements));
				}
			};
		}
	};
    
    HTMLElement.prototype.removeChildren = function(){
		dom.removeChildren(this);
	};
    
    HTMLElement.prototype.showB = function(valueB){
    	var visibleState = this.style.display;
    	var element = this;
    	valueB.liftB(function(val){
    		if(!val){
    			visibleState = element.style.display;
    		}
    		element.style.display=val?"":"none";
    	});
	};
    
    HTMLElement.prototype.showE = function(valueE){
    	var visibleState = this.style.display;
    	var element = this;
    	valueE.mapE(function(val){
    		if(!val){
    			visibleState = element.style.display;
    		}
    		element.style.display=val?"":"none";
    	});
	};
    
	

	F.EventStream.prototype.dom = function(){
		var bParent = this;
		/**
		 * EventStream that writes to the innerHTML of a DOM element
		 */
		return {
			innerHTMLE:function(element){
				return bParent.mapE(function(value){
					if(!good()){
						return value;
					}
					element.innerHTML = value;
				});
			},
			/**
			 * EventStream that shows or hides a given html element.
			 */
			showE: function(element){
		    	var visibleState = element.style.display;
		    	return bParent.mapE(function(val){
		    		if(!val){
		    			visibleState = element.style.display;
		    		}
		    		element.style.display=val?"":"none";
		    	});
			},
			
			/**
			 * EventStream that disabled or enables a given html element.
			 */
			disabledE: function(element){
		    	return bParent.mapE(function(val){
		    		element.disabled = val;
		    	});
			}
		};
	};

	F.Behavior.prototype.dom = function(){
		var bParent = this;
		return {
			innerHTMLB:function(element){
				return bParent.liftB(function(value){
					if(!good()){
						return value;
					}
					element.innerHTML = value;
				});
			},
			/**
			 * Behaviour that shows or hides a given html element.
			 */
			showB: function(element){
		    	var visibleState = element.style.display;
		    	return bParent.liftB(function(val){
		    		if(!val){
		    			visibleState = element.style.display;
		    		}
		    		element.style.display=val?"":"none";
		    	});
			},
			
			/**
			 * EventStream that disabled or enables a given html element.
			 */
			disabledB: function(element){
		    	return bParent.liftB(function(val){
		    		element.disabled = val;
		    	});
			}
		};
	};

	
	return dom;
}(DOM || {}));
