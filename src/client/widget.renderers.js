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
    var lastKeys = undefined;
    var newValueE = F.receiverE();
    var newStateE = F.receiverE();
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
            var newValueB = newValueE.startsWith(SIGNALS.NOT_READY);
            var lastValueB = newValueB.previousValueB();
            
            F.liftB(function(newValue, state){
                if(!good()){
                    return chooseSignal();
                }
                LOG.create();
                keySelection.style.display = (!state.options.keyMap)?"none":"table-cell";
                keySelectionInput.style.display = (!state.options.keyMap)?"table-cell":"none";
                
                valueSelection.style.display = (!state.options.valueMap)?"none":"table-cell";
                valueSelectionInput.style.display = (!state.options.valueMap)?"table-cell":"none";
                
                for(var i=keySelection.options.length-1;i>=0;i--){keySelection.remove(i);}
                for(var key in state.options.keyMap){
                    var option = DOM.create("option", undefined, undefined, state.options.keyMap[key]);
                    option.value = key;
                    if(newValue[key]==undefined){
                        keySelection.appendChild(option);
                    }
                }
                for(var i=valueSelection.options.length-1;i>=0;i--){valueSelection.remove(i);}
                for(var key in state.options.valueMap){
                    var option = DOM.create("option", undefined, undefined, state.options.valueMap[key]);
                    option.value = key;
                    valueSelection.appendChild(option);
                }
            }, newValueB, newStateB);
                
            
            var deleteClickedE = newValueE.mapE(function(newMap){
                var options = newStateB.valueNow().options || {};
                var lastKeys = Object.keys(lastValueB.valueNow());
                if(lastKeys){
                    for(var index in lastKeys){
                        if(!newMap[lastKeys[index]]){
                            DOM.remove(DOM.get(id+"_"+lastKeys[index]));
                        }
                    }
                }  
                var deleteEvents = [];
                for(var key in newMap){
                    var value = newMap[key];
                    var domId = id+"_"+key;
                    var deleteButton = DOM.get(domId+"_button");
                    if(!deleteButton){
                        var rowContainer = DOM.createAndAppend(rowsContainer, "div", domId, "mapRenderer_row");
                        var keyCont = DOM.createAndAppend(rowContainer, "div", undefined, "mapRenderer_key", (options.keyMap!=undefined?options.keyMap[key]:key));
                        var valCont = DOM.createAndAppend(rowContainer, "div", domId+"_val", "mapRenderer_val", value);
                        var deleteButton = DOM.createAndAppend(rowContainer, "button", domId+"_button", "mapRenderer_button", "Delete");
                    }
                    else if(DOM.get(domId+"_val")!==value){
                        DOM.get(domId+"_val").innerHTML = value;
                    } 
                    deleteEvents.push(F.clicksE(deleteButton));
                }
                return F.mergeE.apply({}, deleteEvents);
            }).switchE();
            
            //addButton
            
            
            var deleteUpdateE = deleteClickedE.mapE(function(clickEvent){
                var clickedKey = clickEvent.target.id.replace(id+"_", "").replace("_button", "");
                var cloneData = OBJECT.clone(newValueB.valueNow());
                OBJECT.remove(cloneData, clickedKey);
                return cloneData;
            });
            
            var addUpdateE = F.clicksE(addButton).snapshotE(newStateB).mapE(function(state){
                var key = (!state.options.keyMap)?keySelectionInput.value:keySelection.value;
                var value = (!state.options.valueMap)?valueSelectionInput.value:valueSelection.value;
                var cloneData = OBJECT.clone(newValueB.valueNow());
                cloneData[key] = value;
                return cloneData;
            });
            
            valueE = F.mergeE(deleteUpdateE, addUpdateE);
        },
        setValue : function(newMap) {
            newValueE.sendEvent(newMap);
        },
        setState : function(state) {
            newStateE.sendEvent(state);
        },
        getValueE : function() {
            return valueE;
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
    inputBox.type = "text";
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
                return CRYPTO.md5(value);
            });
            valueE.calmE(500).mapE(function(value){
                inputBox.value = value;
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
            if(inFocusB.valueNow()==false){          
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
			if((""+value).startsWith(TABLES.tempPkPrefix) && false){		//Remove the && false to hide temp pks
				value = "-";
			}
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
	
	// Elements
	// --------
	var jinput = jQuery('<input>', {'class': 'renderer_input', type: 'text'});
	var jdiv_readonly = jQuery('<div>', {'class': 'renderer_input readonly', html: '&nbsp;'});
	var jdiv_container = jQuery('<div>');
	jdiv_container.attr('id', id);
	jdiv_container.append(jinput, jdiv_readonly);
	
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
	
	// Ensure new keyword has been used
	if ( !(this instanceof arguments.callee) ) 
		   throw new Error("Constructor called as a function, use new keyword");
	
	// Elements
	// --------
	var jinput = jQuery('<input>', {'class': 'renderer_input', type: 'text'});
	var jdiv_readonly = jQuery('<span>', {'class': 'renderer_input readonly', html: '&nbsp;'});
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
			
			var focusedB = F.mergeE(focusE.mapE(function(){return true;}), blurE.mapE(function(){return false;})).mapE(function(value){
				return value;
			}).startsWith(false);
			
			setE.mapE(function(value){
				if(focusedB.valueNow() !== true){
					jinput.val(value);
					jdiv_readonly.html(value);
				}
			});
			
			var valueB = F.extractValueB(jinput.get(0));
			
			var lastValueB = valueB.previousValueB();
			
			// Do some numeric input validation
			var value_changesE = jinput.fj('extValE');
			var validated_changesE = value_changesE.mapE(function(value){
				
				// TODO: Add rules like negative numbers, integers etc in here 
				
				var output = new Array(); 
				var decimal_count = 0;
				var length = value.length;
				for(var i=0; i<length; i++){
					var char = value[i];
					switch(char){
					case '-':
						if(i == 0){
							output.push(char);
						}
						
						break;
					case '.':
						decimal_count++;
						if(decimal_count == 1){
							output.push(char);
						}
						break;
						
					case ',':
					case '+':
					default:
						if(!isNaN(char)){
							output.push(char);
						}
						break;
					}
				}
				
				var out_string = output.join('');
				if(out_string != value){
					jinput.val(out_string);
				}
				
				if(output.length > 0){
					var out_number = parseFloat(out_string);
					if(!isNaN(out_number)){
						return out_number;
					}
				}
				
				return lastValueB.valueNow();
			});
			
			
			var changeB = F.mergeE(validated_changesE).startsWith(undefined);
			valueE = blurE.snapshotE(changeB).filterUndefinedE();
		},
		
		setValue : function(value){
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
			
			if(state.options !== undefined && state.options.tooltip !== undefined){
				jdiv_container.attr('title', state.options.tooltip);
			}
			
			if(state.options !== undefined && state.options.min !== undefined && state.options.max !== undefined){
				jinput.attr('title', "[" + state.options.min + " - " + state.options.max + "]");
			}else if(state.options !== undefined && state.options.min !== undefined){
				jinput.attr('title', "[" + state.options.min + " - ]");
			}else if(state.options !== undefined && state.options.max !== undefined){
				jinput.attr('title', "[ - " + state.options.max + "]");
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
				}else{
					value = false;
				}
				
				jinput.prop('checked', value);
				jlabel.text(label);
				if(label.length){
					jdiv_readonly.html(value ? label : uncheckedLabel);
				}else{
					jdiv_readonly.html(value ? '&check;' : '&cross;');
				}
				
				return value;
			});
			
			var clickE = jinput.fj('clicksE').mapE(function(){
				// Force focus on field
				jinput.focus();
			});
			
			valueE = clickE.mapE(function(){
				return jinput.is(':checked');
			});
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
			
			if(state.options !== undefined && state.options.tooltip !== undefined){
				jdiv_container.attr('title', state.options.tooltip);
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
	var jdiv_input = jQuery('<div>', {'class': 'renderer_group_input'});
	var jdiv_readonly = jQuery('<div>', {'class': 'renderer_group_input readonly', html: '&nbsp;'});
	var jdiv_container = jQuery('<div>');
	jdiv_container.attr('id', id);
	jdiv_container.append(jdiv_input, jdiv_readonly);
	
	var columns = -1;
	var list = {};
	
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
				jdiv_input.find('input').prop('disabled', disabled).toggleClass('disabled', disabled);
			});
			
			// Create list of checkboxes
			var listedE = listE.snapshotE(disabledB).mapE(function(disabled){
				
				// Clear out what is already there
				jdiv_input.empty();		
				
				// Create new inputs
				var jcheckboxes = new Array();
				var i = 0;
				for(var key in list){
					
					var jlabel = jQuery('<label>', {'class': 'renderer_group', text: key});
					var jcheckbox = jQuery('<input>', {
						'class': 'renderer_input', 
						type: 'checkbox',
						value: list[key]
						});
					
					jcheckbox.prop('disabled', disabled);
					jcheckbox.toggleClass('disabled', disabled);
					jlabel.prepend(jcheckbox);
					
					if(columns > 0 && i > 0){
						if(i%columns == 0){
							jdiv_input.append(jQuery('<br>'));
						}
					}
					jdiv_input.append(jlabel);
					
					jcheckboxes.push(jcheckbox);
					i++;
				}
				
				return jcheckboxes;
			});
			

			// Listen to focus
			focusE = listedE.mapE(function(jcheckboxes){
				
				var events = new Array();
				for(var i=0;i<jcheckboxes.length;i++){
					var jcheckbox = jcheckboxes[i];
					events.push(jcheckbox.fj('jQueryBind', 'focus'));
				}
				
				return F.mergeE.apply(this, events);
			}).switchE();
			
			// Listen to blur
			blurE = listedE.mapE(function(jcheckboxes){
				
				var events = new Array();
				for(var i=0;i<jcheckboxes.length;i++){
					var jcheckbox = jcheckboxes[i];
					events.push(jcheckbox.fj('jQueryBind', 'blur'));
				}
				
				return F.mergeE.apply(this, events);
			}).switchE();
			
			
			// Listen to changes
			var one_changedE = listedE.mapE(function(jcheckboxes){
				
				var events = new Array();
				for(var i=0;i<jcheckboxes.length;i++){
					var jcheckbox = jcheckboxes[i];
					
					events.push(jcheckbox.fj('clicksE').mapE(function(event) {
						// Focus field
						jQuery(event.target).focus();
						return jQuery(event.target).is(':checked');
					}));
				}
				
				return F.mergeE.apply(this, events);
			}).switchE();
			
			// Handle value set
			setE.mapE(function(values){
				// Note: We don't block set on focus for this renderer, due to the user interaction type of clicking.
				
				var jcheckboxes = jdiv_input.find('input');
				jcheckboxes.each(function(){
					var jcheckbox = jQuery(this);
					var is_checked = (values !== undefined) && 
									(values.length !== undefined) && 
									(values.indexOf(parseInt(jcheckbox.val())) > -1);
					jcheckbox.prop('checked', is_checked);
				});
				
				var display_values = new Array();
				if((values !== undefined) && (values.length !== undefined)){
					for(var key in list){
						var value = list[key];
						var index = values.indexOf(value);
						if(index > -1){
							display_values.push(key);
						}
					}
				}
				
				jdiv_readonly.html(display_values.length ? display_values.join(', ') : '&nbsp;');
			});
			
			// Get value from all fields as array
			valueE = one_changedE.mapE(function(){
				
				var values = new Array();
				var jcheckboxes = jdiv_input.find('input:checked');
				jcheckboxes.each(function(){
					values.push(parseInt(jQuery(this).val()));
				});
				
				return values;
			});
		},
		
		setValue : function(values){
			setE.sendEvent(values);
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
					
					var radio_is_disabled = (disabled === true) ? true : disabled_list === undefined ? false : (disabled_list[key] || false);
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
	var jdiv_container = jQuery('<div>');
	jdiv_container.attr('id', id);
	jdiv_container.append(jinput, jdiv_readonly);
	
	var is_disabled = undefined;
	var is_errored = undefined;
	var is_readonly = undefined;
	
	var list = {};
	var disabled_list = undefined;
	
	var focusE = null;
	var blurE = null;
	var valueE = null;
	var setE = F.receiverE();
	var update_listE = F.receiverE();
	
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
			
			update_listE.mapE(function(){
				if(focusedB.valueNow() === true){
					return;
				}
				
				var current_value = jinput.val();
				jinput.empty();
				
				for(var key in list){
					var value = list[key];
					var joption = jQuery("<option>");
					joption.attr("value", value);
					joption.text(key);
					
					if(disabled_list !== undefined){
						joption.prop("disabled", disabled_list[key] || false);
					}
					
					jinput.append(joption);
				}
				
				jinput.val(current_value);
			});
			
			setE.mapE(function(value){
				if(focusedB.valueNow() === true){
					return;
				}
				
				jinput.val(value);

				var display_value = jinput.find('option:selected').text();
				jdiv_readonly.html(display_value.length ? display_value : '&nbsp;');
				
				return value;
			});
			
			valueE = jinput.fj('extValE').mapE(function(value){
				return parseInt(value);
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