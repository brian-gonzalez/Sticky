
export default class FixIt {
    constructor(options) {
        this.options = options;

        this.shouldEnable = this.options.enabled || function() {return true;};
        // this.offset = isNaN(this.options.offset) ?  || 0;
        this.target = (typeof this.options.target === 'string' ? document.querySelector(this.options.target) : this.options.target) || false;
        this.offsetElement = false;

        if (this.options.offset && isNaN(this.options.offset)) {
            this.offsetElement = typeof this.options.offset === 'string' ? document.querySelector(this.options.offset) : this.options.offset;
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

    enableSticky(timeOut) {
        window.clearTimeout(this._resizeTimeout);

        this._resizeTimeout = window.setTimeout(function() {
            this.offset = this.getOffsetValue();

            if (!this.isEnabled && this.shouldEnable()) {
                this.isEnabled = true;

                if (!this.placeholder) {
                    this.initialSetup();
                }

                this._updateInterval = window.setInterval(this._boundUpdateStickyStatus.bind(this, true), 100);
                window.addEventListener('scroll', this._boundUpdateStickyStatus);

                this._boundUpdateStickyStatus();
            }

            else if (this.isEnabled && !this.shouldEnable()) {
                this.isEnabled = false;
                this.isActive = false;
                this.setInactive();
                window.clearInterval(this._updateInterval);
                window.removeEventListener('scroll', this._boundUpdateStickyStatus);
            }
        }.bind(this), timeOut || 0);
    }

    /**
     * Resets the FixIt initialization and removes all classes and elements created by this FixIt instance.
     */
    destroySticky() {
        this.isEnabled = false;
        this.isActive = false;
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
    getOffsetValue() {
        return this.offsetElement instanceof HTMLElement ? Math.round(this.offsetElement.getBoundingClientRect().height) : (this.offset || 0);
    }

    //Initial FixIt setup. Should only run once to avoid attaching repeated event handlers.
    initialSetup() {
        this.setPlaceholder();

        this.parentContainer = this.options.containedInParent ? (this.options.containedInParent instanceof HTMLElement ? this.options.containedInParent : this.target.parentNode) : false;

        if (this.options.respondToParent) {
            this.target.classList.add('fixit--respond-to-parent');
            this.options.respondToParent = this.options.respondToParent instanceof HTMLElement ? this.options.respondToParent : this.parentContainer;

            window.addEventListener('resize', this.respondTo.bind(this));
        }

        this.scrollPosition = 0;

        if (typeof this.options.onInitCallback === 'function') {
            this.options.onInitCallback(this.target, this);
        }
    }

    /**
     * Updates the status of the sticky object according to where it is on the current scroll.
     */
    updateStickyStatus(isAutoUpdate) {
        // let targetRect = this.target.getBoundingClientRect();

        //isAutoUpdate could be passed as an event instead, so make sure it's an intentional boolean.
        isAutoUpdate = typeof isAutoUpdate === 'boolean' ? isAutoUpdate : false;

        //Indicates if the FixIt element has changed positions and prevents making unnecessary recalculations.
        //Useful for when something changes on the page (like toggling content) that would push the FixIt element off (typically when it's resting and `this.isFrozen` is true).
        if (!isAutoUpdate || (isAutoUpdate && this._previousDocumentHeight !== this.getDocumentHeight())) {
            let placeholderRect = this.placeholder.getBoundingClientRect(),
                canContainInParent = !this.parentContainer || (this.getTargetHeight() < this.parentContainer.getBoundingClientRect().height);

            //canContainInParent if target is smaller than its parent
            //Make sure the entirety of the target element is visible on screen before applying the fixed status.
            if (placeholderRect.top < this.offset && canContainInParent) {
                // this._previousTopPos = targetRect.top;
                this._previousDocumentHeight = this.getDocumentHeight();

                if( !this.targetIsTall() ) {
                    if(!this.isActive) {
                        this.setActive();
                    }
                } else {
                    let scrollDir = this.getScrollDirection(),
                        targetRect = this.target.getBoundingClientRect();

                    if ( scrollDir === 'down' ) {
                        if (Math.round(targetRect.bottom) <= Math.max(window.innerHeight, document.documentElement.clientHeight)) {
                            if(!this.isActive) {
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
                            if(!this.isActive) {
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
            } else if(this.isActive) {
                this.isActive = false;
                this.setInactive();
            }
        }

        return this.isActive || this.isFrozen;
    }

    getDocumentHeight() {
        return Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
    }

    /**
     * Constrains the target element's scroll to the inside of a defined parent [parentContainer] element.
     */
    containInParent() {
        if (this.parentContainer && this.isActive) {
            let targetRect = this.target.getBoundingClientRect();

            //Make sure bottom of parent is visible, then ensure the target and the parent's bottom are at the same level, then confirm the window's offset is not over the target
            if (this.shouldDock(targetRect)) {
                this.setDocked();
            } else if(this.isDocked && targetRect.top >= this.offset) {
                this.setUndocked();
            }
        }
    }

    shouldDock(targetRect) {
        let parentBottom = this.parentContainer.getBoundingClientRect().bottom;

        return parentBottom <= document.documentElement.clientHeight && targetRect.bottom >= parentBottom && targetRect.top <= this.offset;
    }

    setDocked() {
        this.isDocked = true;
        this.target.classList.add('fixit--docked');
        this.target.classList.remove('fixit--bottom');
        this.setTargetPos(true);
    }

    setUndocked() {
        this.isDocked = false;
        this.target.classList.remove('fixit--docked');
        this.setTargetPos();
    }

    /**
     * Either sets the target's 'top' property to the offset value, or clears it depending on [reset] value. 
     * @param  {[boolean]} reset 
     */
    setTargetPos(reset) {
        let newPos = '';

        if (!reset && this.options.useOffsetOnTarget) {
            newPos = this.offset + 'px';
        }

        this.target.style.top = newPos;
    }

    /**
     * Adapts target's width according to its parent's width. Needed cause fixed elements respond to the window.
     */
    respondTo() {
        if (this.isActive || this.isFrozen) {
            let parentComputedStyle = window.getComputedStyle(this.options.respondToParent),
                parentWidth = this.options.respondToParent.getBoundingClientRect().width - parseFloat(parentComputedStyle['padding-left']) - parseFloat(parentComputedStyle['padding-right']);

            this.target.style.width = parentWidth + 'px';
        }
    }


    /**
     * Freezes the target at its current position relative to its parent.
     */
    setFrozen() {
        this.isFrozen = true;
        this.target.style.top = Math.abs(this.parentContainer.getBoundingClientRect().top - this.target.getBoundingClientRect().top) + 'px';
        this.target.classList.remove('fixit--bottom');
        this.target.classList.remove('fixit--active');
        this.target.classList.add('fixit--frozen');
    }

    /**
     * If 'toBottom' is set to true, the fixed element is attached to the bottom of its container.
     * @param {[type]} toBottom [description]
     */
    setActive(toBottom) {
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

        if (typeof this.options.onActiveCallback === 'function') {
            this.options.onActiveCallback(this.target, this);
        }
    }

    //Removes all statuses/settings from the fixit object
    setInactive() {
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

        if (typeof this.options.onInactiveCallback === 'function') {
            this.options.onInactiveCallback(this.target, this);
        }
    }

    /**
     * Creates a "placeholder" element that will take the height (including padding) and margin properties of
     * the target element and is used to avoid a jump when scrolling down and activating the 'fixed' status
     */
    setPlaceholder() {
        let target = this.target;

        this.placeholder = document.createElement('div');

        this.placeholder.className = 'fixit-placeholder';

        target.parentNode.insertBefore(this.placeholder, target);
    }

    /*
    * Removes the placeholder element.
     */
    removePlaceholder() {
        this.placeholder.parentNode.removeChild(this.placeholder);
    }

    /**
     * Updates placeholder properties
     * @param {[boolean]} sync [either sets or resets values]
     */
    setPlaceholderProps(sync) {
        if (this.placeholder) {
            if(sync) {
                this.placeholder.style.height = this.getTargetHeight() + 'px';
                this.placeholder.style.margin = window.getComputedStyle(this.target).margin;
            } else {
                this.placeholder.style.height = '';
                this.placeholder.style.margin = '';
            }
        }
    }

    targetIsTall() {
        return (this.getTargetHeight() + this.offset) > document.documentElement.clientHeight;
    }

    getTargetHeight() {
        return this.target.getBoundingClientRect().height;
    }

    //This method needs revision:
    //Position is not properly reported on certain browsers when using window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    getScrollDirection() {
        let direction,
            docScrollTop = this.placeholder.getBoundingClientRect().top;

        if ((this.scrollPosition > docScrollTop)) {
            direction = 'down';
        } else {
            direction = 'up';
        }

        this.scrollPosition = docScrollTop;

        return direction;
    }
}
