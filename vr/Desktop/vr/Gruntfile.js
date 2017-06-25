module.exports = function(grunt) {

  grunt.initConfig({
    watch: {
      js: {
        files: [
          'app.js',
          '*.js',
          'public/*.js',
          'public/*.html'
        ],
        tasks: ['develop'],
        options: {
          nospawn: false,
          livereload: true
        }
      }
    },
    develop: {
      server: {
        file: 'app.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-develop');

  grunt.registerTask('default', ['develop']);

};
