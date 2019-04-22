const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('build', () =>
    gulp.src('./src/index.js')
        .pipe(babel({
            presets: ['@babel/env'],
        }))
        .pipe(gulp.dest('dist'))
);

gulp.task('default', gulp.series('build'));
