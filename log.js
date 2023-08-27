// ┌───────────────────────────────────────────────────────────────────────────┐
// │ log_js .......................................................... LOGGING │
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
/* jshint  esversion: 9, laxbreak:true, laxcomma:true, boss:true */
/* globals  chrome */
/* exported log_js */

const L_SCRIPT_ID       = "log_js";
const L_SCRIPT_TAG      =  L_SCRIPT_ID +" (230828:00h:51)"; /* eslint-disable-line no-unused-vars */

/*}}}*/
const SEP_LINE = "● ──────────────────────────────────────────────────────────────────────────── ●";
let log_js = (function() {
"use strict";

/*➔ log {{{*/
let CSS_BORDER = "padding: 0 1em; font-size:150%; color: #DDAAAA; border: 2px red solid; border-radius:1em;";
let CSS_GREEN  = "padding: 0 1em; font-size:150%; color: #AADDAA;";

let log = function(arg)
{
    if(!arg || arg.length < 18) console.log("%c"+        (arg || SEP_LINE), CSS_BORDER);
    else if(   arg.length > 80) console.log("%c"+truncate(arg)            , CSS_GREEN );
    else                        console.log("%c"+         arg             , CSS_GREEN );
};

/*}}}*/
/*➔ manifest {{{*/
let manifest = function()
{
    let _manifest = chrome.runtime.getManifest();
    console.log("MANIFEST v"+_manifest.manifest_version, _manifest);
};
/*}}}*/
/*➔ truncate {{{*/
let truncate = function(msg, length=80)
{
    msg = String(msg);
    return (msg.length <= length)
        ?   msg
        :   msg.substring(0, length-3)+"..."
    ;
};
/*}}}*/
/*➔ get_url_path {{{*/

const regexp_PATH  = new RegExp("[\\?&#].*$", "");

let get_url_path = function(url)
{
    if(!url) return url;
    else     return url.replace(regexp_PATH, "");
};
/*}}}*/
/*_ console_clear {{{*/
const CLEAR_CONSOLE_INTERVAL_MS = 1000;
let   last_call_time         = 0;

let console_clear = function(caller)
{
    /* DEBOUNCING {{{*/
    let this_time = new Date().getTime() % 86400000;
    if((this_time - last_call_time) < CLEAR_CONSOLE_INTERVAL_MS)
    {
        last_call_time = this_time; // and start over from there

        console.log( SEP_LINE );
        return;
    }
    last_call_time = this_time;
    /*}}}*/
    console.clear();
    if(caller) console.log("console cleared by "+caller);
};
/*}}}*/
    return { log
        ,    console_clear
        ,    get_url_path
        ,    manifest
        ,    truncate
    };
})();

