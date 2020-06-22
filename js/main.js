App = window.App || {};

App.Main = (function Main() {
    var player;
    var logger;
    var playerStates = App.VideoPlayer.playerStates;
    var SERVER_ADDRESS = 'http://192.168.137.1';
    var ENDPOINTS = {
        VIDEOS: SERVER_ADDRESS + '/videos', // videos list for playing in the app
        LOGIN: SERVER_ADDRESS + '/login?username=test&password=124', // backend url for logging in the user
        LOGOUT: SERVER_ADDRESS + '/logout', // backend url for logging out the user
        CHECKLOGIN: SERVER_ADDRESS + '/checkLogin' // backend url for checking if user is logged in or not
    };
    var videosList = [];
    var isFullscreen = false;
    var isUserLoggedIn = false;
    var targetApplicationId = 'sample0020.PreviewBGSvc'; // application ID of background service, defined in config.xml


    function switchVideo(videoData) {
        exitFullscreen();

        App.Navigation.changeActiveMenu('Basic');
        App.Navigation.getMenu('Basic').setFocusedElemName('movie-' + videoData.id);

        player.changeVideo(videoData.url);
        player.play();
    }

    function onReturn() {
        var playerState = player.getState();

        if (playerState !== playerStates.IDLE && playerState !== playerStates.NONE) {
            player.stop();
        } else {
            tizen.application.getCurrentApplication().hide();
        }
    }

    function registerKeyHandler(keyWithHandler) {
        App.KeyHandler.registerKeyHandler(keyWithHandler.keyCode, keyWithHandler.keyName, keyWithHandler.handler);
    }

    function registerKeyHandlers() {
        var keysWithHandlers = [
            { keyCode: 10252, handler: player.playPause, keyName: 'MediaPlayPause' },
            { keyCode: 415, handler: player.play, keyName: 'MediaPlay' },
            { keyCode: 19, handler: player.pause, keyName: 'MediaPause' },
            { keyCode: 413, handler: player.stop, keyName: 'MediaStop' },
            { keyCode: 417, handler: player.ff, keyName: 'MediaFastForward' },
            { keyCode: 412, handler: player.rew, keyName: 'MediaRewind' },
            { keyCode: 10009, handler: onReturn }
        ];

        keysWithHandlers.forEach(registerKeyHandler);
    }

    function addButtonsHandlers() {
        var buttonsWithHandlers = [
            { elementSelector: '.play', handler: player.play },
            { elementSelector: '.pause', handler: player.pause },
            { elementSelector: '.stop', handler: player.stop },
            { elementSelector: '.ff', handler: player.ff },
            { elementSelector: '.rew', handler: player.rew },
            { elementSelector: '.fullscreen', handler: toggleFullscreen },
            { elementSelector: '.login', handler: toggleUserLogin }
        ];

        App.KeyHandler.addHandlersForButtons(buttonsWithHandlers);
    }

    function toggleUserLogin() {
        var endpoint = isUserLoggedIn ? ENDPOINTS.LOGOUT : ENDPOINTS.LOGIN;

        App.Utils.httpGet(
            endpoint,
            function onLoginLogoutSuccess(response) {
                if (!isUserLoggedIn && response.userState === 'loggedin') {
                    isUserLoggedIn = true;
                    document.querySelector('.login').innerHTML = 'Logout';
                    logger.log('User logged in');
                    launchBgService();
                } else {
                    isUserLoggedIn = false;
                    document.querySelector('.login').innerHTML = 'Login';
                    logger.log('User logged out');
                    launchBgService();
                }
            },
            function onLoginLogoutError(error) {
                logger.error('Login/logout failed:', error.message);
            }
        );
    }

    function toggleFullscreen() {
        if (!isFullscreen) {
            App.Navigation.getMenu('Player').nextMenu = '';
            App.Navigation.getMenu('Player').onAfterLastItem = function () { };
            isFullscreen = true;
        } else {
            App.Navigation.getMenu('Player').nextMenu = 'Basic';
            App.Navigation.getMenu('Player').onAfterLastItem = function () {
                App.Navigation.changeActiveMenu('Logs');
            };
            isFullscreen = false;
        }

        player.toggleFullscreen();
    }

    function exitFullscreen() {
        if (isFullscreen) {
            toggleFullscreen();
        }
    }

    function createMovieButtons(videos) {
        var moviesList = document.querySelector('.moviesList');
        // var menuContainer = document.getElementById('buttons');
        // var showHideInfoBtn = menuContainer.querySelector('.toggle-info');
        // var loginBtn = menuContainer.querySelector('.login');

        App.Navigation.unregisterMenu('Basic');

        // showHideInfoBtn.remove();
        // loginBtn.remove();

        videos.forEach(function (video) {
            var newEl = document.createElement('button');

            newEl.textContent = video.title;
            newEl.classList.add('movie');
            newEl.classList.add('movie-' + video.id);
            newEl.setAttribute('data-list-item', '');

            moviesList.appendChild(newEl);
        });

        // menuContainer.appendChild(loginBtn);
        // menuContainer.appendChild(showHideInfoBtn);

        App.Navigation.registerMenu({
            domEl: document.querySelector('#buttons'),
            name: 'Basic',
            previousMenu: 'Player',
            onAfterLastItem: function () {
                var logsLength = document.querySelectorAll('.log').length;

                if (logsLength > 0 && !isFullscreen) {
                    App.Navigation.changeActiveMenu('Logs');
                }
            }
        });
        App.Navigation.getMenu('Player').nextMenu = 'Basic';
        App.Navigation.getMenu('Logs').previousMenu = 'Basic';
        App.Navigation.changeActiveMenu('Basic');
    }

    function addButtonsHandlersForVideos(videos) {
        var buttonsWithHandlers = videos.map(function (video) {
            return {
                elementSelector: '.movie-' + video.id,
                handler: switchVideo.bind(null, video)
            };
        });

        App.KeyHandler.addHandlersForButtons(buttonsWithHandlers);
    }

    function appControlHandler() {
        var requestedAppControl = tizen.application.getCurrentApplication().getRequestedAppControl();
        var payloadData = getPayloadData(requestedAppControl.appControl.data);
        var videoData = null;

        if (payloadData) {
            logger.log('[AppControl] PAYLOAD object found - app launched from preview.');
            videoData = videosList.filter(function (video) {
                return video.id === payloadData.videoID.toString();
            })[0];

            switchVideo(videoData);
        } else {
            logger.log('[AppControl] No PAYLOAD object found - app launched normally.');
        }
    }

    function isPayload(data) {
        return data.key === 'PAYLOAD';
    }

    function decodeData(data) {
        var values = JSON.parse(data.value[0]).values;
        var decodedValues = decodeURIComponent(values);

        return JSON.parse(decodedValues);
    }

    function getPayloadData(data) {
        return data.filter(isPayload).map(decodeData)[0];
    }

    function launchBgService() {
        logger.log('launchBgService');

        // block ENTER key to avoid multiple executions of background service
        App.KeyHandler.disableKeyHandler();

        tizen.application.launchAppControl(
            new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/pick',
                null,
                null,
                null,
                [new tizen.ApplicationControlData('isUserLoggedIn', [isUserLoggedIn])]),
            targetApplicationId,
            function () {
                App.KeyHandler.enableKeyHandler();
                logger.log('Launching background service success');
            },
            function (e) {
                App.KeyHandler.enableKeyHandler();
                logger.log('Launching background service [' + targetApplicationId + '] failed: ' + e.message);
            }
        );
    }

    window.onload = function onload() {
        var loggerContainer = document.querySelector('.logsContainer');

        logger = App.Logger.create({
            loggerEl: loggerContainer,
            loggerName: 'Main',
            logLevel: App.Logger.logLevels.ALL
        });

        App.Utils.httpGet(
            ENDPOINTS.CHECKLOGIN,
            function onLoginCheckSuccess(response) {
                if (response.userState === 'loggedin') {
                    isUserLoggedIn = true;
                    document.querySelector('.login').innerHTML = 'Logout';
                    logger.log('User is already logged in');
                } else {
                    isUserLoggedIn = false;
                    document.querySelector('.login').innerHTML = 'Login';
                    logger.log('User is NOT logged in yet');
                }
            },
            function onLoginCheckError(error) {
                logger.error('Checking user login state failed:', error.message);
            }
        );

        App.Utils.httpGet(
            ENDPOINTS.VIDEOS,
            function onVideosFetched(videos) {
                var playerConfig = {
                    url: videos[0].url,
                    playerEl: document.querySelector('#av-player'),
                    controls: document.querySelector('#playerButtons'),
                    logger: App.Logger.create({
                        loggerEl: document.querySelector('.logsContainer'),
                        loggerName: 'Player',
                        logLevel: App.Logger.logLevels.ALL
                    })
                };

                videosList = videos;

                App.Navigation.getMenu('Basic').previousMenu = 'Player';

                App.Navigation.registerMenu({
                    domEl: document.querySelector('#playerButtons'),
                    name: 'Player',
                    nextMenu: 'Basic',
                    onAfterLastItem: function () {
                        App.Navigation.changeActiveMenu('Logs');
                    }
                });

                // initialize player - loaded from videoPlayer.js
                player = App.VideoPlayer.create(playerConfig);

                createMovieButtons(videosList);
                registerKeyHandlers();
                addButtonsHandlers();
                addButtonsHandlersForVideos(videos);

                window.addEventListener('appcontrol', appControlHandler);

                appControlHandler();
            },
            function onVideosFetchError(error) {
                logger.error('Streaming Server request error, is Streaming Server running?', error.message);
            }
        );
    };
}());
