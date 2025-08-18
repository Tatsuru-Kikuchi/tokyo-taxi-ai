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
    
    return config;
  });

  return config;
};
