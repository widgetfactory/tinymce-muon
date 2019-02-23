TinyMCE - The JavaScript Rich Text editor
==========================================

Building TinyMCE
-----------------
Install [Node.js](https://nodejs.org/en/) on your system.
Clone this repository on your system
```
$ git clone https://github.com/widgetfactory/tinymce-muon.git
```
Open a console and go to the project directory.
```
$ cd tinymce-muon/
```
Install `grunt` command line tool globally.
```
$ npm i -g grunt-cli
```
Install all package dependencies.
```
$ npm install
```
Now, build TinyMCE by using `grunt`.
```
$ grunt
```

Build tasks
------------
`grunt`
Lints, minified, unit tests and creates release packages for TinyMCE.

`grunt minify`
Minifies all JS and CSS files.

`grunt test`
Runs all qunit tests on PhantomJS.

`grunt lint`
Runs all source files through various JS linters.

`grunt --help`
Displays the various build tasks.
