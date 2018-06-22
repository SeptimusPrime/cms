/**
 *
 * Grana Transparent Navigation jQuery plugin
 * Author: Adam Gee
 *
 */


(function($) {

    $.fn.TransparentNav = function(options){

          //add added options to the defaults
        var opts = $.extend( {}, $.fn.TransparentNav.defaults, options );


        //initialize
        var context = this;
        //Events
        var $headContainer = $(context);

        var $targetHead = $headContainer.find('#head');

        var $triggerEl = $(opts.triggerElement);


        this.wh = $(window).outerHeight();

        this.totalHeight = $headContainer.outerHeight();


        $headContainer.on('subMenuHidden', subMenuHidden);

        $headContainer.on({
            mouseenter: function(){
                $targetHead.addClass('reveal');
            },
            mouseleave: function(){

                if(!checkExpand()){
                    $targetHead.removeClass('reveal');
                }

            }
        });

        if(opts.triggerElement){

            var $triggerEl = $(opts.triggerElement);
            /**
             * Scrollmagic setup
             */
            var controller = new ScrollMagic.Controller({globalSceneOptions: {duration: 0, triggerHook: this.totalHeight/this.wh }});
                // build scenes
                var scene = new ScrollMagic.Scene({triggerElement: opts.triggerElement})
                    .setClassToggle("#head", "static") // add class toggle
                    .offset($triggerEl.outerHeight())
                    .addTo(controller);
        }


        function checkExpand(){
            if($headContainer.hasClass('expand-bg')){
                return true;
            }
            return false;
        }

        /**
         * When the submenu is fully hidden and trigger is executed in the navigation script
         *
         */
        function subMenuHidden(){

            if(!$headContainer.is(':hover')){
                $targetHead.removeClass('reveal');
            }else{

            }
        }

        return this;
    }

    $.fn.TransparentNav.defaults = {
        triggerElement: null
    };
})(jQuery);
