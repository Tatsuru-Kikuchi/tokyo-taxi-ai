import * as React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ColorSchemeName, Pressable, Text } from 'react-native'; // Added Text for placeholder

// import ModalScreen from '../screens/ModalScreen'; // <-- REMOVED THIS LINE
import NotFoundScreen from '../screens/NotFoundScreen';
import CustomerScreen from '../screens/CustomerScreen';
import DriverScreen from '../screens/DriverScreen';
import MapScreen from '../screens/MapScreen'; // <-- NEW IMPORT

import LinkingConfiguration from './LinkingConfiguration';

export default function Navigation({ colorScheme }) {
  return (
    <NavigationContainer
      linking={LinkingConfiguration}
      theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
};

const Stack = createNativeStackNavigator(); // No need for RootStackParamList if not using TypeScript strictly

function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Customer" component={CustomerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Driver" component={DriverScreen} options={{ headerShown: false }} />
      {/* MapScreen for displaying routes */}
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Route Map', headerBackTitle: 'Back' }}
      />
      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
      {/* Removed the ModalScreen group as it's not needed/defined */}
      {/* If you ever need a generic modal, you can create a simple ModalScreen.js */}
    </Stack.Navigator>
  );
};