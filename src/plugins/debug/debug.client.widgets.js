var DEBUG = (function(debug, widgets){
	if(debug.WIDGETS==undefined){
		debug.WIDGETS = {};
	}
	debug.WIDGETS.PageDeflator = function(){
		var rightButton = DOM.create("button", undefined, undefined, "Deflate Right");
		var leftButton = DOM.create("button", undefined, undefined, "Deflate Left");
		var container = DOM.create("div");
		container.appendChild(leftButton);
		container.appendChild(rightButton);
		return {
			build:function(){return container;},
			load:function(){
				F.clicksE(rightButton).mapE(function(click){
					widgets.deflateWidgets(DOM.get("right"));
				});
				F.clicksE(leftButton).mapE(function(click){
					widgets.deflateWidgets(DOM.get("left"));
				});
			},
			destroy:function(){}
		}
	};
	widgets.register("PageDeflator", debug.WIDGETS.PageDeflator);

	return debug;
})(DEBUG || {}, WIDGETS);
