const path = require('path');
const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);

function copyIcons() {
	// encoding: false keeps binary files (PNG/ICO) intact; gulp 5 otherwise
	// decodes them as UTF-8 text and corrupts the bytes.
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource, { encoding: false }).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource, { encoding: false }).pipe(dest(credDestination));
}
