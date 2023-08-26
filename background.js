// ┌───────────────────────────────────────────────────────────────────────────┐
// │ background.js ......................................... BACKGROUND SCRIPT │
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
/* jshint  esversion: 9, laxbreak:true, laxcomma:true, boss:true */
/* globals importScripts, log_js, chrome */
/* exported b */

const MANIFEST_VERSION  = (typeof chrome.tabs.executeScript == "undefined") ?  "v3" : "v2";
const B_SCRIPT_ID       = "background_js";
const B_SCRIPT_TAG      =  B_SCRIPT_ID +" manifest "+MANIFEST_VERSION+" (230826:22h:04)"; /* eslint-disable-line no-unused-vars */

/*}}}*/

let background_js = (function() {
"use strict";
    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ log.js ...................................................... LOGGING │
    // └───────────────────────────────────────────────────────────────────────┘
    importScripts("log.js");
    let log = log_js.log;

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ LISTENER onHeadersReceived                                            │
    // └───────────────────────────────────────────────────────────────────────┘
    const CALLER_OHR_LISTENER_TIMEOUT = "OHR LISTENER TIMEOUT";
    /*_ add_OHR_listener {{{*/
    let add_OHR_listener = function()
    {
        let blocking
            = chrome.runtime.getManifest().permissions.includes("webRequestBlocking");

        let extraInfoSpec
            = blocking
            ? [   chrome.webRequest.OnHeadersReceivedOptions.RESPONSE_HEADERS // to include the response headers in the details object passed to the listener
                , chrome.webRequest.OnHeadersReceivedOptions.BLOCKING         // to make the request synchronous, so you can modify request and response headers
                , chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived
            ]
            : [   chrome.webRequest.OnHeadersReceivedOptions.RESPONSE_HEADERS
                , chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS
            ]
        ;

        log("● ADDING ORH LISTENER ("+(blocking ? "blocking":"not blocking")+"):");
        log(". chrome.webRequest.onHeadersReceived.addListener:");
        console.log(". extraInfoSpec", extraInfoSpec);

        chrome
            .webRequest
            .onHeadersReceived
            .addListener(   ohr_listener
                          , {urls: ["<all_urls>"]}
                          , extraInfoSpec
                        );
    };
    /*_ del_OHR_listener {{{*/
    let del_OHR_listener = function()
    {
        if(!chrome.webRequest.onHeadersReceived.hasListener(ohr_listener))
            return;

        log("● REMOVING ORH LISTENER:");
        chrome.webRequest.onHeadersReceived.removeListener(ohr_listener);
    };
    /*}}}*/
    /*}}}*/
    /*_ ohr_listener {{{*/
    /*{{{*/
    const CSP_HEADER_NAME = "content-security-policy";
    const CHECK_DEBOUNCE_MS = 2000;

    let   ohr_listener_check_timeout;
    let   last_count = 0;
    let   last_csp;
    /*}}}*/
    let ohr_listener = function(details)
    {
        /* START COLLECTING {{{*/
        if(!ohr_listener_check_timeout  )
        {
//      console.clear();

            last_count = 0;
            last_csp   = null;

            log("▼ FIRST EVENT RECEIVED: "+ details.url);
            console.log("details:", details);
            console.groupCollapsed("%c responseHeaders", "font-size:200%; border: 3px orange solid; border-radius:1em; padding:0 1em;");
        }
        else {
            clearTimeout(ohr_listener_check_timeout);
        }
        /*}}}*/

        last_count += 1;

        /* LOOK FOR THE FIRST CSP_HEADER_NAME {{{*/
        if(!last_csp)
        {
            for(let i=details.responseHeaders.length-1; i >= 0; --i)
            {
                if(details.responseHeaders[i].name ==  CSP_HEADER_NAME)
                {

                    /* CSP NOT FROM FIRST RECEIVED HEADER */
                    if(last_count > 1)
                        console.log("details:", details);

                    let csp_status
                        = (last_count > 1)
                        ?  "CSP NOT FROM FIRST RECEIVED HEADER"
                        :          "from first received header"
                    ;

                    last_csp
                        = {  csp_status
                           , header_num     : last_count
                           , reponseHeaders : "#"+i
                           , url            : details.url
                           , csp            : details.responseHeaders[i]
                        };

                    break;
                }
            }
        }
        /*}}}*/

        let csp_status = "CSP_RECEIVED "+(last_csp ? "✔":"-");
                log( (last_count<10 ?" ":"")+last_count
                   + " ["+csp_status+"] "
                   + details.url
                   );
 //     console.log(details);

        ohr_listener_check_timeout
            =  setTimeout(check_DNR, CHECK_DEBOUNCE_MS, details.tabId, CALLER_OHR_LISTENER_TIMEOUT);

      //return a webRequest.BlockingResponse if extraInfoSpec has blocking argument
    };
    /*}}}*/
    /*_ check_DNR {{{*/
    let check_DNR = async function(tabId,_caller)
    {
        /* ● [CALLER_TAB_UPDATED] had precedence over [CALLER_OHR_LISTENER_TIMEOUT] {{{*/
        if(_caller == CALLER_OHR_LISTENER_TIMEOUT)
        {
            if(!ohr_listener_check_timeout)
                return;
        }
        /*}}}*/
        /* ● TERMINATE ON RELOAD OHR COLLECTING {{{*/
        if(ohr_listener_check_timeout)
        {
            console.groupEnd();

            b_send_REPLY_to_POPUP();

            /* discard pending CALLER_OHR_LISTENER_TIMEOUT */
            ohr_listener_check_timeout = null;
        }

        /* ignore further OHR events until next reload request */
        del_OHR_listener();

        /*}}}*/
        /* ● REPORT MATCHED RULES {{{*/

        log("▲ "+_caller+" ● "+last_count+" events received in last bunch");

        /* ● csp_status ● header_num ● responseHeaders# ● url ● csp */
        log("CSP");
        console.log(last_csp);
//      Object.keys(last_csp).forEach((key) => log("● "+key+" : "+last_csp[key]));

        if( tabId ) {
            try {
                let rules = await chrome.declarativeNetRequest.getMatchedRules({tabId});

                log("RULES MATCHED");
//              log(" ● tabId=["+tabId+"] ● declarativeNetRequest ● getMatchedRules");

                console.log("rules"                 , rules                 );
                console.log("rules.rulesMatchedInfo", rules.rulesMatchedInfo);

            } catch(ex) { log(ex); }
            log();
        }
        else {
            log("...you must reload some page first");
        }
        /*}}}*/
    };
    /*}}}*/
//  add_OHR_listener();

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ CONTENT PAGE SCRIPTING ● reload      ● chrome.scripting.executeScript │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ reload {{{*/
    let reload = function(tabId)
    {
  //    log("▲ "+last_count+" events received in last bunch");
        if( tabId )
        {
            log("RELOADING [tabId "+tabId+"]:");

            /* content page reload script */
            let b_page_reload = function() { document.location.reload(true); };
            chrome.scripting.executeScript( { target: { tabId } , func: b_page_reload });
        }
        else {
            log("...you must reload some page first");
        }
    };
    /*}}}*/

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MONITOR popup_port_name                                               │
    // └───────────────────────────────────────────────────────────────────────┘
/*_ b_monitor_popup_window {{{*/
/*{{{*/
let popup_port_name;

/*}}}*/
let b_monitor_popup_window = function()
{
    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ ● initialized by b_message_onMessage_CB triggered by popup_js.       │
    // │ ● sending message to popup_js should only happen when the id is set.  │
    // └───────────────────────────────────────────────────────────────────────┘
//  log("● monitoring popup connection");

    /* ● popup will connect when displayed */
    chrome.runtime.onConnect.addListener(function(port) {
//  console.clear();
        log("● MONITORING popup CONNECTED ON PORT: "+port.name);
        popup_port_name = port.name;

        /* ● then it will disconnect when hidden */
        if(port.name === "popup") {
            port.onDisconnect.addListener(function() {
                log("● MONITORING popup CONNECTION CLOSED");

                popup_port_name = 0;
            });
        }
    });

};
/*}}}*/
    b_monitor_popup_window();

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MESSAGE FROM POPUP     ● query ● reload    ● chrome.runtime.onMessage │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ b_onMessage_CB {{{*/
    let b_onMessage_CB = function(message,sender,response_handler=null) /* eslint-disable-line no-unused-vars */
    {
        if(message.caller == B_SCRIPT_ID) return false;

        let tabId = message.tabId || last_tabId;
        let url   = message.url   || last_url;
        /* reload ● POPUP BUTTON CLICKED {{{*/
        if(message.cmd == "reload")
        {
            log("● RELOAD");
            if(!tabId)
            {
                let  reply = "NO [tabId] YET TO RELOAD";
                log( reply );

                if( response_handler )
                    response_handler({ REPLY: reply , caller: "b_onMessage_CB" });
            }
            else {
                if( response_handler )
                    response_handler({ REPLY: "reloading "+log_js.get_url_path(url) , caller: "b_onMessage_CB" });

                add_OHR_listener();
                reload( tabId );
            }
        }
        /*}}}*/
        /* query ● POPUP JUST DISPLAYED {{{*/
        else if(message.query == "tab")
        {
            b_tabs_query_active_tab(message, response_handler);
        }
        /*}}}*/
        return (response_handler != null); // whether to wait for an async response .. or not
    };
    /*}}}*/
    chrome.runtime.onMessage.addListener( b_onMessage_CB );

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MESSAGE   TO POPUP            ● REPLY      ● chrome.runtime.onMessage │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ b_send_REPLY_to_POPUP {{{*/
    let b_send_REPLY_to_POPUP = function()
    {
        if( popup_port_name )
        {
            let REPLY
                = "✔ "+last_count+" OHR events received\n"
                + "✔ "
                + (  last_csp
                   ? last_csp.csp_status
                   : "NO CSP")
            ;

            let message
                = { last_tabId : "✔ "+last_tabId
                    ,   last_url   : "✔ "+log_js.get_url_path(last_url)
                    ,   REPLY
                    ,   caller     : B_SCRIPT_TAG
                };
            chrome.runtime.sendMessage(message);
        }
    };
    /*}}}*/

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ ACTIVE TAB QUERY                                          chrome.tabs │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ b_tabs_query_active_tab {{{*/
    let b_tabs_query_active_tab = function(info, response_handler=null)
    {
    console.clear();
    log(info.caller || "onActivated");
    log("QUERY ACTIVE TAB");

        if( MANIFEST_VERSION == "v3")
        {
            chrome.tabs.query({ currentWindow: true, active: true })
                .then ((tabs ) =>  b_settings_query_active_tab_url_callback(tabs[0], response_handler))
                .catch((error) =>  console.error(error))
            ;
        }
        else {
            chrome.tabs.query({ currentWindow:true, active:true }
                             , (tabs) => b_settings_query_active_tab_url_callback(tabs[0], response_handler))
            ;
        }
    };
    /*}}}*/
/*_ b_settings_query_active_tab_url_callback {{{*/

    let          last_tabId;
    let          last_url;

    let b_settings_query_active_tab_url_callback = function(active_tab,response_handler)
    {
    log("b_settings_query_active_tab_url_callback");

        last_tabId = active_tab && active_tab.id;
        last_url   = last_tabId && (active_tab.url || active_tab.pendingUrl);

        log("● last_tabId ["+last_tabId+"]");
        log("● last_url   ["+last_url  +"]");

        if( response_handler )
        {
            response_handler({ last_tabId
                             , last_url   : log_js.get_url_path(last_url)
                             , caller     : "b_settings_query_active_tab_url_callback"
            });
        }
    };
    /*}}}*/
    chrome.tabs.onActivated.addListener( b_tabs_query_active_tab );

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ TAB UPDATED                                               chrome.tabs │
    // └───────────────────────────────────────────────────────────────────────┘
    const CALLER_TAB_UPDATED = "TAB UPDATED";
    /*_ b_tabs_onUpdated {{{*/
    let b_tabs_onUpdated = function(tabId, changeInfo, tab)
    {
    log("   ● UPDATED TAB ●   "+tab.url+" ["+(changeInfo.status||"")+"]");
//  console.dir(changeInfo);

        if(!tab.url) return;
//      last_tabId = tabId;
//      last_url   = tab.url;

//      log("● last_tabId ["+last_tabId+"]");
//      log("● last_url   ["+last_url  +"]");

        if(ohr_listener_check_timeout && (changeInfo.status == "complete"))
            check_DNR(tabId, CALLER_TAB_UPDATED);
    };
    /*}}}*/
    chrome.tabs.onUpdated.addListener( b_tabs_onUpdated );

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ EXPORT TO CONSOLE                                                     │
    // └───────────────────────────────────────────────────────────────────────┘
    return {                 query : b_tabs_query_active_tab
        ,                   status : () => log(" ● [last_tabId "+last_tabId+"]\n ● [last_url "+last_url+"]")
        ,                 manifest : log_js.manifest
        ,         check_last_tabId : () => check_DNR( last_tabId, "Devtools")
        ,        reload_last_tabId : () => reload   ( last_tabId )
        , log : log_js.log
    };
})();

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ CONSOLE COMMANDS                                                          │
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
/* eslint-disable strict */
let b = background_js;
let s = ""; Object.keys(b).forEach((f) => s += "\n● b."+f+"()");
console.log(B_SCRIPT_ID+" CONSOLE COMMANDS:"+ s);
/* eslint-enable  strict */
/*}}}*/

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ SEE ALSO                                                                  │
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{

:!rm -rf _metadata
rules1_SET.json
rules2_REMOVE.json

background.js
log.js
popup.js
popup.html

manifest.json
manifest_v2.json
manifest_v3.json
../RTabsExtension/manifest.json

}}}*/

