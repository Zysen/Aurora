var STATS = (function(stats, widgets){
	if(stats.WIDGETS==undefined){
		stats.WIDGETS = {};
	}
	stats.WIDGETS.MemoryUsage = function(instanceId, data, purgeData){
		var container = document.createElement("div");
		container.id = instanceId+"_chart";
		container.style.width = "100%";
		container.style.height = "100%";
		return {
			build:function(){return container;},
			load:function(){
				var chartOptions = {
                    title:{
                        text: "Memory Usage",
                        fontFamily: "arial black"
        
                    },
                    legend: {
                        verticalAlign: "bottom",
                        horizontalAlign: "center"
                    },
                    toolTip:{
                        enabled: true
                    },
                    theme: "theme1",
                    data: [{        
                        type: "pie",
                        indexLabelFontFamily: "Garamond",       
                        indexLabelFontSize: 20,
                        indexLabelFontWeight: "bold",
                        indexLabelFontColor: "MistyRose",       
                        indexLabelLineColor: "darkgrey", 
                        indexLabelPlacement: "inside",
                        showInLegend: true
                    }
                    ]
                };
				var chart = new CanvasJS.Chart(container.id,chartOptions);
				var memoryUsageE = DATA.requestE(instanceId, "AURORA_MEM_USAGE").blindE(500).mapE(function(memoryUsage){
					var used = memoryUsage.total-memoryUsage.free;
					var usedMem = Math.ceil((used/memoryUsage.total)*100);
					var availableMem = Math.floor((memoryUsage.free/memoryUsage.total)*100);
					chartOptions.data[0].dataPoints = [
                        {  y: usedMem, indexLabel: usedMem+"%" , name: "Used", legendMarkerType: "triangle"},
                        {  y: availableMem, indexLabel: availableMem+"%", name: "Available", legendMarkerType: "square"}];
                    chart.render();    
				});				
				
			},
			destroy:function(){
				LOG.create("Releasing widget "+instanceId);
				DATA.release(instanceId, "AURORA_MEM_USAGE");
				DOM.remove(container);
			}
		}
	};
	widgets.register("MemoryUsage", stats.WIDGETS.MemoryUsage);
	
	stats.WIDGETS.MemoryUsageHistory = function(instanceId, data, purgeData){
        var container = document.createElement("div");
        container.id = instanceId+"_chart";
        container.style.width = "100%";
        container.style.height = "300px";
        return {
            build:function(){return container;},
            load:function(){
                var chartOptions = {
                  title:{
                  text: "Memory Usage"
                  },
                  axisY:{},
                   data: [
                  {
                    type: "line",
                    dataPoints: []
                  }
                  ]
                };
                var chart = new CanvasJS.Chart(container.id,chartOptions);
                var memoryUsageE = DATA.requestE(instanceId, "AURORA_MEM_USAGE").blindE(1000).mapE(function(memoryUsage){
                    var used = memoryUsage.total-memoryUsage.free; 
                    chartOptions.data[0].dataPoints.push({ x: new Date(), y: used });
                    if(chartOptions.data[0].dataPoints.length>100000){
                        chartOptions.data[0].dataPoints.shift();
                    }
                    chartOptions.axisY.maximum = memoryUsage.total;
                    chart.render();    
                });             
                
            },
            destroy:function(){
                LOG.create("Releasing widget "+instanceId);
                DATA.release(instanceId, "AURORA_MEM_USAGE");
                DOM.remove(container);
            }
        }
    };
    widgets.register("MemoryUsageHistory", stats.WIDGETS.MemoryUsageHistory);
	
	
	stats.WIDGETS.UpTime = function(instanceId, data, purgeData){
		var container = document.createElement("div");
		return {
			build:function(){return container;},
			load:function(){
				DATA.requestE(instanceId, "AURORA_UPTIME").mapE(function(uptime){
					container.innerHTML = instanceId+"_"+uptime;
				});
			},
			destroy:function(){
				DATA.release(instanceId, "AURORA_UPTIME");
				DOM.remove(container);
			}
		}
	};
	widgets.register("UpTime", stats.WIDGETS.UpTime);
	
	stats.WIDGETS.LoadAverage = function(instanceId, data, purgeData){
		var container = document.createElement("div");
		return {
			build:function(){return container;},
			load:function(){
				DATA.requestE(instanceId, "AURORA_LOAD_AVERAGE").mapE(function(load){
					container.innerHTML = load[0]+" "+load[1]+" "+load[2];
				});
			},
			destroy:function(){
				DATA.release(instanceId, "AURORA_LOAD_AVERAGE");
				DOM.remove(container);
			}
		}
	};
	widgets.register("LoadAverage", stats.WIDGETS.LoadAverage);
	
	
	stats.WIDGETS.MousePosition = function(instanceId, data, purgeData){
		var container = document.createElement("div");
		return {
			build:function(){return container;},
			load:function(){
				F.mouseB(document).cleanUp(purgeData).liftB(function(mousePos){
					container.innerHTML = JSON.stringify(mousePos);
				});
			},
			destroy:function(){
				LOG.create("Releasing widget "+instanceId);
				DOM.remove(container);
			}
		}
	};
	widgets.register("MousePosition", stats.WIDGETS.MousePosition);
	
	stats.WIDGETS.StatisticUpdateRate = function(instanceId, data, purgeData){
		var slider = document.createElement("input");
		slider.type = "range";
		slider.min = 1;
		slider.max = 2000;
		return {
			build:function(){return slider;},
			load:function(){
				var rateBI = DATA.requestB(instanceId, "STATS_RATE");
				rateBI.liftB(function(rate){
					slider.value = rate;
				});
				F.extractValueE(slider).cleanUp(purgeData).filterRepeatsE().mapE(function(rate){//.calmE(1000)
					rateBI.sendEvent(parseInt(rate));
				});
			},
			destroy:function(){
				DATA.release(instanceId, "STATS_RATE");
				DOM.remove(slider);
			}
		}
	};
	widgets.register("StatisticUpdateRate", stats.WIDGETS.StatisticUpdateRate);
	return stats;
})(STATS || {}, WIDGETS);
