var gulp = require('gulp');
var sass = require('gulp-sass');
var connect = require('gulp-connect');
var http    =  require('http');
var mockserver  =  require('mockserver');

gulp.task('connect', function() {
  connect.server({
    root: './',
    port: 8000,
    livereload: true
  });
});

gulp.task('mockserver', function() {
  http.createServer(mockserver('./mocks'))
      .listen(9000);
});

// keeps gulp from crashing for scss errors
gulp.task('sass', function () {
  return gulp.src('./sass/*.scss')
      .pipe(sass({ errLogToConsole: true }))
      .pipe(gulp.dest('./css'));
});

gulp.task('livereload', function () {
  gulp.src('./**/*')
  .pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.watch('./sass/**/*.scss', ['sass']);
  gulp.watch('./**/*', ['livereload']);
});

gulp.task('default', ['connect', 'mockserver', 'sass', 'watch']);
