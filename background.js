// ┌───────────────────────────────────────────────────────────────────────────┐
// │ background.js ......................................... BACKGROUND SCRIPT │
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
/* jshint  esversion: 9, laxbreak:true, laxcomma:true, boss:true */
/* globals importScripts, log_js, chrome */
/* exported b */

const MANIFEST_VERSION  = (typeof chrome.tabs.executeScript == "undefined") ?  "v3" : "v2";
const B_SCRIPT_ID       = "background_js";
const B_SCRIPT_TAG      =  B_SCRIPT_ID +" manifest "+MANIFEST_VERSION+" (230829:19h:52)"; /* eslint-disable-line no-unused-vars */

/*}}}*/

let background_js = (function() {
"use strict";
    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ log.js ...................................................... LOGGING │
    // └───────────────────────────────────────────────────────────────────────┘
    importScripts("log.js");
    let log = log_js.log;

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ ● LISTENER onHeadersReceived                          ● extraInfoSpec │
    // ├───────────────────────────────────────────────────────────────────────┤
    // ├ RESPONSE_HEADERS ● include the response headers in details            │
    // ├───────────────────────────────────────────────────────────────────────┤
    // ├         BLOCKING ● make the request synchronous to modify headers     │
    // ├───────────────────────────────────────────────────────────────────────┤
    // ├-   EXTRA_HEADERS ● https://developer.mozilla.org 🔍 onHeadersReceived │
    // └───────────────────────────────────────────────────────────────────────┘
    /* ● {{{*/

    const CSS_FONT_SIZE       = "font-size    : 200%;"             ;
    const CSS_PADDING         = "padding      : 0 1em;"            ;

    const CSS_BG_GREEN        = "background   : green;"            ;
    const CSS_BG_RED          = "background   : red;"              ;

    const CSS_BR_ORANGE       = "border       : 3px solid orange;";
    const CSS_BR_RADIUS       = "border-radius: 1em;"             ;
    const CSS_BR_WHITE        = "border       : 3px solid white;" ;

    const CSS_RESPONSEHEADERS = CSS_FONT_SIZE+CSS_BR_ORANGE+CSS_BR_RADIUS+CSS_PADDING;
    const CSS_RIGHT_RECEIVED  = CSS_FONT_SIZE+CSS_BR_WHITE +CSS_BR_RADIUS+CSS_PADDING+CSS_BG_GREEN;
    const CSS_WRONG_RECEIVED  = CSS_FONT_SIZE+CSS_BR_WHITE +CSS_BR_RADIUS+CSS_PADDING+CSS_BG_RED;

    const CALLER_OHR_TIMEOUT  = "OHR LISTENER TIMEOUT";
    const CSP_HEADER_NAME     = "content-security-policy";
    const CHECK_DEBOUNCE_MS   = 2000;

    let   ohr_listener_check_timeout;

    let   last_OHRnb = 0;
    let   last_CSP;

    /*}}}*/
    /*_ add_OHR_listener {{{*/
    let add_OHR_listener = function()
    {
        let blocking
            = chrome.runtime.getManifest().permissions.includes("webRequestBlocking");

        let extraInfoSpec
            = blocking
            ? [   chrome.webRequest.OnHeadersReceivedOptions.RESPONSE_HEADERS
                , chrome.webRequest.OnHeadersReceivedOptions.BLOCKING
                , chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS
            ]
            : [   chrome.webRequest.OnHeadersReceivedOptions.RESPONSE_HEADERS
                , chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS
            ]
        ;

        log("● ORH LISTENER ADDED ("+(blocking ? "blocking":"not blocking")+"):");
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
    /*}}}*/
    /*_ del_OHR_listener {{{*/
    let del_OHR_listener = function()
    {
        if(!chrome.webRequest.onHeadersReceived.hasListener(ohr_listener))
            return;

        log("● ORH LISTENER REMOVED:");
        chrome.webRequest.onHeadersReceived.removeListener(ohr_listener);
    };
    /*}}}*/
    /*_ ohr_listener {{{*/
    let ohr_listener = function(details)
    {
        /* ● START COLLECTING ● OR CONTINUE COLLECTING {{{*/
        if(!ohr_listener_check_timeout  )
        {
            last_OHRnb = 0;
            last_CSP   = null;

            console.log("%c first received ▼", (details.url == last_url) ? CSS_RIGHT_RECEIVED : CSS_WRONG_RECEIVED);

            log(        "............."+ details.url);

            console.log("details:"     , details);

            console.groupCollapsed("%c responseHeaders", CSS_RESPONSEHEADERS);
        }
        else {
            clearTimeout(ohr_listener_check_timeout);
        }

        last_OHRnb += 1;

        /*}}}*/
        /* ● LOOK FOR THE FIRST CSP {{{*/
        if(!last_CSP)
        {
            last_CSP = ohr_listener_get_details_responseHeaders_CSP( details );

        }
        /*}}}*/
        /* ● LOG THIS HEADER DETAILS {{{*/
        let csp_status = "frameId="+details.frameId+" ● CSP "+(last_CSP ? "✔":"-");

        log( (last_OHRnb<10 ?" ":"")+last_OHRnb
             + " ["+csp_status+"] "
             + details.url
           );
        /*}}}*/
        // ┌───────────────────────────────────────────────────────────────────┐
        // │ ● if CSP RECEIVED AND extraInfoSpec has blocking argument...      │
        // │ ...return a webRequest.BlockingResponse                           │
        // └───────────────────────────────────────────────────────────────────┘
        /* ● POST NEXT TIMEOUT CHECK {{{*/
        ohr_listener_check_timeout
            =  setTimeout(check_DNR, CHECK_DEBOUNCE_MS, details.tabId, CALLER_OHR_TIMEOUT);

        /*}}}*/
    };
    /*}}}*/
/*_ ohr_listener_get_details_responseHeaders_CSP {{{*/
    let ohr_listener_get_details_responseHeaders_CSP = function( details )
    {
        if(details.url == last_url)
            log("URL ● RESPONSE #"+last_OHRnb);

        for(let i=details.responseHeaders.length-1; i >= 0; --i)
        {
            if(details.responseHeaders[i].name !=  CSP_HEADER_NAME)
                continue;

            let csp_status
                = (last_OHRnb > 1)
                ?  "CSP NOT FROM FIRST RECEIVED HEADER"
                :  "CSP ... from first received header"
            ;

            /* LOG THIS AS THE [LAST RECEIVED CSP] */
            last_CSP
                = {  csp_status
                    , header_num     : last_OHRnb
                    , reponseHeaders : "#"+i
                    , url            : details.url
                    , csp            : details.responseHeaders[i]
                };

            /* GOT ONE ● WARN IF NOT FROM FIRST RECEIVED HEADER (i.e. top-most page frame) */
            if(last_OHRnb > 1)
            {
                log("CSP ● HEADER #"+i);
                console.log("details:", details);
            }
            return last_CSP;
        }
        return null;
    };
    /*}}}*/
    /*_ check_DNR {{{*/
    let check_DNR = async function(tabId,_caller)
    {
        /* ● [TAB UPDATED COMPLETE] called before [OHR LISTENER TIMEOUT] {{{*/
        if(_caller == CALLER_OHR_TIMEOUT)
        {
            if(!ohr_listener_check_timeout)
                return;
        }
        /*}}}*/
        /* ● OHR COLLECTED AND TIMEOUT STILL PENDING (i.e. not on timeout) {{{*/
        if(ohr_listener_check_timeout)
        {
            console.groupEnd();

            b_send_REPLY_to_POPUP();

            /* discard pending CALLER_OHR_TIMEOUT */
            ohr_listener_check_timeout = null;
        }

        /* ignore further OHR events until next reload request */
        del_OHR_listener();

        /*}}}*/
        /* ● REPORT MATCHED RULES {{{*/
        log("▲ "+_caller+" ● "+last_OHRnb+" onHeadersReceived events received");

        /* ● csp_status ● header_num ● responseHeaders# ● url ● csp */
        log("CSP");
        console.log(last_CSP);

        if( tabId ) {
            try {
                let rules = await chrome.declarativeNetRequest.getMatchedRules({tabId});

                log("RULES MATCHED");
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

    // ┌────────────────────────────────────────────────────────────────────────┐
    // │ CONTENT PAGE SCRIPTING ● RELOADING    ● chrome.scripting.executeScript │
    // └────────────────────────────────────────────────────────────────────────┘
    /*_ reload {{{*/
    let reload = function(message)
    {
        // ┌────────────────────────────────────────────────────────────────────┐
        // │ RELOAD POPUP COMMAND            ● popup.js ● p_send_reload_message │
        // └────────────────────────────────────────────────────────────────────┘
        let { method="replace", tabId, url, logging=false } = message;

        if(logging)
        {
            log("● LOGGING location."+message.method+" COMMAND IN Content-Page's Devtools ●");
        }
        else {
            log("RELOADING [tabId "+tabId+"] ( location."+message.method+" ):");

            log("expecting  URL ▼");
            log("............."+ url);
        }

        // ┌───────────────────────────────────────────────────────────────┐
        // │ ● DEFINE CONTENT PAGE RELOAD SCRIPT                           │
        // ├───────────────────────────────────────────────────────────────┤
        // ├ trying to get OPERA to forget its cache ● NOT WORKING SO FAR  │
        // ├───────────────────────────────────────────────────────────────┤
        // ├ document.location.reload (true) ● reload no-cache             │
        // ├ document.location.assign ( url) ● add to history              │
        // ├ document.location.replace( url) ● ... or not                  │
        // └───────────────────────────────────────────────────────────────┘
        chrome.scripting.executeScript( { target: { tabId }
                                        ,   func: reload_executeScript_func
                                        ,   args: [ url, method, logging ]
        })
        .catch((error) => { console.warn(error); chrome.runtime.sendMessage({ error: error.message });});
    };
    /*}}}*/
    /*_ reload_executeScript_func {{{*/
    let reload_executeScript_func = function(url,method,logging)
    {
        // ┌───────────────────────────────────────────────────────────────────┐
        // │ ● just log content-script command in Devtools console  ● popup.js │
        // └───────────────────────────────────────────────────────────────────┘
        if( logging ) {
            const STYLE = "font-size:150%; border: 3px orange solid; border-radius:1em; padding:0 1em;";
            switch(method) {
            case "reload"  : console.log("%c document.location.reload (   true  );", STYLE); break;
            case "assign"  : console.log("%c document.location.assign ('"+url+"');", STYLE); break;
            case "replace" : console.log("%c document.location.replace('"+url+"');", STYLE); break;
            }
        }
        // ┌───────────────────────────────────────────────────────────────────┐
        // │ ● or execute  content-script command                              │
        // └───────────────────────────────────────────────────────────────────┘
        else {
            switch(method) {
            case "reload"  :                 document.location.reload (   true  );           break;
            case "assign"  :                 document.location.assign (   url   );           break;
            case "replace" :                 document.location.replace(   url   );           break;
            }
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
        // │ ● sending message to popup_js should only happen when the id is set.  │
        // └───────────────────────────────────────────────────────────────────────┘

        /* ● popup will connect when displayed */
        chrome.runtime.onConnect.addListener(function(port) {

            log_js.console_clear("runtime.onConnect");
            log("● popup CONNECTED");
            popup_port_name = port.name;

            /* ● then it will disconnect when hidden */
            if(port.name === "popup") {
                port.onDisconnect.addListener(function() {
                    log("● popup CLOSED");

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
    let b_onMessage_CB = function(message,sender,response_handler) /* eslint-disable-line no-unused-vars */
    {
        if(message.caller == B_SCRIPT_ID) return false; // do not handle own message
        /* query  ● POPUP JUST DISPLAYED {{{*/
        if(     message.query ==  "tab")
        {
            b_tabs_query_active_tab(message, response_handler);
        }
        /*}}}*/
        /* reload ● POPUP BUTTON CLICKED {{{*/
        else if(message.cmd == "reload")
        {
            log("● RELOAD");

            if(!message.tabId && !last_tabId)
            {
                let  reply = "NO [tabId] YET TO RELOAD";
                log( reply );
                log("...you must manually reload some page first");

                if( response_handler )
                    response_handler({ REPLY: reply , caller: "b_onMessage_CB" });
            }
            else {
                if(!message.tabId) message.tabId = last_tabId;
                if(!message.url  ) message.url   =  last_url ;

                if( response_handler )
                    response_handler({ REPLY: message.method+" "+log_js.get_url_path(message.url) , caller: "b_onMessage_CB" });

                if(!message.logging)
                    add_OHR_listener();

                reload( message );
            }
        }
        /*}}}*/
        return !!response_handler; // whether to wait for an async response .. or not
    };
    /*}}}*/
    chrome.runtime.onMessage.addListener( b_onMessage_CB );

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ MESSAGE   TO POPUP            ● REPLY      ● chrome.runtime.onMessage │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ b_send_REPLY_to_POPUP {{{*/
    let b_send_REPLY_to_POPUP = function()
    {
        if(!popup_port_name ) return;

        let REPLY
            = "✔ "+last_OHRnb+" OHR events received\n"
            + "✔ "
            + (  last_CSP
               ? last_CSP.csp_status
               : "NO CSP")
        ;

        let message
            = { last_tabId : "✔ "+last_tabId
                ,   last_url   : "✔ "+log_js.get_url_path(last_url)
                ,   REPLY
                ,   caller     : B_SCRIPT_TAG
            };
        chrome.runtime.sendMessage(message);
    };
    /*}}}*/

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ ACTIVE TAB QUERY              ● last_tabId ● last_url     chrome.tabs │
    // └───────────────────────────────────────────────────────────────────────┘
    /*_ b_tabs_query_active_tab {{{*/
    let b_tabs_query_active_tab = function(info, response_handler)
    {
        /* ● CLEAR CONSOLE (not when called from Devtools) */
        if(info.caller || info.tabId) log_js.console_clear("b_tabs_query_active_tab");

        log("QUERY ACTIVE TAB");

        /* LOG [info] */
        let caller = (info.caller || "onActivated");

        let s      = ""; Object.keys(info).forEach((key) => s += " ● "+key+" : "+info[key]);

        log(" ● "+caller+" ● "+s);

        /* QUERY CURRENT TAB URL */
        if( MANIFEST_VERSION == "v3")
        {
            chrome.tabs.query({ currentWindow: true, active: true })
                .then (        (tabs ) => b_settings_query_active_tab_url_callback(tabs[0], response_handler))
                .catch(        (error) => console.warn(error))
            ;
        }
        else {
            chrome.tabs.query({ currentWindow:true, active:true }
                             , (tabs ) => b_settings_query_active_tab_url_callback(tabs[0], response_handler))
            ;
        }
    };
    /*}}}*/
    /*_ b_settings_query_active_tab_url_callback {{{*/
    /*{{{*/
    let last_tabId;
    let last_url;

    /*}}}*/
    let b_settings_query_active_tab_url_callback = function(active_tab,response_handler)
    {
    log("▼");

        /* GETTING CURRENT TAB ID AND URL */
        last_tabId = active_tab &&  active_tab.id;
        last_url   = last_tabId && (active_tab.url || active_tab.pendingUrl);

        log("● last_tabId ["+last_tabId+"]");
        log("● last_url   ["+last_url  +"]");

        /* REPLY TO POPUP QUERY */
        if( response_handler ) {
            response_handler({ last_tabId
                             , last_url   : log_js.get_url_path(last_url)
                             , caller     : "b_settings_query_active_tab_url_callback"
            });
        }
    };
    /*}}}*/
    chrome.tabs.onActivated.addListener( b_tabs_query_active_tab );

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ TAB UPDATED                   ● RELOADING                 chrome.tabs │
    // └───────────────────────────────────────────────────────────────────────┘
    const CALLER_TAB_UPDATED_COMPLETE = "EVENT onUpdated (complete)";
    /*_ b_tabs_onUpdated {{{*/
    let b_tabs_onUpdated = function(tabId, changeInfo, tab)
    {
    log("   ● UPDATED TAB ●   "+tab.url+" ["+(changeInfo.status||"")+"]");

        if(!tab.url) return;

        /* STOP COLLECTING HEADERS WHEN DOCUMENT HAS BEEN FULLY LOADED */
        if(ohr_listener_check_timeout && (changeInfo.status == "complete"))
            check_DNR(tabId, CALLER_TAB_UPDATED_COMPLETE);
    };
    /*}}}*/
    chrome.tabs.onUpdated.addListener( b_tabs_onUpdated );

    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ EXPORT TO CONSOLE             ● Devtools commands                     │
    // └───────────────────────────────────────────────────────────────────────┘
    /*  l = {{{*/
    let l = function()
    {
        let s = ""; Object.keys(b).forEach((f) => s += "\n● b."+f+"()");

        console.log(B_SCRIPT_ID+" CONSOLE COMMANDS:"+ s);
    };
    /*}}}*/
    return {                 query : () => b_tabs_query_active_tab({})
        ,                   status : () => log(" ● [last_tabId "+last_tabId+"]\n ● [last_url "+last_url+"]")
        ,                 manifest : log_js.manifest
        ,         check_last_tabId : () => check_DNR( last_tabId, "Devtools")
        ,        reload_last_tabId : () => reload   ( last_tabId )
        ,                      log : log_js.log
        ,                        l
        , last_url   : (arg) => {
            last_url =  arg;
            let message = { last_tabId
                          , last_url   : log_js.get_url_path(last_url)
                          , caller     : "Devtools"
            };
            chrome.runtime.sendMessage( message ); /* update POPUP */
        }
    };
})();

let b = background_js;
    b.l();

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

