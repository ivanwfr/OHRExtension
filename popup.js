// ┌───────────────────────────────────────────────────────────────────────────┐
// │ popup_js ...................................................... POPUP_TAG │
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
/* jshint  esversion: 9, laxbreak:true, laxcomma:true, boss:true */
/* globals chrome    */
/* exported popup_js */

const P_SCRIPT_ID       = "popup_js";
const P_SCRIPT_TAG      =  P_SCRIPT_ID +" (230826:22h:26)"; /* eslint-disable-line no-unused-vars */

/*}}}*/

let popup_js = (function() {
"use strict";

/*_ DOMContentLoaded_listener {{{*/
let DOMContentLoaded_listener = function ()
{

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
    // │ POPUP UI                                                              │
    // └───────────────────────────────────────────────────────────────────────┘
/*_ p_UI_show_message {{{*/
//const P_SHOW_MESSAGE_DELAY = 3000;
let p_status;

let p_UI_show_message = function(message)
{

    if(message.last_tabId) document.getElementById("last_tabId").innerHTML = message.last_tabId+" <sup><i>(tabId)</i></sup>";
    if(message.last_url  ) document.getElementById("last_url"  ).innerHTML = message.last_url                     ;
    if(message.REPLY     ) {
        /* [p_status] CREATE {{{*/
        if(!p_status )
        {
            p_status                   = document.createElement("P");
            p_status.id                = "p_status";

            p_status.style.margin      = "auto";
            p_status.style.whiteSpace  = "pre-wrap";
            p_status.style.color       = "#66FF66";
            p_status.style.textAlign   = "left";

            document.body.insertBefore(p_status, null); // i.e. at the end
        }
        /*}}}*/
        p_status.innerHTML = message.REPLY.replace("\n","<br>");
        p_status.style.display = "block";
//      setTimeout(() => { if(p_status) p_status.style.display = "none"; }, P_SHOW_MESSAGE_DELAY);
    }
    else if(p_status)
    {
        p_status.style.display = "none";
    }
    /* Enable [reload_page button] ONLY WHEN CURRNET PAGE URL IS NOT MISSING*/
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
    let id = e.target.id;

    /* MESSAGE TO background_js */
    if(id == "reload_page")
    {
        let message
            = {    cmd : "reload"
//            ,  tabId : parseInt(document.getElementById("last_tabId").innerText)
//            ,    url :          document.getElementById("last_url"  ).innerText
              ,  caller: P_SCRIPT_ID
            };
        chrome.runtime.sendMessage(message, p_sendMessage_response_handler);
    }

};
/*}}}*/
/*_ p_sendMessage_response_handler {{{*/
let p_sendMessage_response_handler = function(response, sender, response_handler)
{

    if(typeof response != "undefined")
    {
        p_UI_show_message( response );
    }

return (response_handler != null); // whether to wait for an async response .. or not
};
/*}}}*/
    chrome.runtime.sendMessage({ query: "tab" , caller: P_SCRIPT_ID }, p_sendMessage_response_handler);

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MESSAGE FROM BACKGROUND SCRIPT     ● REPLY ● chrome.runtime.onMessage │
    // └───────────────────────────────────────────────────────────────────────┘
/*_ p_onMessage_CB {{{*/
let p_onMessage_CB = function(message,sender,response_handler=null) /* eslint-disable-line no-unused-vars */
{

    if(message.caller == P_SCRIPT_ID) return false;

    p_UI_show_message( message );

    return (response_handler == null);
};
/*}}}*/
    chrome.runtime.onMessage.addListener( p_onMessage_CB );

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MONITOR popup_showing_windowId                                        │
    // └───────────────────────────────────────────────────────────────────────┘
    if(chrome && chrome.runtime) chrome.runtime.connect({ name: "popup" });

})();

/* @see popup.html */
