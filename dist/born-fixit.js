'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//Common static properties shared across the plugin.
var PROPERTIES = {
    direction: {
        up: 'up',
        down: 'down'
    }
},
    INSTANCES = new Map();

var FixIt = function () {
    function FixIt() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, FixIt);

        this.options = options;

        this.shouldEnable = this.options.enabled || function () {
            return true;
        };
        // this.offset = isNaN(this.options.offset) ?  || 0;
        this.target = (typeof this.options.target === 'string' ? document.querySelector(this.options.target) : this.options.target) || false;
        // this.offsetElements = false;

        if (this.options.offset && isNaN(this.options.offset)) {
            this.setOffsetElements();

            this.setOffsetValue();
        } else {
            this.offset = this.options.offset || 0;
        }

        //Milliseconds to wait after the last scroll happened.
        //A value between 75 and 300 is recommended to prevent miscalculations.
        this._scrollDirectionWait = this.options.scrollDirectionWait || 100;

        //Minimum distance to scroll within the "wait" period.
        this._scrollPositionThereshold = this.options.scrollPositionThereshold || 75;

        //Amount of times the scroll should fire before allowing to change the direction.
        //Setting this and `scrollPositionThereshold` to 0 makes the direction change happen on every scroll.
        this._scrollDirectionThrottle = this.options.scrollDirectionThrottle || 16;

        this._boundUpdateStickyStatus = this.updateStickyStatus.bind(this);
        this._boundEnableSticky = this.enableSticky.bind(this, 150);

        if (this.target) {
            this.enableSticky();

            window.addEventListener('resize', this._boundEnableSticky);
        }

        INSTANCES.set(this.target, this);
    }

    _createClass(FixIt, [{
        key: 'enableSticky',
        value: function enableSticky(timeOut) {
            window.clearTimeout(this._resizeTimeout);

            this._resizeTimeout = window.setTimeout(function () {
                this.setOffsetValue();

                if (!this.isEnabled && this.shouldEnable()) {
                    this.isEnabled = true;

                    if (!this.placeholder) {
                        this.initialSetup();
                    }

                    this._updateInterval = window.setInterval(this._boundUpdateStickyStatus.bind(this, true), 100);
                    window.addEventListener('scroll', this._boundUpdateStickyStatus);

                    this._boundUpdateStickyStatus();
                } else if (this.isEnabled && !this.shouldEnable()) {
                    this.isEnabled = false;

                    this.setInactive();

                    window.clearInterval(this._updateInterval);
                    window.removeEventListener('scroll', this._boundUpdateStickyStatus);
                }
            }.bind(this), timeOut || 0);
        }

        /**
         * Resets the FixIt initialization and removes all classes and elements created by this FixIt instance.
         */

    }, {
        key: 'destroySticky',
        value: function destroySticky() {
            this.isEnabled = false;

            this.setInactive();
            this.removePlaceholder();

            window.clearTimeout(this._resizeTimeout);
            window.clearInterval(this._updateInterval);
            window.removeEventListener('resize', this._boundEnableSticky);
            window.removeEventListener('scroll', this._boundUpdateStickyStatus);
        }

        /**
         * Attempts to get the reference offset element's height, otherwise returns the current offset value or zero.
         * @return {[type]} [description]
         */

    }, {
        key: 'setOffsetValue',
        value: function setOffsetValue() {
            var resultSum = 0;

            if (this.offsetElements instanceof NodeList) {
                [].forEach.call(this.offsetElements, function (currentEl) {
                    resultSum += Math.round(currentEl.getBoundingClientRect().height);
                });
            } else {
                resultSum = this.offset || 0;
            }

            return this.offset = resultSum;
        }
    }, {
        key: 'setOffsetElements',
        value: function setOffsetElements(offset) {
            offset = offset || this.options.offset;

            return this.offsetElements = typeof offset === 'string' ? document.querySelectorAll(offset) : offset;
        }

        //Initial FixIt setup. Should only run once to avoid attaching repeated event handlers.

    }, {
        key: 'initialSetup',
        value: function initialSetup() {
            this.setPlaceholder();

            //Setup the rectangles for initial configurations.
            this.setRectangles();

            //Initialize the placeholder with its dimensions if using `fromViewportBottom`.
            this.setPlaceholderProps(this.options.fromViewportBottom);

            this.parentContainer = this.options.containedInParent ? this.options.containedInParent instanceof HTMLElement ? this.options.containedInParent : this.target.parentNode : false;

            if (this.options.respondToParent) {
                this.target.classList.add('fixit--respond-to-parent');
                this.options.respondToParent = this.options.respondToParent instanceof HTMLElement ? this.options.respondToParent : this.parentContainer;

                window.addEventListener('resize', this.respondTo.bind(this));
                this.target.addEventListener('fixit:triggerResize', this.respondTo.bind(this));
            }

            this.scrollPosition = 0;

            this.publishEvent('fixit', 'init', this.target, {
                FixIt: this
            });

            if (typeof this.options.onInitCallback === 'function') {
                this.options.onInitCallback(this.target, this);
            }

            this.target.addEventListener('fixit:updateScrollDirection', function (evt) {
                this.updateScrollDirection(evt.detail.scrollDirection);
            }.bind(this));
        }

        /**
         * Updates the status of the sticky object according to where it is on the current scroll.
         */

    }, {
        key: 'updateStickyStatus',
        value: function updateStickyStatus(isAutoUpdate) {
            //isAutoUpdate could be passed as an event instead, so make sure it's an intentional boolean.
            isAutoUpdate = typeof isAutoUpdate === 'boolean' ? isAutoUpdate : false;

            //Indicates if the FixIt element has changed positions and prevents making unnecessary recalculations.
            //Useful for when something changes on the page (like toggling content) that would push the FixIt element off (typically when it's resting and `this.isFrozen` is true).
            if (!isAutoUpdate || isAutoUpdate && this._previousDocumentHeight !== this.getDocumentHeight()) {
                this.setRectangles();

                //Set a property for the directional start location depending on wether or not `fromViewportBottom` is set to TRUE.
                this._scrollListeningStart = this.options.fromViewportBottom ? this._placeholderRect.bottom - Math.max(window.innerHeight, document.documentElement.clientHeight) : this._placeholderRect.top;

                //The first portion of the following conditional checks if the target is smaller than its parent.
                //Then it makes sure that the entirety of the target element is visible on screen before applying the fixed status.
                if ((!this.parentContainer || this._targetRect.height < this._parentContainerRect.height) && this._scrollListeningStart < this.offset) {
                    this.getScrollDirection();

                    this._previousDocumentHeight = this.getDocumentHeight();

                    this.toggletFullyScrolled(this._placeholderRect.top + this._targetRect.height < this.offset);

                    //Only request to change the direction if this flag is turn on.
                    //This prevents potentially taxing calculations.
                    if (this.options.enableDirectionUpdates) {
                        this.requestScrollDirectionUpdate(this.currentScrollDirection);
                    }

                    if (!this.targetIsTall()) {
                        this.unsetIsTall();

                        if (!this.isActive) {
                            this.setActive();
                        }
                    } else {
                        this.setIsTall();

                        if (this.currentScrollDirection === PROPERTIES.direction.down) {
                            if (Math.round(this._targetRect.bottom) <= Math.max(window.innerHeight, document.documentElement.clientHeight)) {
                                if (!this.isActive) {
                                    this.isFrozen = false;
                                    this.setActive(true);
                                }
                            } else if (this.isActive && !this.isDocked && !this.shouldDock()) {
                                //We don't wanna run this if it's docked
                                this.isActive = false;

                                this.setFrozen();
                                this.unsetBottom();
                            }
                        } else {
                            if (Math.round(this._targetRect.top) >= this.offset) {
                                if (!this.isActive) {
                                    this.isFrozen = false;
                                    this.setActive();
                                }
                            } else if (this.isActive && !this.isDocked && !this.shouldDock()) {
                                //We don't wanna run this if it's docked
                                this.isActive = false;

                                this.setFrozen();
                                this.unsetBottom();
                            }
                        }
                    }

                    this.containInParent();
                } else if (this.isActive) {
                    this.setInactive();
                }
            }

            return this.isActive || this.isFrozen;
        }

        /**
         * Updates the commonly-used rectangles for this plugin.
         */

    }, {
        key: 'setRectangles',
        value: function setRectangles() {
            this._targetRect = this.target.getBoundingClientRect();
            this._placeholderRect = this.placeholder.getBoundingClientRect();
            this._parentContainerRect = this.parentContainer ? this.parentContainer.getBoundingClientRect() : {};
        }
    }, {
        key: 'getDocumentHeight',
        value: function getDocumentHeight() {
            return Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
        }

        /**
         * Constrains the target element's scroll to the inside of a defined parent [parentContainer] element.
         */

    }, {
        key: 'containInParent',
        value: function containInParent() {
            if (this.parentContainer && this.isActive) {
                //Update the rectangles before deciding wether to dock or not.
                //This prevents the target from jumping around outside its container.
                this.setRectangles();

                //Make sure bottom of parent is visible, then ensure the target and the parent's bottom are at the same level, then confirm the window's offset is not over the target
                if (this.shouldDock()) {
                    this.setDocked();
                } else if (this.isDocked && this._targetRect.top >= this.offset) {
                    this.setUndocked();
                }
            }
        }
    }, {
        key: 'shouldDock',
        value: function shouldDock() {
            return this._parentContainerRect.bottom <= document.documentElement.clientHeight && this._targetRect.bottom >= this._parentContainerRect.bottom && (this.isBottom || this._targetRect.top <= this.offset);
        }
    }, {
        key: 'setDocked',
        value: function setDocked() {
            this.isDocked = true;
            this.target.classList.add('fixit--docked');

            this.unsetBottom();

            this.setTargetPos(true);
        }
    }, {
        key: 'setUndocked',
        value: function setUndocked() {
            this.isDocked = false;
            this.target.classList.remove('fixit--docked');
            this.setTargetPos();
        }

        /**
         * Either sets the target's 'top' property to the offset value, or clears it depending on [reset] value. 
         * @param  {[boolean]} reset 
         */

    }, {
        key: 'setTargetPos',
        value: function setTargetPos(reset) {
            var newPos = '';

            if (!reset && this.options.useOffsetOnTarget) {
                newPos = this.offset + 'px';
            }

            this.target.style.top = newPos;
        }

        /**
         * Adapts target's width according to its parent's width. Needed cause fixed elements respond to the window.
         */

    }, {
        key: 'respondTo',
        value: function respondTo() {
            if (this.isActive || this.isFrozen) {
                var parentComputedStyle = window.getComputedStyle(this.options.respondToParent),
                    parentWidth = this.options.respondToParent.getBoundingClientRect().width - parseFloat(parentComputedStyle['padding-left']) - parseFloat(parentComputedStyle['padding-right']);

                this.target.style.width = parentWidth + 'px';
            }
        }

        /**
         * Freezes the target at its current position relative to its parent.
         */

    }, {
        key: 'setFrozen',
        value: function setFrozen() {
            this.isFrozen = true;

            this.target.style.top = Math.abs(this._parentContainerRect.top - this._targetRect.top) + 'px';

            this.target.classList.remove('fixit--active');
            this.target.classList.add('fixit--frozen');
        }
    }, {
        key: 'setBottom',
        value: function setBottom() {
            this.isBottom = true;

            this.setTargetPos(true);

            this.target.classList.add('fixit--bottom');
        }
    }, {
        key: 'unsetBottom',
        value: function unsetBottom() {
            this.isBottom = false;

            this.target.classList.remove('fixit--bottom');
        }
    }, {
        key: 'setIsTall',
        value: function setIsTall() {
            this.isTall = true;

            this.target.classList.add('fixit--is-tall');
        }
    }, {
        key: 'unsetIsTall',
        value: function unsetIsTall() {
            this.isTall = false;

            this.target.classList.remove('fixit--is-tall');
        }

        /**
         * If 'toBottom' is set to true, the fixed element is attached to the bottom of its container.
         * @param {[type]} toBottom [description]
         */

    }, {
        key: 'setActive',
        value: function setActive(toBottom) {
            this.isActive = true;

            //If `fromViewportBottom` is set to TRUE, set placeholder's dimensions to 0, otherwise calculate and set its dimensions;
            this.setPlaceholderProps(!this.options.fromViewportBottom);
            this.target.classList.remove('fixit--frozen');
            this.target.classList.add('fixit--active');

            if (toBottom) {
                this.setBottom();
            } else {
                this.setTargetPos();
            }

            if (this.options.respondToParent) {
                this.respondTo();
            }

            this.publishEvent('fixit', 'active', this.target, {
                FixIt: this
            });

            if (typeof this.options.onActiveCallback === 'function') {
                this.options.onActiveCallback(this.target, this);
            }
        }

        //Removes all statuses/settings from the fixit object

    }, {
        key: 'setInactive',
        value: function setInactive() {
            this.isActive = false;

            this.unsetBottom();
            this.unsetIsTall();

            //If `fromViewportBottom` is set to TRUE, calculate and set the placeholder's dimensions, otherwise reset to 0;
            this.setPlaceholderProps(this.options.fromViewportBottom && this.isEnabled);

            this.target.classList.remove('fixit--active');
            this.target.classList.remove('fixit--docked');
            this.target.classList.remove('fixit--frozen');
            this.target.classList.remove('fixit--scrolled');

            this.removeDirectionUpdates();

            this.scrollPosition = 0;

            if (this.options.useOffsetOnTarget) {
                this.setTargetPos(true);
            }

            if (this.options.respondToParent) {
                this.target.style.width = '';
            }

            this.publishEvent('fixit', 'inactive', this.target, {
                FixIt: this
            });

            if (typeof this.options.onInactiveCallback === 'function') {
                this.options.onInactiveCallback(this.target, this);
            }
        }
    }, {
        key: 'removeDirectionUpdates',
        value: function removeDirectionUpdates() {
            if (this.options.enableDirectionUpdates) {
                this.target.classList.remove('fixit--scroll-' + PROPERTIES.direction.up);
                this.target.classList.remove('fixit--scroll-' + PROPERTIES.direction.down);
                this.target.classList.remove('fixit--scroll-direction-change');

                delete this._prevScrollDirection;

                window.clearTimeout(this._scrollDirectionTimeout);
            }
        }

        /**
         * Creates a "placeholder" element that will take the height (including padding) and margin properties of
         * the target element and is used to avoid a jump when scrolling down and activating the 'fixed' status
         */

    }, {
        key: 'setPlaceholder',
        value: function setPlaceholder() {
            this.placeholder = document.createElement('div');

            this.placeholder.className = 'fixit-placeholder';

            this.target.parentNode.insertBefore(this.placeholder, this.target);
        }

        /*
        * Removes the placeholder element.
         */

    }, {
        key: 'removePlaceholder',
        value: function removePlaceholder() {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }

        /**
         * Updates placeholder properties
         * @param {[boolean]} sync [either sets or resets values]
         */

    }, {
        key: 'setPlaceholderProps',
        value: function setPlaceholderProps(sync) {
            if (this.placeholder) {
                if (sync) {
                    this.placeholder.style.height = this._targetRect.height + 'px';
                    this.placeholder.style.margin = window.getComputedStyle(this.target).margin;
                } else {
                    this.placeholder.style.height = '';
                    this.placeholder.style.margin = '';
                }
            }
        }
    }, {
        key: 'targetIsTall',
        value: function targetIsTall() {
            return this._targetRect.height + this.offset > document.documentElement.clientHeight;
        }

        //This method needs revision:
        //Position is not properly reported on certain browsers when using window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;

    }, {
        key: 'getScrollDirection',
        value: function getScrollDirection() {
            //Do not set a direction if there is no difference between these two values.
            if (this.scrollPosition > this._placeholderRect.top) {
                this.currentScrollDirection = PROPERTIES.direction.down;
            } else if (this.scrollPosition < this._placeholderRect.top) {
                this.currentScrollDirection = PROPERTIES.direction.up;
            }

            this.scrollPosition = this._placeholderRect.top;

            return this.currentScrollDirection;
        }

        /**
         * Attempts to update the scroll direction, but only if all the configured options are met.
         * @param  {String} newScrollDirection ["up" or "down"]
         */

    }, {
        key: 'requestScrollDirectionUpdate',
        value: function requestScrollDirectionUpdate(newScrollDirection) {
            this._setScrollDirectionCallCount = (this._setScrollDirectionCallCount || 0) + 1;
            this._newScrollPosition = this._placeholderRect.top;

            //Throttle how often the scroll direction change should be called.
            //This allows updating the direction even before the user has stopped scrolling.
            if (this._setScrollDirectionCallCount >= this._scrollDirectionThrottle) {
                this._updateScrollDirectionOnThreshold(newScrollDirection);

                //Reset the call count once it has reached the minimum threshold.
                this._setScrollDirectionCallCount = 0;
            }

            window.clearTimeout(this._scrollDirectionTimeout);

            //Set a timeout to ensure that the last position is stored after the user stops scrolling.
            this._scrollDirectionTimeout = window.setTimeout(function () {
                this._updateScrollDirectionOnThreshold(newScrollDirection);

                this._prevScrollPosition = this._placeholderRect.top;
            }.bind(this), this._scrollDirectionWait);
        }

        /**
         * Internal function to ensure the scroll position difference between the last two locations is larger than the configured threshold.
         * @param  {String} newScrollDirection ["up" or "down"]
         */

    }, {
        key: '_updateScrollDirectionOnThreshold',
        value: function _updateScrollDirectionOnThreshold(newScrollDirection) {
            //Scroll position difference between the new location and the
            //location the FixIt target had the last time a "direction change" was succesfully executed.
            this._diffScrollPosition = Math.abs(this._newScrollPosition - (this._prevScrollPosition || 0));

            if (this._diffScrollPosition > this._scrollPositionThereshold) {
                this.updateScrollDirection(newScrollDirection);
            }
        }

        /**
         * Update the FixIt target state with the provided `newScrollDirection` value.
         * @param  {String} newScrollDirection ["up" or "down"]
         */

    }, {
        key: 'updateScrollDirection',
        value: function updateScrollDirection(newScrollDirection) {
            this.publishEvent('fixit', 'scrollDirectionUpdate', this.target, {
                previousDirection: this._prevScrollDirection,
                newDirection: newScrollDirection,
                FixIt: this
            });

            if (this._prevScrollDirection !== newScrollDirection) {
                this.target.classList.add('fixit--scroll-' + newScrollDirection);
                this.target.classList.remove('fixit--scroll-' + this._prevScrollDirection);

                //Attach a special class when the direction has changed at least once.
                //We know this happens whenever a `this._prevScrollDirection` is available.
                if (this._prevScrollDirection) {
                    this.target.classList.add('fixit--scroll-direction-change');
                }

                this._prevScrollDirection = newScrollDirection;
                this._prevScrollPosition = this._placeholderRect.top;
            }
        }
    }, {
        key: 'toggletFullyScrolled',
        value: function toggletFullyScrolled(setScrolled) {
            if (setScrolled) {
                this.target.classList.add('fixit--scrolled');
            } else {
                this.target.classList.remove('fixit--scrolled');
            }
        }

        /**
         * Publish an event at the specific target element scope
         * for other modules to subscribe.
         * The subscribe method can be a standard
         * .addEventListener('moduleName.eventName') method
         *
         * @param {String} moduleName
         * @param {String} eventName
         * @param {HTMLElement} target
         */

    }, {
        key: 'publishEvent',
        value: function publishEvent(moduleName, eventName, target, detail) {
            var event = void 0,
                params = { bubbles: true, cancelable: true, detail: detail },
                eventString = moduleName && eventName ? moduleName + ':' + eventName : moduleName || eventName;

            // IE >= 9, CustomEvent() constructor does not exist
            if (typeof window.CustomEvent !== 'function') {
                event = document.createEvent('CustomEvent');
                event.initCustomEvent(eventString, params.bubbles, params.cancelable, null);
            } else {
                event = new CustomEvent(eventString, params);
            }

            target.dispatchEvent(event);
        }
    }], [{
        key: 'getInstance',
        value: function getInstance(el) {
            return INSTANCES.get(el);
        }
    }]);

    return FixIt;
}();

exports.default = FixIt;
