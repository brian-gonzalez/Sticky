define(['exports'], function (exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var FixIt = function () {
        function FixIt(options) {
            _classCallCheck(this, FixIt);

            this.options = options;

            this.shouldEnable = this.options.enabled || function () {
                return true;
            };
            // this.offset = isNaN(this.options.offset) ?  || 0;
            this.target = (typeof this.options.target === 'string' ? document.querySelector(this.options.target) : this.options.target) || false;
            this.offsetElements = false;

            if (this.options.offset && isNaN(this.options.offset)) {
                this.offsetElements = typeof this.options.offset === 'string' ? document.querySelectorAll(this.options.offset) : this.options.offset;
                this.offset = this.getOffsetValue();
            } else {
                this.offset = this.options.offset || 0;
            }

            this._boundUpdateStickyStatus = this.updateStickyStatus.bind(this);
            this._boundEnableSticky = this.enableSticky.bind(this, 150);
            this._updateInterval;
            // this._previousTopPos;
            this._previousDocumentHeight;

            if (this.target) {
                this.enableSticky();

                window.addEventListener('resize', this._boundEnableSticky);
            }
        }

        _createClass(FixIt, [{
            key: 'enableSticky',
            value: function enableSticky(timeOut) {
                window.clearTimeout(this._resizeTimeout);

                this._resizeTimeout = window.setTimeout(function () {
                    this.offset = this.getOffsetValue();

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
                        this.isActive = false;
                        this.setInactive();
                        window.clearInterval(this._updateInterval);
                        window.removeEventListener('scroll', this._boundUpdateStickyStatus);
                    }
                }.bind(this), timeOut || 0);
            }
        }, {
            key: 'destroySticky',
            value: function destroySticky() {
                this.isEnabled = false;
                this.isActive = false;
                this.setInactive();
                this.removePlaceholder();
                window.clearTimeout(this._resizeTimeout);
                window.clearInterval(this._updateInterval);
                window.removeEventListener('resize', this._boundEnableSticky);
                window.removeEventListener('scroll', this._boundUpdateStickyStatus);
            }
        }, {
            key: 'getOffsetValue',
            value: function getOffsetValue() {
                var resultSum = 0;

                if (this.offsetElements instanceof NodeList) {
                    [].forEach.call(this.offsetElements, function (currentEl) {
                        resultSum += Math.round(currentEl.getBoundingClientRect().height);
                    });
                } else {
                    resultSum = this.offset || 0;
                }

                return resultSum;
            }
        }, {
            key: 'initialSetup',
            value: function initialSetup() {
                this.setPlaceholder();

                this.parentContainer = this.options.containedInParent ? this.options.containedInParent instanceof HTMLElement ? this.options.containedInParent : this.target.parentNode : false;

                if (this.options.respondToParent) {
                    this.target.classList.add('fixit--respond-to-parent');
                    this.options.respondToParent = this.options.respondToParent instanceof HTMLElement ? this.options.respondToParent : this.parentContainer;

                    window.addEventListener('resize', this.respondTo.bind(this));
                    this.target.addEventListener('fixit:triggerResize', this.respondTo.bind(this));
                }

                this.scrollPosition = 0;

                this.publishEvent('fixit', 'init', this.target);

                if (typeof this.options.onInitCallback === 'function') {
                    this.options.onInitCallback(this.target, this);
                }
            }
        }, {
            key: 'updateStickyStatus',
            value: function updateStickyStatus(isAutoUpdate) {
                // let targetRect = this.target.getBoundingClientRect();

                //isAutoUpdate could be passed as an event instead, so make sure it's an intentional boolean.
                isAutoUpdate = typeof isAutoUpdate === 'boolean' ? isAutoUpdate : false;

                //Indicates if the FixIt element has changed positions and prevents making unnecessary recalculations.
                //Useful for when something changes on the page (like toggling content) that would push the FixIt element off (typically when it's resting and `this.isFrozen` is true).
                if (!isAutoUpdate || isAutoUpdate && this._previousDocumentHeight !== this.getDocumentHeight()) {
                    var placeholderRect = this.placeholder.getBoundingClientRect(),
                        canContainInParent = !this.parentContainer || this.getTargetHeight() < this.parentContainer.getBoundingClientRect().height;

                    //canContainInParent if target is smaller than its parent
                    //Make sure the entirety of the target element is visible on screen before applying the fixed status.
                    if (placeholderRect.top < this.offset && canContainInParent) {
                        // this._previousTopPos = targetRect.top;
                        this._previousDocumentHeight = this.getDocumentHeight();

                        if (!this.targetIsTall()) {
                            if (!this.isActive) {
                                this.setActive();
                            }
                        } else {
                            var scrollDir = this.getScrollDirection(),
                                targetRect = this.target.getBoundingClientRect();

                            if (scrollDir === 'down') {
                                if (Math.round(targetRect.bottom) <= Math.max(window.innerHeight, document.documentElement.clientHeight)) {
                                    if (!this.isActive) {
                                        this.isFrozen = false;
                                        this.setActive(true);
                                    }
                                } else if (this.isActive && !this.isDocked && !this.shouldDock(targetRect)) {
                                    //We don't wanna run this if it's docked
                                    this.isActive = false;
                                    this.setFrozen();
                                }
                            } else {
                                if (Math.round(targetRect.top) >= this.offset) {
                                    if (!this.isActive) {
                                        this.isFrozen = false;
                                        this.setActive();
                                    }
                                } else if (this.isActive && !this.isDocked && !this.shouldDock(targetRect)) {
                                    //We don't wanna run this if it's docked
                                    this.isActive = false;
                                    this.setFrozen();
                                }
                            }
                        }

                        this.containInParent();
                    } else if (this.isActive) {
                        this.isActive = false;
                        this.setInactive();
                    }
                }

                return this.isActive || this.isFrozen;
            }
        }, {
            key: 'getDocumentHeight',
            value: function getDocumentHeight() {
                return Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
            }
        }, {
            key: 'containInParent',
            value: function containInParent() {
                if (this.parentContainer && this.isActive) {
                    var targetRect = this.target.getBoundingClientRect();

                    //Make sure bottom of parent is visible, then ensure the target and the parent's bottom are at the same level, then confirm the window's offset is not over the target
                    if (this.shouldDock(targetRect)) {
                        this.setDocked();
                    } else if (this.isDocked && targetRect.top >= this.offset) {
                        this.setUndocked();
                    }
                }
            }
        }, {
            key: 'shouldDock',
            value: function shouldDock(targetRect) {
                var parentBottom = this.parentContainer.getBoundingClientRect().bottom;

                return parentBottom <= document.documentElement.clientHeight && targetRect.bottom >= parentBottom && targetRect.top <= this.offset;
            }
        }, {
            key: 'setDocked',
            value: function setDocked() {
                this.isDocked = true;
                this.target.classList.add('fixit--docked');
                this.target.classList.remove('fixit--bottom');
                this.setTargetPos(true);
            }
        }, {
            key: 'setUndocked',
            value: function setUndocked() {
                this.isDocked = false;
                this.target.classList.remove('fixit--docked');
                this.setTargetPos();
            }
        }, {
            key: 'setTargetPos',
            value: function setTargetPos(reset) {
                var newPos = '';

                if (!reset && this.options.useOffsetOnTarget) {
                    newPos = this.offset + 'px';
                }

                this.target.style.top = newPos;
            }
        }, {
            key: 'respondTo',
            value: function respondTo() {
                if (this.isActive || this.isFrozen) {
                    var parentComputedStyle = window.getComputedStyle(this.options.respondToParent),
                        parentWidth = this.options.respondToParent.getBoundingClientRect().width - parseFloat(parentComputedStyle['padding-left']) - parseFloat(parentComputedStyle['padding-right']);

                    this.target.style.width = parentWidth + 'px';
                }
            }
        }, {
            key: 'setFrozen',
            value: function setFrozen() {
                this.isFrozen = true;
                this.target.style.top = Math.abs(this.parentContainer.getBoundingClientRect().top - this.target.getBoundingClientRect().top) + 'px';
                this.target.classList.remove('fixit--bottom');
                this.target.classList.remove('fixit--active');
                this.target.classList.add('fixit--frozen');
            }
        }, {
            key: 'setActive',
            value: function setActive(toBottom) {
                this.isActive = true;
                this.setPlaceholderProps(true);
                this.target.classList.remove('fixit--frozen');
                this.target.classList.add('fixit--active');

                if (toBottom) {
                    this.target.classList.add('fixit--bottom');
                    this.setTargetPos(true);
                } else {
                    this.setTargetPos();
                }

                if (this.options.respondToParent) {
                    this.respondTo();
                }

                this.publishEvent('fixit', 'active', this.target);

                if (typeof this.options.onActiveCallback === 'function') {
                    this.options.onActiveCallback(this.target, this);
                }
            }
        }, {
            key: 'setInactive',
            value: function setInactive() {
                this.setPlaceholderProps();
                this.target.classList.remove('fixit--active');
                this.target.classList.remove('fixit--bottom');
                this.target.classList.remove('fixit--docked');
                this.target.classList.remove('fixit--frozen');

                if (this.options.useOffsetOnTarget) {
                    this.setTargetPos(true);
                }

                if (this.options.respondToParent) {
                    this.target.style.width = '';
                }

                this.publishEvent('fixit', 'inactive', this.target);

                if (typeof this.options.onInactiveCallback === 'function') {
                    this.options.onInactiveCallback(this.target, this);
                }
            }
        }, {
            key: 'setPlaceholder',
            value: function setPlaceholder() {
                var target = this.target;

                this.placeholder = document.createElement('div');

                this.placeholder.className = 'fixit-placeholder';

                target.parentNode.insertBefore(this.placeholder, target);
            }
        }, {
            key: 'removePlaceholder',
            value: function removePlaceholder() {
                this.placeholder.parentNode.removeChild(this.placeholder);
            }
        }, {
            key: 'setPlaceholderProps',
            value: function setPlaceholderProps(sync) {
                if (this.placeholder) {
                    if (sync) {
                        this.placeholder.style.height = this.getTargetHeight() + 'px';
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
                return this.getTargetHeight() + this.offset > document.documentElement.clientHeight;
            }
        }, {
            key: 'getTargetHeight',
            value: function getTargetHeight() {
                return this.target.getBoundingClientRect().height;
            }
        }, {
            key: 'getScrollDirection',
            value: function getScrollDirection() {
                var direction = void 0,
                    docScrollTop = this.placeholder.getBoundingClientRect().top;

                if (this.scrollPosition > docScrollTop) {
                    direction = 'down';
                } else {
                    direction = 'up';
                }

                this.scrollPosition = docScrollTop;

                return direction;
            }
        }, {
            key: 'publishEvent',
            value: function publishEvent(moduleName, eventName, target) {
                var event = void 0,
                    params = { bubbles: true, cancelable: true },
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
        }]);

        return FixIt;
    }();

    exports.default = FixIt;
});
