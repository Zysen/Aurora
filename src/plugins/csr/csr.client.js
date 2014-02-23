var CSR = (function(csr, widgets){
    if(csr.widgets===undefined){
        csr.widgets = {};
    }

    widgets.register("Menu", function(instanceId, data, purgeData){
        var treeWidget = new TREEVIEW.widgets.TreeViewWidget(instanceId+"_tree", data);
        
        function processTree(node){
            node.expanded = true;
            if(node.children===undefined || node.children.length===0){
                node.icon = "/resources/images/application_form.png";
            }
            else{
                node.icon = "/resources/images/folder.png";
            }
            if(node.href!==undefined){
                node.description = "<a onclick=\"return changePage('/"+node.href+"');\" href=\"/"+node.href+"\">"+node.description+"</a>";
            }
            node.description = "<div class=\"side_menu_node\">"+node.description+"</div>";
            node.iconDimensions = {width: 15, height: 15};
            for(var childIndex in node.children){
                processTree(node.children[childIndex]);
            }
        }
        
        
        
        var menu = {index: 1, description: "root", skip: true, children:[
            {index: 100, description: "Status",  children:[
                {index: 101, description: "Equipment", href:"equipment"},
                {index: 102, description: "Alarms", href:"alarms"},
                {index: 103, description: "Sensors", href:"sensors"},
                {index: 104, description: "Event Log", href:"log"},
                {index: 105, description: "Reports", href:"reports"}
            ]},
            
            {index: 200, description: "System Configuration",  children:[
                {index: 201, description: "System Information", href:"admin/sysinfo"},
                {index: 202, description: "Date & Time", href:"admin/datetime"},
                {index: 203, description: "System About", href:"about"},
                {index: 204, description: "Manufacture Details", href:"mdetails"},
                {index: 205, description: "PoE Configuration", href:"ethernet/poe"},
                {index: 206, description: "Backup Power", href:"power"},
                {index: 207, description: "Admin", children:[
                    {index: 221, description: "Data Sources", href:"admin/data"},
                    {index: 222, description: "User Management", href:"admin/users"},
                    {index: 223, description: "Configuration Management", href:"admin/config"},
                    {index: 224, description: "Software Management", href:"admin/software"},
                    {index: 225, description: "License Management", href:"admin/licensing"}
                ]}
            ]},
            
            {index: 300, description: "Ethernet Configuration",  children:[
                {index: 301, description: "Port Manager", href:"ethernet/ports"}
            ]},
            
            {index: 400, description: "Radio Configuration",  children:[
                {index: 401, description: "Radio Link Configuration", href:"radio/config"},
                {index: 402, description: "Radio Link Diagnostics", href:"radio/diag"},
                {index: 403, description: "Radio Link Protection", href:"radio/prot"},
                {index: 404, description: "Radio Link Protection Diagnostics", href:"radio/prot/diag"},
            ]},
            
            {index: 500, description: "TDM Configuration",  children:[
                {index: 501, description: "Tributary Diagnostics", href:"trib/diag"}
            ]},
            
            {index: 600, description: "Statistics",  children:[
                {index: 601, description: "Interface", href:"stats/interface"},
                {index: 602, description: "Ethernet", href:"stats/ethernet"},
                {index: 603, description: "Radio Link Performance", href:"stats/rperf"},
                {index: 604, description: "Radio Link History", href:"stats/rhistory"},
                {index: 605, description: "ARP Cache", href:"stats/arp"},
                {index: 606, description: "MAC Address Table", href:"stats/mac"}
            ]}
        ]};
        
        //<div class="widget_Menu"></div>
        
        
        return {
            build:function(){
                return treeWidget.build();
            },
            load:function(){
                
                treeWidget.load(
                    F.constantB(menu).liftB(function(tree){
                        var newTree = OBJECT.clone(tree);
                        processTree(newTree);
                        return newTree;
                    })
                ); 



                $(document).ready(function () {
            
                    // Update content size and setup resize listener
                    updateMiddle2Container();
                    $(window).resize(function() {
                        updateMiddle2Container();
                    });
                    
                    // Listen for menu button click
                    $("#layout_menu_button").click(function(){
                        layout_menu_open = !layout_menu_open;
                        updateMenuContainer();
                    });                    
                });
                
                /** Handles menu hide / show
                 *
                 */
                function updateMenuContainer(){
                    
                    // Update menu button
                    if(layout_menu_open){
                        $("#layout_menu_button").removeClass("open");
                        $("#layout_menu_button").addClass("close");
                    }else{
                        $("#layout_menu_button").removeClass("close");
                        $("#layout_menu_button").addClass("open");
                    }
                
                    // Hide / Show divs
                    var animation_time = 250;
                    if(layout_menu_open){
                        $("#layout_device_name").css('display', 'block');
                        $("#layout_menu").css('display', 'block');
                        $("#layout_menu").animate({width: LAYOUT_MENU_WIDTH}, animation_time);
                        $("#layout_content").animate({marginLeft: LAYOUT_MENU_WIDTH}, animation_time);
                        $("#layout_options").animate({width: LAYOUT_MENU_WIDTH}, animation_time);
                        $("#layout_tabs").animate({marginLeft: LAYOUT_MENU_WIDTH}, animation_time);
                    }else{
                        $("#layout_menu").animate({width: 0}, animation_time, function(){ $("#layout_menu").css('display', 'none'); $("#layout_device_name").css('display', 'none'); });
                        $("#layout_content").animate({marginLeft: 0}, animation_time);
                        $("#layout_options").animate({width: 42}, animation_time);
                        $("#layout_tabs").animate({marginLeft: 42}, animation_time);
                    }
                }
                
                /** Sets the height of the content and menu container. 
                 *  This is needed so that the iframes can have a height of 100% and we can also have a footer. 
                 */
                function updateMiddle2Container() {
                    var header = $("#layout_header").height();
                    var tabs = $("#layout_middle1_container").height();
                    var footer = $("#layout_footer").height();
                    
                    var total = header + tabs + footer;
                    var page = $(window).height();
                    $("#layout_middle2_container").height(page - total);
                }
            


            },
            destroy:function(){
                treeWidget.destroy();
            }
        };
    });
    return csr;
}(CSR || {}, WIDGETS));


CSR.ENTITIES = (function(entityLib, widgets){
    if(entityLib.widgets===undefined){
        entityLib.widgets = {};
    }
    
    widgets.register("EntityTable", function(instanceId, data, purgeData){
        var tableWidget = new TABLES.WIDGETS.tableWidget(instanceId+"_TW", {}); //Create an instance of a tablewidget
        return {
            build:function(){
                return tableWidget.build();
            },
            load:function(){
                tableWidget.load(F.liftBI(function(table){
                    if(!good()){
                        return chooseSignal();
                    }
                    
                    if(!TABLES.UTIL.isTable(table)){
                        LOG.create("ERROR, Data is not a table");
                        LOG.create(table);
                        console.log(table);
                        newTable = SIGNALS.NOT_READY;
                    }
                    else{
                        var newTable = OBJECT.clone(table);
                        //LOG.create(table);
                    }
                    //var visibleColumns = ["index", "description", "containedIn"];
                    //for(var columnIndex in newTable.columnMetaData){
                    //    if(!ARRAYS.contains(visibleColumns, columnIndex)){
                   //         newTable.columnMetaData[columnIndex].visible = false;
                   //     }
                   // }
                   // TABLES.UTIL.setColumnOrder(newTable, visibleColumns); 
                    return newTable;
                },function(table){
                    return [table];
                }, DATA.requestB(instanceId, "CSR_ENTITY_TABLE")));
            },
            destroy:function(){
                DATA.release(instanceId, "CSR_ENTITY_TABLE");
                tableWidget.destroy();
            }
        };
    });
    
    return entityLib;
}(CSR.ENTITIES || {}, WIDGETS));
