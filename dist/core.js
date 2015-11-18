(function() {
  'use strict';
  var core = angular.module('ar.core', []);

  core.provider('arSettings', function() {
    var settings = {
      server: {
        protocol: 'http',
        port: '8080',
        socketPort: '9277',
        host: 'dev.addictradio.net',
        path: '/api/1'
      },
      playerName: null,
      coverPreload: {
        background: {
          width: 500,
          height: 500,
          blurRadius: 70
        },
        thumb: {
          width: 300,
          height: 300,
          blurRadius: 0
        }
      }
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
          settings.server.protocol + '://' +
          settings.server.host +
          (settings.server.port ? ':' + settings.server.port : ':80') +
          settings.server.path
          );
      })();

      settings.socket = (function() {
        return (
          settings.server.protocol + '://' +
          settings.server.host +
          ':' + settings.server.socketPort
          );
      })();

      return settings;
    }];
  });

}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.service('arAudioPlayer', ["$interval", "$timeout", "arSettings", "arChannel", function(
    $interval, $timeout, arSettings, arChannel
    ) {

    this.audio = new Audio();

    this._lastChunk = 0;
    this._currentChannel = null;
    this._watchPromise = null;

    if (arSettings.autoLoadChannel) {
      arChannel.promise.then((function() {
        var channel = arChannel.find(arSettings.autoLoadChannel);
        if (!channel) {
          var index = Math.floor(Math.random() * arChannel.list().length);
          channel = arChannel.list()[index];
        }
        this.setChannel(channel);

        if (arSettings.autoPlay) this.play();
      }).bind(this));
    }

    angular.element(this.audio).on('timeupdate', (function(e) {
      if (this._lastChunk !== 0) this._lastChunk = e.timeStamp;
    }).bind(this));

    $interval((function() {
      this.isPlaying = (Date.now() - this._lastChunk) < 2000;
      this.isLoading = this._lastChunk === Infinity;

      if (this._lastChunk !== 0 && !this.isPlaying) this._restart();
    }).bind(this), 250);

    this.play = function() {
      this._loadSource();
      this.audio.play();
      this._lastChunk = Infinity;
      this._watchLoading();
      return this;
    };

    this.stop = function() {
      this.audio.pause();
      this._unloadSource();
      this._lastChunk = 0;
      return this;
    };

    this.getVolume = function() {
      return parseInt(this.audio.volume * 100);
    };

    this.setVolume = function(value) {
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

    this.getChannel = function() {
      return this._currentChannel;
    };

    this.setChannel = function(channel) {
      this._currentChannel = channel;
      return this;
    };

    this.getMeta = function() {
      if (this.getChannel()) return this.getChannel().meta();
    };

    this.getCover = function(id) {
      if (this.getMeta() && this.getMeta().cover) {
        var cover = this.getMeta().cover;
        return id ? cover.base64(id) : cover.source;
      }
    };

    this.getCoverLightness = function() {
      if (this.getMeta() && this.getMeta().cover)
        return this.getMeta().cover.lightness;
    };

    this.getCoverLightnessWord = function() {
      var lightnessValue = this.getCoverLightness();
      if (lightnessValue)
        return this.getCoverLightness() < 128 ? 'dark' : 'light';
    };

    this.getTheme = function() {
      if (this.getChannel())
        return this.getChannel().theme;
    };

    this._watchLoading = function(callback) {
      if (this._watchPromise) $timeout.cancel(this._watchPromise);

      this._watchPromise = $timeout((function() {
        if (this.isLoading) {
          this.stop();
          this.isLoading = false;
          this._restart();
          this._watchPromise = null;
        }
      }).bind(this), 5000);
    };

    this._restart = function() {
      if (!this.isLoading) this.play();
    };

    this._loadSource = function() {
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

    this._unloadSource = function() {
      while (this.audio.firstChild) {
        this.audio.removeChild(this.audio.firstChild);
      }
      return this;
    };
  }]);

  core.directive('arPlay', ["arAudioPlayer", function(arAudioPlayer) {
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
  }]);

  core.directive('arStop', ["arAudioPlayer", function(arAudioPlayer) {
    return {
      link: function(scope, element, attrs) {
        element.on('click', function(e) {
          e.preventDefault();
          arAudioPlayer.stop();
        });
      }
    };
  }]);

  core.directive('arVolume', ["arAudioPlayer", function(arAudioPlayer) {
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
  }]);

}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.factory('arChannel', ["$http", "arSettings", "arMeta", function($http, arSettings, arMeta) {
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
      promise: promise,
      list: function() {
        return _channels;
      },
      find: function(tag) {
        return _channels.filter(function(channel) {
          return channel.tag === tag;
        })[0];
      },
    };
  }]);


}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.factory('arCover', ["$q", "arSettings", function($q, arSettings) {
    function Cover(url) {
      this.source = url;
      this.image = new Image();
      this.image.src = this.source + '?' + new Date().getTime();
      this.image.crossOrigin = "Anonymous";

      var deferred = $q.defer();
      this.promise = deferred.promise;

      this._exports = {};

      this.image.onload = (function() {
        this.getLightness();
        if (arSettings.coverPreload) {
          var keys = Object.keys(arSettings.coverPreload);
          for (var i = keys.length - 1; i >= 0; i--) {
            var key = keys[i];
            var opt = arSettings.coverPreload[key];
            this.export(key, opt.width, opt.height, opt.blurRadius);
          }
        }

        deferred.resolve(this);
      }).bind(this);
    }

    Cover.prototype.base64 = function(id) {
      return (this._exports[id] ? this._exports[id].getBase64() : void 0);
    };

    Cover.prototype.export = function(id, width, height, blurRadius) {
      height = height || (
        width ?
        width * (this.image.naturalHeight / this.image.naturalWidth) :
        this.image.naturalHeight
        );
      width = width || this.image.naturalWidth;

      if (this._exports[id])
        return this._exports[id];

      var coverExport = new CoverExport(this);
      coverExport.draw(width, height);

      if (parseFloat(blurRadius))
        coverExport.blur(parseFloat(blurRadius));

      this._exports[id] = coverExport;
      return this._exports[id];
    };

    Cover.prototype.getLightness = function() {
      var sampleSize = 20;
      var data = (new CoverExport(this))
        .draw(sampleSize, sampleSize)
        .getImageData().data;

      var r, g, b, avg, colorSum = 0;
      for (var i = 0, len = data.length; i < len; i+=4) {
        r = data[i];
        g = data[i + 1];
        b = data[i + 2];

        avg = Math.floor((r + g + b) / 3);
        colorSum += avg;
      }
      var lightness = Math.floor(colorSum / Math.pow(sampleSize, 2));
      return (this.lightness = lightness);
    };

    function CoverExport(source) {
      this.source = source;
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }

    CoverExport.prototype.draw = function(width, height) {
      this.canvas.style.width = (this.canvas.width = width) + 'px';
      this.canvas.style.height = (this.canvas.height = height) + 'px';
      this.ctx.drawImage(this.source.image, 0, 0, width, height);
      return this;
    };

    CoverExport.prototype.blur = function(radius) {
      function BlurStack() {
        this.r = 0;
        this.g = 0;
        this.b = 0;
        this.a = 0;
        this.next = null;
      }

      var mul_table = [
      512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,
      454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,
      482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,
      437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,
      497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,
      320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,
      446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,
      329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,
      505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,
      399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,
      324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,
      268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,
      451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,
      385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,
      332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,
      289,287,285,282,280,278,275,273,271,269,267,265,263,261,259];

      var shg_table = [
      9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
      17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
      19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
      21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
      21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
      23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
      23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
      23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
      23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24];

      if (isNaN(radius) || radius < 1) return;
      radius |= 0;

      var top_x = 0;
      var top_y = 0;
      var width = this.canvas.width;
      var height = this.canvas.height;

      var imageData = this.ctx.getImageData(top_x, top_y, width, height);
      var pixels = imageData.data;

      var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
      r_out_sum, g_out_sum, b_out_sum,
      r_in_sum, g_in_sum, b_in_sum,
      pr, pg, pb, rbs;

      var div = radius + radius + 1;
      var w4 = width << 2;
      var widthMinus1  = width - 1;
      var heightMinus1 = height - 1;
      var radiusPlus1  = radius + 1;
      var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

      var stackStart = new BlurStack();
      var stack = stackStart;
      for (i = 1; i < div; i++) {
        stack = stack.next = new BlurStack();
        if (i == radiusPlus1) var stackEnd = stack;
      }
      stack.next = stackStart;
      var stackIn = null;
      var stackOut = null;

      yw = yi = 0;

      var mul_sum = mul_table[radius];
      var shg_sum = shg_table[radius];

      for (y = 0; y < height; y++) {
        r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;

        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi+1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi+2]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;

        stack = stackStart;

        for(i = 0; i < radiusPlus1; i++) {
          stack.r = pr;
          stack.g = pg;
          stack.b = pb;
          stack = stack.next;
        }

        for( i = 1; i < radiusPlus1; i++ ) {
          p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
          r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
          g_sum += (stack.g = (pg = pixels[p+1])) * rbs;
          b_sum += (stack.b = (pb = pixels[p+2])) * rbs;

          r_in_sum += pr;
          g_in_sum += pg;
          b_in_sum += pb;

          stack = stack.next;
        }

        stackIn = stackStart;
        stackOut = stackEnd;
        for (x = 0; x < width; x++) {
          pixels[yi]   = (r_sum * mul_sum) >> shg_sum;
          pixels[yi+1] = (g_sum * mul_sum) >> shg_sum;
          pixels[yi+2] = (b_sum * mul_sum) >> shg_sum;

          r_sum -= r_out_sum;
          g_sum -= g_out_sum;
          b_sum -= b_out_sum;

          r_out_sum -= stackIn.r;
          g_out_sum -= stackIn.g;
          b_out_sum -= stackIn.b;

          p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

          r_in_sum += (stackIn.r = pixels[p]);
          g_in_sum += (stackIn.g = pixels[p+1]);
          b_in_sum += (stackIn.b = pixels[p+2]);

          r_sum += r_in_sum;
          g_sum += g_in_sum;
          b_sum += b_in_sum;

          stackIn = stackIn.next;

          r_out_sum += ( pr = stackOut.r );
          g_out_sum += ( pg = stackOut.g );
          b_out_sum += ( pb = stackOut.b );

          r_in_sum -= pr;
          g_in_sum -= pg;
          b_in_sum -= pb;

          stackOut = stackOut.next;

          yi += 4;
        }
        yw += width;
      }


      for (x = 0; x < width; x++) {
        g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;

        yi = x << 2;
        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi+1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi+2]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;

        stack = stackStart;

        for (i = 0; i < radiusPlus1; i++) {
          stack.r = pr;
          stack.g = pg;
          stack.b = pb;
          stack = stack.next;
        }

        yp = width;

        for (i = 1; i <= radius; i++) {
          yi = ( yp + x ) << 2;

          r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
          g_sum += (stack.g = (pg = pixels[yi+1])) * rbs;
          b_sum += (stack.b = (pb = pixels[yi+2])) * rbs;

          r_in_sum += pr;
          g_in_sum += pg;
          b_in_sum += pb;

          stack = stack.next;

          if (i < heightMinus1) yp += width;
        }

        yi = x;
        stackIn = stackStart;
        stackOut = stackEnd;
        for (y = 0; y < height; y++) {
          p = yi << 2;
          pixels[p]   = (r_sum * mul_sum) >> shg_sum;
          pixels[p+1] = (g_sum * mul_sum) >> shg_sum;
          pixels[p+2] = (b_sum * mul_sum) >> shg_sum;

          r_sum -= r_out_sum;
          g_sum -= g_out_sum;
          b_sum -= b_out_sum;

          r_out_sum -= stackIn.r;
          g_out_sum -= stackIn.g;
          b_out_sum -= stackIn.b;

          p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

          r_sum += (r_in_sum += (stackIn.r = pixels[p]));
          g_sum += (g_in_sum += (stackIn.g = pixels[p+1]));
          b_sum += (b_in_sum += (stackIn.b = pixels[p+2]));

          stackIn = stackIn.next;

          r_out_sum += (pr = stackOut.r);
          g_out_sum += (pg = stackOut.g);
          b_out_sum += (pb = stackOut.b);

          r_in_sum -= pr;
          g_in_sum -= pg;
          b_in_sum -= pb;

          stackOut = stackOut.next;

          yi += width;
        }
      }

      this.ctx.putImageData(imageData, top_x, top_y);

      return this;
    };

    CoverExport.prototype.getBase64 = function() {
      return this.canvas.toDataURL();
    };

    CoverExport.prototype.getImageData = function() {
      return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    };

    return Cover;
  }]);

}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.factory('arMeta', ["$http", "$q", "arSettings", "arSocket", "arCover", function($http, $q, arSettings, arSocket, arCover) {
    var _metas = {};

    function Meta(data) {
      var deferred = $q.defer();

      this.played_on = data.played_on;
      this.played_at = data.played_at;
      this.req_artist = data.req_artist;
      this.req_title = data.req_title;
      this.song = data.song;
      this.promise = deferred.promise;

      if (!this.song) {
        this.clean();
        deferred.resolve();
      } else if (this.song.album && this.song.album.cover_url) {
        this.cover = new arCover(this.song.album.cover_url);

        this.cover.promise.then((function() {
          deferred.resolve();
        }).bind(this));
      }
    }

    Meta.prototype.fullName = function(separator) {
      return this.song.name + (separator || ' — ') + this.song.artist.name;
    };

    Meta.prototype.clean = function() {
      this.song = {
        name: this.req_title,
        artist: {
          name: this.req_artist
        }
      };
    };

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

      var meta = new Meta(data);
      meta.promise.then(function() {
        _metas[data.played_on] = meta;
      });
    });

    return {
      find: function(tag) {
        return _metas[tag];
      },
      promise: promise
    };
  }]);

}).call(this);

(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.service('arSocket', ["$rootScope", "arSettings", function($rootScope, arSettings) {
    var socket = io.connect(arSettings.socket);

    this.on = function(eventName, callback) {
      socket.on(eventName, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          callback.apply(socket, args);
        });
      });
    };
    this.emit = function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    };
  }]);
}).call(this);
