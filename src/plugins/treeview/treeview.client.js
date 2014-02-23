var TREEVIEW = (function(treeview) {
    if(treeview.widgets===undefined){
        treeview.widgets = {};
    }
    
    treeview.buildAndUpdateTree = function(instanceId, domParent, node, expandAll){
        expandAll = expandAll==undefined?false:expandAll;
        var nodeId = instanceId+"_"+node.index;
        var childrenNodeId = instanceId+"_"+node.index+"_children";
        var descriptionNodeId = instanceId+"_"+node.index+"_description";
        var iconNodeId = instanceId+"_"+node.index+"_icon";
        var listIconId = instanceId+"_"+node.index+"_list_icon";
        var clickContainerId = instanceId+"_"+node.index+"_clickContainer";

        var childrenExist = node.children&&node.children.length!=0;
        if(DOM.get(nodeId)==undefined && node.skip===undefined){

            var domNode = DOM.create("li", nodeId, "treeView_domNode");
            
            var tableContainer = DOM.createAndAppend(domNode, "div", undefined, "treeView_tableContainer");
            var innerContainer = DOM.createAndAppend(tableContainer, "div", clickContainerId);
            var listIcon = DOM.createAndAppend(innerContainer, "span", listIconId,(node.expanded || expandAll)?"treeView_open":"treeView_closed", "&nbsp;");
            
            var iconContainer = DOM.createAndAppend(innerContainer, "div", undefined, "treeView_iconContainer");
            var domIcon = DOM.createAndAppend(iconContainer, "img", iconNodeId, "treeView_icon");
            
            if(node.icon){
                domIcon.src = node.icon;
            }
            if(node.iconDimensions!=undefined){
                domIcon.style.width = node.iconDimensions.width+"px";
                domIcon.style.height = node.iconDimensions.height+"px";
            }
            
            var descriptionContainer = DOM.createAndAppend(innerContainer, "span", descriptionNodeId, "treeView_description", node.description);            
            var domChildren = DOM.createAndAppend(domNode, "ul", childrenNodeId, "treeView_list");
            domChildren.style.display = (node.expanded || expandAll)?"block":"none";
            domParent.appendChild(domNode);
        }
        else if(node.skip===undefined){
            var domNode = DOM.get(descriptionNodeId);
            if(domNode.innerHTML!=node.description){
                domNode.innerHTML = node.description;
            }
            
            var domIcon = DOM.get(iconNodeId);
            if(node.icon){
                domIcon.src = node.icon;
            }
            
            var domChildren = DOM.get(childrenNodeId);
            var listIcon = DOM.get(listIconId);
            var innerContainer = DOM.get(clickContainerId);
        }
        if(innerContainer){
            innerContainer.className = (childrenExist && (!expandAll))?"treeview_nodeOpen":"treeview_nodeClosed";   
            //listIcon.className = ((!expandAll) && (node.children&&node.children.length>0))?listIcon.className:"treeView_hidden";
            listIcon.style.display = (childrenExist && (!expandAll))?"table-cell":"none";
        }
        else{
            domChildren = domParent;
        }
        
        
        
        for(cIndex in node.children){
            treeview.buildAndUpdateTree(instanceId, domChildren, node.children[cIndex], expandAll);
        }
    };
    
    treeview.styleTreeNode = function(node){
        var nodes = node.children('li');
        nodes.find('.last').removeClass('last');
        nodes.last().addClass('last');
        
        nodes.children('ul').each(function(index){
            treeview.styleTreeNode(jQuery(this));
        });
    };
    
    
   treeview.widgets.TreeViewWidget = function(instanceId, data){ 
        function findParentWithClass(node, className){
            if(node.className.contains(className)){
                return node;
            }
            else{
                return findParentWithClass(node.parentElement, className);
            }
            return false;
        }
        function pruneTree(instanceId, node, matchingNode){
            if(matchingNode==undefined){
                return;
            }
            if(node.index!=matchingNode.index){
                log("Scan out of sync");
                log(node.description+" "+matchingNode.description);
                return;
            }
            for(var index in matchingNode.children){
                //search for child with index, dont use array index
                var foundNode = false;
                for(var cIndex in node.children){
                    if(node.children[cIndex].index===matchingNode.children[index].index){
                        foundNode = node.children[cIndex];
                        break;
                    }
                }
                if(!foundNode){
                    DOM.remove(DOM.get(instanceId+"_"+matchingNode.children[index].index));
                }
                else{
                    pruneTree(instanceId, foundNode, matchingNode.children[index]);
                }
            }
        }
                
        var container = DOM.create("ul", undefined, "treeView_list");
        this.load = function(entityAlarmsB){
            var lastState = undefined;
            var clickEventsE = F.liftB(function(root){
                if(!good()){
                    return F.zeroE();
                }
                pruneTree(instanceId, root, lastState)
                treeview.buildAndUpdateTree(instanceId, container, root); 
                treeview.styleTreeNode(jQuery('.treeView_list').first());
                
                lastState = OBJECT.clone(root);
                //Build Click Events
                var eventArray = [];
                var matchingElements = DOM.getElementsByClassName("treeView_domNode", container);
                
                LOG.create("matchingElements");
                LOG.create(matchingElements);
                
                for(var index in matchingElements){
                    eventArray.push(F.clicksE(matchingElements[index]));
                }
                return F.mergeE.apply({}, eventArray);
            }, entityAlarmsB);
            //TODO: Fix flapjax. Do not merge clickEventsE and clickedDescriptionsE. The constantB for lastState will break!!!! (Flapjax Bug?)
            var clickedDescriptionsE = clickEventsE.changes().switchE();
            
            clickedDescriptionsE.mapE(function(ev){                                         //.mapE(function(clickEvent){return clickEvent.target;}).filterRepeatsE()
                DOM.stopEvent(ev);
                
                LOG.create("clickedDescriptionsE");
                LOG.create(ev.target);
                
                var parent = findParentWithClass(ev.target, "treeView_domNode");
                var listIcon = DOM.get(parent.id+"_list_icon");
                var childrenList = DOM.get(parent.id+"_children");
                if(childrenList && childrenList.children && childrenList.children.length>0){
                    if(childrenList.style.display==="none"){
                        childrenList.style.display = "block";
                        listIcon.className = "treeView_open";
                    }
                    else{
                        childrenList.style.display = "none";
                        listIcon.className = "treeView_closed";
                    }
                }
            });
            
        };
        this.build = function(){
            return container;
        };
        this.destroy = function(){
            
        };
    };
    return treeview;
}(TREEVIEW || {}));
