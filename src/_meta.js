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
