const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');

const pathFix = (s) => {
    return s.replace('/', path.sep);
};

gulp.task('build', () =>
    gulp.src(pathFix('./src/index.js'))
        .pipe(babel({
            presets: ['@babel/env'],
        }))
        .pipe(gulp.dest(pathFix('./dist')))
);

gulp.task('watch', () => {
    gulp.watch(pathFix('./src/*.js'), gulp.series('build'));
});

gulp.task('dev', gulp.series('build', 'watch'));

gulp.task('default', gulp.series('dev'));
