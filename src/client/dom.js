var DOM = (function(dom){
	dom.makeDomSafe = function(str){
		return str.replaceAll(" ", "_").replace(/^[^a-z]+|[^\w:.-]+/gi, "?");
	};
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
		return-1!=a.indexOf("msie")?parseInt(a.split("msie")[1]):!1;
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
    
	dom.checkboxClicksE = function(ch, allowNullB){
    	
    	allowNullB = allowNullB || F.constantB(false);
    	if(!(allowNullB instanceof F.Behavior)){
    		allowNullB = F.constantB(allowNullB); 
    	}
    	var rec = F.receiverE();
    	var state = undefined;
		ch.onclick = function(e){
			if(allowNullB.valueNow()===true){
			setTimeout(function(){
				console.log("checkboxClicksE", allowNullB.valueNow());
				if(state===undefined){			
					if(ch.indeterminate){
			    		state = 1;
			    	}
			    	else if(ch.checked===true){
			    		state = 0;
			    	}
			    	else{
			    		state = 2;
			    	}
			    	console.log("Default State "+state);
				}	    	
			
				if(state===0){
					//if(allowNullB.valueNow()){
					//	state++;
					//}
					//else{
						ch.checked = false;
						ch.indeterminate = true;
					//}
				}
				if(state===1){
					ch.indeterminate = false;
					ch.checked = false;
				}
				else if(state===2){
					ch.indeterminate = false;
					ch.checked = true;
				}
				state++;
				state = state % 3;
				rec.sendEvent(ch.indeterminate?undefined:ch.checked);
			}, 1);
			event.stopPropagation();
			return false;
				
			}
			else{
				rec.sendEvent(ch.checked);
			}
			
			
		};	
		return rec.mapE(function(a){return a;});			//<- The mapE is just so you cant call send event on it.
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
    	
    	return jdiv_container.get(0);
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
					}, F.mergeE.apply(this, events).startsWith(defaultSelection || NOT_READY), F.constantB(buttons), F.constantB(domElements));
				}
			};
		}
	};
	
	HTMLSelectElement.prototype.optionsB = function(valueB){
		var select = this;
		valueB.liftB(function(v){
			if(good()){
				select.removeChildren();
				for(var index in v){
					
					var el = document.createElement("option");
					el.innerHTML = v[index];
					el.id = v[index];
					select.appendChild(el);
					
				}
			}
		});
	};
	
	 HTMLElement.prototype.each = function(cb){
	 	for(var index in this.childNodes){
	 		cb(this.childNodes[index]);
	 	}
	 };
    
    HTMLElement.prototype.showB = function(valueB, forcedStateB){
    	if(!forcedStateB instanceof F.Behavior){
    		forcedStateB = F.constantB(forcedState);
    	}
    	var visibleState = this.style.display;
    	var element = this;
    	F.liftB(function(val, forcedState){
    		if(!good()){
    			return chooseSignal();
    		}
    		if(!val && (element.style.display !== "none")) {
    			visibleState = element.style.display;
    		}
    		if(forcedState){
    			visibleState = forcedState;
    		}
    		element.style.display=val?visibleState:"none";
    	},valueB,forcedStateB);
	};
    
    HTMLElement.prototype.showE = function(valueE){
    	var visibleState = this.style.display;
    	var element = this;
    	valueE.mapE(function(val){
    		if(!val){
    			visibleState = element.style.display;
    		}
    		element.style.display=val?visibleState:"none";
    	});
	};
	
	HTMLElement.prototype.valueE = function(valueE){
    	var element = this;
    	valueE.mapE(function(val){
			element.value = val;    		
    	});
	};
	
	HTMLElement.prototype.valueB = function(valueB){
    	var element = this;
    	valueB.liftB(function(val){
    		if(good()){
				element.value = val;
    		}
    	});
	};
	
	HTMLElement.prototype.innerHTMLE = function(valueE){
    	var element = this;
    	valueE.mapE(function(val){
			element.innerHTML = val;    		
    	});
	};
	
	HTMLElement.prototype.innerHTMLB = function(valueB){
    	var element = this;
    	valueB.liftB(function(val){
    		if(good()){
				element.innerHTML = val; 
    		}
    	});
	};

	HTMLElement.prototype.cssClassB = function(valueB, klass){
		var element = this;
		valueB.liftB(function(val){
			if (val) element.classList.add(klass);
			else element.classList.remove(klass);
		});
	};

	HTMLElement.prototype.onChangeE = function(){
		var rec = F.receiverE();
		var textarea = this;
		this.onchange = function(){
       		rec.sendEvent(textarea.value);
        }
       return rec;
	}
	
	dom.removeChildren = function(element){
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	};
	
	HTMLElement.prototype.removeChildren = function(){
		dom.removeChildren(this);
	};
	
	HTMLButtonElement.prototype.clicksE = function(){
		return F.clicksE(this);	
	};
	HTMLButtonElement.prototype.disabledB = function(valueB){
		var element = this;
		return valueB.liftB(function(val){
			element.disabled=val;
		});
	};

	F.EventStream.prototype.stopPropagationE = function(){
		return this.mapE(function(event){
			if (event.stopPropagation){
		    	event.stopPropagation();
		    }
		    else if(window.event){
		    	window.event.cancelBubble=true;
		   	}
		   	return event;
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
		    		element.style.display=val?visibleState:"none";
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
		    		element.style.display=val?visibleState:"none";
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
	
	if(HTMLElement.prototype.remove===undefined){
		HTMLElement.prototype.remove = function(){
			this.parentNode.removeChild(this);	
		};
	}
	
	HTMLElement.prototype.hasClass = function(cls) {
	    return (' ' + this.className + ' ').indexOf(' ' + cls + ' ') > -1;
	};
	
	HTMLElement.prototype.classB = function(classB) {
	    var element = this;
	    return classB.liftB(function(cl){
	    	if(!good()){return SIGNALS.NOT_READY};
	    	element.className = cl
	    });
	};
	
	HTMLElement.prototype.toggleClassB = function(classB) {
		var element = this;
		classB.liftB(function(cl){
			if(!good()){return chooseSignal()};
			jQuery(element).toggleClass(cl);
		});
	};

	
	return dom;
}(DOM || {}));
