/**
 * Filesystem interface
 *
 * In background service it is needed to use Tizen Filesystem API
 * because Node filesystem is not available.
 */

// The virtual folder where the timestamp file will be stored.
// wgt-private is NOT shared with the other applications.
var fsPathName = 'wgt-private';
var fsFileName = 'timestamp.json';
var remoteLogger = require('./remoteLogger.js');


function readDir(pathName) {
    return new Promise((resolve, reject) => {
        tizen.filesystem.resolve(pathName, function onSuccess(dir) {
            remoteLogger.log('[BackgroundService][FileSystem][readDir]: tizen.filesystem.resolve success:', dir);
            resolve(dir);
        }, function onError(error) {
            remoteLogger.error('[BackgroundService][FileSystem][readDir]: tizen.filesystem.resolve error:',
                JSON.stringify(error));
            reject(error);
        }, 'rw');
    });
}

function readFile(dir, fileName) {
    return new Promise((resolve, reject) => {
        var file;
        var contents = '';

        remoteLogger.log('[BackgroundService][FileSystem][readFile]: params:', dir, fileName);

        try {
            file = dir.resolve(fileName);
        } catch (err) {
            reject(err);
            return;
        }

        file.openStream(
            'r',
            function onSuccess(fileStream) {
                remoteLogger.log('[BackgroundService][FileSystem][readFile]: read success');

                if (fileStream.bytesAvailable > 0) {
                    try {
                        contents = fileStream.read(fileStream.bytesAvailable);
                    } catch (error) {
                        reject(error);
                        return;
                    }
                }

                remoteLogger.log('[BackgroundService][FileSystem][readFile]: contents:', contents);
                fileStream.close();
                resolve(contents);
            },
            function onError(error) {
                remoteLogger.error('[BackgroundService][FileSystem][readFile]: read error:', JSON.stringify(error));
                reject(error);
            }
        );
    });
}

function writeFile(dir, fileName, data) {
    return new Promise((resolve, reject) => {
        var file;

        try {
            file = dir.resolve(fileName);
            remoteLogger.log('[BackgroundService][FileSystem][writeFile]: file exists:', file);
        } catch (error) {
            try {
                remoteLogger.log('[BackgroundService][FileSystem][writeFile]: create file ' + fileName);
                file = dir.createFile(fsFileName);
            } catch (err) {
                remoteLogger.error('[BackgroundService][FileSystem][writeFile]: cannot create file',
                    JSON.stringify(err));
                reject(err);
                return;
            }
        }

        file.openStream(
            'w',
            function onSuccess(fileStream) {
                remoteLogger.log('[BackgroundService][FileSystem][writeFile]: append success');
                fileStream.write(data);
                fileStream.close();
                resolve(data);
            },
            function onError(error) {
                remoteLogger.error('[BackgroundService][FileSystem][writeFile]: append error:', JSON.stringify(error));
                reject(error);
            }
        );
    });
}

function deleteFile(dir, fileName) {
    return new Promise((resolve, reject) => {
        dir.deleteFile(
            dir.fullPath + '/' + fileName,
            function onSuccess() {
                remoteLogger.log('[BackgroundService][FileSystem][deleteFile]: delete success');
                resolve();
            },
            function onError(error) {
                remoteLogger.error('[BackgroundService][FileSystem][deleteFile]: delete error:', JSON.stringify(error));
                reject(error);
            }
        );
    });
}


function checkTimestamp() {
    return new Promise((resolve) => {
        readDir(fsPathName)
            .then(dir => readFile(dir, fsFileName))
            .then((contents) => {
                remoteLogger.log('[BackgroundService][FileSystem][checkTimestamp]: read '
                    + fsPathName + '/' + fsFileName + ' result:', contents);
                resolve(contents);
            })
            .catch((err) => {
                remoteLogger.error('[BackgroundService][FileSystem][checkTimestamp]: catch error', JSON.stringify(err));
                // we have no timestamp so let's say it was long time ago to refresh preview:
                resolve({ lastDate: 0 });
            });
    });
}

function deleteTimestampFile() {
    remoteLogger.log('[BackgroundService][FileSystem][deleteTimestampFile]: begin');
    return readDir(fsPathName)
        .then(dir => deleteFile(dir, fsFileName));
}

function saveTimestamp() {
    var lastDateObj = {
        lastDate: Date.now() + ''
    };
    var lastDateString = JSON.stringify(lastDateObj);

    remoteLogger.log('[BackgroundService][FileSystem][saveTimestamp]: begin');

    return readDir(fsPathName)
        .then(dir => writeFile(dir, fsFileName, lastDateString));
}


module.exports = {
    saveTimestamp: saveTimestamp,
    checkTimestamp: checkTimestamp,
    deleteTimestampFile: deleteTimestampFile
};
