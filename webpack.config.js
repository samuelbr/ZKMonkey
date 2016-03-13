var sources = ['./src/main.js'];

if (process.env.NODE_ENV !== 'production') { // for live reload
    sources.push('webpack-dev-server/client?https://nw-docker:10343');
}

module.exports = {
    entry: {
        gremlins: sources
    },
    output: {
        filename: "zkmonkey.min.js",
        publicPath: "https://nw-docker:10343/",
        libraryTarget: "umd"
    }
};
