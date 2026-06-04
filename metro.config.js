// Metro config — extiende el default de Expo para empaquetar modelos .tflite
// como assets (react-native-fast-tflite los carga vía require()).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite');

module.exports = config;
