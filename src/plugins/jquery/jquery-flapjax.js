/*!
 * Copyright 2011, Jelle Verstraaten
 * Dual licensed under the MIT or GPL license.
 *
 */

(function ($, flapjax) {
    var methods = {
        'clicksE': function () {
            if (!(this instanceof $)) { return; }
            var events = [];

            var i;
            for (i = 0; i < this.length; i += 1) {
                var elm = this[i];
                events.push(flapjax.clicksE(elm));
            }

            return flapjax.mergeE.apply({}, events);
        },
        'extEvtE': function (eventName, callbackReturn) {
            if (!(this instanceof $)) { return; }
            var events = [];
            var i;
            for (i = 0; i < this.length; i += 1) {
                var elm = this[i];
                events.push(flapjax.extractEventE(elm, eventName, false, callbackReturn));
            }

            return flapjax.mergeE.apply({}, events);
        },
        'extValB': function () {
            if (!(this instanceof $) || this.length < 1) { return; }
            return flapjax.extractValueB(this.get(0));
        },
        'extValE': function () {  
            if (!(this instanceof $)) { return; }
            var events = [];

            var i;
            for (i = 0; i < this.length; i += 1) {
                var elm = this[i]; 
                events.push(flapjax.extractValueE(elm));
            }

            return flapjax.mergeE.apply({}, events);
        },
        'jQueryBind': function (eventName) {       
            if (!(this instanceof $)) { return; }
            var eventStream = F.receiverE();
            //alert('Binding to: '+eventName);
            this.bind(eventName, function (e) {
               //alert('BIND');
                eventStream.sendEvent(arguments.length > 1 ? arguments : e);
            });
            
            return eventStream;
        },
        'liftB': function (fn) {
            if (!(this instanceof $) || this.length < 1) { return; }
            return this.fj('extValB').liftB(fn);
        },
        'liftBArr': function (fn) {
            return this.map(function () {
                return flapjax.extractValueB(this).liftB(fn);
            });
        }
    };

    jQuery.fn.fj = function (method) {
        var args = Array.prototype.slice.call(arguments, 1);
        return methods[method].apply(this, args);
    };
})(jQuery, F);

