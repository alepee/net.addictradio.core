(function() {
  'use strict';
  var core = angular.module('ar.core');

  core.service('arSocket', function($rootScope, arSettings) {
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
  });
}).call(this);
