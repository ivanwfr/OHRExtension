// ┌───────────────────────────────────────────────────────────────────────────┐
// │ popup_js ...................................................... POPUP_TAG │
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
/* jshint  esversion: 9, laxbreak:true, laxcomma:true, boss:true */
/* globals chrome    */
/* exported popup_js */

const P_SCRIPT_ID  = "popup_js";
const P_SCRIPT_TAG =  P_SCRIPT_ID +" (230828:23h:59)"; /* eslint-disable-line no-unused-vars */

/*}}}*/

let popup_js = (function() {
"use strict";

    /*_ DOMContentLoaded_listener {{{*/
    let DOMContentLoaded_listener = function ()
    {
        if(!chrome.runtime ) return; // not there when opened to adjust style with Devtools

        let mf = chrome.runtime.getManifest();

        let text_color
            = (mf.manifest_version == 2) ?    "red"
            : (mf.manifest_version == 3) ? "orange"
            :                               "white"
        ;
        document.getElementsByTagName("body")[0].style.color
            = text_color;

        document.getElementById("manifest")
            .textContent = "● manifest v"+mf.manifest_version+" ●";

        document.getElementsByTagName("body")[0].title
            = mf.description;

        document.getElementById("reload_page").addEventListener("click", p_send_reload_message);
    };
    /*}}}*/

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MONITOR popup_showing_windowId                                        │
    // └───────────────────────────────────────────────────────────────────────┘
    if(chrome && chrome.runtime) chrome.runtime.connect({ name: "popup" });

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ POPUP UI                                                              │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ p_UI_show_message {{{*/
    /*{{{*/
    let p_status;

    /*}}}*/
    let p_UI_show_message = function(message)
    {
        /* TAB ID {{{*/
        let last_tabId_el  = document.getElementById("last_tabId");
        if( last_tabId_el && message.last_tabId)
        {
            last_tabId_el.innerHTML = message.last_tabId+" <sup><i>(tabId)</i></sup>";
        }
        /*}}}*/
        /* TAB URL {{{*/
        let last_url_el    = document.getElementById("last_url"  );

        if( last_url_el    && message.last_url)
        {
            last_url_el  .innerHTML = message.last_url                     ;
            last_url_el  .title     = message.last_url                     ;
        }
        /*}}}*/
        /* TAB STATUS {{{*/
        if(message.REPLY     )
        {
            /* [p_status] CREATE {{{*/
            if(!p_status )
            {
                p_status                   = document.createElement("P");
                p_status.id                = "p_status";

                p_status.style.margin      = "auto";
                p_status.style.whiteSpace  = "nowrap";
                p_status.style.textAlign   = "left";
                p_status.style.maxWidth    = "28ch";

                document.body.insertBefore(p_status, null); // i.e. at the end
            }
            /*}}}*/

            p_status.title         = message.REPLY;
            p_status.innerHTML     = message.REPLY.replace("\n","<br>");
            p_status.style.color   = message.REPLY.includes(" NOT ") ? "red" : "#66FF66";
            p_status.style.display = "block";
        }
        else if(p_status)
        {
            p_status.style.display = "none";

        }
        /*}}}*/

        /* Enable [reload_page button] ONLY WHEN CURRENT PAGE URL IS NOT MISSING*/
        let url_is_missing
            = (typeof message.last_url != "undefined")
            &&       !message.last_url
        ;
        document.getElementById("reload_page")
            .disabled = url_is_missing ;

    };
    /*}}}*/
    document.addEventListener("DOMContentLoaded", DOMContentLoaded_listener);

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MESSAGE   TO BACKGROUND  ● query ● reload  ● chrome.runtime.onMessage │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ p_send_reload_message {{{*/
    let p_send_reload_message = function(e)
    {
        /* MESSAGE TO background_js */
        let id  = e.target.id;
        if( id == "reload_page")
        {
            /* POPUP UI */
            let  logging_el = document.getElementById  ("logging" );
            let location_el = document.querySelector   ("input[type='radio'][name='location']:checked");

            /* MESSAGE TO background_js */
            let         cmd = "reload";
            let     logging = ( logging_el &&  logging_el.checked);
            let      method = (location_el && location_el.id     );

            let message     = { cmd, logging, method, caller: P_SCRIPT_ID };

            chrome.runtime.sendMessage(message, p_sendMessage_response_handler);
        }

    };
    /*}}}*/
    /*_ p_sendMessage_response_handler {{{*/
    let p_sendMessage_response_handler = function(response, sender, response_handler)
    {
        /* UPDATE POPUP UI WITH background_js REPLY */
        if(typeof response != "undefined")
            p_UI_show_message( response );

        return (response_handler != null); // whether to wait for an async response .. or not
    };
    /*}}}*/
    if( chrome.runtime ) // not there when opened to adjust style with Devtools
        chrome.runtime.sendMessage({ query: "tab" , caller: P_SCRIPT_ID }, p_sendMessage_response_handler);

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MESSAGE FROM BACKGROUND SCRIPT     ● REPLY ● chrome.runtime.onMessage │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ p_onMessage_CB {{{*/
    let p_onMessage_CB = function(message,sender,response_handler=null) /* eslint-disable-line no-unused-vars */
    {
        if(message.caller == P_SCRIPT_ID) return false; // do not handle own message

        /* UPDATE POPUP UI WITH background_js MESSAGE */
        p_UI_show_message( message );

        return (response_handler == null);
    };
    /*}}}*/
    if( chrome.runtime ) // not there when opened to adjust style with Devtools
        chrome.runtime.onMessage.addListener( p_onMessage_CB );

})();

/* @see popup.html */
