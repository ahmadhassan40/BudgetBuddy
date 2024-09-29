import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from "expo-asset";
import React from 'react';
import { DrawerActions, NavigationContainer } from '@react-navigation/native';
import { SQLiteProvider } from 'expo-sqlite/next';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/Home';

const Stack = createNativeStackNavigator();

const loadDatabase = async () => {
  const dbName = "mySQLiteDB.db";
  const dbasset = require("./assets/mySQLiteDB.db")
  const dbUri = Asset.fromModule(dbasset).uri;
  const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}` ;
  const fileInfo = await FileSystem.getInfoAsync(dbPath)

  if (!fileInfo.exists) {
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}SQLite/`,
      { intermediates: true}
    );
    await FileSystem.downloadAsync(dbUri, dbPath);  
  }
}

export default function App() {
  const [dbLoaded, setDbLoaded] = React.useState<boolean>(false);
  React.useEffect(() => {
    loadDatabase()
      .then(() => setDbLoaded(true))
      .catch((e) => console.error(e));
  }, []);

  if (!dbLoaded) {
    return(
      <View style={{flex: 1}}>
        <ActivityIndicator size = {"large"}/>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <NavigationContainer>
      <React.Suspense
        fallback = {
          <View style={{flex: 1}}>
        <ActivityIndicator size = {"large"}/>
        <Text>Loading...</Text>
      </View>
        }
      >
        <SQLiteProvider databaseName='mySQLiteDB.db' useSuspense>
          <Stack.Navigator>
            <Stack.Screen 
              name = "Home" 
              component={Home}
              options={{
                headerTitle: "BudgetBuddy",
                headerLargeTitle: true
              }}  
            />
          </Stack.Navigator>
        </SQLiteProvider>
      </React.Suspense>
    </NavigationContainer>
  );
}
