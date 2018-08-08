rm -rf output
node build || exit 1
#node --inspect output/server.min.js || exit 1
node output/server.min.js || exit 1