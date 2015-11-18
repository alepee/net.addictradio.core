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
  });


}).call(this);
