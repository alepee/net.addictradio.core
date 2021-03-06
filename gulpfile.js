var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var annotate = require('gulp-ng-annotate');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var connect = require('gulp-connect');
var bower = require('bower');
var sh = require('shelljs');

gulp.task('default', ['compile', 'connect', 'watch']);

gulp.task('compile', function() {
  gulp.src(['src/core.js', 'src/_*.js'])
  .pipe(concat('core.js'))
  .pipe(annotate())
  .pipe(gulp.dest('dist'))
  .pipe(uglify())
  .pipe(rename('core.min.js'))
  .pipe(gulp.dest('dist'))
  .pipe(connect.reload());
});

gulp.task('watch', function() {
  gulp.watch('src/*.js', ['compile']);
});

gulp.task('connect', function() {
  connect.server({
    root: 'demo',
    livereload: true
  });
});

gulp.task('install', ['git-check'], function() {
  bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});
