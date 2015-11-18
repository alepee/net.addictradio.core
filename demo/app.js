(function() {
  'use strict';

  var app = angular.module('ar.player', ['ar.core']);

  app.config(function(arSettingsProvider) {
    arSettingsProvider.setOptions({
      playerName: 'Website',
      autoLoadChannel: true,
      autoPlay: true,
      coverPreload: {
        background: {
          width: 500,
          height: 500,
          blurRadius: 70
        }
      }
    });
  });

  app.controller('AppController', function(arChannel, arAudioPlayer) {
    this.channels = arChannel;
    this.audioPlayer = arAudioPlayer;

    this.getCover = arAudioPlayer.getCover.bind(arAudioPlayer);
    this.getTheme = arAudioPlayer.getTheme.bind(arAudioPlayer);
  });

}).call(this);
