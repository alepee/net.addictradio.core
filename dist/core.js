(function() {
  'use strict';
  var core = angular.module('ar.core', []);

  core.provider('arSettings', function() {
    var settings = {
      protocol: 'http',
      port: '8080',
      socketPort: '9277',
      host: 'dev.addictradio.net',
      path: '/api/1',
      playerName: null
    };

    this.setOptions = function(options) {
      settings = angular.extend(settings, options);
    };

    this.$get = [function() {
      if (!settings.playerName) {
        throw new Error('You must set a playerName value for ar.core with arSettingsProvider.setOption() in angular config phase');
      }

      settings.endpoint = (function() {
        return (
          settings.protocol + '://' +
          settings.host +
          (settings.port ? ':' + settings.port : ':80') +
          settings.path
          );
      })();

      settings.socket = (function() {
        return (
          settings.protocol + '://' +
          settings.host +
          ':' + settings.socketPort
          );
      })();

      return settings;
    }];
  });

}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.factory('arAudioPlayer', function($interval, $timeout) {
    function AudioPlayer() {
      this.audio = new Audio();

      this._lastChunk = 0;
      this._currentChannel = null;
      this._watchPromise = null;

      var self = this;
      angular.element(self.audio).on('timeupdate', function(e) {
        if (self._lastChunk !== 0) self._lastChunk = e.timeStamp;
      });

      $interval(function() {
        self.isPlaying = (Date.now() - self._lastChunk) < 2000;
        self.isLoading = self._lastChunk === Infinity;

        if (self._lastChunk !== 0 && !self.isPlaying) self._restart();
      }, 250);
    }

    AudioPlayer.prototype.play = function() {
      this._loadSource();
      this.audio.play();
      this._lastChunk = Infinity;
      this._watchLoading();
      return this;
    };

    AudioPlayer.prototype.stop = function() {
      this.audio.pause();
      this._unloadSource();
      this._lastChunk = 0;
      return this;
    };

    AudioPlayer.prototype.getVolume = function() {
      return parseInt(this.audio.volume * 100);
    };

    AudioPlayer.prototype.setVolume = function(value) {
      value = parseInt(value);
      if (typeof value === "number" &&
         isFinite(value) &&
         value >= 0 &&
         value <= 100) {
        this.audio.volume = value / 100;
      } else {
        console.error(
          'Volume must be a number between 0 and 100 (was: ' + value + ')'
          );
      }
      return this;
    };

    AudioPlayer.prototype.getChannel = function() {
      return this._currentChannel;
    };

    AudioPlayer.prototype.setChannel = function(channel) {
      this._currentChannel = channel;
      return this;
    };

    AudioPlayer.prototype._watchLoading = function(callback) {
      if (this._watchPromise) $timeout.cancel(this._watchPromise);

      var self = this;
      self._watchPromise = $timeout(function() {
        if (self.isLoading) {
          self.stop();
          self.isLoading = false;
          self._restart();
          self._watchPromise = null;
        }
      }, 5000);
    };

    AudioPlayer.prototype._restart = function() {
      if (!this.isLoading) this.play();
    };

    AudioPlayer.prototype._loadSource = function() {
      this._unloadSource();
      var sources = (this._currentChannel ? this._currentChannel.sources() : void 0);
      if (!sources) throw new Error('_currentChannel is undefined. Use setChannel method.');

      for (var i = sources.length - 1; i >= 0; i--) {
        var source = sources[i];
        var element = document.createElement('source');
        this.audio.appendChild(element);
        element.src = source;
      }

      this.audio.load();
      return this;
    };

    AudioPlayer.prototype._unloadSource = function() {
      while (this.audio.firstChild) {
        this.audio.removeChild(this.audio.firstChild);
      }
      return this;
    };

    return new AudioPlayer();
  });

  core.directive('arPlay', function(arAudioPlayer) {
    return {
      scope: { channel: '=' },
      link: function(scope, element, attrs) {
        element.on('click', function(e) {
          e.preventDefault();
          arAudioPlayer.setChannel(scope.channel || arAudioPlayer.getChannel());
          arAudioPlayer.play();
        });
      }
    };
  });

  core.directive('arStop', function(arAudioPlayer) {
    return {
      link: function(scope, element, attrs) {
        element.on('click', function(e) {
          e.preventDefault();
          arAudioPlayer.stop();
        });
      }
    };
  });

  core.directive('arVolume', function(arAudioPlayer) {
    return {
      template: '<input type="range" min="0" max="100" ng-model="volume">',
      scope: {},
      restrict: 'E',
      link: function(scope, element, attrs) {
        scope.volume = arAudioPlayer.getVolume();
        element.on('input change', function() {
          arAudioPlayer.setVolume(scope.volume);
        });
      }
    };
  });

}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.factory('arChannel', function($http, arSettings, arMeta) {
    var _channels = [];

    function Channel(data) {
      this.name = data.name;
      this.tag = data.tag;
      this.theme = data.theme;
      this.streams = data.streams;
    }

    Channel.prototype.sources = function() {
      return this.streams
        .filter(function(stream) {
          return stream.status === 'online';
        })
        .map(function(stream) {
          return (stream.url +
            '?amsparams=playerid:' +
            arSettings.playerName +
            ';skey:' +
            parseInt(Date.now() / 1000) +
            ';'
            );
        });
    };

    Channel.prototype.meta = function() {
      return arMeta.find(this.tag);
    };

    var promise = $http.get(arSettings.endpoint + '/channels', {});
    promise.then(function(res) {
      for (var i = res.data.response.length - 1; i >= 0; i--) {
        _channels.push(new Channel(res.data.response[i]));
      }
    }, function(error) {
      console.error(error);
    });

    return {
      list: function() {
        return _channels;
      },
      find: function(tag) {
        return _channels.filter(function(channel) {
          return channel.tag === tag;
        });
      },
      promise: promise
    };
  });


}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  function Meta(data) {
    this.played_on = data.played_on;
    this.played_at = data.played_at;
    this.req_artist = data.req_artist;
    this.req_title = data.req_title;
    this.song = data.song;

    this._clean();
  }

  Meta.prototype.cover = function() {
    return (this.song.album ? this.song.album.cover_url : void 0);
  };

  Meta.prototype.fullName = function(separator) {
    return this.song.name + (separator || ' — ') + this.song.artist.name;
  };

  Meta.prototype._clean = function() {
    if (this.song == null) {
      this.song = {
        name: this.req_title,
        artist: {
          name: this.req_artist
        }
      };
    }
  };

  core.factory('arMeta', function($http, $q, arSettings, arSocket) {
    var _metas = {};

    var promise = $http.get(arSettings.endpoint + '/plays', {});
    promise.then(function(res) {
      for (var i = res.data.response.length - 1; i >= 0; i--) {
        _metas[res.data.response[i].played_on] = new Meta(res.data.response[i]);
      }
    }, function(error) {
      console.error(error);
    });

    arSocket.on('play:update', function(data) {
      var cover, ref;
      var deferred = $q.defer();

      if (cover = (ref = data.song) != null ? ref.album.cover_url : void 0) {
        var image = new Image();
        image.src = cover;
        image.onload = deferred.resolve;
      } else {
        deferred.resolve();
      }

      deferred.promise.then(function() {
        _metas[data.played_on] = new Meta(data);
      });
    });

    return {
      find: function(tag) {
        return _metas[tag];
      },
      promise: promise
    };
  });

}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.factory('arSocket', function($rootScope, arSettings) {
    var socket = io.connect(arSettings.socket);
    return {
      on: function(eventName, callback) {
        socket.on(eventName, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        });
      }
    };
  });
}).call(this);
