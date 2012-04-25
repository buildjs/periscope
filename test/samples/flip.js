/*! flip - v0.2.0 - 2012-04-14
* https://github.com/DamonOehlman/flip
* Copyright (c) 2012 Damon Oehlman; Licensed MIT */

var _flippers = {};

var reTrailingExtension = /\.\w+$/,
    reLeadingDot = /^\./,
    reLeadingHash = /^\#/,
    convertedUrls = {},
    reValidAttr = /^data\-(.*)$/i;
    
function _eventPass(results, promises) {
    // mark the route as valid if we have route results
    var valid = results && results.length;

    // now do a more detailed check of those results
    for (var ii = 0; valid && ii < results.length; ii++) {
        if (typeof results[ii] != 'undefined') {
            // update the routed flag
            valid = valid && results[ii];

            // add to the list of current promises
            promises.push(results[ii]);
        } // if
    } // for
    
    return valid;
}
    
function _getTargetUrl(target) {
    return target.getAttribute('href') || 'home';
}

function _urlToPageName(url) {
    if (! convertedUrls[url]) {
        convertedUrls[url] = url
            // strip the url extension
            .replace(reTrailingExtension, '')
            // replace slashes with dots
            .replace(/\//g, '.')
            // strip the leading dot
            .replace(reLeadingDot, '');
    }
    
    return convertedUrls[url];
} // _urlToPageName

function _makeTapHandler(flipper) {
    return function(evt) {
        var target = evt.target || evt.srcElement,
            routeData;

        // if we have a text node, then iterate up the tree
        while (target && typeof target.href == 'undefined') {
            target = target.parentNode;
        } // while
        
        // get the route for the target
        routeData = flipper.isRoute(target, evt);
        
        // if we have a path, then activate the path and prevent the default action
        if (routeData.valid) {
            evt.preventDefault();
            
            // activate the specified route
            flipper.activate(routeData.route, routeData.promises);
        }
    };
} // _makeTapHandler

/**
The `whenOk` function is used to parse results from triggering an eve event
and determining whether the event has handled ok.  If an event returns undefined,
true or a function then the results may be ok.
*/
function _whenOk(eveResults, promises, callback, errback) {
    var ok = true;
        
    // ensure eve results is an array
    // iterate through the results
    for (var ii = 0; eveResults && ii < eveResults.length; ii++) {
        ok = ok && (typeof eveResults[ii] == 'undefined' || eveResults[ii]);
        if (ok && typeof eveResults[ii] != 'undefined') {
            promises.push(eveResults[ii]);
        } // if
    } // for
    
    // if the results are ok, then process
    if (ok) {
        when.all([].concat(promises), callback, errback);
    } // if
} // whenOk

function Route(url, flipper, element) {
    var sourceData = element.dataset, key,
        section;
    
    // ensure the url is valid
    if (url === '' || url === '/') {
        url = 'home';
    } // if
    
    // if we don't have dataset data, then look through the attributes
    if (! sourceData) {
        sourceData = {};
        
        // get the state for the section
        for (key in element.attributes) {
            if (reValidAttr.test(key)) {
                sourceData[RegExp.$1] = element.attributes[key];
            } // if
        } // for
    } // if
    
    // copy the source data to the actual data
    this.data = {};
    for (key in sourceData) {
        this.data[key] = sourceData[key];
    }
    
    // initialise the url
    this.url = url;
    this.regex = new RegExp('^' + url);
    this.element = element;
    
    // create the page name for the element
    this.pageName = _urlToPageName(url);
    
    // save a reference to the flipper
    this.flipper = flipper;

    // make an event handler that flags this route as being handled
    this.flipper.on('flip.to.' + this.pageName, function() {
        return true;
    });
}


function Flipper(element, opts) {
    // initialise opts
    opts = opts || {};
    opts.title = opts.title || 'Untitled App';
    
    // if the id is an object, then 
    if (typeof element == 'string' || element instanceof String) {
        element = qsa('#' + element.replace(reLeadingHash, ''))[0];
    } // if
    
    // default to the document body if the element isn't specified
    this.element = element || document.body;
    this.id = this.element.id || ('flipper_' + new Date().getTime());

    // initialise routing information
    this.routes = [];
    this.activeRoute = null;
    this.defaultRoute = null;
    
    // initialise the events
    this.events = {
        activating: 'flip.activating',
        changed: 'flip.changed',
        init: 'flip.init'
    };
    
    // initialise
    this.init();
}

Flipper.prototype.activate = function(route, promises, sourceEvent) {
    var flipper = this,
        activated,
        activationPromises = [];
    
    // if the route is a string, then look for the route that matches
    if (typeof route == 'string' || route instanceof String) {
        route = this.findRoute(route);
    }
    
    if (route && route.element) {
        // initialise update state to a valid value
        // updateState = typeof updateState == 'undefined' || updateState;

        // set the section margin top to offset it's position on the page
        // section.style['margin-top'] = '-' + section.offsetTop + 'px';

        when.all(promises || [], function() {
            // remove the active flag from all of the sections
            classtweak('.flip-active', '-flip-active', flipper.element);

            // fire the activating event and check the result
            // in the same way as the flip.to events 
            activated = _eventPass(
                eve(flipper.events.activating, flipper, route, flipper.activeRoute, sourceEvent),
                activationPromises
            );
            
            // if (and once) activation is successful, continue
            when.all([activated].concat(activationPromises), function() {
                // make the new section active
                classtweak(route.element, '+flip-active');

                // update the document title
                // document.title = data.title || document.title;

                // trigger the activated event
                eve(flipper.events.changed, flipper, route, flipper.activeRoute, sourceEvent);

                // update the activate section variable
                flipper.activeRoute = route;
            });
        });
    }
};

Flipper.prototype.findRoute = function(url) {
    // iterate through the routables and look for a matching route
    for (var ii = 0; ii < this.routes.length; ii++) {
        if (this.routes[ii].regex.test(url)) {
            return this.routes[ii];
        } // if
    } // for
    
    return undefined;
};

Flipper.prototype.init = function() {
    var flipper = this,
        key, elements, ii,
        handleTap = _makeTapHandler(this),
        defaultElement;
    
    // if the element has an id, then include the events in the key
    if (this.element.id) {
        for (key in this.events) {
            this.events[key] += '.' + this.element.id;
        } // for
    } // if
    
    // add the container class to the container element
    classtweak(this.element, '+flipper');
    
    // find the routable elements
    elements = qsa('*[data-route]', this.element);
    
    // iterate through the routables and defined handlers
    for (ii = 0; ii < elements.length; ii++) {
        this.routes.push(new Route(elements[ii].getAttribute('data-route'), this, elements[ii]));
    } // for
    
    // bind event handlers
    this.element.addEventListener('touchstart', handleTap, false);
    this.element.addEventListener('click', handleTap, false);
    
    /*
    // if the element is the document body, then add to the html element also
    if (element === document.body) {
        classtweak(element.parentNode, '+flipper');
    } // if
    */
    
    // look for a default element
    defaultElement = qsa('.flip-active', this.element).concat(
        qsa('[data-route="/"]', this.element), 
        qsa('section, .section', this.element))[0];
        
    // if we have default element, then create a default route
    if (defaultElement) {
        var route = defaultElement.getAttribute('data-route');
        this.defaultRoute = route ? new Route(route, this, defaultElement) : null;
    }
    
    // trigger the init event
    eve(this.events.init, this, this.element);

    // activate the first selected element
    this.activate(this.defaultRoute);
    
    // add the container class to the container element
    setTimeout(function() {
        classtweak(flipper.element, '+flip-ready');
    }, 10);
};

Flipper.prototype.isRoute = function(target, sourceEvent) {
    var valid = false,
        path, routeResults, eventName,
        route = this.activeRoute,
        promises = [];
    
    if (target && target.href) {
        // determine the path
        path = _getTargetUrl(target);
        eventName = 'flip.to.' + _urlToPageName(path) + '.' + this.id;
        
        // if we have an active section, and the path matches the target path, then we have routed
        valid = route && route.path === path;
        
        // if this isn't a match for the current path, check if anything matches
        if (! valid) {
            // get the route
            route = this.findRoute(path);
            
            // check the route results (can we proceed?)
            // TODO: consider firing the flip.to event regardless
            routeResults = route ? eve(eventName, this, route, this.activeRoute, sourceEvent) : null;

            // check event validity
            valid = _eventPass(routeResults, promises);
        }
    } // if
    
    return {
        valid: valid,
        route: route,
        promises: promises
    };    
};

Flipper.prototype.on = function(evtName, handler) {
    eve.on(evtName + '.' + this.id, handler);
};

function flip(element, opts) {
    var flipper = new Flipper(element, opts);
    
    // register the flipper in the list of flippers
    _flippers[flipper.id] = flipper;
    
    // return the new flipper
    return flipper;
}

flip.get = function(id) {
    return _flippers[id];
};