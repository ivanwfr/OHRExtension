// ┌───────────────────────────────────────────────────────────────────────────┐
// │ popup_js ...................................................... POPUP_TAG │
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
/* jshint  esversion: 9, laxbreak:true, laxcomma:true, boss:true */
/* globals chrome    */
/* exported popup_js */

const P_SCRIPT_ID  = "popup_js";
const P_SCRIPT_TAG =  P_SCRIPT_ID +" (230829:19h:22)"; /* eslint-disable-line no-unused-vars */

/*}}}*/

let popup_js = (function() {
"use strict";

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ POPUP JUST DISPLAYED                               ● DOMContentLoaded │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ DOMContentLoaded_listener {{{*/
    /*{{{*/
    const CSS_COLOR_MANIFEST_V2 =    "red";
    const CSS_COLOR_MANIFEST_V3 = "orange";
    const CSS_COLOR_MANIFEST_XX =  "white";

    /*}}}*/
    let DOMContentLoaded_listener = function ()
    {
        if(!chrome.runtime ) return; // not there when opened to adjust style with Devtools

        // ┌───────────────────────────────────────────────────────────────────┐
        // │ Popup UI                                                          │
        // └───────────────────────────────────────────────────────────────────┘
        let body           = document.getElementsByTagName("body"       )[0];
        let manifest_panel = document.getElementById      ("manifest"   );
        let reload_button  = document.getElementById      ("reload_page");

        // ┌───────────────────────────────────────────────────────────────────┐
        // │ Extension manifest (v2 ● v3)                ● color ● description │
        // └───────────────────────────────────────────────────────────────────┘
        let mf = chrome.runtime.getManifest();
        let text_color
            = (mf.manifest_version == 2) ? CSS_COLOR_MANIFEST_V2
            : (mf.manifest_version == 3) ? CSS_COLOR_MANIFEST_V3
            :                              CSS_COLOR_MANIFEST_XX
        ;
        body   .style.color = text_color;
        manifest_panel.textContent       = "● manifest v"+mf.manifest_version+" ●";
        manifest_panel.title             =                mf.description;

        // ┌───────────────────────────────────────────────────────────────────┐
        // │ reload_button handler                                     ● click │
        // └───────────────────────────────────────────────────────────────────┘
        reload_button.addEventListener("click", p_send_reload_message);
    };
    /*}}}*/
    document.addEventListener("DOMContentLoaded", DOMContentLoaded_listener);

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MONITOR popup_showing_windowId               ● Extension icon clicked │
    // └───────────────────────────────────────────────────────────────────────┘
    if( chrome && chrome.runtime)
        chrome.runtime.connect({ name: "popup" });

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MESSAGE TO BACKGROUND    ● query ● reload  ● chrome.runtime.onMessage │
    // └───────────────────────────────────────────────────────────────────────┘
    /*{{{*/
    const GREETING_GOOD_DAY = "...got it, Have a good day!";
    const GREETING_SEE_YOU  = "...got this one too, See you soon!";

    /*}}}*/
    /*_ p_send_reload_message {{{*/
    let p_send_reload_message = function(e)
    {
        let id  = e.target.id;
        if( id != "reload_page") return;

        /* POPUP UI */
        let  logging_el = document.getElementById  ("logging" );
        let location_el = document.querySelector   ("input[type='radio'][name='location']:checked");

        /* MESSAGE TO background_js */
        let         cmd = "reload";
        let     logging = ( logging_el &&  logging_el.checked);
        let      method = (location_el && location_el.id     );

        let message     = { cmd, logging, method, caller: P_SCRIPT_ID };

        chrome.runtime.sendMessage(message, p_sendMessage_response_handler);
    };
    /*}}}*/
    /*_ p_sendMessage_response_handler {{{*/
    let p_sendMessage_response_handler = function(response, sender, response_handler)
    {
        /* UPDATE POPUP UI WITH background_js REPLY */
        if(typeof response != "undefined")
            p_UI_show_message( response );

        if( response_handler )
            response_handler({ info: GREETING_GOOD_DAY }); // ACK

        return !!response_handler; // whether to wait for an async response .. or not
    };
    /*}}}*/
    if( chrome.runtime ) // not there when opened to adjust style with Devtools
        chrome.runtime.sendMessage({ query: "tab" , caller: P_SCRIPT_ID }, p_sendMessage_response_handler);

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MESSAGE FROM BACKGROUND            ● REPLY ● chrome.runtime.onMessage │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ p_onMessage_CB {{{*/
    let p_onMessage_CB = function(message,sender,response_handler) /* eslint-disable-line no-unused-vars */
    {
        if(message.caller == P_SCRIPT_ID) return false; // do not handle own message

        /* UPDATE POPUP UI WITH background_js MESSAGE */
        p_UI_show_message( message );

        if( response_handler )
            response_handler({ info: GREETING_SEE_YOU }); // ACK

        return !!response_handler; // whether to wait for an async response .. or not
    };
    /*}}}*/
    if( chrome.runtime ) // not there when opened to adjust style with Devtools
        chrome.runtime.onMessage.addListener( p_onMessage_CB );

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ POPUP UI UPDATE                            ● background.js ↔ popup.js │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ p_UI_show_message {{{*/
    /*{{{*/
    const CSS_COLOR_RIGHT = "#66FF66";
    const CSS_COLOR_WRONG =     "red";
    let p_status;

    /*}}}*/
    let p_UI_show_message = function(message)
    {
        /* TAB ID {{{*/
        let last_tabId_el           = document.getElementById("last_tabId");
        if( last_tabId_el && message.last_tabId)
        {
            last_tabId_el.innerHTML = message.last_tabId+" <sup><i>(tabId)</i></sup>";
        }
        /*}}}*/
        /* TAB URL {{{*/
        let last_url_el             = document.getElementById("last_url"  );
        if( last_url_el   && message.last_url)
        {
            last_url_el  .innerHTML = message.last_url;
            last_url_el  .title     = message.last_url;
        }
        /*}}}*/
        /* TAB STATUS {{{*/
        if( message.REPLY || message.error )
        {
            /* [p_status] CREATE {{{*/
            if(!p_status )
            {
                p_status                  = document.createElement("P");
                p_status.id               = "p_status";

                p_status.style.margin     =   "auto";
                p_status.style.textAlign  =   "left";
                p_status.style.maxWidth   =   "28ch";

                document.body.insertBefore(p_status, null); // i.e. at the end
            }
            /*}}}*/

            let txt
                = message.REPLY || message.error;

            let wrong
                =  txt              .includes(" NOT "  )
                || txt.toLowerCase().includes("cannot ");

            p_status.title          = txt;
            p_status.innerHTML      = txt.replace("\n","<br>");
            p_status.style.color    = wrong ? CSS_COLOR_WRONG : CSS_COLOR_RIGHT;
            p_status.style.display  = "block";
        }
        else if(p_status)
        {
            p_status.style.display  = "none";

        }
        /*}}}*/
        // RELOAD button ● enabled f(URL) {{{*/
        /* Enable [reload_page button] ONLY WHEN CURRENT PAGE URL IS NOT MISSING*/
        let url_is_missing
            = (typeof message.last_url != "undefined")
            &&       !message.last_url
        ;

        document.getElementById("reload_page")
            .disabled = url_is_missing ;
        /*}}}*/
    };
    /*}}}*/

})();

/* @see popup.html */
