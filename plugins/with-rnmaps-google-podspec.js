/**
 * react-native-maps 1.27.2 ships Google Maps support as the
 * `react-native-maps/Google` SUBSPEC, but Expo prebuild still injects a
 * `pod 'react-native-google-maps'` line (the standalone pod that older
 * versions like koen's 1.20.1 shipped). That podspec no longer exists in
 * 1.27.2, so `pod install` fails.
 *
 * This plugin regenerates that standalone `react-native-google-maps.podspec`
 * for 1.27.2 — re-exposing the existing AirGoogleMaps source + the version's
 * own GoogleMaps deps (9.4.0) as the pod Expo expects. It runs before
 * `pod install`, so the injected line resolves and iOS gets Google Maps
 * (with custom map styling / tinting), while staying on the RN-0.85-
 * compatible 1.27.2.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PODSPEC = `require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

folly_config = get_folly_config()
folly_compiler_flags = folly_config[:compiler_flags]

Pod::Spec.new do |s|
  s.name         = "react-native-google-maps"
  s.version      = package['version']
  s.summary      = package["description"]
  s.authors      = package["author"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.platform     = :ios, "15.1"
  s.source       = { :git => "https://github.com/react-native-maps/react-native-maps.git", :tag => "v#{s.version}" }
  s.module_name  = 'ReactNativeGoogleMaps'

  s.source_files = "ios/AirGoogleMaps/**/*.{h,m,mm,swift}"
  s.resource_bundles = {
    'GoogleMapsPrivacy' => ['ios/AirGoogleMaps/Resources/GoogleMapsPrivacy.bundle']
  }
  s.compiler_flags = folly_compiler_flags + ' -DHAVE_GOOGLE_MAPS=1 -DHAVE_GOOGLE_MAPS_UTILS=1'

  s.dependency 'GoogleMaps', '9.4.0'
  s.dependency 'Google-Maps-iOS-Utils', '6.1.0'
  s.dependency 'react-native-maps/Generated'
  s.dependency 'react-native-maps/Maps'
  install_modules_dependencies(s)
end
`;

module.exports = function withRNMapsGooglePodspec(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const target = path.join(
        cfg.modRequest.projectRoot,
        'node_modules',
        'react-native-maps',
        'react-native-google-maps.podspec',
      );
      if (fs.existsSync(path.dirname(target))) {
        fs.writeFileSync(target, PODSPEC);
      }
      return cfg;
    },
  ]);
};
