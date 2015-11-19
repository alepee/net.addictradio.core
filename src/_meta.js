(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.factory('arMeta', function($http, $q, arSettings, arSocket, arCover) {
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

    var api = {
      find: function(tag) {
        return _metas[tag];
      },
      reload: function() {
        callServer();
      }
    };

    var callServer = function() {
      api.promise = $http.get(arSettings.endpoint + '/plays', {});
      api.promise.then(function(res) {
        for (var i = res.data.response.length - 1; i >= 0; i--) {
          var data = res.data;
          _metas[data.response[i].played_on] = new Meta(data.response[i]);
        }
      }, function(error) {
        console.error(error);
      });
    };

    callServer();

    arSocket.on('play:update', function(data) {
      var cover, ref;
      var deferred = $q.defer();

      var meta = new Meta(data);
      meta.promise.then(function() {
        _metas[data.played_on] = meta;
      });
    });

    return api;
  });

}).call(this);
