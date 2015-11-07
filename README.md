AR.Core
=======

## Installation

```
$ bower install --save git@github.com:addictradio/net.addictradio.core.git
```

## API

The ar.core module expose 3 public services, 1 provider and 3 directives
Please note that all methods and attributes starting with `_` (e.g.: AudioPlayer._watchLoading) are considered as "private" and should not be used by the app.

### Provider

#### arSettingsProvider
It defines configuration for ar.core and must be used on angular bootstrap

```js
angular.module('myApp', [ar.core])
.config(function(arSettingsProvider) {
  arSettingsProvider.setOptions({
    playerName: 'Website', // (mandatory) define playerName for analityc tools (adswizz)
    protocol: 'http', // optional
    port: '8080', // optional
    socketPort: '9277', // optional
    host: 'dev.addictradio.net', // optional
    path: '/api/1' // optional
  });
});
```

### Services

#### arAudioPlayer
A single instance is shared accross application and take care of playing an audio stream and related features.

It returns an `AudioPlayer` object defined below.

N.B.: arAudioPlayer come [with 3 directives](#user-content-directives) to interact with `play()` `stop()` and `get/setVolume()`

#### arChannel
A single instance is shared accross application. On startup this service retrieve all channels from server and expose 2 methods.

| Attribute | Parameters | Behavior |
|-----------|------------|----------|
| list() | - | return an Array of `Channel` objects |
| find(string) | a string that designate a channel tag (e.g.: 'alternative' or 'ldg') as served by server API | return a single `Channel` object |
| promise | - | an angular [$http promise](https://code.angularjs.org/1.4.7/docs/api/ng/service/$q#the-promise-api) (for initial call to server) |

FYI: $http promise `success` and `error` methods have been deprecated. Use $q standard `then` method instead

#### arMeta
Contains a collection of metadatas for each channel. They are updated along time with a websocket.

| Attribute | Parameters | Behavior |
|-----------|------------|----------|
| find(string) | a string that designate a channel tag (e.g.: 'alternative' or 'ldg') as served by server API | return a single `Meta` object that match a specific channel |
| promise | - | an angular [$http promise](https://code.angularjs.org/1.4.7/docs/api/ng/service/$q#the-promise-api) (for initial call to server) |

### Directives

#### arPlay
This control start playing a channel.

```html
<button ar-play channel="channel">Play {{ channel.name }}</button>
```

If `channel` attribute is not defined, the directive will try to play the currently selected channel (and throw an error if there is no channel selected).

#### arStop
Stop the audio and unload sources.

```html
<button ar-stop>Stop</button>
```

#### arVolume
This control will append an `input[type="range"]` and allow to control audio volume.

```html
<ar-volume></ar-volume>
```

### Custom Objects

#### AudioPlayer
Defined in arAudioPlayer.

| Attribute | Parameters | Behavior |
|-----------|------------|----------|
| audio | - | the HTML Audio element (should not be used directly) |
| play() | - | load audio streams from a previously selected channel and start playing |
| stop() | - | pause the audio and unload sources |
| getVolume() | - | return the current volume (between 0 and 100) |
| setVolume(`Number`/`String`) | a number (or parsable string) between 0 and 100 | set the audio volume |
| getChannel() | - | return the currently selected `Channel` |
| setChannel(`Channel`) | a Channel object as returned by `arChannel.list()` or `arChannel.find(channelTag)` | set a new channel as the current one. |
| isLoading | - | is `true` if stream is loading or `false` |
| isPlaying | - | is `true` if player actually play something (e.g.: computer speakers are actually louding something) or `false` |

#### Channel
Defined in arChannel.

| Attribute | Behavior |
|-----------|----------|
| name | formatted channel name |
| tag | channel tag |
| theme | an array of colors for per channel theming purpose |
| streams | an array of streams url[string] and status[string] can be `online` or `offline` |
| sources() | return an array of formatted and ready to urls for each streams |
| meta() | return a `Meta` object corresponding the currently played title on channel |

#### Meta
Defined in arMeta.

| Attribute | Parameters | Behavior |
|-----------|------------|----------|
| played_on | - | channel tag for this meta |
| played_at | - | dateTime for this meta |
| req_artist | - | original request data (should not be used) |
| req_title | - | original request data (should not be used) |
| song | - | a song object (check your network panel to get its structure) |
| cover() | - | get the cover url for this album |
| fullname(separator) | a string to separate song title and artist name | get a formatted title + artist name |

## Contribute

To contribute please **fork this repository**.

For any new feature (improvements, etc…) create a new `feature` branch following [git-flow](http://nvie.com/img/git-model@2x.png) workflow. When a feature is ready make a pull request on github (`my_fork/net.addictradio.core:feature/my_feature` ->> `addictradio/net.addictradio.core:feature/my_feature`).

You will need node.js to be installed on your computer.

Mac
```bash
$ brew install node
```

Debian
```bash
$ sudo apt-get install node
```

Windows… do your stuff :trollface:

**Install developer dependencies**
```bash
$ git clone git@github.com:addictradio/net.addictradio.core.git
$ cd net.addictradio.core
$ npm install
$ bower install
$ gulp
```

A tiny server will start on localhost:8080 with the demo app. Please do not edit files in `/dist` folder, they won't be saved. Source files are in `/src`. Each time you hit save all sources are concatenated and minified in `/dist`.
