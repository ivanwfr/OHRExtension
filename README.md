# OHRExtension
 Manifest v3 ● onHeadersReceived checker

### ✔ [ZIP archive on GitHub](../../archive/master.zip)

## `README.md` _TAG (230920:18h:55)

### Logging HTTP Reponse headers during a reload of a `Browser Current Web Page`

#### ● `Motivation #1`
Looking for a `Content-Security-Policy` header in order to relax, customize or remove it.

#### ● `Motivation #2`
Trying to understand why this test extension is working fine in both `Chrome` and `Edge`
while `Opera` keeps missing to dispatch the top level frame Reponse Header.

#### ✔ `Opera screenshots:` https://remotetabs.com/dev/OHRExtension/SCREENSHOTS/_index.html

On some `mysterious occasions` Opera does the job as it should every time.
It may have something to do with its `cache` invalidation internal policy...
I am looking for some magical stratagem that would trigger the event
in order to provide some clue for a bug tracking which is likely the way to go once
everything else will have failed.

I tried everything I could think of, even asking GPT 3.5 and Bing AI.

(*Those `AI` keep failing to grasp how `Manifest V3` ivalidates their suggested solutions.)*

The CSP is precisely in the first Response received by the webRequest.onHeadersReceived listener.
This is where the `declarativeNetRequest` or my `Manifest v2 Javascript dynamic filtering`
can do their job.

Another CSP could be located in the DOM header but it is not the one at stake here.

It looks like the `☑ Disable Cache` in `Opera Devtools`  does not solve the problem.

And location.reload(`true`), location.replace() or location.assign() can't do better.

<!-- BROWSERS_popup {{{-->

## Tested Browsers Popup

> ![Browsers Popup](/SCREENSHOTS/BROWSERS_popup.png)

<!--}}}-->

## `Load unpacked`

This is a plain Manifest V3 Extension that can be loaded widh `Load unpacked` once the
[ZIP archive](../../archive/master.zip) has been extracted somewhere.

### The Popup icon can activate a reload.

The result summary will be displayed but all kinds of detailed logs can be analyzed
in the `service-worker` background Devtools pane...

<!--
}!!tree --dirsfirst    | sed -e 's/^/    /'
-->
    .
    |-- images
    |   `-- icon.png
    |
    |-- javascript
    |   |-- background.js
    |   |-- log.js
    |   `-- popup.js
    |
    |-- OHRExtension.zip
    |-- README.md
    |-- background.html
    |-- manifest.json
    |-- manifest_v2.json
    |-- manifest_v3.json
    |-- manifest_v3_Firefox.json
    |-- popup.html
    |-- rules1_SET.json
    `-- rules2_REMOVE.json
    

<!-- SCREENSHOTS {{{-->

## See `SCREENSHOTS/_index.html`

> ![SCREENSHOTS](/SCREENSHOTS/_index.png)

<!--}}}-->
    
```
