var gulp = require('gulp');
var log = require('fancy-log');
var sass = require('gulp-sass');
var scsslint = require('gulp-scss-lint');


// Style check SCSS
gulp.task('scss-lint', function() {
  return gulp.src(['./templates/**/*.scss'])
    .pipe(scsslint({ 'config': 'scss-lint.yml' }));
});

//Compile sass into css
gulp.task('sass', function() {
  return gulp.src('./web/css/main.scss')
  .pipe(sass({style: 'expanded'}))
  .on('error', log)
  .pipe(gulp.dest('./web/css'));
});

// Watch scss file changes and build
gulp.task('watch', function() {
  gulp.watch('./templates/**/*.scss', gulp.series('build'));
});


gulp.task('build', gulp.series('scss-lint','sass'));