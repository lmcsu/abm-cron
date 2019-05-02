const path = require('path');
const gulp = require('gulp');
const gulpBabel = require('gulp-babel');
const gulpRename = require('gulp-rename');
const gulpUglify = require('gulp-uglify');

const pathFix = (s) => {
    return s.replace('/', path.sep);
};

gulp.task('js:min', () =>
    gulp.src(pathFix('./dist/abm-cron.js'))
        .pipe(gulpUglify())
        .pipe(gulpRename('abm-cron.min.js'))
        .pipe(gulp.dest(pathFix('./dist')))
);

gulp.task('js', () =>
    gulp.src(pathFix('./src/index.js'))
        .pipe(gulpBabel({
            presets: [
                '@babel/env',
            ],
            plugins: [
                'babel-plugin-loop-optimizer',
            ],
        }))
        .pipe(gulpRename('abm-cron.js'))
        .pipe(gulp.dest(pathFix('./dist')))
);

gulp.task('build', gulp.series('js', 'js:min'));

gulp.task('watch', () => {
    gulp.watch(pathFix('./src/*.js'), gulp.series('build'));
});

gulp.task('dev', gulp.series('build', 'watch'));

gulp.task('default', gulp.series('dev'));
