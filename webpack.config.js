const path = require('path');

module.exports = {
	entry: './src/index.ts',
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
		fallback: { "buffer": require.resolve("buffer/") },
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
