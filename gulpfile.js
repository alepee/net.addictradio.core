var gulp = require('gulp');
var concat = require('gulp-concat');
var annotate = require('gulp-ng-annotate');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var connect = require('gulp-connect');

gulp.task('default', ['compile', 'connect', 'watch']);

gulp.task('compile', function() {
  gulp.src(['src/core.js', 'src/_*.js'])
  .pipe(concat('core.js'))
  .pipe(annotate())
  .pipe(gulp.dest('dist'))
  .pipe(uglify())
  .pipe(rename('core.min.js'))
  .pipe(gulp.dest('dist'));
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
