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
