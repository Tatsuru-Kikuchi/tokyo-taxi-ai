<<<<<<< HEAD
const {
  withInfoPlist,
  withDangerousMod,
  withPlugins
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withGoogleMapsIOS(config) {
  // Add API key to Info.plist
  config = withInfoPlist(config, (config) => {
    const apiKey = 
      config.ios?.config?.googleMapsApiKey ||
      config.extra?.googleMapsApiKey ||
      'AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ';
    
    config.modResults.GMSApiKey = apiKey;
    config.modResults.GMSServicesApiKey = apiKey;
=======
const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

module.exports = function withGoogleMaps(config, { apiKey }) {
  // Add Google Maps API Key to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults['GMSApiKey'] = apiKey;
    return config;
  });

  // Modify AppDelegate to initialize Google Maps
  config = withAppDelegate(config, (config) => {
    const { contents } = config.modResults;
    
    // Add import
    if (!contents.includes('#import <GoogleMaps/GoogleMaps.h>')) {
      const importIndex = contents.indexOf('#import "AppDelegate.h"');
      config.modResults.contents = 
        contents.slice(0, importIndex) +
        '#import <GoogleMaps/GoogleMaps.h>\n' +
        contents.slice(importIndex);
    }
    
    // Add initialization in didFinishLaunchingWithOptions
    if (!contents.includes('[GMSServices provideAPIKey:')) {
      const didFinishIndex = contents.indexOf('didFinishLaunchingWithOptions:(NSDictionary *)launchOptions');
      const bracketIndex = contents.indexOf('{', didFinishIndex);
      config.modResults.contents = 
        contents.slice(0, bracketIndex + 1) +
        '\n  [GMSServices provideAPIKey:@"AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ"];\n' +
        contents.slice(bracketIndex + 1);
    }
>>>>>>> origin/main
    
    return config;
  });

<<<<<<< HEAD
  // Add to Podfile with CORRECT versions
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        // Check if Google Maps pods are already included
        if (!podfileContent.includes('GoogleMaps')) {
          // Find the target section
          const targetIndex = podfileContent.indexOf("target '");
          const endTargetIndex = podfileContent.indexOf('end', targetIndex);
          
          if (targetIndex !== -1 && endTargetIndex !== -1) {
            // Use COMPATIBLE version with react-native-maps
            const googleMapsPods = `
  # Google Maps - Compatible with react-native-maps 1.20.1
  pod 'GoogleMaps', '~> 9.0.0'
  pod 'Google-Maps-iOS-Utils', '5.0.0'
`;
            
            // Insert before the 'end' of target
            podfileContent = 
              podfileContent.slice(0, endTargetIndex) +
              googleMapsPods +
              '\n' +
              podfileContent.slice(endTargetIndex);
            
            fs.writeFileSync(podfilePath, podfileContent);
          }
        }
      }
      
      return config;
    },
  ]);

  return config;
}

function withGoogleMapsAndroid(config) {
  // Android configuration
  if (!config.android) {
    config.android = {};
  }
  if (!config.android.config) {
    config.android.config = {};
  }
  if (!config.android.config.googleMaps) {
    config.android.config.googleMaps = {};
  }
  
  config.android.config.googleMaps.apiKey = 
    config.android?.config?.googleMaps?.apiKey ||
    config.extra?.googleMapsApiKey ||
    'AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ';
  
  return config;
}

module.exports = function withGoogleMaps(config) {
  return withPlugins(config, [
    withGoogleMapsIOS,
    withGoogleMapsAndroid,
  ]);
};
=======
  return config;
};
>>>>>>> origin/main
