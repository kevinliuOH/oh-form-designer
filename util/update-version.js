const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.resolve('./package.json');
const packageJson = require(packageJsonPath);

// Get environment variables for build type and build number
const buildType = (process.env.BUILD_TYPE || 'default').trim().toLowerCase(); // Trim spaces and convert to lowercase
const buildNumber = process.env.BUILD_BUILDID || '0'; // Default build number
const env = process.env.ENVIRONMENT;
if (!process.env.BUILD_TYPE) {
  console.error('BUILD_TYPE is not defined. Exiting to avoid unintended patch increment.');
}
// Parse and validate the current version
let major = 0, minor = 0, patch = 0;
if (packageJson.version) {
  const versionParts = packageJson.version.split('.');
  if (versionParts.length === 3) {
    major = parseInt(versionParts[0], 10) || 0;
    minor = parseInt(versionParts[1], 10) || 0;
    patch = parseInt(versionParts[2], 10) || 0;
  } else {
    console.error('Invalid version format in package.json. Expected format: x.y.z');
    process.exit(1);
  }
} else {
  console.error('No version field found in package.json');
  process.exit(1);
}

// Log initial version for debugging
console.log(`Initial Version: ${major}.${minor}.${patch}`);
console.log(`BUILD_TYPE: ${buildType}`);
console.log(`BUILD_BUILDID: ${buildNumber}`);
console.log(`ENVIRONMENT: ${process.env.ENVIRONMENT || 'dev'}`);

// Increment the version based on BUILD_TYPE
switch (buildType) {
  case 'major':
    minor = 0;
    patch = 0;
    major += 1;
    break;
  case 'minor':
    patch = 0; 
    minor += 1;
    break;
  case 'patch':
    patch += 1;
    break;
  default:
    console.error(`Invalid BUILD_TYPE: ${buildType}. Must be 'major', 'minor', or 'patch'.`);
}

console.log(`Updated Version Parts: major=${major}, minor=${minor}, patch=${patch}`);

// Generate the new version with the build number appended
let newVersion;
if(env == 'PROD' || env == 'CT'){
  newVersion= `${major}.${minor}.${patch}`;
}else{
  newVersion = `${major}.${minor}.${patch}+${buildNumber}`;
}
console.log(`BUILD_TYPE: ${buildType}`);
console.log(`Current Version: ${major}.${minor}.${patch}`);  

packageJson.version = newVersion;

// Write the updated version back to package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

// Write the new version to version.json
const versionJsonPath = path.resolve('./src/assets/version.json');
const versionData = {
  version: newVersion,
  environment: process.env.ENVIRONMENT || 'dev',
  timestamp: new Date().toISOString(),
};
fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');

// Final log
console.log(`Updated version to ${newVersion}`);
