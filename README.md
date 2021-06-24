# Sticky #

Sets elements to 'position: fixed;' after window has scrolled to the 'target' element. Allows to set boundaries and other options. 

## Options and Callbacks ##

**target**: [HTMLElement] [**REQUIRED**] Target HTML Element to make sticky.

**offset**: [Integer | Selector | HTMLElement] *Default: 0*. Offset value or element referebce to set the target element as 'sticky', from top. Added as pixels. 

**useOffsetOnTarget**: [Boolean] *Default: false*. adds the offset value as position 'top: value;'.

**respondToParent**: [Boolean | HTMLElement] *Default: false*. If 'target' element is not meant to be full width, make it use the width of it's closest parent. Alternatively, pass an HTMLElement to use instead of the closest parent.

**containedInParent**:	[boolean | HTMLElement] *Default: false*. If an HTMLElement is provided, use that as the boundaries for the 'sticky' element. Set to **TRUE** to use closest parent, relative to the 'target' element.

**enabled**: [function] Runs once before initiallizing the module. If **false** is returned, the module will not initialiize.

## Usage ##

	var myFixedElement = new FixIt({
		target: document.querySelector('.my-sticky-element'),
		offset: 50,
		enabled: function() {   
		            //Do something
		            if (myCondition) {
		                return true;
		            }
		            return false;
		         },
	});
