/**
 * Multi slider plugin
 *
 * @author Adam Gee <adam@grana.com>
 */

(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define([ 'jquery', 'touchswipe' ], factory);
    } else {
        factory(jQuery);
    }
}(function($) {

    var defaults = {
        classSelector: '.multislider',
        infinite: false,
        visibleItems: 3,
        hideArrows: false,
        type: {
            format: 'default',
            motion: 'carousel',
        },
        nav: {
            enabled: false,
            classSelector: null,
        },
        navSelector: null,
        autoForward: {
            interval: null,
            pauseSelector: null,
        },
        swipeCallbacks: {
          left: null,
          right: null
        }
    };

    /**
     * Constructor
     *
     * @param  {object} element jQuery object
     * @param  {object} options Multislider settings
     */
    function multiSlider(element, options) {

        this.$el = element;

        this.$items;
        this.$item;
        this.$arrow;
        this.$arrowLeft;
        this.$arrowRight;
        this.$navList;
        this.visibleClass;
        this.arrowHide;
        this.infinite;
        this.itemWidth;
        this.nextEnabled = true;
        this.elWidth;
        this.executeTransition;
        this.imageSelection;
        this.nextImagePre;
        this.autoForward;
        this.autoForwardLock = false;
        this.totalItems;
        this.cacheItems = [];

        this.options = $.extend({}, defaults, options);

        this.init();
    }

    multiSlider.prototype = {

        /**
         * Initialize
         */
        init: function() {

            var context = this;
            this.device = this.$el.data('device');

            // remove periods in case the user has entered it with the class selector.
            var classPrefix = this.options.classSelector.replace(/\./g, '');

            this.$items = this.$el.find('.' + classPrefix + '-items');
            this.$item = this.$el.find('.' + classPrefix + '-item');
            this.$arrow = this.$el.find('*[class^="' + classPrefix + '-arrow"]');
            this.$arrowLeft = this.$el.find('.' + classPrefix + '-arrow-left');
            this.$arrowRight = this.$el.find('.' + classPrefix + '-arrow-right');
            this.visibleClass = 'is-visible';
            this.arrowHide = classPrefix + '-arrow-hide';
            this.infinite = this.options.infinite;

            if (!this.options.hideArrows) {
                this.showArrows();
            }

            this.totalItems = this.$items.children().length;
            this.typeConfiguration(this.options.type);

            // activate the autoforward feature
            var autoForwardOptions = this.options.autoForward;
            var autoForwardInterval = autoForwardOptions.interval;
            if (autoForwardInterval) {
                this.setAutoForward(autoForwardInterval);

                if (autoForwardOptions.pauseSelector) {
                    this.pauseAutoForward(autoForwardOptions.pauseSelector, autoForwardInterval);
                }
            }

            var navSelector = this.options.navSelector;
            if (navSelector) {
                this.$navList = $(navSelector);
                this.$navList.find('li').on('click', this.onNavDotClick.bind(this));
            }

            this.$arrow.on('click', function() {
                if (context.nextEnabled) {
                    context.nextImage(this);
                }
            });

            this.$el.swipe({
                swipeLeft: function() {
                    context.nextImage(1);

                    if (context.options.swipeCallbacks.left) {
                        context.options.swipeCallbacks.left();
                    }
                },
                swipeRight: function() {
                    context.nextImage(-1);

                    if (context.options.swipeCallbacks.right) {
                        context.options.swipeCallbacks.right();
                    }
                },
            });

        },

        /**
         * Fires when nav dot is clicked.
         * @param  {object} e jQuery object of dot element
         */
        onNavDotClick: function(e) {
            var context = this;
            if (!$(e.currentTarget).hasClass('is-selected')) {
                var index = $(e.currentTarget).index();
                context.imageSelection(index);
                context.cancelAutoForward();
                context.autoForwardLock = true;
            }
        },

        /**
         * Add item to the end or beginning of carousel to create
         * endless, infinite, loop.
         *
         * @param {number} direction The direction can be -1 for left or 1 for right
         */
        addInfiniteItem: function(direction) {
            var refPercentPos,$target,$newItem,itemIndex;

            if (direction === -1) {
                $target = this.$items.children().last();
                itemIndex = $target[0].itemIndex;
                refPercentPos = this.$items.children().first()[0].currentPercentPosition;
                $newItem = $target.clone(true);
                $newItem[0].itemIndex = itemIndex;
                this.setPercentagePosition($newItem[0], refPercentPos - 100);
                $newItem.prependTo(this.$items);
            } else {
                $target = this.$items.children().first();
                itemIndex = $target[0].itemIndex;
                refPercentPos = this.$items.children().last()[0].currentPercentPosition;
                $newItem = $target.clone(true);
                $newItem[0].itemIndex = itemIndex;
                this.setPercentagePosition($newItem[0], refPercentPos + 100);
                $newItem.appendTo(this.$items);
            }
            return $target;
        },

        /**
         * Add items from the supplied array to the end or beginning
         * of carousel.
         *
         * @param {number} direction direction values
         * @param {array} array      images to be added
         */
        addSpecificInfiniteItems: function(direction, array) {
            var refElement, refPercentPos, $newItem;
            var multiplier = 1;

            var context = this;

            if (direction === 1) {
                refElement = this.$items.children().last()[0];
            } else if (direction === -1) {
                refElement = this.$items.children().first()[0];
            }

            refPercentPos = refElement.currentPercentPosition;

            $.each(array, function(el, i) {
                context.cacheItems.push(this);

                $newItem = $(this).clone(true);
                $newItem[0].itemIndex = this.itemIndex;
                $newItem.removeClass('is-selected');

                var increment = direction * (multiplier * 100);
                context.setPercentagePosition($newItem[0], refPercentPos + increment);

                if (direction === 1) {
                    $newItem.appendTo(context.$items);
                } else if (direction === -1) {
                    $newItem.prependTo(context.$items);
                }

                multiplier++;
            });
        },

        /**
         * Get the x position from a percentage value that is
         * relative from the carousel element.
         *
         * @param  {number} perc Percentage to be converted
         * @return {number}      X position
         */
        calculateXPosFromPercentage: function(perc) {
            var percentPos = perc;
            var baseXPos = this.elWidth / 2 - this.itemWidth / 2;

            return baseXPos + ((percentPos / 100) * this.itemWidth);
        },

        /**
         * Deletes the stored images from the dom.
         * Cached items are saved in order for the carousel
         * animation to work.
         */
        deleteCacheItems: function() {
            $.each(this.cacheItems, function() {
                $(this).remove();
            });

            this.cacheItems = [];
        },

        /**
         * Fades in images after all images are loaded.
         *
         * @param  {number} delay The delay in miliseconds to fade in images
         */
        loadAllImages: function(delay,callback,callback2) {
            var context = this;
            var $images = this.$items.children().find('img');
            var totalImages = $images.length;
            var loadedImages = 0;

            $images.each(function() {
                var image = new Image();
                image.onload = function() {
                    loadedImages++;

                    if (loadedImages === totalImages) {

                        // These functions need to run after images have been loaded.
                        // Need to find a better solution to calculate positions without the images.
                        context.updateElementDimensions();
                        callback();
                        callback2();

                        setTimeout(function() {
                            var $newImageEl = context.$items.children().find('img');
                            $newImageEl.each(function() {
                                $(this).addClass('lazy-loaded');
                            });
                        }, delay);

                    }

                };
                image.src = $(this).attr('src');
            });
        },

        /**
         * Initial setup of slider depending on the options set. Handles the
         * motionTypes, carousel or fade, and the formatTypes, default or full.
         *
         * @param  {object} type Object containing the format and motion options
         */
        typeConfiguration: function(type) {
            var context = this;
            var format = type.format;
            var motion = type.motion;

            this.saveItemIndexes();

            var motionTypes = {
                carousel: function() {

                    if (context.options.type.format === 'full') {
                        context.setCarouselList();
                    }

                    var direction = -1;
                    context.addSpecificInfiniteItems(direction, context.checkNextCarouselImages(0));
                    context.deleteCacheItems();
                    context.nextEnabled = true;

                    context.setCarouselPositions();
                    context.executeTransition = context.carouselTransition;
                    context.imageSelection = context.selectCarouselImage;
                    context.nextImagePre = context.nextCarouselImage;

                    if (context.device === 'desktop') {

                        $(window).resize(function() {
                            context.updateElementDimensions();
                            if (context.options.type.format === 'full') {
                                context.setCarouselList();
                            }
                            context.setCarouselPositions();
                        });
                    }
                },

                fade: function() {
                    // context.setInitFadeItemPositions();
                    context.executeTransition = context.fadeTransition;
                    context.imageSelection = context.selectImage;
                    context.nextImagePre = context.nextImage;
                },
            };

            var formatTypes = {
                default: function() {
                    context.setContainerHeight();
                },
                full: function() {
                    context.setContainerFullHeight();
                },
            };

            if (motion === 'carousel') {
                // only have preloading for carousel, so the pdp.
                this.loadAllImages(300,motionTypes[motion],formatTypes[format]);
            } else {
                motionTypes[motion]();
                formatTypes[format]();
            }

        },

        /**
         * Retrive width of the multislider element
         *
         * @return {number} Width in pixels
         */
        getElWidth: function() {
            return this.$el.outerWidth();
        },

        /**
         * Saves the index onto the jQuery object in order to retrieve them
         * later after infinite carousel is used.
         */
        saveItemIndexes: function() {
            this.$items.children().each(function(i) {
                this.itemIndex = i;
            });
        },

        /**
         * Get the selected item's index
         *
         * @return {number} Index of the selected item in a carousel
         */
        getSelectedIndex: function() {
            return this.$items.find('.is-selected')[0].itemIndex;
        },

        /**
         * Sets the container width to be the item width in order
         * to center an item.
         */
        setCarouselList: function() {
            this.$items.css('width', this.itemWidth + 'px');
        },

        /**
         * Calculate and set the positions of the items
         */
        setCarouselPositions: function() {
            var context = this;
            var offset;
            var leftOffset = 1;
            var selectIndex = this.getSelectedIndex();
            var selectedElement = this.getElementByItemIndex(selectIndex);
            var selectedCurrrentIndex = $(selectedElement).index();
            var itemWidth = this.itemWidth;
            var lastIndex = this.totalItems - 1;


            this.$items.children().each(function(i) {
                var itemIndex = this.itemIndex;
                var directionToSelected = context.checkSiblingPosition(selectedElement, this);

                if (directionToSelected === -1) {
                    offset = $(this).index() - selectedCurrrentIndex;
                } else if (directionToSelected === 1) {
                    offset = leftOffset;
                    leftOffset++;
                } else {
                    offset = 0;
                }

                var percPos = offset * 100;
                context.setPercentagePosition(this, percPos);
            });

            this.checkArrowVisibility();
        },

        /**
         * Calculate and set the positions of the motion type fade items
         */
        setInitFadeItemPositions: function() {
            var context = this;
            // this doesnt really work with resizing of the browser and updating the positions.
            // Need to be worked on.
            this.$item.each(function(index) {
                context.setXpos(this, 0);
            });

            this.checkArrowVisibility();
        },

        /**
         * Set container height of slides to be the same as the children
         * slides.
         */
        setContainerHeight: function() {
            var itemHeight = this.$items.find('.multislider-item').outerHeight();
            this.$items.css('height', itemHeight + 'px');
        },

        /**
         * Set container height to one hundred percent of its parent.
         */
        setContainerFullHeight: function() {
            this.$items.add(this.$item).css('height', '100%');
        },

        /**
         * Set the passed item as selected
         *
         * @param {object} obj Item
         */
        setSelectedItem: function(obj) {
            this.$items.find('.is-selected').removeClass('is-selected');
            $(obj).addClass('is-selected');
        },

        /**
         * Set the transform position using percentages
         *
         * @param {object} obj  Carousel item object
         * @param {number} perc Percentage to be set
         */
        setPercentagePosition: function(obj, perc) {
            var percentPos = perc;

            $(obj).css(whichTransform(), 'translate(' + percentPos + '%, 0%)');
            obj.currentPercentPosition = percentPos;
            obj.currentXPosition = this.calculateXPosFromPercentage(percentPos);

            if (percentPos === 0) {
                this.setSelectedItem(obj);
            }

            this.setVisibleItem(obj);
        },

        /**
         * Set the transform position using px values.
         *
         * @param {object} obj  Fade item object
         * @param {number} x    Value to be set
         */
        setXpos: function(obj, x) {

            var xPos = x;

            // whichTransform retrieves the supported prefix for transforms
            $(obj).css(whichTransform(), 'translate(' + xPos + 'px, 0px)');
            obj.currentXPosition = xPos;

            this.setVisibleItem(obj);

        },

        /**
         * Trigger the display of the slider arrows.
         * Disabled by default.
         */
        showArrows: function() {
            this.$arrowLeft.add(this.$arrowRight).show();
        },

        /**
         * Displays the arrows if there are next or prev slides.
         */
        checkArrowVisibility: function() {

            if (this.infinite === true) {
                return;
            }

            var firstItem = this.$item.first()[0];
            var lastItem = this.$item.last()[0];

            if (firstItem.currentXPosition >= 0) {
                this.$arrowLeft.addClass(this.arrowHide);
            } else {
                this.$arrowLeft.removeClass(this.arrowHide);
            }

            if (lastItem.currentXPosition < this.elWidth) {
                this.$arrowRight.addClass(this.arrowHide);
            } else {
                this.$arrowRight.removeClass(this.arrowHide);
            }
        },

        /**
         * Sets the slides as visible if any portion of a slide is
         * within the user's viewport.
         *
         * @param {object} item Slide object
         */
        setVisibleItem: function(item) {

            var xPos = item.currentXPosition;

            if (xPos + this.itemWidth > 0 && xPos < this.elWidth) {
                $(item).addClass(this.visibleClass);
            } else {
                $(item).removeClass(this.visibleClass);
            }

        },

        /**
         * Sets the selected nav item as selected.
         *
         * @param  {number} index Nav item index
         */
        selectNavItem: function(index) {
            if (this.$navList && this.$navList.length > 0) {
                this.$navList.find('.is-selected').removeClass('is-selected');
                this.$navList.find('li').eq(index).addClass('is-selected');
            }

        },

        /**
         * Transition for motion type carousel
         *
         * @param  {number} index     Index of the selected item
         * @param  {string} direction 'left' or 'right'
         */
        carouselTransition: function(index, direction, enableInfinite) {

            var context = this;
            var indexDifference = index - this.getSelectedIndex();
            var totalImagesGap = Math.abs(indexDifference);
            var $extraneousEl;


            this.nextEnabled = false;

            // only operates for nextImage use
            if (enableInfinite) {
                // prevent the function from continuing if there is no next image
                totalImagesGap = 1;
                if (!this.checkNextImage(direction)) {

                    if (this.infinite) {
                        $extraneousEl = this.addInfiniteItem(direction);
                    } else {
                        return;
                    }

                }
            }

            // timeout is need as addInfiniteItem may add new item to DOM
            setTimeout(function() {
                // loop through items to update positions
                context.$items.children().each(function(index) {
                    var percentPos;

                    if (direction === -1) {
                        percentPos = this.currentPercentPosition + totalImagesGap * 100;
                    } else {
                        percentPos = this.currentPercentPosition - totalImagesGap * 100;
                    }

                    context.setPercentagePosition(this, percentPos);
                });

                context.checkArrowVisibility();
            }, 50);

            setTimeout(function() {
                context.deleteCacheItems();
                context.nextEnabled = true;
                if ($extraneousEl) {
                    $extraneousEl.remove();
                }
            }, 300);

        },

        /**
         * Transition for motion type fade
         *
         * @param  {number} index     Index of the selected item
         * @param  {string} direction 'left' or 'right'
         */
        fadeTransition: function(index, direction) {

            var context = this;
            var $active = this.$items.find('.is-selected');
            var $target = this.$item.eq(index);

            this.$el.find('.is-previous').removeClass('is-previous');
            $active.addClass('is-previous').removeClass('is-selected');

            $target.addClass('is-selected');

        },

        /**
         * Determine if we should scroll to the next image.
         * If no image is next then return false.
         *
         * @param  {string} direction -1 or 1
         * @return {boolean}          true or false
         */
        checkNextImage: function(direction) {

            var context = this;
            var nextImage = false;

            this.$items.children().each(function(index) {

                var xPos = this.currentXPosition;

                if (xPos >= context.elWidth && direction === 1) {
                    nextImage = true;
                } else if (0 > xPos && xPos + context.itemWidth <= 0 && direction === -1) {
                    nextImage = true;
                }

            });

            return nextImage;

        },

        /**
         * Determines the next image and executes the transition.
         *
         * @param  {string} e Direction of the slide
         */
        nextImage: function(e) {
            var context = this;
            var direction = (e == -1 || e == 1) ? e : $(e).data('direction');
            var targetIndex;

            var $active = this.$items.find('.is-selected');
            var activeIndex = $active[0].itemIndex;

            if (direction == -1) {
                targetIndex = activeIndex - 1;
                if (targetIndex < 0) {
                    targetIndex = this.totalItems - 1;
                }
            } else {
                targetIndex = activeIndex + 1;
                if (targetIndex > this.totalItems - 1) {
                    targetIndex = 0;
                }
            }

            this.executeTransition(targetIndex, direction, true);
            this.selectNavItem(targetIndex);

        },

        nextCarouselImage: function(e) {

            var direction = (e == 'left' || e == 'right') ? e : $(e).data('direction');
            var active = this.getSelectedIndex();

            if (direction == 'left') {
                if (active > 0) {
                    targetIndex = active - 1;
                } else {
                    targetIndex = this.totalItems - 1;
                }
            } else {
                if (active < this.totalItems - 1) {
                    targetIndex = active + 1;
                } else {
                    targetIndex = 0;
                }
            }

            this.selectCarouselImage(targetIndex);

        },

        /**
         * Gets the direction from the selected item to the supplied index.
         * The direction is based upon an items initial index, and not its
         * current position within the items.
         *
         *
         * @param  {number} index initial index of the item
         * @return {number}       -1,1
         */
        getDirectionFromSelected: function(index) {
            var indexDifference = index - this.getSelectedIndex();
            return Math.sign(indexDifference);
        },

        /**
         * Finds the images needed to maintain carousel effect
         * when using the nav indicators.
         *
         * @param  {number} index the item to animate to
         * @return {array}        array of item jquery objects
         */
        checkNextCarouselImages: function(index) {
            var indexDifference = index - this.getSelectedIndex();
            var direction = this.getDirectionFromSelected(index);
            var totalImagesGap = Math.abs(indexDifference);
            var count = 0;
            var arrayOfItems = [];

            if (totalImagesGap > 0) {
                for (var i = this.getSelectedIndex() + direction; count < totalImagesGap; i += direction) {
                    count++;

                    var nextEl = this.getElementByItemIndex(i);
                    var siblingPosition = this.checkSiblingPosition(this.getElementByItemIndex(this.getSelectedIndex()), nextEl);
                    if (siblingPosition === -1 && direction > 0) {
                        arrayOfItems.push(nextEl);
                    } else if (siblingPosition === 1 && direction < 0) {
                        arrayOfItems.push(nextEl);
                    }

                    // the newly selected image item
                    if (i === index) {
                        var nextImage = index + direction;
                        var firstIndex = 0;
                        var lastIndex = this.totalItems - 1;

                        if (nextImage > lastIndex) {
                            nextImage = 0;
                        } else if (nextImage < firstIndex) {
                            nextImage = lastIndex;
                        }

                        var extraEl = this.getElementByItemIndex(nextImage);
                        var extraPosition = this.checkSiblingPosition(this.getElementByItemIndex(this.getSelectedIndex()), extraEl);
                        if (extraPosition === -1 && direction > 0) {
                            arrayOfItems.push(extraEl);
                        } else if (extraPosition === 1 && direction < 0) {
                            arrayOfItems.push(extraEl);
                        } else if (extraPosition === 0) {
                            arrayOfItems.push(extraEl);
                        }
                    }
                }
            } else {

                var nextImage = index + 1;
                var prevImage = index - 1;

                var firstIndex = 0;
                var lastIndex = this.totalItems - 1;

                if (nextImage > lastIndex) {
                    nextImage = 0;
                }

                var extraEl = this.getElementByItemIndex(nextImage);
                var extraPosition = this.checkSiblingPosition(this.getElementByItemIndex(this.getSelectedIndex()), extraEl);

                if (extraPosition === -1) {
                    arrayOfItems.push(extraEl);
                }

                if (prevImage < firstIndex) {
                    prevImage = lastIndex;
                }

                var extraEl = this.getElementByItemIndex(prevImage);
                var extraPosition = this.checkSiblingPosition(this.getElementByItemIndex(this.getSelectedIndex()), extraEl);

                if (extraPosition === 1) {
                    arrayOfItems.push(extraEl);
                }
            }


            return arrayOfItems;
        },

        /**
         * Determines the direction in which an item is currently
         * positioned in relation to another.
         *
         * @param  {object} point item
         * @param  {object} el    item
         * @return {number}       -1,0, or 1 indicating direction of el
         */
        checkSiblingPosition: function(point, el) {
            var pointCurPlacementIndex = $(point).index();
            var elCurPlacementIndex = $(el).index();

            if (elCurPlacementIndex > pointCurPlacementIndex) {
                return 1;
            } else if (elCurPlacementIndex < pointCurPlacementIndex) {
                return -1;
            } else {
                return 0;
            }
        },

        /**
         * Retrieves the item using its intial index.
         *
         * @param  {number} index item index
         * @return {object}       item
         */
        getElementByItemIndex: function(index) {
            var el;

            this.$items.children().each(function(i) {
                if (this.itemIndex === index) {
                    el = this;
                    return;
                }
            });

            return el;
        },

        /**
         * Select an image using a supplied index.
         *
         * @param  {number} index Index of slide item
         */
        selectImage: function(index) {
            this.executeTransition(index, null);
            this.selectNavItem(index);
        },

        /**
         * Select an image using a supplied index.
         *
         * @param  {number} index Index of slide item
         */
        selectCarouselImage: function(index) {
            var direction = this.getDirectionFromSelected(index);
            this.addSpecificInfiniteItems(direction, this.checkNextCarouselImages(index));

            this.executeTransition(index, direction, false);
            this.selectNavItem(index);
        },

        /**
         * Sets the auto forward interval.
         *
         * @param {number} interval The interval in miliseconds
         */
        setAutoForward: function(interval) {
            var context = this;

            if (this.autoForwardLock === false) {
                this.autoForward = setInterval(function() {
                    context.nextImage('right');
                }, interval);
            }
        },

        /**
         * Stops the auto forward interval
         */
        cancelAutoForward: function() {
            if (this.autoForward) {
                clearInterval(this.autoForward);
            }
        },

        /**
         * Runs through selectors that will disable the autoForward until mouseout
         *
         * @param  {string} selectors jQuery selectors
         * @param  {number} interval  Interval in miliseconds
         */
        pauseAutoForward: function(selectors, interval) {
            var context = this;
            $(selectors).on({
                mouseenter: function() {
                    context.cancelAutoForward();
                },
                mouseleave: function() {
                    context.setAutoForward(interval);
                },
            });
        },

        /**
         * Update width variables. Used on resize to ensure accuracy.
         */
        updateElementDimensions: function() {
            this.elWidth = this.getElWidth();
            this.itemWidth = this.$items.children().first().outerWidth();
        },

    };


    $.fn.multiSlider = function(options) {
        return new multiSlider(this, options);
    };

}));
