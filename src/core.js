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
