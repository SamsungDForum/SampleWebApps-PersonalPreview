# Personal Preview

This application demonstrates the usage of Preview API. With this API it is possible to have a preview on SmartHub main screen showing what content is available in application. It provides a way for deeplinking to specific parts of application to directly access the desired content.  

What is most important, this application shows how to implement Preview with background service. This gives many possibilities, e.g. it is possible to create personalized Preview for logged in user.

## How to use the Public Preview application

In order to use Preview follow the procedure:

1. Launch Preview Server (see PreviewServer app)
2. Launch Streaming Server (see StremaingServer app)
3. Install and launch Personal Preview App
4. Add shortcut to Preview bar (go to Apps panel, press and hold ENTER button on desired app - menu will appear, choose "Add to Home")

If a TV can access Preview server and Streaming server user should see the preview tiles on Preview bar on SmartHub home screen. 
When user clicks on desired content the application will be launched and chosen content should start to play.  

The application itself is a simple VOD player. Use TV remote controller to choose the movie and control playback.  

When user logs in by pressing the button "Login" (this is only a stub of real login) the application launches the background service to replace the contents of Preview bar in SmartHub with personalized data.  

**IMPORTANT!** `webapis.preview.setPreviewData()` should not be called more often than once per 10 minutes. If it called more often the Preview can be not refreshed - the call to `webapis.preview.setPreviewData()` will be silently omitted.

## Supported platforms

2016 and newer


## Prerequisites

In order for Preview to work user needs to launch a Preview Server providing a JSON file with preview data (see PreviewServer app).  
Preview Server app contains `preview.json` file with data for public preview and `personalized.json` with user personalized data for personalized preview. It also contains `videos.json` with URLs to video streams that can be played in the application. Replace the resource URLs in mentioned JSON files with the ones fitting your environment. StreamingServer app can be used for serving the example streams. 


To use Preview API, embed below script into your `index.html`:

```html
<script type="text/javascript" src="$WEBAPIS/webapis/webapis.js"></script>
```

## Privileges and metadata

To enable your application to use the personal preview functionality set the background service application as the preview data source:
```xml
<tizen:metadata key="http://samsung.com/tv/metadata/use.preview" value="bg_service"></tizen:metadata>
```

To add the background service application to the foreground application, add the following code in `config.xml`:

```xml
<tizen:service id="sample0020.SamplePreviewBGService">
    <tizen:content src="js/backgroundService/backgroundService.js" />
    <tizen:name>SamplePreviewBGService</tizen:name>
    <tizen:description>Service Application</tizen:description>
    <tizen:metadata key="meta-key" value="meta-value" />
    <tizen:category name="http://tizen.org/category/service" />
</tizen:service>
```
Replace `tizen:service id` and `tizen:content src` (also `tizen:name` and `tizen:description`) with a proper data according to your application.

Disable reloading the application main page when it receives an application control request. This allows your application, if it is already running, to receive the `action_data` information without reloading:

```xml
<tizen:app-control>
    <tizen:src name="index.html" reload="disable" />
    <tizen:operation name="http://samsung.com/appcontrol/operation/eden_resume" />
</tizen:app-control>
```

In order to use `webapis.avplay` API the following privileges and metadata must be included in `config.xml`:

```xml
<tizen:privilege name="http://developer.samsung.com/privilege/avplay" />
```

The final thing is to put the correct backend server address in application (Preview Server is responsible for this). Find the following line at the beginning of `js/main.js`:  

```javascript
var SERVER_ADDRESS = 'http://192.168.137.1';
var ENDPOINTS = {
    VIDEOS: SERVER_ADDRESS + '/videos', // videos list for playing in the app
    LOGIN: SERVER_ADDRESS + '/login?username=test&password=124', // backend url for logging in the user
    LOGOUT: SERVER_ADDRESS + '/logout', // backend url for logging out the user
    CHECKLOGIN: SERVER_ADDRESS + '/checkLogin' // backend url for checking if user is logged in or not
};
```

### File structure

```
PersonalPreview/ - PersonalPreview sample app root folder
│
├── assets/ - resources used by this app
│   │
│   └── JosefinSans-Light.ttf - font used in application
│
├── css/ - styles used in the application
│   │
│   ├── main.css - styles specific for the application
│   └── style.css - style for application's template
│
├── js/ - scripts used in the application
│   │
│   ├── backgroundService/ - contains background service related files
│   │   │
│   │   ├── ajax.js - module for sending requests to server
│   │   ├── backgroundService.js - background service main execution file
│   │   ├── backgroundServiceConfig.json - background service configuration file
│   │   ├── fileSystem.js - responsible for operations on files such as writing, reading etc.
│   │   └── remoteLogger.js - module for sending logs from background service to server
│   │
│   ├── init.js - script that runs before any other for setup purpose
│   ├── keyhandler.js - module responsible for handling keydown events
│   ├── logger.js - module allowing user to register logger instances
│   ├── main.js - main application script
│   ├── navigation.js - module responsible for handling in-app focus and navigation
│   ├── utils.js - module with useful tools used through application
│   └── videoPlayer.js - module controlling AVPlay player
│
├── CHANGELOG.md - changes for each version of application
├── config.xml - application's configuration file
├── icon.png - application's icon
├── index.html - main document
└── README.md - this file
```

## Other resources

*  **Preview API**  
  https://developer.samsung.com/tv/develop/api-references/samsung-product-api-references/preview-api

*  **Personal Preview Implementation**  
  https://developer.samsung.com/tv/develop/guides/smart-hub-preview/implementing-personal-preview


## Copyright and License

**Copyright 2019 Samsung Electronics, Inc.**

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
