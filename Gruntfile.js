/*eslint-env node */


module.exports = function (grunt) {
	var packageData = grunt.file.readJSON("package.json");
	var changelogLine = grunt.file.read("changelog.txt").toString().split("\n")[0];
	var BUILD_VERSION = packageData.version + '-' + (process.env.BUILD_NUMBER ? process.env.BUILD_NUMBER : '0');
	packageData.date = /^Version [^\(]+\(([^\)]+)\)/.exec(changelogLine)[1];

	grunt.initConfig({
		pkg: packageData,

		eslint: {
			options: {
				config: ".eslintrc"
			},

			core: ["jscripts/tiny_mce/classes/**/*.js"],

			plugins: [],

			themes: []
		},

		qunit: {
			core: {
				options: {
					urls: [
						"tests/index.html"
					]
				}
			}
		},

		amdlc: {
			core: {
				options: {
					version: packageData.version,
					releaseDate: packageData.date,
					baseDir: "js/tinymce/classes",
					rootNS: "tinymce",
					outputSource: "js/tinymce/tinymce.js",
					outputMinified: "js/tinymce/tinymce.min.js",
					outputDev: "js/tinymce/tinymce.dev.js",
					verbose: false,
					expose: "public",
					compress: true,

					from: [
						"geom/Rect.js",
						"dom/DomQuery.js",
						"EditorManager.js",
						"LegacyInput.js",
						"util/XHR.js",
						"util/JSONRequest.js",
						"util/JSONP.js",
						"util/LocalStorage.js",
						"Compat.js",
						"ui/*.js",
						"Register.js"
					]
				}
			},

			"paste-plugin": {
				options: {
					baseDir: "js/tinymce/plugins/paste/classes",
					rootNS: "tinymce.pasteplugin",
					outputSource: "js/tinymce/plugins/paste/plugin.js",
					outputMinified: "js/tinymce/plugins/paste/plugin.min.js",
					outputDev: "js/tinymce/plugins/paste/plugin.dev.js",
					verbose: false,
					expose: "public",
					compress: true,

					from: "Plugin.js"
				}
			},

			"table-plugin": {
				options: {
					baseDir: "js/tinymce/plugins/table/classes",
					rootNS: "tinymce.tableplugin",
					outputSource: "js/tinymce/plugins/table/plugin.js",
					outputMinified: "js/tinymce/plugins/table/plugin.min.js",
					outputDev: "js/tinymce/plugins/table/plugin.dev.js",
					verbose: false,
					expose: "public",
					compress: true,

					from: "Plugin.js"
				}
			},

			"spellchecker-plugin": {
				options: {
					baseDir: "js/tinymce/plugins/spellchecker/classes",
					rootNS: "tinymce.spellcheckerplugin",
					outputSource: "js/tinymce/plugins/spellchecker/plugin.js",
					outputMinified: "js/tinymce/plugins/spellchecker/plugin.min.js",
					outputDev: "js/tinymce/plugins/spellchecker/plugin.dev.js",
					verbose: false,
					expose: "public",
					compress: true,

					from: "Plugin.js"
				}
			},

			"codesample-plugin": {
				options: {
					baseDir: "js/tinymce/plugins/codesample/classes",
					rootNS: "tinymce.codesampleplugin",
					outputSource: "js/tinymce/plugins/codesample/plugin.js",
					outputMinified: "js/tinymce/plugins/codesample/plugin.min.js",
					outputDev: "js/tinymce/plugins/codesample/plugin.dev.js",
					verbose: false,
					expose: "public",
					compress: true,

					from: "Plugin.js"
				}
			}
		},

		uglify: {},

		nugetpack: {
			main: {
				options: {
					id: "TinyMCE",
					version: packageData.version,
					authors: "Ephox Corp",
					owners: "Ephox Corp",
					description: "The best WYSIWYG editor! TinyMCE is a platform independent web based Javascript HTML WYSIWYG editor " +
						"control released as Open Source under LGPL by Ephox Corp. TinyMCE has the ability to convert HTML " +
						"TEXTAREA fields or other HTML elements to editor instances. TinyMCE is very easy to integrate " +
						"into other Content Management Systems.",
					releaseNotes: "Release notes for my package.",
					summary: "TinyMCE is a platform independent web based Javascript HTML WYSIWYG editor " +
						"control released as Open Source under LGPL by Ephox Corp.",
					projectUrl: "http://www.tinymce.com/",
					iconUrl: "http://www.tinymce.com/favicon.ico",
					licenseUrl: "http://www.tinymce.com/license",
					requireLicenseAcceptance: true,
					tags: "Editor TinyMCE HTML HTMLEditor",
					excludes: [
						"js/**/config",
						"js/**/scratch",
						"js/**/classes",
						"js/**/lib",
						"js/**/dependency",
						"js/**/src",
						"js/**/*.less",
						"js/**/*.dev.svg",
						"js/**/*.dev.js",
						"js/**/Gruntfile.js",
						"js/tinymce/tinymce.full.min.js"
					],
					outputDir: "tmp"
				},

				files: [{
						src: "js/tinymce/langs",
						dest: "/content/scripts/tinymce/langs"
					},
					{
						src: "js/tinymce/plugins",
						dest: "/content/scripts/tinymce/plugins"
					},
					{
						src: "js/tinymce/themes",
						dest: "/content/scripts/tinymce/themes"
					},
					{
						src: "js/tinymce/skins",
						dest: "/content/scripts/tinymce/skins"
					},
					{
						src: "js/tinymce/tinymce.js",
						dest: "/content/scripts/tinymce/tinymce.js"
					},
					{
						src: "js/tinymce/tinymce.min.js",
						dest: "/content/scripts/tinymce/tinymce.min.js"
					},
					{
						src: "js/tinymce/jquery.tinymce.min.js",
						dest: "/content/scripts/tinymce/jquery.tinymce.min.js"
					},
					{
						src: "js/tinymce/license.txt",
						dest: "/content/scripts/tinymce/license.txt"
					}
				]
			}
		},

		clean: {
			release: ["tmp"],

			core: [
				"js/tinymce/tinymce*",
				"js/tinymce/*.min.js",
				"js/tinymce/*.dev.js"
			],

			plugins: [
				"js/tinymce/plugins/**/*.min.js",
				"js/tinymce/plugins/**/*.dev.js",
				"js/tinymce/plugins/table/plugin.js",
				"js/tinymce/plugins/paste/plugin.js",
				"js/tinymce/plugins/spellchecker/plugin.js"
			],

			skins: [
				"js/tinymce/skins/**/*.min.css",
				"js/tinymce/skins/**/*.dev.less"
			],

			npm: [
				"node_modules",
				"npm-debug.log"
			]
		},

		jsbeautify: {
			files: ["jscripts/tiny_mce/classes/**/*.js"],
			options: {
				jslintHappy: true
			}
		}
	});

	require("load-grunt-tasks")(grunt);
	grunt.loadTasks("tools/tasks");

	grunt.registerTask("lint", ["eslint"]);
	grunt.registerTask("minify", ["amdlc", "uglify", "skin", "less"]);
	grunt.registerTask("test", ["qunit"]);
	grunt.registerTask("default", ["lint", "minify", "validateVersion", "clean:release", "nugetpack"]);

	grunt.registerTask("jsbeautify", ["jsbeautify"]);
};