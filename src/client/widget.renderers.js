goog.require('goog.events');
/**
 * Renderer rules
 * - User input renderers must support readonly, disabled and errored modes
 * 
 */

/**
 * Map Renderer
 */
WIDGETS.renderers.Map = function(id) {
    // Ensure new keyword has been used
    if ( !(this instanceof arguments.callee) ) 
           throw new Error("Constructor called as a function, use new keyword");
    
    var container = DOM.create("div");
    var rowsContainer = DOM.createAndAppend(container, "div", undefined, "mapRenderer_rowsContainer");
    var controlsContainer = DOM.createAndAppend(container, "div", undefined, "mapRenderer_controls");
    controlsContainer.style.clear = "both";
    var lastKeys = undefined;
    var newValueE = F.receiverE();
    var newStateE = F.receiverE();
    var deleteClickedE = F.receiverE();
    var optionsE = newStateE.propertyE("options");
    var optionsB = optionsE.startsWith(SIGNALS.NOT_READY);
    var valueE = F.zeroE();
    
    var keySelection = DOM.createAndAppend(controlsContainer, "select", undefined, "mapRenderer_newKey");
    var keySelectionInput = DOM.createAndAppend(controlsContainer, "input", undefined, "mapRenderer_newKeyInput");
    var valueSelection = DOM.createAndAppend(controlsContainer, "select", undefined, "mapRenderer_newValue");
    var valueSelectionInput = DOM.createAndAppend(controlsContainer, "input", undefined, "mapRenderer_newValueInput");
    var addButton = DOM.createAndAppend(controlsContainer, "button", undefined, "mapRenderer_addButton", "Add");
    return {
        build : function() {
            return container;
        },
        load : function(options) {      
            var newStateB = newStateE.startsWith(SIGNALS.NOT_READY);                

            var deleteUpdateE = deleteClickedE.mapE(function(clickEvent){
                return clickEvent.target.id.replace(id+"_", "").replace("_button", "");
            });
            
            var addUpdateE = F.clicksE(addButton).snapshotE(newStateB).mapE(function(state){
                var key = (!state.options.keyMap)?keySelectionInput.value:keySelection.value;
                var value = (!state.options.valueMap)?valueSelectionInput.value:valueSelection.value;
                return {key:key,value:value};
            });

           valueE = F.mergeE(newValueE.tagE("map"), deleteUpdateE.tagE("delete"), addUpdateE.tagE("add")).collectE({value:{}}, function(newValue, state){
            	if(newValue.tag==="map"){
            		state.value = newValue.value;
            	}
            	else if(newValue.tag==="add"){
            		if(state.value===undefined){
            			state.value = {};
            		}
            		state.value[newValue.value.key] = newValue.value.value;
            	}
            	else if(newValue.tag==="delete"){
            		state.value = OBJECT.remove(state.value, newValue.value);
            	}
            	state.tag = newValue.tag;
            	return state;
           });

            
            valueE.mapE(function(newMap){
            	newMap = newMap.value;
            	rowsContainer.innerHTML = "";
                var options = optionsB.valueNow();
                var deleteEvents = [];
                for(var key in newMap){
                    var value = newMap[key];
                    var domId = id+"_"+key;
                    var deleteButton = DOM.get(domId+"_button");
                    if(!deleteButton){
                        var rowContainer = DOM.createAndAppend(rowsContainer, "div", domId, "mapRenderer_row");
                        rowContainer.style.clear = "both";
                        var keyCont = DOM.createAndAppend(rowContainer, "div", undefined, "mapRenderer_key", (options.keyMap!=undefined?options.keyMap[key]:key));
                        var deleteButton = DOM.createAndAppend(rowContainer, "button", domId+"_button", "mapRenderer_button", "Delete");
                        var valCont = DOM.createAndAppend(rowContainer, "div", domId+"_val", "mapRenderer_val", value);
                        
                    	keyCont.style.cssFloat = "left";
                    	valCont.style.cssFloat = "right";
                    	valCont.style.marginRight = "5px";
                    	deleteButton.style.cssFloat = "right";
                    }
                    else if(DOM.get(domId+"_val")!==value){
                        DOM.get(domId+"_val").innerHTML = value;
                    } 
                    deleteEvents.push(F.clicksE(deleteButton));
                }
                return F.mergeE.apply({}, deleteEvents);
            }).switchE().mapE(function(e){
            	deleteClickedE.sendEvent(e);
            });

   			F.liftB(function(newValue, state){
                if(!good()){
                    return chooseSignal();
                }
                keySelection.style.display = (!state.options.keyMap)?"none":"table-cell";
                keySelectionInput.style.display = (!state.options.keyMap)?"table-cell":"none";
                
                valueSelection.style.display = (!state.options.valueMap)?"none":"table-cell";
                valueSelectionInput.style.display = (!state.options.valueMap)?"table-cell":"none";
                for(var i=keySelection.options.length-1;i>=0;i--){keySelection.remove(i);}
                for(var key in state.options.keyMap){
                    var option = DOM.create("option", undefined, undefined, state.options.keyMap[key]);
                    option.value = key;
                       keySelection.appendChild(option);
                }
                
                for(var i=valueSelection.options.length-1;i>=0;i--){valueSelection.remove(i);}
                for(var key in state.options.valueMap){
                    var option = DOM.create("option", undefined, undefined, state.options.valueMap[key]);
                    option.value = key;
                    valueSelection.appendChild(option);
                }
            }, valueE.startsWith(SIGNALS.NOT_READY), newStateB);
        },
        setValue : function(newMap) {
            newValueE.sendEvent(newMap);
        },
        setState : function(state) {
            newStateE.sendEvent(state);
        },
        getValueE : function() {
        	return valueE.filterE(function(state){
        		return state.tag!=="map";
        	}).mapE(function(state){
        		return state.value;
        	});
        },
        getFocusE : function() {
            return F.zeroE();
        },
        getBlurE : function() {
            return F.zeroE();
        },
        isDisabled : function() {
            return false;
        },
        isErrored : function() {
            return false;
        },
        isReadOnlyB : function() {
            return false;
        }
    };
};
WIDGETS.renderers.map = WIDGETS.renderers.Map;

/**
 * List Renderer
 */
//TODO: Rename this to select. A list should allow for multiple rows.
WIDGETS.renderers.List = function(id) {
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
		 
		 
    var readContainer = document.createElement("div");  
    readContainer.style.display = "none";
	var selectElement = document.createElement('select');
	selectElement.style.display = "none";
	var container = document.createElement("div");
	container.appendChild(readContainer);
	container.appendChild(selectElement);
	var focusE = undefined;
	var blurE = undefined;
	var valueE = undefined;
	var stateE = F.receiverE();
	var inFocusB = undefined;
	var isDisabledB = stateE.mapE(function(state){return state.disabled || false;}).startsWith(false);
	var isReadOnlyB = stateE.mapE(function(state){return state.readonly || false;}).startsWith(false);
	var valueDisplayMap = {};
	// Public object
	return {
		build : function() {
			return container;
		},
		destroy : function() {
        },
		load : function(options) {
			focusE = jQuery(selectElement).fj('jQueryBind', 'focus');
			blurE = jQuery(selectElement).fj('jQueryBind', 'blur');
			inFocusB = F.mergeE(focusE.mapE(function(){return true;}), blurE.mapE(function(){return false;})).startsWith(false);
			var dataTypeB = stateE.filterRepeatsE().mapE(function(state){
				var dataType = "string";
				if(state.options && state.options.options && (!inFocusB.valueNow())){
					for(i=selectElement.options.length-1;i>=0;i--){
                        selectElement.remove(i);
                    }
                    var option;
                    var list = state.options.options;
					if(list==undefined){list = "";}
					if(typeof(list)==="string"){list = list.split("|");}
					if(list instanceof Array){
					    alert("List Is ARRAY!!!");
					   for(var index in list){
					       option = DOM.create("option",undefined, undefined, list[index]);
                            option.value = list[index];
                            selectElement.appendChild(option); 
                            valueDisplayMap[list[index]] = list[index];
					   }    
					}
					else if(typeof(list)==="object"){
					   for(var key in list){
                            option = DOM.create("option",undefined, undefined, key);
                            option.value = list[key];   
                            selectElement.appendChild(option); 
                            valueDisplayMap[key] = list[key];
                            dataType = typeof(list[key]);
                       } 
					}
					
				}
				
				if(state.readonly!=undefined && state.readonly==true){
				    readContainer.style.display = "block";
                    selectElement.style.display = "none";
				}
				else{
				    readContainer.style.display = "none";
				    selectElement.style.display = "block";
				}
				selectElement.disabled = (state.disabled!=undefined && state.disabled==true);
				return dataType;
			}).startsWith(SIGNALS.NOT_READY);	
			
			valueE = F.extractValueE(selectElement).mapE(function(val){
                if(dataTypeB.valueNow()!="string"){
                    try{
                        return parseInt(val);
                    }
                    catch(e){}
                }
                return val;
            });
			
		},
		setValue : function(value) {	
			if(value instanceof Array){
			    readContainer.innerHTML = "";
			    for(var index in value){
			         readContainer.innerHTML+=value[index]+"<br />";  
			    }
			}
			else if(value==undefined){
			    readContainer.innerHTML = "";  
			}
			else{
			    selectElement.value = value;
			    readContainer.innerHTML = valueDisplayMap[value]!=undefined?valueDisplayMap[value]:value;  
			}
		},
		setState : function(state) {
			stateE.sendEvent(state);
		},
		getValueE : function() {
			return valueE;
		},
		getFocusE : function() {
			return focusE;
		},
		getBlurE : function() {
			return blurE;
		},
		isDisabled : function() {
			return isDisabledB.valueNow();
		},
		
		isErrored : function() {
			return false;
		},
		
		isReadOnlyB : function() {
			return isReadOnlyB.valueNow();
		}
	};
};
WIDGETS.renderers.list = WIDGETS.renderers.List;

/**
 * Array Renderer
 */
WIDGETS.renderers.JSON = function(id) {
    // Ensure new keyword has been used
    if ( !(this instanceof arguments.callee)){
        throw new Error("Constructor called as a function, use new keyword");
    }
         
    var container = document.createElement("div");  
    var textarea = DOM.createAndAppend(container, "textarea");
    textarea.rows = 6;
    textarea.cols = 40;
    var valueE = F.zeroE();
    var focusE = F.zeroE();
    var blurE = F.zeroE();
    
    
    var stateE = F.receiverE();
    // Public object
    return {
        build : function() {
            return container;
        },
        destroy : function() {
        	
        },
        load : function(options) {
           valueE = textarea.onChangeE().mapE(function(str){
           		try{
           			return JSON.parse(str);
           		}
           		catch(e){
           			console.log("JSON renderer, cannot parse input", str);
           			console.log(e);
           		}
        	});//.printE("TEXTARE CHANGE");
           
        	focusE = jQuery(textarea).fj('jQueryBind', 'focus');
            blurE = jQuery(textarea).fj('jQueryBind', 'blur');
        },
        setValue : function(value) {    
            if(typeof(value)==="object" && (value instanceof Array)===false){
                textarea.innerHTML = JSON.stringify(value);
            }
        },
        setState : function(state) {
            stateE.sendEvent(state);
        },
        getValueE : function() {
            return valueE;
        },
        getFocusE : function() {
            return focusE;
        },
        getBlurE : function() {
            return blurE;
        },
        isDisabled : function() {
            return F.constantB(false);
        },
        
        isErrored : function() {
            return false;
        },
        
        isReadOnlyB : function() {
            return F.constantB(true);
        }
    };
};
WIDGETS.renderers.object = WIDGETS.renderers.JSON;

/**
 * Array Renderer
 */
WIDGETS.renderers.Array = function(id) {
    // Ensure new keyword has been used
    if ( !(this instanceof arguments.callee)){
        throw new Error("Constructor called as a function, use new keyword");
    }
         
    var container = document.createElement("div");  

    var stateE = F.receiverE();
    // Public object
    return {
        build : function() {
            return container;
        },
        destroy : function() {
        },
        load : function(options) {
           
        },
        setValue : function(value) {    
            if(value instanceof Array){
                container.innerHTML = "";
                for(var index in value){
                     container.innerHTML+=value[index]+"<br />";  
                }
            }
        },
        setState : function(state) {
            stateE.sendEvent(state);
        },
        getValueE : function() {
            return F.zeroE();
        },
        getFocusE : function() {
            return F.zeroE();
        },
        getBlurE : function() {
            return F.zeroE();
        },
        isDisabled : function() {
            return F.constantB(false);
        },
        
        isErrored : function() {
            return false;
        },
        
        isReadOnlyB : function() {
            return F.constantB(true);
        }
    };
};
WIDGETS.renderers.array = WIDGETS.renderers.Array;

/**
 * Password Renderer
 */
WIDGETS.renderers.password = function(id) {
    // Ensure new keyword has been used
    if ( !(this instanceof arguments.callee) ) 
           throw new Error("Constructor called as a function, use new keyword");
         
         
    var readContainer = document.createElement("div");  
    readContainer.style.display = "none";
    var inputBox = document.createElement('input');
    inputBox.style.display = "none";
    inputBox.type = "password";
    var container = document.createElement("div");
    container.appendChild(readContainer);
    container.appendChild(inputBox);
    var focusE = undefined;
    var blurE = undefined;
    var valueE = undefined;
    var stateE = F.receiverE();
    var inFocusB = undefined;
    var isDisabledB = stateE.mapE(function(state){return state.disabled || false;}).startsWith(false);
    var isReadOnlyB = stateE.mapE(function(state){return state.readonly || false;}).startsWith(false);
    
    // Public object
    return {
        build : function() {
            return container;
        },
        destroy : function() {
        },
        load : function(options) {
            focusE = jQuery(inputBox).fj('jQueryBind', 'focus');
            blurE = jQuery(inputBox).fj('jQueryBind', 'blur');
            inFocusB = F.mergeE(focusE.mapE(function(){return true;}), blurE.mapE(function(){return false;})).startsWith(false);
            
            valueE = blurE.snapshotE(F.extractValueE(inputBox).startsWith(SIGNALS.NOT_READY)).mapE(function(value){
                return value;   //CRYPTO.md5(value);
            });
            valueE.calmE(500).mapE(function(value){
                if(good(value)){
                    inputBox.value = value;
                }
            });
            stateE.filterRepeatsE().mapE(function(state){
                if(state.readonly!=undefined && state.readonly==true){
                    readContainer.style.display = "block";
                    inputBox.style.display = "none";
                }
                else{
                    readContainer.style.display = "none";
                    inputBox.style.display = "block";
                }
            }); 
        },
        setValue : function(value) {  
            if(inFocusB.valueNow()==false && good(value)){          
                inputBox.value = value;
            }
        },
        setState : function(state) {
            stateE.sendEvent(state);
        },
        getValueE : function() {
            return valueE;
        },
        getFocusE : function() {
            return focusE;
        },
        getBlurE : function() {
            return blurE;
        },
        isDisabled : function() {
            return isDisabledB.valueNow();
        },
        
        isErrored : function() {
            return false;
        },
        
        isReadOnlyB : function() {
            return isReadOnlyB.valueNow();
        }
    };
};

/**
 * UpperCase Renderer
 */
WIDGETS.renderers.UCFirst = function(id) {	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
		   
	var container = document.createElement('div');
	// Public object
	return {
		build : function() {
			return container;
		},
		load : function(options) {
			
		},
		setValue : function(value) {
			value = (typeof(value)!='string')?value+"":value;
			 container.innerHTML = value.charAt(0).toUpperCase() + value.slice(1);
		},
		setState : function(state) {
		},
		setDisabled : function(disabled) {},
		setReadOnly : function(readOnly) {},
		setErrored : function(errored) {},
		getValueE : function() {
			return F.zeroE();
		},
		getFocusE : function() {
			return F.zeroE();
		},
		getBlurE : function() {
			return F.zeroE();
		},
		
		isDisabled : function() {
			return false;
		},
		
		isErrored : function() {
			return false;
		},
		
		isReadOnly : function() {
			return true;
		}
	};
};

/**
 * Blank Renderer
 */
WIDGETS.renderers.BlankRenderer = function(id) {
    // Ensure new keyword has been used
    if ( !(this instanceof arguments.callee) )
        throw new Error("Constructor called as a function, use new keyword");

    var container = document.createElement('div');
    // Public object
    return {
        build : function() {
            return container;
        },
        load : function(options) {
        },
        setValue : function(value) {
        },
        setState : function(state) {
        },
        setDisabled : function(disabled) {},
        setReadOnly : function(readOnly) {},
        setErrored : function(errored) {},
        getValueE : function() {
            return F.zeroE();
        },
        getFocusE : function() {
            return F.zeroE();
        },
        getBlurE : function() {
            return F.zeroE();
        },

        isDisabled : function() {
            return false;
        },

        isErrored : function() {
            return false;
        },
        isReadOnly : function() {
            return true;
        }
    };
};

/**
 * PrimaryKey Renderer
 */
WIDGETS.renderers.GroupingCell = function(id) {	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
		   
	var container = document.createElement('div');
	container.className = "RenderersGroupingCellContainer";
	// Public object
	return {
		build : function() {
			return container;
		},
		
		load : function(options) {
			
		},
		
		setValue : function(value) {
			value = (typeof(value)!='string')?value+"":value;
			container.innerHTML = value.charAt(0).toUpperCase() + value.slice(1);
		},
		
		setState : function(state){},
		
		getValueE : function() {
			return F.zeroE();
		},
		getFocusE : function() {
			return F.zeroE();
		},
		getBlurE : function() {
			return F.zeroE();
		},
		
		isDisabled : function() {
			return false;
		},
		
		isErrored : function() {
			return false;
		},
		
		isReadOnly : function() {
			return false;
		}
	};
};

/**
 * PrimaryKey Renderer
 */
WIDGETS.renderers.PrimaryKey = function(id) {	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
		   
	var container = document.createElement('div');
	// Public object
	return {
		build : function() {
			return container;
		},
		
		load : function(options) {
			
		},
		
		setValue : function(value) {
			container.innerHTML = value;
		},
		
		setState : function(state){},
		
		getValueE : function() {
			return F.zeroE();
		},
		getFocusE : function() {
			return F.zeroE();
		},
		getBlurE : function() {
			return F.zeroE();
		},
		
		isDisabled : function() {
			return false;
		},
		
		isErrored : function() {
			return false;
		},
		
		isReadOnly : function() {
			return false;
		}
	};
};

/**
 * Text Input Box
 */
WIDGETS.renderers.TextInput = function(id) {	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
    var charValidator = undefined;	
    var keyFilter = function (e) {
        if (!charValidator) {
            return;
        }
        if (!goog.events.KeyCodes.isTextModifyingKeyEvent(e)) {
            return;
        }
        // Allow: backspace, delete, tab, escape, enter and .
        if (goog.array.contains([116, 46, 40, 8, 9, 27, 13, 110, 190], e.keyCode) ||
            // Allow: Ctrl+A
            (e.keyCode == 65 && e.ctrlKey === true) ||
            // Allow: Ctrl+C
            (e.keyCode == 67 && e.ctrlKey === true) ||
            // Allow: Ctrl+C
            (e.keyCode == 86 && e.ctrlKey === true) ||
            // Allow: Ctrl+X
               (e.keyCode == 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            // let it happen, don't do anything
            return;
        }
        // Ensure that it is a number and stop the keypress
        
        var bevent = e.getBrowserEvent();
        var ch = bevent.key !== undefined ? bevent.key : bevent.char;
        if (ch !== undefined && !charValidator(ch)) {
            e.preventDefault();
        }
    };
    // Elements
    // --------
    var jinput = jQuery('<input>', {'class': 'renderer_input', type: 'text'});
    var jdiv_readonly = jQuery('<div>', {'class': 'renderer_input readonly', html: '&nbsp;'});
    var jdiv_container = jQuery('<div>');
    jdiv_container.attr('id', id);
    jdiv_container.append(jinput, jdiv_readonly);
    goog.events.listen(jinput[0],
                       goog.events.EventType.KEYDOWN, keyFilter);	
    goog.events.listen(new goog.events.PasteHandler(jinput[0])
                       , goog.events.PasteHandler.EventType.PASTE,
                       function(e) {
                           if (charValidator) {
                               var inputEl = e.target;
                               var origText = inputEl;
                               
                               var clip = e.getBrowserEvent().clipboardData;
                               var txt = clip.getData('text/plain');
                               
                               var cleanTxt = "";
                               for (var i = 0; i < txt.length; i++) {
                                   if (charValidator(txt[i])) {
                                      cleanTxt+=txt[i];
                                   }
                               }
                               //                           txt = txt.replace(/[^0-9.+]/g, 'F');
                               if (cleanTxt != txt) {
                                   if (cleanTxt === '') {
                                       e.preventDefault();
                                   }
                                   else {
                                       var orig = inputEl.value;
                                       var before = orig.substr(0, inputEl.selectionStart);
                                       var after = orig.substr(inputEl.selectionEnd);
                                       var selPos = inputEl.selectionStart + cleanTxt.length;

                                       inputEl.value = before + cleanTxt + after;
                                       inputEl.selectionStart  = selPos;
                                       inputEl.selectionEnd = selPos;
                                       e.preventDefault();
                                   }
                               }
                           }
//                           e.stopPropagation();
                           //filter stuff here
                       });


	var is_disabled = undefined;
	var is_errored = undefined;
	var is_readonly = undefined;


	var focusE = null;
	var blurE = null;
	var valueE = null;
	var setE = F.receiverE();

	// Public object
	// -------------
	return {
		build : function() {
			return jdiv_container.get(0);
		},
		
		load : function() {			
			focusE = jinput.fj('jQueryBind', 'focus');
			blurE = jinput.fj('jQueryBind', 'blur');
			
			var focusedB = F.mergeE(focusE.mapE(function(){return true;}), blurE.mapE(function(){return false;})).mapE(function(value){
				return value;
			}).startsWith(false);
			
			setE.mapE(function(value){
				if(focusedB.valueNow() === true){
					return;
				}
				jinput.val(value);
				jdiv_readonly.html(value);
				return value;
			});
			
			//var valueB = F.mergeE(F.extractValueE(jinput.get(0)), set_valueE).startsWith(SIGNALS.NOT_READY);
			var valueB = F.extractValueB(jinput.get(0));
			
			valueE = blurE.snapshotE(valueB).filterE(function(value){return good();}).mapE(function(value){
				return value;
			});
		},
		
		setValue : function(value) {
			setE.sendEvent(value);
		},
		
		setState : function(state) {
			
			if(state.disabled !== is_disabled){
				is_disabled = state.disabled;
				jinput.prop('disabled', is_disabled);
				jdiv_readonly.toggleClass('disabled', is_disabled);
			}
			
			if(state.readonly !== is_readonly){
				is_readonly = state.readonly;
				jinput.toggle(!is_readonly);
				jdiv_readonly.toggle(is_readonly);
			}
			
			if(state.errored !== is_errored){
				is_errored = state.errored;
				jinput.toggleClass('errored', is_errored);
			}
			if(state.options != undefined && state.options.size != undefined){
				jinput.attr('size', state.options.size);
			}
			charValidator = state.options != undefined && state.options.charValidator;

			if(state.options != undefined && state.options.maxlength != undefined){
				jinput.attr('maxlength', state.options.maxlength);
			}
			
			if(state.options != undefined && state.options.width != undefined){
				jinput.css('width', state.options.width);
			}
			
			if(state.options !== undefined && state.options.tooltip !== undefined){
				jdiv_container.attr('title', state.options.tooltip);
			}
			
			if(state.options !== undefined && state.options.placeholder !== undefined){
				jinput.attr('placeholder', state.options.placeholder);
			}
		},
		
		getValueE : function() {
			return valueE;
		},
		
		getFocusE : function() {
			return focusE;
		},
		
		getBlurE : function() {
			return blurE;
		},
		
		isDisabled : function() {
			return is_disabled;
		},
		
		isErrored : function() {
			return is_errored;
		},
		
		isReadOnly : function() {
			return is_readonly;
		}
	};
};
WIDGETS.renderers.string = WIDGETS.renderers.TextInput;

/**
 * Numeric Input Box
 */
WIDGETS.renderers.NumericInput = function(id) {
    var KeyCodes = {
        WIN_KEY_FF_LINUX: 0,
        MAC_ENTER: 3,
        BACKSPACE: 8,
        TAB: 9,
        NUM_CENTER: 12,  // NUMLOCK on FF/Safari Mac
        ENTER: 13,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        PAUSE: 19,
        CAPS_LOCK: 20,
        ESC: 27,
        SPACE: 32,
        PAGE_UP: 33,    // also NUM_NORTH_EAST
        PAGE_DOWN: 34,  // also NUM_SOUTH_EAST
        END: 35,        // also NUM_SOUTH_WEST
        HOME: 36,       // also NUM_NORTH_WEST
        LEFT: 37,       // also NUM_WEST
        UP: 38,         // also NUM_NORTH
        RIGHT: 39,      // also NUM_EAST
        DOWN: 40,       // also NUM_SOUTH
        PLUS_SIGN: 43,  // NOT numpad plus
        PRINT_SCREEN: 44,
        INSERT: 45,  // also NUM_INSERT
        DELETE: 46,  // also NUM_DELETE
        ZERO: 48,
        ONE: 49,
        TWO: 50,
        THREE: 51,
        FOUR: 52,
        FIVE: 53,
        SIX: 54,
        SEVEN: 55,
        EIGHT: 56,
        NINE: 57,
        FF_SEMICOLON: 59,   // Firefox (Gecko) fires this for semicolon instead of 186
        FF_EQUALS: 61,      // Firefox (Gecko) fires this for equals instead of 187
        FF_DASH: 173,       // Firefox (Gecko) fires this for dash instead of 189
        QUESTION_MARK: 63,  // needs localization
        AT_SIGN: 64,
        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,
        META: 91,  // WIN_KEY_LEFT
        WIN_KEY_RIGHT: 92,
        CONTEXT_MENU: 93,
        NUM_ZERO: 96,
        NUM_ONE: 97,
        NUM_TWO: 98,
        NUM_THREE: 99,
        NUM_FOUR: 100,
        NUM_FIVE: 101,
        NUM_SIX: 102,
        NUM_SEVEN: 103,
        NUM_EIGHT: 104,
        NUM_NINE: 105,
        NUM_MULTIPLY: 106,
        NUM_PLUS: 107,
        NUM_MINUS: 109,
        NUM_PERIOD: 110,
        NUM_DIVISION: 111,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        NUMLOCK: 144,
        SCROLL_LOCK: 145,

        // OS-specific media keys like volume controls and browser controls.
        FIRST_MEDIA_KEY: 166,
        LAST_MEDIA_KEY: 183,

        SEMICOLON: 186,             // needs localization
        DASH: 189,                  // needs localization
        EQUALS: 187,                // needs localization
        COMMA: 188,                 // needs localization
        PERIOD: 190,                // needs localization
        SLASH: 191,                 // needs localization
        APOSTROPHE: 192,            // needs localization
        TILDE: 192,                 // needs localization
        SINGLE_QUOTE: 222,          // needs localization
        OPEN_SQUARE_BRACKET: 219,   // needs localization
        BACKSLASH: 220,             // needs localization
        CLOSE_SQUARE_BRACKET: 221,  // needs localization
        WIN_KEY: 224,
        MAC_FF_META:
        224,  // Firefox (Gecko) fires this for the meta key instead of 91
        MAC_WK_CMD_LEFT: 91,   // WebKit Left Command key fired, same as META
        MAC_WK_CMD_RIGHT: 93,  // WebKit Right Command key fired, different from META
        WIN_IME: 229,

        // "Reserved for future use". Some programs (e.g. the SlingPlayer 2.4 ActiveX
        // control) fire this as a hacky way to disable screensavers.
        VK_NONAME: 252,

        // We've seen users whose machines fire this keycode at regular one
        // second intervals. The common thread among these users is that
        // they're all using Dell Inspiron laptops, so we suspect that this
        // indicates a hardware/bios problem.
        // http://en.community.dell.com/support-forums/laptop/f/3518/p/19285957/19523128.aspx
        PHANTOM: 255
    };
	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
	
	var DEFAULT_VALUE = 0;
	var INVALID_VALUE = DEFAULT_VALUE;
	
	// Elements
	// --------
	var jinput = jQuery('<input>', {id: id + '_input', 'class': 'renderer_input', type: 'text'});
	
	var writeInput = jinput.get(0);							//TODO: Check that this is ok, it was added on after.
	
	writeInput.onkeypress = function(e) {
	    e = e || window.event;
            if (e.keyCode != 0 &&  (e.keyCode <= KeyCodes.DOWN || (e.keyCode >= KeyCodes.F1 && e.keyCode <= KeyCodes.F12)) ) {
                return;
            }
            if (e.keyCode === KeyCodes.DELETE) {
                return;
            }
	    var cchar = String.fromCharCode((typeof e.which == "undefined") ? e.keyCode : e.which);

	    return (cchar==="-"&&writeInput.selectionStart===0) || (cchar==="." && writeInput.value.indexOf(".")===-1) || ("0123456789".indexOf(cchar)>=0);
	};
	
	
	jinput.val(DEFAULT_VALUE);
	
	var jdiv_readonly = jQuery('<span>', {id: id + '_readonly', 'class': 'renderer_input readonly', html: '&nbsp;'});
	var jdiv_container = jQuery('<span>');
	jdiv_container.attr('id', id);
	jdiv_container.append(jinput, jdiv_readonly);
	
	var is_disabled = undefined;
	var is_errored = undefined;
	var is_readonly = undefined;
	
	var focusE = null;
	var blurE = null;
	var valueE = null;
	var setE = F.receiverE();
	
	var decimalPlaces = -1;
	var applyFormatting = false;
	var scientific = false;
	
	var formatNumber = function(x) {
            if (scientific && typeof(x) === 'number') {
                return  x.toExponential();
            }
	    if(!applyFormatting || x < 10000){
		return x.toString();
	    }
		
		var parts = decimalPlaces > 0 ? x.toString().split(".") : [x.toString()];
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	};

	// Public object
	// -------------
	return {
		getClickE: function(){
			return F.clicksE(jinput.get(0));
		},
		focus: function(){
			jinput.get(0).focus();
		},
		highlightText:function(){
			jinput.get(0).select();
		},
		build : function() {
			return jdiv_container.get(0);
		},
		
		load : function() {
			focusE = jinput.fj('jQueryBind', 'focus');
			blurE = jinput.fj('jQueryBind', 'blur');
			
			var keyE = jinput.fj('jQueryBind', 'keyup');
			var keyEnterE = keyE.mapE(function(e){
				if(e.keyCode == 13){
					jinput.blur();
				}
			});
			
			var focusedB = F.mergeE(focusE.mapE(function(){return true;}), blurE.mapE(function(){return false;})).mapE(function(value){
				return value;
			}).startsWith(false);
			
			var lastValueE = setE.mapE(function(value){
				if(value==undefined){
					jinput.val("");
					jdiv_readonly.html("");
				}
				else if(focusedB.valueNow() !== true){
					var valuef = parseFloat(value);
					valuef = isNaN(valuef) ? INVALID_VALUE : valuef;
					
					var formattedNumber = formatNumber(valuef);
					jinput.val(formattedNumber);
					jdiv_readonly.html(formattedNumber);
					return valuef;
				}
				return false;
			}).filterFalseE();
			
			var lastValueB = lastValueE.startsWith(DEFAULT_VALUE);			
			
			// Do some numeric input validation
			var valueOnFocusE = focusE.mapE(function(){return jinput.val();});
			var value_changesE = jinput.fj('extValE');
			var validated_changesE = F.mergeE(valueOnFocusE, value_changesE).mapE(function(value){
				
				// TODO: Add rules like negative numbers, integers etc in here 
				
				var output = new Array(); 
				var decimal_count = 0;
				var chars_after_decimal = 0;
				var length = value.length;
				for(var i=0; i<length; i++){
					var charI = value[i];
					switch(charI){
					case '-':
						if(i == 0){
							output.push(charI);
						}
						
						break;
					case '.':
						decimal_count++;
						if(decimal_count == 1 && decimalPlaces > 0){
							output.push(charI);
						}
						break;
						
					case ',':
						if(applyFormatting){
							output.push(charI);
							break;
						}
					case '+':
					default:
						if(!isNaN(charI)){
							
							// Enforce decimal places
							if(decimalPlaces > 0 && decimal_count > 0){
								
								if(chars_after_decimal < decimalPlaces){
									output.push(charI);
									chars_after_decimal++;
								}
								
							}else{
								output.push(charI);
							}
						}
						break;
					}
				}
			
				var out_string = output.join('');	
				if(out_string != value){
					jinput.val(out_string);
				}
				
				if(output.length > 0){
					var outNumber = parseFloat(out_string.replace(/,/g, ''));
					if(!isNaN(outNumber)){
						return outNumber;
					}
				}
				
				var last_value = lastValueB.valueNow();
				return isNaN(last_value) ? DEFAULT_VALUE : last_value;
			});
			
			
			var changeB = validated_changesE.startsWith(DEFAULT_VALUE);
			valueE = blurE.snapshotE(changeB).mapE(function(value){
				var formattedNumber = formatNumber(value);
				jinput.val(formattedNumber);
				return value;
			});
		},
		
		setValue : function(value){
			setE.sendEvent(value);
		},
		
		setState : function(state) {
			if(state.disabled !== is_disabled){
				is_disabled = state.disabled;
				if(is_disabled){
					jinput.prop('disabled', true);
					jdiv_readonly.addClass('disabled');
				}else{
					jinput.prop('disabled', false);
					jdiv_readonly.removeClass('disabled');
				}
			}
			
			if(state.readonly !== is_readonly){
				is_readonly = state.readonly;
				if(is_readonly){
					jinput.css('display', 'none');
					jdiv_readonly.css('display', '');
				}else{
					jinput.css('display', '');
					jdiv_readonly.css('display', 'none');
				}
			}
			
			if(state.errored !== is_errored){
				is_errored = state.errored;
				if(is_errored){
					jinput.addClass('errored');
				}else{
					jinput.removeClass('errored');
				}
			}
			
			if(state.options != undefined && state.options.maxlength != undefined){
				jinput.attr('maxlength', state.options.maxlength);
			}
			
			
			if(state.options != undefined && state.options.classNames != undefined){
				for(var index in state.options.classNames){
					jQuery(jinput).addClass(state.options.classNames[index]);
				}
			}
			
			if(state.options != undefined && state.options.size != undefined){
				jinput.attr('size', state.options.size);
			}
					
			if(state.options != undefined && state.options.width != undefined){
				jinput.css('width', state.options.width);
			}
			
			if(state.options !== undefined && state.options.invalidValue !== undefined){
				INVALID_VALUE = state.options.invalidValue;
			}
			
			if(state.options !== undefined && state.options.tooltip !== undefined){
				jdiv_container.attr('title', state.options.tooltip);
			}
			
			if(state.options != undefined && state.options.decimalPlaces != undefined && !isNaN(state.options.decimalPlaces)){
				decimalPlaces = state.options.decimalPlaces;
			}
			
			if(state.options != undefined && state.options.format != undefined){
				applyFormatting = state.options.format;
			}

			if(state.options != undefined && state.options.scientific != undefined){
				scientific = state.options.scientific;
			}
			
			// Range tooltip (note: overwrites tooltip)
			var tooltip_range = "";
			if(state.options !== undefined && state.options.min !== undefined && state.options.max !== undefined){
				tooltip_range = "[" + formatNumber(state.options.min) + "  -  " + formatNumber(state.options.max) + "]";
			}else if(state.options !== undefined && state.options.min !== undefined){
				tooltip_range = "[" + formatNumber(state.options.min) + "  -  ]";
			}else if(state.options !== undefined && state.options.max !== undefined){
				tooltip_range = "[*  -  " + formatNumber(state.options.max) + "]";
			}
			
			if(state.options !== undefined && state.options.step !== undefined && tooltip_range.length > 0){
				tooltip_range += " Step: " + state.options.step;
			}
			
			if(tooltip_range.length > 0 && !state.readonly){
				jdiv_container.attr('title', tooltip_range);
			}
		},
		
		getValueE : function() {
			return valueE;
		},
		
		getFocusE : function() {
			return focusE;
		},
		
		getBlurE : function() {
			return blurE;
		},
		
		isDisabled : function() {
			return is_disabled;
		},
		
		isErrored : function() {
			return is_errored;
		},
		
		isReadOnly : function() {
			return is_readonly;
		}
	};
};
WIDGETS.renderers.number = WIDGETS.renderers.NumericInput;
WIDGETS.renderers.int = WIDGETS.renderers.NumericInput;

/**
 * Checkbox
 */
WIDGETS.renderers.Checkbox = function(id) {
	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
	
	// Elements
	// --------
	var label = '';
	var uncheckedLabel = '';
	var nullLabel = '';
	
	var jlabel = jQuery('<span>');
	var jinput = jQuery('<input>', {'class': 'renderer_checkbox', type: 'checkbox'});
	var jdiv_error = jQuery('<div>', {'class': 'renderer_checkbox'});
	jdiv_error.append(
			jQuery('<label>', {'class': 'renderer_checkbox'}).append(
					jinput,
					jlabel
				)
		);
	var jdiv_readonly = jQuery('<div>', {'class': 'renderer_checkbox readonly', html: '&cross;'});
	var jdiv_container = jQuery('<div>');
	

	jdiv_container.attr('id', id);
	jdiv_container.append(jdiv_error, jdiv_readonly);
	
	var is_disabled = undefined;
	var is_errored = undefined;
	var is_readonly = undefined;
	
	var focusE = null;
	var blurE = null;
	var valueE = null;
	var setE = F.receiverE();
	var allowNullE = F.receiverE();
	var allowNullB = allowNullE.startsWith(SIGNALS.NOT_READY);
	
	
	// Public object
	// -------------
	return {
		build : function() {
			return jdiv_container.get(0);
		},
		
		load : function() {			
			focusE = jinput.fj('jQueryBind', 'focus');
			blurE = jinput.fj('jQueryBind', 'blur');
			
			setE.mapE(function(value){
				// Note: We don't block set on focus for this renderer, due to the user interaction type of clicking.
				if(value === true){
					value = true;
					jinput.prop('indeterminate', false);
					jinput.prop('checked', value);
				}
				else if(allowNullB.valueNow() && (value===null || value===undefined)){
					value = undefined;
					jinput.prop('checked', false);
					jinput.prop('indeterminate', true);
				}
				else{
					value = false;
					jinput.prop('indeterminate', false);
					jinput.prop('checked', value);
				}

				jlabel.html(label);
				if(label.length){
					jdiv_readonly.html(value===undefined?nullLabel:(value ? label : uncheckedLabel));
				}else{
					jdiv_readonly.html(value===undefined?"-":(value ? '&check;' : '&cross;'));
				}
				return value;
			});
			valueE = DOM.checkboxClicksE(jinput.get(0), allowNullB);
			valueE.printE("Checlbox Renderer click");
		},
		
		setValue : function(value){
			setE.sendEvent(value);
		},
		
		setState : function(state) {
			if(state.disabled !== is_disabled){
				is_disabled = state.disabled;
				jinput.prop('disabled', is_disabled);
				jdiv_error.toggleClass('disabled', is_disabled);
				jdiv_error.find('label').toggleClass('disabled', is_disabled);
				jdiv_readonly.toggleClass('disabled', is_disabled);
			}
			
			if(state.readonly !== is_readonly){
				is_readonly = state.readonly;
				jdiv_error.toggle(!is_readonly);
				jdiv_readonly.toggle(is_readonly);
			}
			
			if(state.errored !== is_errored){
				is_errored = state.errored;
				jdiv_error.toggleClass('errored', is_errored);
			}
						
			if(state.options != undefined && state.options.label != undefined){
				label = state.options.label;
			}
			
			if(state.options != undefined && state.options.uncheckedLabel != undefined){
				uncheckedLabel = state.options.uncheckedLabel;
			}
			
			if(state.options != undefined && state.options.nullLabel != undefined){
				uncheckedLabel = state.options.nullLabel;
			}
			
			if(state.options !== undefined && state.options.tooltip !== undefined){
				jdiv_container.attr('title', state.options.tooltip);
			}
			if(state.options !== undefined && state.options.allowNull !== undefined){
				allowNullE.sendEvent(state.options.allowNull);
			}
		},
		
		getValueE : function() {
			return valueE;
		},
		
		getFocusE : function() {
			return focusE;
		},
		
		getBlurE : function() {
			return blurE;
		},
		
		isDisabled : function() {
			return is_disabled;
		},
		
		isErrored : function() {
			return is_errored;
		},
		
		isReadOnly : function() {
			return is_readonly;
		}
	};
};
WIDGETS.renderers.boolean = WIDGETS.renderers.Checkbox;

/**
 * Checkbox List
 */
WIDGETS.renderers.CheckboxList = function(id) {
	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");	
	// Elements
	// --------
	var jdiv_input = jQuery('<div>', {'class': 'renderer_group_input flex_vertical'});
	var jdiv_readonly = jQuery('<div>', {'class': 'renderer_group_input readonly', html: '&nbsp;'});
	var jdiv_container = jQuery('<div>');
	jdiv_container.attr('id', id);
	jdiv_container.append(jdiv_input, jdiv_readonly);
	
	var columns = -1;
	//var list = {};
	var disabled_list = {};
	var tooltip_list = {};
	var sortedOutput = false;
	
	var setE = F.receiverE();
	var setB = setE.filterRepeatsE().startsWith(SIGNALS.NOT_READY);
	var stateE = F.receiverE();
	var valueE = null;
	var focusE = null;
	var blurE = null;	
	
	var disabledB = null;
	var erroredB = null;
	var readonlyB = null;
	var sortedOutputB = null;
	var guard = 0;
	// Public object
	// -------------
	return {
		build : function() {
			return jdiv_container.get(0);
		},
		
		load : function() {	

			disabledB = stateE.propertyE("disabled").filterRepeatsE().startsWith(false);
			erroredB = stateE.propertyE("errored").filterRepeatsE().startsWith(false);
			readonlyB = stateE.propertyE("readonly").filterRepeatsE().startsWith(false);
			sortedOutputB = stateE.propertyE("options").propertyE("sortedOutput").filterRepeatsE().startsWith(false);

			var listE = stateE.propertyE("options").propertyE("list").filterRepeatsE();
			var listB = listE.startsWith([]);
			var disabled_listB = stateE.propertyE("options").propertyE("disabled_list").filterRepeatsE().startsWith({});
			var tooltip_listE = stateE.propertyE("options").propertyE("tooltip_list").filterRepeatsE();
			var columnsB = stateE.propertyE("options").propertyE("columns").filterRepeatsE().startsWith(-1);

			var listedB = F.liftB(function(serverValues, state, disabled_list){
				if(!good()){
					return SIGNALS.NOT_READY;
				}

				var list = state.event;
				var disabled = state.disabled;
				var columns = state.columns;
				// Create new inputs
				var domElements = {};
				var focusEvents = [];
				var blurEvents = [];
				var valueEvents = [];
				
				// Clear out what is already there
				jdiv_input.empty();	
				var i = 0;
				for(var key in list){
					var label = DOM.create("label", undefined, "renderer_group checkboxlistrenderer_option",key);
					var jLabel = jQuery(label);
					var checkbox = DOM.create("input", undefined, "renderer_input checkboxlistrenderer_checkbox");
					checkbox.type="checkbox";
					var jcheckbox = jQuery(checkbox);
					checkbox.checked = serverValues[key];
					checkbox.disabled = disabled || disabled_list[key];
					label.title = tooltip_list[key] || '';
					jLabel.toggleClass('disabled', disabled);
					label.insertBefore(checkbox, label.firstChild);
					
					if(columns > 0 && i > 0 && (i%columns === 0)){
						jdiv_input.append(jQuery('<br>'));
					}
					jdiv_input.append(jLabel);

					domElements[key] = checkbox;
					focusEvents.push(F.extractEventE(checkbox, "focus"));
					blurEvents.push(F.extractEventE(checkbox, "blur"));
					(function(num, checkbox){
						valueEvents.push(F.extractValueB(checkbox).liftB(function(val){return {num: num, checked:val};}));
					}(key, checkbox));
					i++;
				}
				return {elements:domElements, focusEvents:focusEvents, blurEvents:blurEvents, valueEvents:valueEvents, list:list};
			},setB, listE.snapshotManyE({disabled: disabledB, columns:columnsB, disabled_list:disabled_listB}).startsWith(SIGNALS.NOT_READY), disabled_listB);		
			
			focusE = listedB.changes().propertyE("focusEvents").filterRepeatsE().mapE(function(focusEvents){
				return F.mergeE.apply(this, focusEvents);
			}).switchE();
			blurE = listedB.changes().propertyE("blurEvents").filterRepeatsE().mapE(function(blurEvents){
				return F.mergeE.apply(this, blurEvents);
			}).switchE();
			
			var valueB = F.liftB(function(values){		//sortedOutput
				if(!good()){
					return F.constantB(SIGNALS.NOT_READY);
				}
				values.unshift(function(){
					var ar = {};
					for(var index in arguments){
						ar[arguments[index].num] = arguments[index].checked;
					}
					return ar;
				});
				return F.liftB.apply(this, values);
			}, listedB.propertyB("valueEvents").filterRepeatsB()).switchB();	//sortedOutputB

			
			valueE =  valueB.changes().filterRepeatsE().filterNotGoodE().filterE(function () {return good() && guard === 0}).mapE(function(values){
				var newVal = {};
				for(var index in values){
					if(values[index]){
						newVal[index] = values[index];
					}
				}
				return newVal;
			});
			
			//Side Effects Below
			
			//Apply new set values to the html elements
			setE.filterRepeatsE().snapshotManyE({listed: listedB}).mapE(function(state){	//.filterRepeatsE()
				var display_values = [];
				var values = state.event || [];
				var listed = state.listed;
				var i=0;
					for(var key in values){
						listed.elements[key].checked = values[key];
						display_values.push(key);
					}
				jdiv_readonly.html(display_values.length ? display_values.join(', ') : '&nbsp;');
			});
			
			disabledB.liftB(function(disabled){
				jdiv_input.toggleClass('disabled', disabled);
				jdiv_readonly.toggleClass('disabled', disabled);
				jdiv_input.find('input').prop('disabled', disabled).toggleClass('disabled', disabled);
			});
			
			readonlyB.liftB(function(is_readonly){
                jdiv_input.css(is_readonly ? {display: 'none'} :{});
                jdiv_readonly.toggle(is_readonly);
			});
			
			erroredB.liftB(function(errored){
				jdiv_input.toggleClass('errored', errored);
			});
		
		},
		
		setValue : function(values){
				try {
					
					guard++;
			setE.sendEvent(values);
				}
				finally {
					guard--;
				}
		},
		
		setState : function(state) {
			stateE.sendEvent(state);
		},
		
		getValueE : function() {
			return valueE;
		},
		
		getFocusE : function() {
			return focusE;
		},
		
		getBlurE : function() {
			return blurE;
		},
		
		isDisabled : function() {
			return disabledB.valueNow();
		},
		
		isErrored : function() {
			return erroredB.valueNow();
		},
		
		isReadOnly : function() {
			return readonlyB.valueNow();;
		}
	};
};

/**
 * Radio Buttons
 */
WIDGETS.renderers.RadioGroup = function(id) {
	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");	
	
	// Elements
	// --------
	var jdiv_input = jQuery('<div>', {'class': 'renderer_group_input'});
	var jdiv_readonly = jQuery('<div>', {'class': 'renderer_group_input readonly', html: '&nbsp;'});
	var jdiv_container = jQuery('<div>');
	jdiv_container.attr('id', id);
	jdiv_container.append(jdiv_input, jdiv_readonly);
	
	var instanceId = id;
	var columns = -1;
	var list = {};
	var disabled_list = undefined;
	var tooltip_list = undefined;
	
	var is_disabled = undefined;
	var is_errored = undefined;
	var is_readonly = undefined;
	
	var setE = F.receiverE();
	var listE = F.receiverE();
	var disabledE = F.receiverE();
	var valueE = null;
	var focusE = null;
	var blurE = null;
	
	// Public object
	// -------------
	return {
		build : function() {
			return jdiv_container.get(0);
		},
		
		load : function() {						
			var disabledB = disabledE.startsWith(false);
			disabledE.mapE(function(disabled){
				jdiv_input.toggleClass('disabled', disabled);
				jdiv_readonly.toggleClass('disabled', disabled);
				
				var inputs = jdiv_input.find('input');
				//inputs.prop('disabled', disabled);
				inputs.toggleClass('disabled', disabled);
			});
			
			// Create list of radios
			var listedE = listE.snapshotE(disabledB).mapE(function(disabled){
				// Clear out what is already there
				jdiv_input.empty();		
				
				// Create new inputs
				var jradioes = new Array();
				var i = 0;
				for(var key in list){
					
					var jlabel = jQuery('<label>', {'class': 'renderer_group', text: key});
					var jradio = jQuery('<input>', {
						'class': 'renderer_input', 
						type: 'radio',
						name: 'radio_group' + instanceId,
						value: list[key],
						});
					
					var radio_is_disabled = (disabled === true) ? true : disabled_list === undefined ? false : (disabled_list[key]!==undefined);
					jradio.prop('disabled', radio_is_disabled);
					jradio.toggleClass('disabled', radio_is_disabled);
					jlabel.toggleClass('disabled', radio_is_disabled);
					
					if(tooltip_list !== undefined && tooltip_list[key] !== undefined){
						jlabel.attr('title', tooltip_list[key]);
					}
					
					jlabel.prepend(jradio);
					
					if(columns > 0 && i > 0){
						if(i%columns == 0){
							jdiv_input.append(jQuery('<br>'));
						}
					}
					jdiv_input.append(jlabel);
					
					jradioes.push(jradio);
					i++;
				}
				
				return jradioes;
			});
			
			// Listen to focus
			focusE = listedE.mapE(function(jradioes){
				
				var events = new Array();
				for(var i=0;i<jradioes.length;i++){
					var jradio = jradioes[i];
					events.push(jradio.fj('jQueryBind', 'focus'));
				}
				
				return F.mergeE.apply(this, events);
			}).switchE();
			
			// Listen to blur
			blurE = listedE.mapE(function(jradioes){
				
				var events = new Array();
				for(var i=0;i<jradioes.length;i++){
					var jradio = jradioes[i];
					events.push(jradio.fj('jQueryBind', 'blur'));
				}
				
				return F.mergeE.apply(this, events);
			}).switchE();
			
			// Listen to changes
			var one_changedE = listedE.mapE(function(jradioes){
				var jradioes = jdiv_input.find('input');
				return jradioes.fj('clicksE').mapE(function(event) {
					
					// Focus field
					jQuery(event.target).focus();
					
					return jQuery(event.target).is(':checked');
				});
			}).switchE();
			
			// Handle value set
			setE.mapE(function(value){
				// Note: We don't block set on focus for this renderer, due to the user interaction type of clicking.
				
				var jradioes = jdiv_input.find('input');
				jradioes.each(function(){
					var jradio = jQuery(this);
					jradio.prop('checked', value == parseInt(jradio.val()));
				});
				
				var display_value = "";
				for(var key in list){
					if(list[key] == value){
						display_value = key;
						break;
					}
				}				
				jdiv_readonly.html(display_value.length ? display_value : '&nbsp;');
			});
			
			// Get value
			valueE = one_changedE.mapE(function(){
				var jradioes = jdiv_input.find('input:checked');
				
				if(jradioes.length == 0){
					return undefined;
				}
				
				return parseInt(jradioes.val());
			});
		},
		
		setValue : function(value) {
			setE.sendEvent(value);
		},
		
		setState : function(state) {
			
			if(state.disabled !== is_disabled){
				is_disabled = state.disabled;
				disabledE.sendEvent(is_disabled);
			}
			
			if(state.readonly !== is_readonly){
				is_readonly = state.readonly;
				jdiv_input.toggle(!is_readonly);
				jdiv_readonly.toggle(is_readonly);
			}
			
			if(state.errored !== is_errored){
				is_errored = state.errored;
				jdiv_input.toggleClass('errored', is_errored);
			}
			
			if(state.options != undefined && state.options.columns){
				columns = state.options.columns;
			}
			
			if(state.options != undefined && state.options.list){
				if(JSON.stringify(list) !== JSON.stringify(state.options.list)){
					list = state.options.list;
					listE.sendEvent();
				}
			}
			
			if(state.options != undefined && state.options.disabled_list){
				if(JSON.stringify(disabled_list) !== JSON.stringify(state.options.disabled_list)){
					disabled_list = state.options.disabled_list;
					listE.sendEvent();
				}
			}else if(disabled_list !== undefined){
				disabled_list = undefined;
				listE.sendEvent();
			}
			
			if(state.options != undefined && state.options.tooltip_list){
				if(JSON.stringify(tooltip_list) !== JSON.stringify(state.options.tooltip_list)){
					tooltip_list = state.options.tooltip_list;
					listE.sendEvent();
				}
			}else if(tooltip_list !== undefined){
				tooltip_list = undefined;
				listE.sendEvent();
			}
		},
		
		getValueE : function() {
			return valueE;
		},
		
		getFocusE : function() {
			return focusE;
		},
		
		getBlurE : function() {
			return blurE;
		},
		
		isDisabled : function() {
			return is_disabled;
		},
		
		isErrored : function() {
			return is_errored;
		},
		
		isReadOnly : function() {
			return is_readonly;
		}
	};
};

/**
 * SelectInput
 */
WIDGETS.renderers.SelectInput = function(id) {
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
	
	// Elements
	// --------
	var jinput = jQuery('<select>', {'class': 'renderer_input'});
	var jdiv_readonly = jQuery('<div>', {'class': 'renderer_input readonly', html: '&nbsp;'});
	var jdiv_container = jQuery('<span>');
	jdiv_container.attr('id', id);
	jdiv_container.append(jinput, jdiv_readonly);
	
	var is_disabled = undefined;
	var is_errored = undefined;
	var is_readonly = undefined;
	var defaultValue = undefined;
	
	var list = {};
	var disabled_list = undefined;
	
	var focusE = null;
	var blurE = null;
	var valueE = null;
	var setE = F.receiverE();
	var stateE = F.receiverE();
	var update_listE = F.receiverE();
        var displayUnknownFunc = null;
        var displayUnknown = function (val) {
            if (displayUnknownFunc) {
                return displayUnknownFunc(val);
            }
            return "Unknown (" + val + ")";
        }
	// Public object
	// -------------
	return {
		build : function() {
			return jdiv_container.get(0);
		},
		
		load : function(widgetSetB) {			
			focusE = jinput.fj('jQueryBind', 'focus');
			blurE = jinput.fj('jQueryBind', 'blur');
			
			var focusedB = F.mergeE(focusE.mapE(function(){return true;}), blurE.mapE(function(){return false;})).mapE(function(value){
				return value;
			}).startsWith(false);
			
			var numberTypeB = update_listE.mapE(function(){
				var numberType = false;
				if(focusedB.valueNow() === true){
					return;
				}
				
				var current_value = jinput.val();
                var found = false;
				jinput.empty();
				
				for(var key in list){
					
					var value = list[key];
					
					if(numberType===false && typeof(value)==="number"){
						numberType = true;
					}
					
					var joption = jQuery("<option>");
					if(value===null){
						value="$NULL";
					}
					else if(value===undefined){
						value="$UNDEFINED";
					}
					else if(typeof(value)==="object"){
						value = JSON.stringify(value);
					}
					found = found || value == current_value;
					joption.attr("value", value+"");			//Convert to string because jQuery sucks
					joption.text(key);
					
					if(disabled_list !== undefined){
						joption.prop("disabled", disabled_list[key]!==undefined);
					}
					
					jinput.append(joption);
				}
				var keys = Object.keys(list);
				
				if(!found && current_value != null){			
					var joption = jQuery("<option>");
					joption.attr("value", value);
					joption.attr("unknown", true);
					joption.text(displayUnknown(current_value));
					jinput.append(joption);

				}
				if(numberType && typeof(current_value)==="string"){
					current_value = parseInt(current_value);
				}
				jinput.val(current_value);
				return numberType;
			}).startsWith(SIGNALS.NOT_READY);
			
			var valueB = F.liftB(function(widgetSet, rendererSet){
				if(good(rendererSet)){
					return rendererSet;
				}
				return widgetSet;
			}, widgetSetB, setE.startsWith(SIGNALS.NOT_READY));
			
			
			F.liftB(function(value, state) {
				if(focusedB.valueNow() === true || (!good()) || value===undefined){
					return;
				}
				if(value===null){
					value="$NULL";
				}
				if(value===undefined){
					value="$UNDEFINED";
				}
				var showUnknownText = state.options!==undefined && state.options.showUnknownText!==false;

				var found = false;
				for (var key in state.options.list) {
					if (state.options.list[key] == value || OBJECT.equals(state.options.list[key],value)) {
						jdiv_readonly.html(("" + key).length ? key : '&nbsp;');
						found = true;
						break;
					}
				}
				if (found===false) {
				    jinput.attr('unknown', "true");
					jdiv_readonly.html(showUnknownText?displayUnknown(value):value);
					var exists = false;
					
					jinput.find('option').each(function(){
					   
					    if (this.value == value || OBJECT.equals(this.value,value)) {
					        exists = true;
					        return false;
					    }
					    if (typeof(value)==="object" && this.value===JSON.stringify(value)) {
					        exists = true;
					        return false;
					    }
					});

					if (exists===false && showUnknownText===true) {
    					jinput.find('option[unknown="true"]').remove();
						var joption = jQuery("<option>");
					    if (typeof(value)==="object") {
	            		    joption.attr("value", JSON.stringify(value));		
                        }
                        else {
    						joption.attr("value", value+"");
                        }
						joption.attr("unknown", true);
						joption.text(showUnknownText? displayUnknown(value): value);
						jinput.append(joption);
					}
				}
				else {
					// remove unknowns if they are there we have a valid
					jinput.find('option[unknown="true"]').remove();
					jinput.attr('unknown', "false");

				}
				if(typeof(value)==="object"){
				    jinput.val(JSON.stringify(value));		
				    
				}
				else{
				    jinput.val(value+"");			//Converted to a string because jquery complains otherwise.
				}
				
				
				return value;

			}, valueB, stateE.startsWith(SIGNALS.NOT_READY));
			
			valueE = jinput.fj('extValE').mapE(function(value){
				if(value==="$NULL"){
					return null;
				}
				else if(value==="$UNDEFINED"){
					return undefined;
				}
				else if(numberTypeB.valueNow()===true){
					return parseInt(value);
				}
				try{
					value = JSON.parse(value);
				}
				catch(e){}
				return value;
			});
		},
		
		setValue : function(value) {
 			setE.sendEvent(value);
		},
		
		setState : function(state) {
			if(state.disabled !== is_disabled){
				is_disabled = state.disabled;
				jinput.prop('disabled', is_disabled);
				jdiv_readonly.toggleClass('disabled', is_disabled);
			}

			if(state.readonly !== is_readonly){
				is_readonly = state.readonly;
				jinput.toggle(!is_readonly);
				jdiv_readonly.toggle(is_readonly);
			}
			
			if(state.errored !== is_errored){
				is_errored = state.errored;
				jinput.toggleClass('errored', is_errored);
			}
			
			if(state.defaultValue != undefined){
				defaultValue = state.defaultValue;
				jinput.val(state.defaultValue);
			}
			
            if (state.options && state.options.displayUnknown !== displayUnknownFunc) {
			    displayUnknownFunc = state.options.displayUnknown;
            }
			
			if(state.options != undefined && state.options.list){
				if(JSON.stringify(list) !== JSON.stringify(state.options.list)){
					list = state.options.list;
					update_listE.sendEvent(true);
				}
			}
			
			if(state.options != undefined && state.options.disabled_list){
				if(JSON.stringify(disabled_list) !== JSON.stringify(state.options.disabled_list)){
					disabled_list = state.options.disabled_list;
					update_listE.sendEvent(true);
				}
			}else if(disabled_list !== undefined){
				disabled_list = undefined;
				update_listE.sendEvent(true);
			}
			stateE.sendEvent(state);
			
			
		},
				
		getValueE : function() {
			return valueE.filterNotGoodE();
		},
		
		getFocusE : function() {
			return focusE;
		},
		
		getBlurE : function() {
			return blurE;
		},
		
		isDisabled : function() {
			return is_disabled;
		},
		
		isErrored : function() {
			return is_errored;
		},
		
		isReadOnly : function() {
			return is_readonly;
		}
	};
};

/**
 * Drop down box where content is custom html.
 * If needed to set data it is expected that you encapsulate this renderer in a custom renderer
 */
WIDGETS.renderers.HTMLDropdown = function(id) {
	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
	
	// Instance id
	var instanceId = id;
	
	// Elements
	// --------
	var jinput = jQuery('<div>', {'id': 'dropdown' + instanceId, 'class': 'renderer_html_dropdown', 'tabindex':0});
	jinput.append(jQuery('<div>', {'class': 'renderer_html_dropdown_icon'}));
	jinput.append(jQuery('<div>', {'class': 'renderer_html_dropdown_title'}));
	
	var jdiv_readonly = jQuery('<div>', {'class': 'renderer_html_dropdown readonly'});
	var jdiv_container = jQuery('<div>', {'style': 'position: relative;'});
	jdiv_container.attr('id', id);
	jdiv_container.append(jinput, jdiv_readonly);
	
	var jdiv_dropdown = jQuery('<div>', {'id': 'dropdown_content' + instanceId, 'class': 'renderer_html_dropdown_content', 'style': 'display: none;'});
	jdiv_container.append(jdiv_dropdown);
	
	var is_disabled = undefined;
	var is_errored = undefined;
	var is_readonly = undefined;
	
	var click_outsideE = F.receiverE();
	var focusE = null;
	var blurE = null;
		
	// Public object
	// -------------
	return {
		build : function() {
			return jdiv_container.get(0);
		},
		
		load : function() {			
			focusE = jinput.fj('jQueryBind', 'focus');
			blurE = jinput.fj('jQueryBind', 'blur');
			
			focusE.mapE(function(){
				// Listen to key press
				jinput.on('keydown', function(e){
					switch(e.which){
					case 13:	// Enter
					case 32:	// Space
						click_outsideE.sendEvent();
						break;
					}
				});
			});
			
			blurE.mapE(function(){
				// Remove key press listener
				jinput.off('keydown');
			});
			
			var clickE = jinput.fj('clicksE');
			
			F.mergeE(click_outsideE, clickE).mapE(function(){
				
				if(jdiv_dropdown.is(":visible")){
					// Hide content
					jdiv_dropdown.hide();
					
					// Remove click outside for this specific object.
					jQuery(document).off('mouseup.' + '#dropdown_content' + instanceId);
					
				}else{
					// Position content just under button
					var pos = jinput.position();
					var height = jinput.innerHeight();
					var margin_top = 4;
					var margin_left = 4;
					var border_width = 1;
					jdiv_dropdown.css('top', pos.top + height + margin_top + border_width);
					jdiv_dropdown.css('left', pos.left + margin_left);
					jdiv_dropdown.show();
					
					// Listen to click outside for this specific object.
					jQuery(document).on('mouseup.' + '#dropdown_content' + instanceId, function (e){
					    var container = jQuery('#dropdown_content' + instanceId + ', #' + 'dropdown' + instanceId);
					    if (!container.is(e.target) && container.has(e.target).length === 0)
					    {
					    	click_outsideE.sendEvent();
					    }
					});
				}
			});
		},
		
		/**
		 * Does nothing. You should implement this renderer inside a custom renderer.
		 * @param value
		 * @returns
		 */
		setValue : function(value) {
		},
		
		setState : function(state) {
			if(state.disabled !== is_disabled){
				is_disabled = state.disabled;
				jinput.toggleClass('disabled', is_disabled);
				jdiv_readonly.toggleClass('disabled', is_disabled);
			}
			
			if(state.readonly !== is_readonly){
				is_readonly = state.readonly;
				jinput.toggle(!is_readonly);
				jdiv_readonly.toggle(is_readonly);
			}
			
			if(state.errored !== is_errored){
				is_errored = state.errored;
				jinput.toggleClass('errored', is_errored);
			}
		},
		
		getValueE : function() {
			return F.zeroE();
		},
		
		getFocusE : function() {
			return focusE;
		},
		
		getBlurE : function() {
			return blurE;
		},
		
		isDisabled : function() {
			return is_disabled;
		},
		
		isErrored : function() {
			return is_errored;
		},
		
		isReadOnly : function() {
			return is_readonly;
		},
		
		setWidth : function(width){
			jinput.css('width', width);
		},
		
		setTitle : function(title){
			jinput.find('.renderer_html_dropdown_title').text(title);
			jdiv_readonly.html(title);
		},
		
		setContent : function(content){
			jdiv_dropdown.empty();
			jdiv_dropdown.append(content);
		},
		
		close : function(){
			click_outsideE.sendEvent();
		}
	};
};

/**
 * Timestamp Renderer
 */
WIDGETS.renderers.Timestamp = function(id) {
    // Ensure new keyword has been used
    if ( !(this instanceof arguments.callee)){
        throw new Error("Constructor called as a function, use new keyword");
    }
         
    var container = document.createElement("div");  

    var stateE = F.receiverE();
    // Public object
    return {
        build : function() {
            return container;
        },
        destroy : function() {
        },
        load : function(options) {
           
        },
        setValue : function(value) { 
            if(MATH.isNumber(value)){
                var d = new Date();
                d.setTime(value);       //-DATE.getLocalOffSet()
                container.innerHTML = d.toString();
            }
        },
        setState : function(state) {
            stateE.sendEvent(state);
        },
        getValueE : function() {
            return F.zeroE();
        },
        getFocusE : function() {
            return F.zeroE();
        },
        getBlurE : function() {
            return F.zeroE();
        },
        isDisabled : function() {
            return F.constantB(false);
        },
        
        isErrored : function() {
            return false;
        },
        
        isReadOnlyB : function() {
            return F.constantB(true);
        }
    };
};
WIDGETS.renderers.timestamp = WIDGETS.renderers.Timestamp;

/**
 * TimestampDiff Renderer
 */
WIDGETS.renderers.TimestampDiff = function(id) {
    // Ensure new keyword has been used
    if ( !(this instanceof arguments.callee)){
        throw new Error("Constructor called as a function, use new keyword");
    }
         
    var container = document.createElement("div");  
    var value = undefined;
    var stateE = F.receiverE();
    // Public object
    return {
        build : function() {
            return container;
        },
        destroy : function() {
        },
        load : function(options) {
            F.timerE(1000).mapE(function(){
                if(value!==undefined){
                    var diff = (value-DATE.getTime())/1000;
                    var prefix = diff>=0?"In ":"";
                    var postfix = diff>=0?"":" ago";
                    if(diff<0){
                        diff = Math.abs(diff);
                    }
                    container.innerHTML = prefix+diff.formatAsTime()+postfix;
                }
           });
        },
        setValue : function(val) { 
            if(MATH.isNumber(val)){
                value = val;
            }
        },
        setState : function(state) {
            stateE.sendEvent(state);
        },
        getValueE : function() {
            return F.zeroE();
        },
        getFocusE : function() {
            return F.zeroE();
        },
        getBlurE : function() {
            return F.zeroE();
        },
        isDisabled : function() {
            return F.constantB(false);
        },
        
        isErrored : function() {
            return false;
        },
        
        isReadOnlyB : function() {
            return F.constantB(true);
        }
    };
};

/**
 * Popup
 */
WIDGETS.renderers.Popup = function(id) {
	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
	
	// Instance id
	var instanceId = id;
	
	// Elements
	// --------
	var jdiv_container = jQuery('<div>', {style: 'position: relative;'});
	jdiv_container.attr('id', id);
	
	var jdiv_inner = jQuery('<div>', {id: 'duration' + instanceId, 'class': 'popup_field', 'tabindex':0});
	jdiv_inner.append(
		jQuery('<div>', {'class': 'popup_icon_container button', text: '...'}),
		jQuery('<div>', {'class': 'popup_display', html: '&nbsp;'}),
		jQuery('<div>', {style: 'clear: both;'})
	);
	
	var jdiv_readonly = jQuery('<div>', {'class': 'renderer_group_input readonly', html: '&nbsp;'});
	jdiv_container.append(jdiv_inner, jdiv_readonly);
	
	// Construct popup
	var jdiv_popup = jQuery('<div>', {id: 'popup_content' + instanceId, 'class': 'popup_container'});
	jdiv_popup.hide();
	jdiv_container.append(jdiv_popup);
	
	var is_disabled = undefined;
	var is_errored = undefined;
	var is_readonly = undefined;
	
	// Events
	var toggledE = F.receiverE();
	var click_outsideE = F.receiverE();
	var focusE = null;
	var blurE = null;
	
	// Public object
	// -------------
	return {
		build : function() {
			return jdiv_container.get(0);
		},
		
		load : function() {
			focusE = jdiv_inner.fj('jQueryBind', 'focus');
			blurE = jdiv_inner.fj('jQueryBind', 'blur');
			
			// Popup logic
			// -----------
			
			var clickE = jdiv_inner.fj('clicksE').mapE(function(){
				if(jdiv_inner.hasClass('disabled')){
					return false;
				}			
				
				// Force focus
				jdiv_inner.focus();
				return true;
			}).filterE(function(value){ return value;});
			

			var popup_shownE = F.mergeE(clickE, click_outsideE).mapE(function(){
				
				if(jdiv_popup.is(":visible")){
					// Hide content
					toggledE.sendEvent(false);
					jdiv_popup.hide();
					jdiv_inner.find('.duration_inner_icon').toggleClass('up', false);
					
					// Remove click outside for this specific object.
					jQuery(document).off('mouseup.' + '#popup_content' + instanceId);
					
					return false;
					
				}else{
					// Show content
					toggledE.sendEvent(true);
					jdiv_popup.show();
					ensureOnScreen(jdiv_popup, '', jdiv_inner.outerHeight() + 2);
					
					// Listen to click outside for this specific object.
					jQuery(document).on('mouseup.' + '#popup_content' + instanceId, function (e){
					    var container = jQuery('#popup_content' + instanceId + ', #' + 'duration' + instanceId);
					    if (!container.is(e.target) && container.has(e.target).length === 0)
					    {
					    	click_outsideE.sendEvent();
					    }
					});
					
					return true;
				}
			});
		},
		
		setValue : function(value) {
			jdiv_inner.find('.popup_display').html(value);
			jdiv_readonly.html(value);
		},
		
		setContent : function(content){
			jdiv_popup.html(content);
		},
		
		close : function(){
			click_outsideE.sendEvent();
		},
		
		setState : function(state) {
			if(state.disabled !== is_disabled){
				is_disabled = state.disabled;
				jdiv_inner.toggleClass('disabled', is_disabled);
				jdiv_readonly.toggleClass('disabled', is_disabled);
				jdiv_inner.find('.popup_icon_container').toggleClass('disabled', is_disabled);
				
				if(is_disabled){
					jdiv_inner.removeAttr('tabindex');
				}else{
					jdiv_inner.attr('tabindex', 0);
				}
			}
			
			if(state.readonly !== is_readonly){
				is_readonly = state.readonly;
				jdiv_inner.toggle(!is_readonly);
				jdiv_readonly.toggle(is_readonly);
			}
			
			if(state.errored !== is_errored){
				is_errored = state.errored;
				jdiv_inner.toggleClass('errored', is_errored);
			}
			
			if(state.options !== undefined && state.options.tooltip !== undefined){
				jdiv_container.attr('title', state.options.tooltip);
			}
		},
		
		getToggledE : function(){
			return toggledE;
		},
		
		getValueE : function() {
			return F.zeroE();	// Extend this class to return a value.
		},
		
		getFocusE : function() {
			return focusE;
		},
		
		getBlurE : function() {
			return blurE;
		},
		
		isDisabled : function() {
			return is_disabled;
		},
		
		isErrored : function() {
			return is_errored;
		},
		
		isReadOnly : function() {
			return is_readonly;
		}
	};
};

/**
 * InterfaceStatus Renderer
 */
WIDGETS.renderers.InterfaceStatus = function(id) {
	// Ensure new keyword has been used
	if (!(this instanceof arguments.callee))
		throw new Error("Constructor called as a function, use new keyword");

	var _status = false;
	
	var applyValue = function() {
		jQuery(icon).removeClass("up down unknown");

		jQuery(icon).addClass((_status == "UP") ? 'up' : (_status == "DOWN") ? 'down' : 'disabled');
		
		container.title = (_status == "UP") ? 'Up' : (_status == "DOWN") ? 'Down' : 'Unknown';
		
	};

	var container = DOM.create('div', undefined);
	container.style.textAlign = 'center';
	var icon = DOM.create('div', undefined, 'port_icon');
	icon.style.margin = "0 auto";
	container.appendChild(icon);

	// Public object
	return {
		build : function() {
			return container;
		},
		load : function() {
		},
		setValue : function(value) {
			_status = value;
			applyValue();
		},
		setState : function(state) {
		},
		setDisabled : function(disabled) {
		},
		setReadOnly : function(readOnly) {
		},
		setErrored : function(errored) {
		},
		getValueE : function() {
			return F.zeroE();
		},
		getFocusE : function() {
			return F.zeroE();
		},
		getBlurE : function() {
			return F.zeroE();
		},
		isDisabled : function() {
			return false;
		},
		isErrored : function() {
			return false;
		},
		isReadOnly : function() {
			return true;
		}
	};
};

WIDGETS.renderers.TextAreaInput = function(id) {
    // Ensure new keyword has been used
    if (!(this instanceof arguments.callee))
        throw new Error("Constructor called as a function, use new keyword");

    var container = DOM.create('div', undefined);
    var textarea = DOM.createAndAppend(container, "textarea");

    var stateE = F.receiverE();
    var valueE = F.zeroE();
    var focusE = undefined;
    var blurE = undefined;

    // Public object
    return {
        build : function() {
            return container;
        },
        load : function() {

            var valueB = F.extractValueB(textarea);
            focusE = jQuery(textarea).fj('jQueryBind', 'focus');
            blurE = jQuery(textarea).fj('jQueryBind', 'blur');

            valueE = blurE.snapshotE(valueB);

            stateE.filterRepeatsE().mapE(function (state) {
                if(state.options !== undefined) {
                    textarea.rows = state.options.rows;
                    textarea.cols = state.options.cols;
                }
            });

        },
        setValue : function(value) {
            if(value !== undefined) {
                textarea.innerHTML = value;
            }

        },
        setState : function(state) {
            stateE.sendEvent(state);
        },
        setDisabled : function(disabled) {
        },
        setReadOnly : function(readOnly) {
        },
        setErrored : function(errored) {
        },
        getValueE : function() {
            return valueE;
        },
        getFocusE : function() {
            return focusE;
        },
        getBlurE : function() {
            return blurE;
        },
        isDisabled : function() {
            return false;
        },
        isErrored : function() {
            return false;
        },
        isReadOnly : function() {
            return true;
        }
    };
};

/**
 * IPAddress Renderer
 */
WIDGETS.renderers.IPAddressGeneric = function (hasMask, hasType, zerosAfterMask) {
    return function(id) {
        // Ensure new keyword has been used
        if (!(this instanceof arguments.callee))
            throw new Error("Constructor called as a function, use new keyword");

        var textInput         = DOM.create('input', undefined);
        textInput.type        = "text";
        textInput.placeholder = hasMask ? "0.0.0.0/xx" : "0.0.0.0";
        var validChars = hasMask ? "0123456789./" : "0123456789.";

        jQuery(textInput).on('keydown',function (e) {
            //e = e || window.event;
            var cchar = String.fromCharCode((typeof e.which == "undefined") ? e.keyCode : e.which);

            if (true) {
                // this done till we have time to properly deal key handling
                return true;
            }

            console.log("e.which", e.which,cchar, e);
            if ([46, 40, 8, 9, 27, 13, 110, 190, 19, 111].indexOf(e.keyCode) !== -1 ||
                  (e.keyCode >= 97 && e.keyCode <= 105) ||

                  (e.keyCode >= 112 && e.keyCode <= 123) ||
                      // Allow: Ctrl+A
                  (e.keyCode == 65 && e.ctrlKey === true) ||
                      // Allow: Ctrl+C
                  (e.keyCode == 67 && e.ctrlKey === true) ||
                      // Allow: Ctrl+C
                  (e.keyCode == 86 && e.ctrlKey === true) ||
                      // Allow: Ctrl+X
                  (e.keyCode == 88 && e.ctrlKey === true) ||
                      // Allow: home, end, left, right
                  (e.keyCode >= 35 && e.keyCode <= 39)) {
                // let it happen, don't do anything
                console.log("keyCode", e.keyCode);
                return true;
            }

            return (validChars.indexOf(cchar) >= 0);
        });

        var valueFromString = function (str) {

            var res;
            if (hasMask) {
                var sp = str.split("/");
                if (sp.length === 2) {
                    //console.log({ip: sp[0], len: parseInt(sp[1])});
                    res =  {ip: sp[0], len: parseInt(sp[1])};
                }
                else {
                    console.log("ERROR, IP-Renderer cannot find subnet length");
                }
            }
            else {
                res = str;
            }
            if (hasType) {
                res = {value: res , type : hasMask ? "ipv4-prefix" : "ipv4"};
            }

            return res;

        };

        var stateE = F.receiverE();
        var setE   = F.receiverE();
        var valueE = F.zeroE();
        var focusE = undefined;
        var blurE  = undefined;

        // Public object
        return {
            build:       function () {
                return textInput;
            },
            load:        function () {

                var valueB = F.extractValueB(textInput);
                focusE     = jQuery(textInput).fj('jQueryBind', 'focus');
                blurE      = jQuery(textInput).fj('jQueryBind', 'blur');

                valueE = blurE.snapshotE(valueB).mapE(function (str) {
                    return valueFromString(str);
                });

                stateE.filterRepeatsE().mapE(function (state) {
                    if (state.options !== undefined) {

                    }
                });
                // setE.printE("111111111  IP ADDRESS RENDERER");
                setE.mapE(function (val) {
                    if (UTIL.getIp(val, hasType, hasMask) !== undefined && (!hasMask || UTIL.getLen(val, hasType, hasMask) !== undefined)) {
                        if (hasMask) {
                            textInput.value = WTM_UTILS.getIp(val, hasType, hasMask) + "/" + UTIL.getLen(val, hasType, hasMask);
                        }
                        else {
                            textInput.value = WTM_UTILS.getIp(val, hasType, hasMask);
                        }
                    }
                });


            },
            setValue:    function (value) {
                setE.sendEvent(value);
            },
            setState:    function (state) {
                stateE.sendEvent(state);
            },
            setDisabled: function (disabled) {
            },
            setReadOnly: function (readOnly) {
            },
            setErrored:  function (errored) {
            },
            getValueE:   function () {
                return valueE;
            },
            getFocusE:   function () {
                return focusE;
            },
            getBlurE:    function () {
                return blurE;
            },
            isDisabled:  function () {
                return false;
            },
            isErrored:   function () {
                return false;
            },
            isReadOnly:  function () {
                return true;
            }
        };
    }
};
WIDGETS.renderers.IPAddress = WIDGETS.renderers.IPAddressGeneric(true, false);

/**
 * Date Renderer
 */
WIDGETS.renderers.Date = function(id) {
    // Ensure new keyword has been used
    if ( !(this instanceof arguments.callee) )
        throw new Error("Constructor called as a function, use new keyword");

    var container = DOM.create('div');
    var writeContainer = DOM.createAndAppend(container, 'span');
    var readContainer = DOM.createAndAppend(container, 'span');
    readContainer.style.padding = '4px';
    var iconContainer = DOM.createAndAppend(container, 'span');
    var iconButton = DOM.createAndAppend(iconContainer, 'button');
    var icon = DOM.createAndAppend(iconButton, "img");
    icon.src = "/resources/images/calendar_icon.png";
    iconButton.type = "button";

    jQuery(iconButton).css('margin-top', 0).css('vertical-align', 'middle').css('padding', '2px 5px');

    var offSetClear = (new Date()).getTimezoneOffset()*60;

    var calendarFocusE = undefined;
    var calendarBlurE = undefined;

    var calendarValueE = null;
    var lastState = undefined;
    var monthYearChangedE = F.receiverE();
    var dateChangedE = F.receiverE();
    var lastServerTime = undefined;
    var lastClientTime = undefined;
    var timezoneOffset = 0;
    var dateFormat = 'dd-mm-yy';
    // Public object
    return {
        build : function() {
            jQuery(writeContainer).datepicker({
                dateFormat: dateFormat,
                changeMonth: true,
                changeYear: true,
                showOtherMonths: false,
                dayNamesMin: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                yearRange: "2000:2050",
                onChangeMonthYearType: function(year, month, inst){
                    monthYearChangedE.sendEvent({year: year, month: month});
                },
                onSelect: function(){
                    dateChangedE.sendEvent(true);
                    return true;
                },
                onClose: function(){}
            });
            return container;
        },
        load : function(options) {
            calendarFocusE = jQuery(writeContainer).fj('jQueryBind', 'focus');
            calendarBlurE = jQuery(writeContainer).fj('jQueryBind', 'blur');
            calendarValueE = dateChangedE.mapE(function(){
                var date = jQuery(writeContainer).datepicker('getDate');

                var m = moment.utc([date.getFullYear(), date.getMonth(), date.getDate()]);
                var newValue =  m.utc().unix();

                readContainer.innerHTML = jQuery.datepicker.formatDate(dateFormat, date);
                if(lastState !== undefined && lastState.options !== undefined && lastState.options.collapse===true){
                    jQuery(writeContainer).hide();
                }
                return m;
            });
            F.clicksE(container).delayE(100).mapE(function(){
                if(lastState !== undefined && lastState.options !== undefined && lastState.options.collapse===true){
                    jQuery(writeContainer).show();
                }
            });
            F.clicksE(document).mapE(function(e){
                if(lastState !== undefined && lastState.options !== undefined  && lastState.options.collapse===true && e.target!==undefined && DOM!==undefined && e.target!==undefined && !DOM.isParentOf(container, e.target)){
                    jQuery(writeContainer).hide();
                }
            });
        },
        setValue : function(csValue) {
            if (!good(csValue)) {
                return;
            }

            var v = csValue;
            var d = new Date(v.year(), v.month(), v.date());
            timezoneOffset = csValue.utcOffset();

            var dateCont = jQuery(writeContainer);
            var oldDate = dateCont.datepicker('getDate');
            if (oldDate.getDate() !== d.getDate() || oldDate.getMonth() !== d.getMonth() || oldDate.getFullYear() !== d.getFullYear()) {
                dateCont.datepicker("setDate", d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear());
            }


            readContainer.innerHTML = jQuery.datepicker.formatDate(dateFormat, jQuery(writeContainer).datepicker('getDate'));
        },
        setState : function(state) {
            if(lastState === undefined
                  || (state.readonly !== lastState.readonly)
                  || (!UTIL.objectEquals(state.options, lastState.options))){
                if(state.readonly || (state.options !== undefined && state.options.collapse)){
                    jQuery(writeContainer).hide();
                    jQuery(readContainer).show();
                }
                else{
                    jQuery(readContainer).hide();
                    jQuery(writeContainer).show();
                }
                if(state.options !== undefined && state.options.collapse){
                    jQuery(readContainer).addClass("border");
                    jQuery(writeContainer).addClass("dateRenderer_popup");
                    jQuery(iconContainer).show();
                }
                else{
                    jQuery(readContainer).removeClass("border");
                    jQuery(writeContainer).removeClass("dateRenderer_popup");
                    jQuery(iconContainer).hide();
                }
            }
            if(lastState===undefined || state.disabled!==lastState.disabled){
                if(state.disabled){
                    jQuery(readContainer).addClass("renderer_datetime_disabled");
                }
                else{
                    jQuery(readContainer).removeClass("renderer_datetime_disabled");
                }
            }
            lastState = state;

            if(state.options !== undefined && state.options.dateFormat !== undefined){
                dateFormat = state.options.dateFormat;
            }
        },
        setDisabled : function(disabled) {},
        setReadOnly : function(readOnly) {},
        setErrored : function(errored) {},
        getValueE : function() {
            return calendarValueE;
        },
        getFocusE : function() {
            return calendarFocusE;
        },
        getBlurE : function() {
            return calendarBlurE;
        },
        isDisabled : function() {return false;},
        isErrored : function() {return false;},
        isReadOnly : function() {return true;},
        destroy: function(){
            jQuery(writeContainer).datepicker('destroy');
        }
    };
};

/**
 * Time Renderer
 */
WIDGETS.renderers.Time = function(default_options) {
    if ( !(this instanceof arguments.callee) )
        throw new Error("Constructor called as a function, use new keyword");

    var createInputBox = function(id){
        var input = DOM.create("input");
        input.type = "text";
        input.size = 2;
        input.maxlength = 2;
        jQuery(input).css('width', 15);
        jQuery(input).addClass("no_border");
        jQuery(input).addClass("rightAlign");
        if(id!=undefined){
            input.id = id;
        }
        return input;
    };

    var cleanString = function(str){
        str = typeof(str)!="string"?str+"":str;
        return str.replace(/[^0-9]/ig, '');
    };

    var fixInputValue = function(value, max, element){
        var value = cleanString(value);
        if(value.length==0){
            value = 0;
        }
        var leadingZeros = "";
        var intVal = parseInt(value);
        intVal = intVal<0?0:(intVal>max?max:intVal);
        var selStart = element.selectionStart;
        var selEnd = element.selectionEnd;
        var selDir = element.selectionDirection;

        if((""+intVal).length!=2){
            for(var i=0;i<2-(""+intVal).length;i++){
                leadingZeros+="0";
            }
        }
        if(element!=undefined){
            element.value = leadingZeros+intVal;

            if ($(element).is(':focus')) {
                element.setSelectionRange(selStart, selEnd, selDir);
            }
        }
        if(!isNaN(intVal)){
            return intVal;
        }
        return ERROR;
    };
    var readOnlyFilter = function(){return lastState!=undefined && lastState.readonly==false;};

    var outerContainer = DOM.create('div');
    var readContainer = DOM.create('span');
    var container = DOM.create('span', undefined, 'renderer_datetime_input');

    var hourInput = createInputBox("hour");
    var minInput = createInputBox("min");
    var secInput = createInputBox("sec");

    var secLabel = DOM.create('span', undefined, "renderer_datetime_unit", "s");
    var minLabel = DOM.create('span', undefined, "renderer_datetime_unit", "m");
    var hourLabel = DOM.create('span', undefined, "renderer_datetime_unit", "h");

    var valueE = undefined;
    var userHasInteractedB = undefined;
    var serverUpdatesE = undefined;
    var lastState = undefined;
    var clearInteractionE = F.receiverE();
    var lastCSPairPacket = undefined;
    var userHasFocusB = undefined;

    return {
        build:function(){
            jQuery(container).addClass("smallPadding");
            var cont1 = DOM.create('span');
            var cont2 = DOM.create('span');
            var cont3 = DOM.create('span');
            container.appendChild(cont1);
            container.appendChild(hourLabel);
            container.appendChild(cont2);
            container.appendChild(minLabel);
            container.appendChild(cont3);
            container.appendChild(secLabel);
            cont1.appendChild(hourInput);
            cont2.appendChild(minInput);
            cont3.appendChild(secInput);


            outerContainer.appendChild(container);
            outerContainer.appendChild(readContainer);
            outerContainer.appendChild(DOM.create("span", undefined, "units_label", "( 24 hour )"));
            return outerContainer;
        },
        load: function(){
            serverUpdatesE = F.receiverE();
            var hourFocusE = jQuery(hourInput).fj('jQueryBind', 'focus').filterE(readOnlyFilter);
            var hourBlurE = jQuery(hourInput).fj('jQueryBind', 'blur').filterE(readOnlyFilter);
            var hourClickE = F.clicksE(hourInput).filterE(readOnlyFilter);
            //var hourChangedE = F.mergeE(hourFocusE, F.extractValueE(hourInput).filterRepeatsE()).calmE(300).filterTypeE("object");
            var hourChangedE = F.extractEventE(hourInput, "keypress").calmE(100).mapE(function(){
                hourInput.value = cleanString(hourInput.value);
                return hourInput.value;
            }).filterRepeatsE();

            var hourValueE = hourBlurE.delayE(100).snapshotE(hourChangedE.startsWith(undefined)).filterUndefinedE().mapE(function(value){
                return fixInputValue(value, 23, hourInput);
            });

            hourChangedE.filterRepeatsE().mapE(function(value){
                if(value>23){
                    hourInput.select();
                }
                else if((value+"").length==2){
                    minInput.select();
                }
            });


            var minFocusE = jQuery(minInput).fj('jQueryBind', 'focus').filterE(readOnlyFilter);
            var minBlurE = jQuery(minInput).fj('jQueryBind', 'blur').filterE(readOnlyFilter);
            var minClickE = F.clicksE(minInput).filterE(readOnlyFilter);
            var minChangedE = F.extractEventE(minInput, "keypress").calmE(100).mapE(function(){
                minInput.value = cleanString(minInput.value);
                return minInput.value;
            }).filterRepeatsE();

            var minValueE = minBlurE.snapshotE(minChangedE.startsWith(undefined)).filterUndefinedE().mapE(function(value){
                return fixInputValue(value, 59, minInput);
            });
            minChangedE.filterRepeatsE().mapE(function(value){
                if(value>59){
                    minInput.select();
                }
                else if((value+"").length==2){
                    secInput.select();
                }
            });

            var secFocusE = jQuery(secInput).fj('jQueryBind', 'focus').filterE(readOnlyFilter);
            var secBlurE = jQuery(secInput).fj('jQueryBind', 'blur').filterE(readOnlyFilter);
            var secClickE = F.clicksE(secInput).filterE(readOnlyFilter);
            var secChangedE = F.extractEventE(secInput, "keypress").calmE(100).mapE(function(){
                secInput.value = cleanString(secInput.value);
                return secInput.value;
            }).filterRepeatsE();

            var secValueE = secBlurE.snapshotE(secChangedE.startsWith(undefined)).filterUndefinedE().mapE(function(value){
                return fixInputValue(value, 59, secInput);
            });

            //userHasInteractedB = F.mergeE(hourFocusE, minFocusE, secFocusE, clearInteractionE).mapE(function(){
            //	return true;
            //}).startsWith(false);
            function elementIsFocusedE(element){
                return F.mergeE(jQuery(element).fj('jQueryBind', 'focus').mapE(function(){return true;}), jQuery(element).fj('jQueryBind', 'blur').mapE(function(){return false;}));
            }
            userHasFocusB = F.orB(elementIsFocusedE(hourInput).startsWith(false), elementIsFocusedE(minInput).startsWith(false), elementIsFocusedE(secInput).startsWith(false));


            //Highlight on focus
            F.mergeE(hourFocusE, hourClickE, minFocusE, minClickE, secFocusE, secClickE).calmE(100).mapE(function(ev){
                ev.target.select();
            });


            var serverUpdatesB = serverUpdatesE.startsWith(NOT_READY);

            valueE = F.liftB(function(hours, minutes, seconds){	//serverUpdate
                if(serverUpdatesB.valueNow()==undefined || !good(serverUpdatesB.valueNow())){
                    return;
                }
                var serverUpdate = serverUpdatesB.valueNow();
                var hours = good(hours)?hours:serverUpdate.hour;
                hours = (hours>23||hours<0)?23:hours;
                var minutes = good(minutes)?minutes:serverUpdate.minutes;
                minutes = (minutes>59||minutes<0)?59:minutes;
                var seconds = good(seconds)?seconds:0;
                seconds = (seconds>59||seconds<0)?59:seconds;

                var m = moment();
                m.hour(hours);
                m.minute(minutes);
                m.second(seconds);

                // return (hours*60*60)+(minutes*60)+(seconds);
                return m;
            }, hourValueE.startsWith(NOT_READY), minValueE.startsWith(NOT_READY), secValueE.startsWith(NOT_READY)).changes();		//, serverUpdatesE.calmE(500).startsWith(NOT_READY)

            //.mapE(function(value){if(lastState!=undefined && lastState.client==undefined){return undefined;}return value;})
            valueB = valueE.startsWith(NOT_READY);

            var lastSet = null;
            serverUpdatesE.mapE(function(update){
                if (lastSet &&(jQuery(hourInput).is(':focus')|| jQuery(minInput).is(':focus') || jQuery(secInput).is(':focus'))) {
                    if ((lastSet.hour+"").padLeft(2, "0") !== hourInput.value) {
                        return;
                    }
                    if ((lastSet.minutes + "").padLeft(2, "0") !== minInput.value) {
                        return;
                    }

                    if ((lastSet.seconds+"").padLeft(2, "0") !== secInput.value) {
                        return;
                    }

                }
                fixInputValue(update.hour, 23, hourInput);
                fixInputValue(update.minutes, 59, minInput);
                fixInputValue(update.seconds, 59, secInput);
                lastSet = update;
            });
        },
        destroy: function(){

        },
        setValue : function(value){
            var hour = value.hour(); //Math.min(Math.floor(value/60/60), 23);
            // value -=hour*60*60;
            var minutes = value.minute();// Math.min(Math.floor(value/60), 59);
            var seconds = value.second(); // Math.min(value-(minutes*60), 59);

            readContainer.innerHTML = (hour+"").padLeft(2, "0")+" : "+(minutes+"").padLeft(2, "0");

            serverUpdatesE.sendEvent({hour: hour, minutes: minutes, seconds: seconds});
            // return;
        },
        setState : function(state) {
            if(lastState==undefined || !UTIL.objectEquals(lastState, state)){
                if(state.disabled==true){
                    jQuery(container).addClass("renderer_datetime_disabled");
                }
                else{
                    jQuery(container).removeClass("renderer_datetime_disabled");
                }

                if(state.readonly!=undefined && state.readonly==true){
                    jQuery(readContainer).show();
                    jQuery(container).hide();
                }
                else{
                    jQuery(container).show();
                    jQuery(readContainer).hide();
                }
                if(state.options!=undefined && (state.options.labels==undefined || state.options.labels==SYSINFO.OPTIONS.MODE.TIME)){
                    jQuery(secInput).show();
                    jQuery(secLabel).show();
                    jQuery(minLabel).show();
                    hourLabel.innerHTML = "h";
                }
                else{
                    jQuery(secInput).hide();
                    jQuery(secLabel).hide();
                    jQuery(minLabel).hide();
                    hourLabel.innerHTML = ":";
                }

                jQuery(hourInput).prop('disabled', state.disabled);
                jQuery(minInput).prop('disabled', state.disabled);
                jQuery(secInput).prop('disabled', state.disabled);

                if(state.options && state.options.show_unit_label !== undefined){
                    jQuery(outerContainer).find('.units_label').toggle(state.options.show_unit_label);
                }
            }
            lastState = state;



        },
        setDisabled : function(disabled) {},
        setReadOnly : function(readOnly) {},
        setErrored : function(errored) {},
        getValueE : function() {
            return valueE;
        },
        getFocusE : function() {return F.zeroE();},
        getBlurE : function() {return F.zeroE();},
        isDisabled : function() {return false;},
        isErrored : function() {return false;},
        isReadOnly : function() {return true;}
    };
};


/**
 * Dialog Renderer
 */
WIDGETS.renderers.Dialog = function (doDialog) {
    return function(id) {
        // Ensure new keyword has been used
        if (!(this instanceof arguments.callee))
            throw new Error("Constructor called as a function, use new keyword");
    
        var container = DOM.create('div', id);
        var dialogButton = DOM.createAndAppend(container, "button", undefined, undefined, "...");
    
        var stateE = F.receiverE();
        var valueE = F.receiverE();
        var focusE = undefined;
        var blurE = undefined;
        var myState = {};
        // Public object
        return {
            build : function() {
                return container;
            },
            load : function() {
                focusE = jQuery(dialogButton).fj('jQueryBind', 'focus');
                blurE = jQuery(dialogButton).fj('jQueryBind', 'blur');
                
                dialogButton.onclick = function() {  
                    doDialog(valueE, null, myState.options);
                }
            },
            setValue : function(value) {
            },
            setState : function(state) {
                myState = state;
                stateE.sendEvent(state);
            },
            getValueE : function() {
                return valueE;
            },
            getFocusE : function() {
                return focusE;
            },
            getBlurE : function() {
                return blurE;
            }
        };
    }
}


WIDGETS.renderers.Button = function (btnName, action) {
    return function(id) {
        // Ensure new keyword has been used
        if (!(this instanceof arguments.callee))
            throw new Error("Constructor called as a function, use new keyword");
    
        var container = DOM.create('div', id);
        var button = DOM.createAndAppend(container, "button", "renderBtn", "renderBtn", btnName);
        var stateE = F.receiverE();
        var valueE = F.receiverE();
        var focusE = undefined;
        var blurE = undefined;
        // Public object
        return {
            build : function() {
                return container;
            },
            load : function() {
                focusE = jQuery(button).fj('jQueryBind', 'focus');
                blurE = jQuery(button).fj('jQueryBind', 'blur');
                button.onclick = action;
            },
            setValue : function(value) {
            },
            setState : function(state) {
                stateE.sendEvent(state);
            },
            getValueE : function() {
                return valueE;
            },
            getFocusE : function() {
                return focusE;
            },
            getBlurE : function() {
                return blurE;
            }
        };
    }
}
