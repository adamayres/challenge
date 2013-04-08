/**
 * @author Adam Ayres
 * @date 04/07/13
 * 
 * JavaScript for Stayful developer challenge.
 * 
 */
;(function(window, document) {
   
/**
 * Stayful container object
 */
var SF = {};

/**
 * Static event functions to normalize event binding
 * for adding, removing and triggering events.
 */
SF.EVENT = {
    /*
     * Add event to a HTML element
     *
     * @param {HTMLElement} element - The element to bind an event to
     * @param {String} type - The even type to bind to
     * @param {Function} fn - Callback function
     */
    addEvent: function(element, type, fn) {        
        if (element.attachEvent) {
            element["e" + type + fn] = fn;
            element[type + fn] = function() {
                element["e" + type + fn](window.event);
            };
            element.attachEvent('on' + type, element[type + fn]);
        }
        else {
            element.addEventListener(type, fn, false);
        }
    },
    /*
     * Remove event from a HTML element
     *
     * @param {HTMLElement} element - The element to bind an event to
     * @param {String} type - The even type to bind to
     * @param {Function} fn - Callback function
     */
    removeEvent: function(element, type, fn) {
        if (element.detachEvent) {
            element.detachEvent("on" + type, element[type + fn]);
            element[type + fn] = null;
        } else {
            element.removeEventListener(type, fn, false);
        }
    },
    /*
     * Trigger an event from a HTML element
     *
     * @param {HTMLElement} element - The element to bind an event to
     * @param {String} event - Event name to trigger
     */
    triggerEvent: function(element, event) {
        if (document.createEventObject) {        
            element.fireEvent(event, document.createEventObject());
        } else {        
            var eventObj = document.createEvent('HTMLEvents');
            eventObj.initEvent(event, true, true);
            element.dispatchEvent(eventObj);
        }
    }
};  

/**
 * Static CSS functions to add and remove css 
 * classes from elements.
 */
SF.CSS = {
    /*
     * Add a CSS class to a HTML element
     *
     * @param {HTMLElement} element - The element to add a class name to
     * @param {String} newClass - The classname to add
     */
    addClass: function(element, newClass) {
        var clazz, classes, newClasses;

        classes = element.className.split(/\s+/),
        newClasses = [];

        while (classes.length) {
            clazz = classes.shift();
            if (clazz && clazz != newClass) {
                newClasses.push(clazz);
            }
        }

        newClasses.push(newClass);
        element.className = newClasses.join(" ");
    },
    /*
     * Add a CSS class to a HTML element
     *
     * @param {HTMLElement} element - The element to remove a class name from
     * @param {String} oldClass - The classname to remove
     */
    removeClass: function(element, oldClass) {
        var clazz, classes, newClasses;

        classes = element.className.split(/\s+/),
        newClasses = [];

        while (classes.length) {
            clazz = classes.shift();
            if (clazz && clazz != oldClass) {
                newClasses.push(clazz);
            }
        }

        element.className = newClasses.join(" ");
    }
};

/**
 * Static animation functions, currently only supports fade.
 * 
 * NOTE: I would have used CSS3 animations but they are not yet 
 * fully supported. A better approach would be to use the CSS3
 * transitions and shim with JavaScript for browsers that 
 * do not support it using cabality detection via modenizr.
 */ 
SF.ANIMATION = {
    /*
     * Fades an HTML element using opacity
     *
     * @param {HTMLElement} element - The HTML element to fade
     * @param {Number} start - The starting opacity, should be between 0 - 1
     * @param {Number} end - The ending opacity, should be between 0 - 1
     * @param {Number} duration - The number of MS to run the anmiation over
     */
    fade: function(element, start, end, duration) {
        var range = end - start;
        var goingUp = end > start;
        var steps = duration / 20;   // arbitrarily picked 20ms for each step
        var increment = range / steps;
        var current = start;
        var more = true;
        function next() {
            current = current + increment;
            if (goingUp) {
                if (current > end) {
                    current = end;
                    more = false;
                }
            } else {
                if (current < end) {
                    current = end;
                    more = false;
                }
            }
            element.style.opacity = current;
            if (more) {
                setTimeout(next, 20);
            }
        }
        next();
    }
}; 

/**
 * Singleton object responsible for managing the loading and swapping
 * of background images. 
 */
SF.BackgroundImageLoader = function() {
    var loadedFirstImage, container, activeElement, activeNumber, 
        activeCity, loadedImages, preloaded, interval;
    
    /*
     * Flag to determine if the main image has loaded.
     * We use this to determine when we can unhide the
     * page to prevent FOUC
     */
    loadedFirstImage = false;    
    
    /*
     * Cache of divs where the background images will be
     * displayed from. Items in this list are guaranteed  
     * to have their images already loaded.
     */
    loadedImages = {};
    
    /*
     * Flag if the preloading of the images has started.
     */
    preloaded = false;
    
    /*
     * Workaround to make the onload event for images work
     * across all browsers. IE in particular will not 
     * trigger the onload even if the image is already in 
     * the local cache. We use a blank image to swap
     * it back and forth which will then trigger the event.
     *
     * @param {HTMLElement} image - The image element to fix.
     */
    function fixImageLoadEvent(image) {
        var src;        
        
        if (image.complete && image.naturalWidth !== 0 && loadedFirstImage === false) {                        
            SF.EVENT.triggerEvent(image, "load");            
        } else if (image.readyState || image.complete) {
            src = image.src;
            image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
            image.src = src;            
        }        
    }
    
    /*
     * Callback method once an image has loaded so we can
     * add the corresponding div element, which has a background 
     * image set via CSS, to the cache.
     *
     * @param {DOMEvent} event - The event triggered during the image load.
     */
    function imageLoaded(event) {                        
        var image, element, city, number;
        
        image = this;   
        city = image.getAttribute("data-city");
        number = image.getAttribute("data-number");
        element = document.getElementById(city + "-" + number);
        
        loadedImages[city][number] = element;            
    }
    
    /*
     * Preloads the images for each of the cities. The preloading
     * is done by create a new Image object. We also handle the 
     * creation of divs and background styles that will display
     * the images.
     *
     * @param {Array} cities - Array of the cities to load
     * @param {Number} numberOfImages - The number of images per city
     * @param {Number} size - The image resolution size to load (width)
     */
    function preloadImages(cities, numberOfImages, size) {
        if (preloaded === false) {
            preloaded = true;
            
            for (var i = 0; i < cities.length; i++) {
                var city = cities[i];
                for (var j = 1; j <= numberOfImages; j++) {                
                    var element, image;
                                    
                    if (loadedImages[city] === undefined) {
                        loadedImages[city] = {};
                    }
                    
                    element = addBackgroundElement(city + "-" + j);                
                    if (element !== activeElement) {
                        SF.CSS.addClass(element, "offscreen");
                        
                        image = new Image();
                        
                        /*
                         * Store the city and image number as data
                         * so it can be retreived later to find the
                         * corresponding background div.
                         */
                        image.setAttribute("data-city", city);
                        image.setAttribute("data-number", j);
                        
                        SF.EVENT.addEvent(image, "load", imageLoaded);
                        
                        image.src = buildImageSrc(city, j, size);        
                        fixImageLoadEvent(image); 
                        
                        addBackgroundImageStyle(city, j, size);
                    }
                    
                    container.appendChild(element);                                
                }            
            }
        }
    }
    
    /*
     * Adds the background CSS for the images. Typically 
     * CSS is added in a css file to follow best separation of
     * concerns best practices. However given the amount of CSS
     * that would beed to be generated and the programtic nature 
     * of this content we do it in JavaScript. Consider using a 
     * CSS pre-processor in this case.
     *
     * @param {String} city - City name
     * @param {Number} number - The item number
     * @param {Number} size - The resolution of the image (width)
     *
     */
    function addBackgroundImageStyle(city, number, size) {        
        var head, cityClassName, imageLocation, styleText, styleElement;
        
        cityClassName = "#" + city + "-" + number;
                
        imageLocation = buildImageSrc(city, number, size);
                
        head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;
        styleElement = document.createElement("style");            
        styleElement.type = "text/css";            

        
        /*
         * IE fix for the CSS3 cover background size.
         */        
        styleText = cityClassName + "{\n" +
            "\tbackground: url(" + imageLocation + ") no-repeat center center fixed;\n" +
            "\tfilter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src='." + imageLocation + "', sizingMethod='scale');\n" +
            "\t-ms-filter: \"progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + imageLocation + "', sizingMethod='scale')\";" +
            "\n}\n\n";
        
        if (styleElement.styleSheet) {
            styleElement.styleSheet.cssText = styleText;
        } else {
            styleElement.innerHTML = styleText;
        }
        
        head.appendChild(styleElement);
    }
    
    /*
     * Helper method to build the image src locations
     * 
     * @param {String} city - City name
     * @param {Number} number - The item number
     * @param {Number} size - The resolution of the image (width)
     */ 
    function buildImageSrc(city, number, size) {
        var cityFileName;
        
        cityFileName = city + "-" + number + "-" + size + ".jpg";        
        return "/magicaj/stayful/workspace/images/" + cityFileName;
    }
    
    /*
     * Adds a div element to the page that will be used to display
     * each background image.
     *
     * @param {HTMLElement} elementId - The element id of the new element.
     */
    function addBackgroundElement(elementId) {
        var element;
        
        element = document.getElementById(elementId);

        if (element === null) {
            element = document.createElement("div");
            container.appendChild(element);
            element.setAttribute("id", elementId);            
            SF.CSS.addClass(element, "background-image");        
            element.style.zIndex = 2;
        }
        
        return element;
    }
    
    /*
     * Helper method to fade out the active element
     * and fade in the new element. This is used 
     * to swap between the background elements and 
     * create the cross-fade effect.
     *
     * @param {HTMLElement} newElement - The element to fade in
     * @param {Number} number - The number of the element in the list
     */
    function swapActiveElement(newElement, number) {
        newElement.style.zIndex = 2;        
        SF.CSS.removeClass(newElement, "offscreen");
        
        /*
         * This is a very simple fade. A more fancy fade could be
         * done where there is an ease-in/ease-out.
         */
        SF.ANIMATION.fade(newElement, 0, 1, 1000);
        SF.ANIMATION.fade(activeElement, 1, 0, 1000);
        
        activeElement = newElement;
        activeNumber = number;        
    }
    
    /*
     * Starts the image carousel 
     *
     * @param {Number} numberOfImagesPerGroup - The number of images per city
     */        
    function startCarousel(numberOfImagesPerCity) {
        interval = window.setInterval(function() {
            if (loadedImages[activeCity] !== undefined) {
                var nextNumber; 
                
                if (activeNumber < numberOfImagesPerCity) {
                    nextNumber = activeNumber + 1;
                } else {
                    nextNumber = 1;
                }
                
                if (loadedImages[activeCity][nextNumber] !== undefined) {                    
                    swapActiveElement(loadedImages[activeCity][nextNumber], nextNumber);
                }
            }
        }, 5000);
    }
    
    /*
     * Initializes the whole sha-bang-a-bang
     *
     * @param {String} elementId - The element id where the background images will be housed.
     * @param {String} imageFromDataId - The CSS id used for loading a low-fi image to prevent FOUC
     * @param {Number} numberOfImagesPerCity - The number of images per city
     *
     */ 
    function init(elementId, imageFromDataId, numberOfImagesPerCity) {
        var image, slow, citiesSelectElement, cityChanged, screenSize, windowInnerWidth, clientWidth, defaultCity, cities;
        
        windowInnerWidth = window.innerWidth;
        clientWidth = document.documentElement.clientWidth;
        
        /*
         * We use something similiar to media queries to determine
         * the size of images to use.
         */
        if ((windowInnerWidth || clientWidth) <= 480) {
            screenSize = 480;
        } else if ((windowInnerWidth || clientWidth) <= 1024) {
            screenSize = 1024;
        } else if ((windowInnerWidth || clientWidth) <= 1600) {
            screenSize = 1600;
        } else {
            screenSize = 1920;
        }
        
        citiesSelectElement = document.getElementById("cities");                
        activeCity = defaultCity = citiesSelectElement.value; 
        cities = [];
        
        for (var i = 0; i < citiesSelectElement.options.length; i++) {
            cities.push(citiesSelectElement.options[i].value);
        }        
        
        container = document.getElementById(elementId);
        image = new Image();
        slow = false;
        cityChanged = false;
        
        /*
         * Callback handler for when the first image loads. If
         * the low-fi image from the CSS data URI was loaded and the
         * city has not been changed then we just overlay the hire res
         * version once it has loaded (no fading). 
         */ 
        function firstImageLoaded() {            
            if (loadedFirstImage === false) {
                var newactiveElement;
                
                loadedFirstImage = true;
                    
                addBackgroundImageStyle(defaultCity, 1, screenSize);
                newactiveElement = addBackgroundElement(defaultCity + "-" + 1);
                loadedImages[defaultCity] = {};
                
                loadedImages[defaultCity][1] = newactiveElement;
                    
                if (cityChanged === false) {
                    if (slow === true) {
                        activeElement.style.zIndex = 1;
                        SF.CSS.removeClass(newactiveElement, "offscreen");
                    }
                    
                    activeElement = newactiveElement; 
                    activeNumber = 1;
                    
                    /*
                     * We do not want to start preloading the images
                     * until the first high-res was is done.
                     */
                    preloadImages(cities, numberOfImagesPerCity, screenSize);
                    
                    /*
                     * Set loaded in case it was not already done
                     */
                    document.body.className = "loaded";
                }
            }
        }
        
        SF.EVENT.addEvent(image, "load", firstImageLoaded);
                
        image.src = buildImageSrc(defaultCity, 1, screenSize);        
        fixImageLoadEvent(image); 
        
        /* If the first image is not already in the cache then
         * we show the low-fi image that is part of the CSS
         * sent in the initial payload as a data URI. This will prevent the FOUC.
         */
        if (loadedFirstImage === false) {
            activeElement = addBackgroundElement(imageFromDataId);            
            slow = true;
        }
            
        /*
         * When a the city is changed we stop the current carousel, pause
         * for 2.5 seconds, swap in the first image for the new city,
         * and then start up the carousel again.
         */
        SF.EVENT.addEvent(citiesSelectElement, "change", function() {                                    
            window.clearInterval(interval);
            window.setTimeout(function() {                
                var city;
                
                city = citiesSelectElement.value;
                
                if (loadedImages[city] !== undefined) {
                    activeCity = city;
                    var newActiveElement = loadedImages[city][1];
                    if (newActiveElement !== undefined) {
                        swapActiveElement(newActiveElement, 1);
                    }           
                }
                                
                cityChanged = true;
                startCarousel(numberOfImagesPerCity);    
            }, 2500);  
            
            /*
             * Since we do not normally start the preloading until 
             * the first image is done we need to make sure it is
             * done in the case where the city is changed
             * before the first high res image is loaded.
             */
            preloadImages(cities, numberOfImagesPerCity, screenSize);
        });
        
        startCarousel(numberOfImagesPerCity);
    }
        
    return function(elementId, imageFromDataId, numberOfImagesPerCity) {        
        init(elementId, imageFromDataId, numberOfImagesPerCity);
    };
}();

/*
 * Prevent the browser loader icon from spinning by waiting for page to load
 * before showing content.
 */
SF.EVENT.addEvent(window, "load", function() {
    SF.BackgroundImageLoader("background", "sf-1-from-data", 4);
    
    /*
     * Wait until we have either loaded the first high-res image 
     * from cache or loaded the low-res image from the CSS data URI.
     *
     */    
    document.body.className = "loaded";    
});
    
})(window, document);
