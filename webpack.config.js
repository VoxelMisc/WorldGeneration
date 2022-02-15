const path = require('path');

module.exports = {
	entry: './src/index.js',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist'),
		library: {
			// name: "WorldGeneration",
			// type: "commonjs",

			type: "commonjs2",
		},
		// libraryTarget: "var",
		// libraryExport: "default",
	},
	watch: true,
	mode: 'development',
};
