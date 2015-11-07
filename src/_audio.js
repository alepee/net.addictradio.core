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
