/**
 * Background Service for personal preview
 */

// Global variables definition
var ajax;
var remoteLogger;
var backendIp;
var fileSystem;
var requestTimeout = 25 * 60 * 1000; // timeout to limit number of requests to content provider server
// TODO: set requestTimeout to 24 hrs before release, current value (25 mins) is for testing purposes only

initProcessCheck();

ajax = require('./ajax.js');
remoteLogger = require('./remoteLogger.js');
backendIp = require('./backgroundServiceConfig.json').backendIp;
fileSystem = require('./fileSystem.js');

remoteLogger.log('[Background Service]: BACKGROUND SERVICE LOADED.');

function initProcessCheck() {
    process
        .on('uncaughtException', function (err) {
            var stackTrace = err.stack || err;
            remoteLogger.error('[PROCESS]: Caught Exception:', stackTrace);
        })
        .on('unhandledRejection', (reason) => {
            remoteLogger.error('[PROCESS]: Unhandled Rejection at Promise:', reason);
        });
}

function parseTimestampString(timestampString) {
    var ts = {};

    try {
        ts = JSON.parse(timestampString);
    } catch (err) {
        ts.lastDate = 0;
    }

    return ts;
}

function parsePreviewData(data) {
    var previewData = {};

    remoteLogger.log('[Background Service]: parsePreviewData() called with the data:', data);

    try {
        previewData = JSON.parse(data);
    } catch (err) {
        remoteLogger.error('[Background Service]: parsePreviewData() JSON.parse error:', err);
    }

    remoteLogger.log('[Background Service]: parsePreviewData() finished.');

    return previewData;
}

function setPreview(previewData) {
    var data = { sections: [] };

    remoteLogger.log('[Background Service]: setPreview() called.');

    data.sections = previewData.sections;

    try {
        webapis.preview.setPreviewData(
            JSON.stringify(data),
            function () {
                remoteLogger.log('[Background Service]: setPreview() SuccessCallback.');
                tizen.application.getCurrentApplication().exit();
            },
            function (err) {
                remoteLogger.error('[Background Service]: setPreview() failed:', err);
                tizen.application.getCurrentApplication().exit();
            }
        );
    } catch (err) {
        remoteLogger.error('[Background Service]: setPreview() raised exception: ' + err);
        tizen.application.getCurrentApplication().exit();
    }

    remoteLogger.log('[Background Service]: setPreview() finished.');
}


// Following functions are required for background service module
function onStart() {
    remoteLogger.log('[Background Service]: onStart() called.');
}

function onRequest() {
    var data;
    var reqAppControl;
    var backendUrl;

    remoteLogger.log('[Background Service]: onRequest() called.');

    reqAppControl = tizen.application.getCurrentApplication().getRequestedAppControl();


    if (reqAppControl && reqAppControl.appControl.operation === 'http://tizen.org/appcontrol/operation/pick') {
        remoteLogger.log('AppControl operation is "pick"');

        data = reqAppControl.appControl.data;

        remoteLogger.log('======== reqAppControl.appControl.data:', data);

        if (data[0].key === 'isUserLoggedIn') {
            remoteLogger.log('Background service launched by frontend application');

            if (data[0].value[0] === 'true') {
                remoteLogger.log('User just logged in - show public preview');
                backendUrl = '/personal';
            } else {
                remoteLogger.log('User just logged out - show personalized preview');
                backendUrl = '/preview';
            }

            ajax.get(backendIp, backendUrl)
                .then(parsePreviewData)
                .then(setPreview)
                .then(() => fileSystem.saveTimestamp({ timestamp: Date.now() })
                    .catch((error) => {
                        remoteLogger.error(error);
                    }))
                .catch((error) => {
                    remoteLogger.error('[Background Service][onRequest]: error while setting preview'
                        + ' on login/logout:', error);
                });

            return;
        }
    }

    fileSystem.checkTimestamp()
        .then(parseTimestampString)
        .then((timestamp) => {
            var now = Date.now();

            // remoteLogger.log('[Background Service][onRequest]: timestamp string from file:', timestampString);
            remoteLogger.log('[Background Service][onRequest]: timestamp from file:', new Date(timestamp.lastDate));
            remoteLogger.log('[Background Service][onRequest]: timestamp NOW:', new Date(now));
            remoteLogger.log('[Background Service][onRequest]: timestamp difference:', (now - timestamp.lastDate));
            remoteLogger.log('[Background Service][onRequest]: timestamp timeout:', requestTimeout);

            if (now - timestamp.lastDate < requestTimeout) {
                remoteLogger.log('[Background Service][onRequest]: ======== DON\'T REFRESH PREVIEW YET');
                return;
            }

            remoteLogger.log('[Background Service][onRequest]: ======== LET\'S REFRESH PREVIEW NOW');

            ajax.get(backendIp, '/preview')
                .then(parsePreviewData)
                .then(setPreview)
                .then(() => fileSystem.saveTimestamp({ timestamp: now })
                    .catch((error) => {
                        remoteLogger.error(error);
                    }))
                .catch((error) => {
                    remoteLogger.error('[Background Service][onRequest]: error while setting preview:', error);
                });
        })
        .catch((error) => {
            remoteLogger.error('[Background Service][onRequest]: error while checking timestamp'
                + ' of last HTTP request for preview data:', error);
        });
}

function onExit() {
    remoteLogger.log('[Background Service]: onExit() called.');
}


module.exports = {
    onStart: onStart,
    onRequest: onRequest,
    onExit: onExit
};
