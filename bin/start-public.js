/**
 * This script starts dev server binding to network so that the server
 * is accessible from other machines in the internal network such as
 * other PCs in the network.
 */
const hostName = require('os').hostname();
const { spawn } = require('child_process');

// Port 9030 for form builder.
const ngArgs = ['serve', '--port', '9030', '--host', hostName];
// Use production configuration for dist folder which contains production artifacts.
if (process.argv[2] && process.argv[2] === '--dist') {
  ngArgs.push('--configuration');
  ngArgs.push('production');
}
spawn('ng', ngArgs, {
  stdio: 'inherit'
});
