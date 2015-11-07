(function() {
  'use strict';

  var app = angular.module('ar.player', ['ar.core']);

  app.config(function(arSettingsProvider) {
    arSettingsProvider.setOptions({
      playerName: 'Website'
    });
  });

  app.controller('AppController', function(arChannel, arAudioPlayer) {
    this.channels = arChannel;
    this.audioPlayer = arAudioPlayer;
  });

}).call(this);
