WIDGETS.register("PageToolbarWidget", function(instanceId, data){

	// Constants
	// ---------
	/**
	 * The amount of time to show the apply feedback before changing to default.
	 */
	this.feedbackDuration = 10000;
	
	/** Margin above the content.
	 */ 
	var marginTop = (data !== undefined && data.marginTop) ? data.marginTop : 0;
	var clearButton = jQuery('<button>', {'class':'button undo undo_selected', title: 'Clear changes for selected', type:'button'}).text('Clear');
	// Update Options
	// --------------
	/**
	 * Forces the page toolbar to redraw, in cases where DOM has not updated.
	 */
	this.update = function(){
		style_updatedE.sendEvent();
	};
	
	// Limit Options
	// -------------
	
	this.toggleAddOption = function(show_hide){
		show_hide = (show_hide === undefined) || show_hide;
		jQuery('#page_toolbar_' + instanceId).find('.add').toggle(show_hide);
		style_updatedE.sendEvent();
	};
	
	this.toggleDeleteOption = function(show_hide){
		show_hide = (show_hide === undefined) || show_hide;
		jQuery('#page_toolbar_' + instanceId).find('.delete').toggle(show_hide);
		jQuery('#page_toolbar_' + instanceId).find('.delete').next('.button_spacer_vertical').toggle(show_hide);
		style_updatedE.sendEvent();
	};
	
	this.toggleToolbarOptions = function(show_hide){
		show_hide = (show_hide === undefined) || show_hide;
		jQuery('#page_toolbar_' + instanceId).toggle(show_hide);
		style_updatedE.sendEvent();
	};
	
	// Disable Options
	// ---------------
	this.setAddDisabled = function(disabled, tooltip){
		if(disabled === undefined){
			disabled = true;
		}
		var jAdd = jQuery('#page_toolbar_' + instanceId).find('.add');
		jAdd.toggleClass('disabled', disabled);
		jAdd.prop('disabled', disabled);
		jAdd.prop('title', (tooltip === true || tooltip === false) ? '' : tooltip);
	};
	
	this.setUndoDisabled = function(disabled){
		if(disabled === undefined){
			disabled = true;
		}
		var jUndo = jQuery('#page_toolbar_' + instanceId).find('.undo');
		jUndo.toggleClass('disabled', disabled);
		jUndo.prop('disabled', disabled);
	};
	
	this.setDeleteDisabled = function(disabled){
		if(disabled === undefined){
			disabled = true;
		}
		var jDelete = jQuery('#page_toolbar_' + instanceId).find('.delete');
		jDelete.toggleClass('disabled', disabled);
		jDelete.prop('disabled', disabled);
	};
	
	this.setApplyDisabled = function(disabled){
		if(disabled === undefined){
			disabled = true;
		}
		var jApply = jQuery('#page_toolbar_' + instanceId).find('.apply');
		jApply.toggleClass('disabled', disabled);
		jApply.prop('disabled', disabled);
	};
	
	// Style Options
	// -------------
	this.setUndoStyle = function(undoAll){
		var jUndo = jQuery('#page_toolbar_' + instanceId).find('.undo')
		.attr('title', undoAll ? 'Clear all changes' : 'Clear changes for selected')
		.toggleClass('undo_selected', !undoAll);
		clearButton.text(undoAll ? 'Clear All' : 'Clear');
	};
	
	// Error Options
	// -------------
	var style_updatedE = F.receiverE();
	var set_feedbackE = F.receiverE();
	
	this.setErrorCount = function(count){
		if(count > 0){
			jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_errors').show();
			jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_error_count').text('x' + count);
		}else{
			jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_errors').hide();
		}
		style_updatedE.sendEvent();
	};
	
	// Feedback Options
	// ----------------
	this.setFeedbackSuccess = function(){
		set_feedbackE.sendEvent('success');
	};
	
	this.setFeedbackError = function(){
		set_feedbackE.sendEvent('error');
	};
	
	this.setFeedbackUpdating = function(){
		set_feedbackE.sendEvent('updating');
	};
	
	this.setFeedbackDefault = function(){
		set_feedbackE.sendEvent('default');
	};
	
	// Button Click Events
	// -------------------
	this.getAddClickE = function(){
		return jQuery('#page_toolbar_' + instanceId).find('.add').fj('extEvtE', 'mouseup').filterE(function(event){
			event.stopImmediatePropagation();
			return !jQuery('#page_toolbar_' + instanceId).find('.add').hasClass('disabled');
		});
	};
	
	this.getUndoClickE = function(){
		return jQuery('#page_toolbar_' + instanceId).find('.undo').fj('extEvtE', 'mouseup').filterE(function(event){
			event.stopImmediatePropagation();
			var result = !jQuery('#page_toolbar_' + instanceId).find('.undo').hasClass('disabled');
			return result;
		});
	};
	
	this.getDeleteClickE = function(){
		return jQuery('#page_toolbar_' + instanceId).find('.delete').fj('extEvtE', 'mouseup').filterE(function(event){
			event.stopImmediatePropagation();
			return !jQuery('#page_toolbar_' + instanceId).find('.delete').hasClass('disabled');
		});
	};
	
	this.getApplyClickE = function(){
		return jQuery('#page_toolbar_' + instanceId).find('.apply').fj('extEvtE', 'mouseup').filterE(function(event){
			event.stopImmediatePropagation();
			return !jQuery('#page_toolbar_' + instanceId).find('.apply').hasClass('disabled');
		});
	};
	
	// Position Options
	// ----------------
	this.setMarginTop = function(top){
		marginTop = top;
	};
	
	// General Widget
	// --------------
	this.load = function(){
		
		var jtoolbar = jQuery('#page_toolbar_' + instanceId);
		var jparent = jtoolbar.parent();
		
		// Set default
		jtoolbar.find('.page_toolbar_errors').hide();
		jparent.css('position', 'relative');
		
		var feedback_do_timeoutE = set_feedbackE.mapE(function(value){
			var do_timeout = false;
			
			// Set style according to what is set
			switch(value){
			case 'updating':
				var jdiv = jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_feedback');
				jdiv.toggleClass('success', false);
				jdiv.toggleClass('error', false);
				jdiv.toggleClass('updating', true);
				break;
			case 'success':
				var jdiv = jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_feedback');
				jdiv.toggleClass('success', true);
				jdiv.toggleClass('error', false);
				jdiv.toggleClass('updating', false);
				do_timeout = true;
				break;
			case 'error':
				var jdiv = jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_feedback');
				jdiv.toggleClass('success', false);
				jdiv.toggleClass('error', true);
				jdiv.toggleClass('updating', false);
				do_timeout = true;
				break;
			default:
				var jdiv = jQuery('#page_toolbar_' + instanceId).find('.page_toolbar_feedback');
				jdiv.toggleClass('success', false);
				jdiv.toggleClass('error', false);
				jdiv.toggleClass('updating', false);
			}
			
			return do_timeout;
		});
		
		// Store feedback state
		var feedback_do_timeoutB = feedback_do_timeoutE.startsWith(false);
		
		// If timeout enabled, wait feedbackDuration then if still feedback_do_timeoutB - go to default.
		var set_to_defaultE = feedback_do_timeoutE.filterFalseE().calmE(this.feedbackDuration).snapshotE(feedback_do_timeoutB).filterFalseE();
		set_to_defaultE.mapE(function(){
			set_feedbackE.sendEvent('default');
		});
		
		var window_offset = undefined;
		var update_eventsE = F.mergeE(jQuery('#content').fj('jQueryBind', 'scroll'), style_updatedE, feedback_do_timeoutE);
		var toolbar_widthE = update_eventsE.mapE(function(){
			
			if(window_offset === undefined){
				window_offset = jQuery('#content').offset();
			}
			var window_top = window_offset !== undefined ? window_offset.top : 0;
			
			if(jparent.length > 0){
				var parent_height = jparent.outerHeight();
				var parent_offset = jparent.offset();
				var parent_top = parent_offset !== undefined ? parent_offset.top : 0;
				var toolbar_height = jtoolbar.outerHeight(true);
				
				var offset = -1 * (parent_top - (window_top + marginTop));
				if(offset < 0){
					offset = 0;
				}
				
				if(offset > (parent_height - toolbar_height)){
					offset = Math.max(0, (parent_height - toolbar_height));
				}
				
				// If height of toolbar exceeds content height, make toolbar relative
				var jcontent = jparent.find('.page_toolbar_content');
				if(jcontent.length > 0){
					var content_height = 0;
					
					jcontent.each(function(){
						var jelement = jQuery(this);
						if(jelement.is(":visible")){
							content_height += jelement.outerHeight();
						}
					});
					
					if(toolbar_height > content_height){
						jtoolbar.css('position', 'relative');
						jtoolbar.css('top', 0);
					}else{
						jtoolbar.css('position', 'absolute');
						jtoolbar.css('top', offset);
					}
				}
			}
			
			// If not visible return negative width
			if(!jtoolbar.is(":visible")){
				return -1;
			}
			
			// Else if visible return width of toolbar
			return jtoolbar.outerWidth();
		});
		
		toolbar_widthE.filterE(function(value){
			return !isNaN(value) && value !== 0;
		}).filterRepeatsE().mapE(function(newWidth){
			
			// Adjust margin left so that toolbar isn't over content
			// This is dynamic as button sizes in toolbar now change due to text length.
			if(jparent.length > 0){
				var jcontent = jparent.find('.page_toolbar_content');
				jcontent.css('margin-left', newWidth + 10);
			}
		});
		
		// Goto 1st error when clicked
		jQuery(".page_toolbar_errors").click(function(){
			var errorTag = jQuery(".errored_tag").first().find(".errored_tag_container").get(0);
			if(errorTag !== undefined){
				errorTag.scrollIntoView(true);
			}
		});
	};
	this.loader = this.load;
	
	this.build = function(){ 
		var jdiv_container = jQuery('<div>', {'id': 'page_toolbar_' + instanceId, 'class':'page_toolbar_container'});
		
		jdiv_container.append(
				jQuery('<button>', {'class':'button add', title: 'Add new', type:'button'}).text('Add'),
				jQuery('<br>'),
				jQuery('<button>', {'class':'button delete', title: 'Remove selected', type:'button'}).text('Remove'),
				jQuery('<div>', {'class':'button_spacer_vertical'}),
				clearButton,
				jQuery('<div>', {'class':'button_spacer_vertical'}),
				jQuery('<div>', {'class': 'page_toolbar_feedback'}).append(
						jQuery('<button>', {'class':'button apply sends', title: 'Apply changes to device', type:'button'}).text('Apply')
				),
				jQuery('<div>', {'class':'page_toolbar_errors'}).append(
						jQuery('<div>', {'class':'page_toolbar_error_count'})
				)
		);
		
		return jdiv_container;
	};
	
	this.destroy = function(){
    };
}); 
