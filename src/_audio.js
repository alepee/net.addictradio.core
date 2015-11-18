(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.service('arAudioPlayer', function(
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

    this.getCoverData = function(id) {
      if (this.getMeta() && this.getMeta().cover)
        return this.getMeta().cover.base64(id);
    };

    this.getCoverLightness = function() {
      if (this.getMeta() && this.getMeta().cover)
        return this.getMeta().cover.lightness;
    };

    this.getCoverLightnessWord = function() {
      var lightnessValue = this.getCoverLightness();
      if (lightnessValue)
        return this.getCoverLightness() < 128 ? 'dark' : 'light';
      else
        return undefined;
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
