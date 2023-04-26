import React from "react";
import { StyleSheet, View, Text } from "react-native";
import Go from "./Go";
import { api } from "./api";

export default function App() {
  console.log(api);
  return (
    <View style={styles.container}>
      <Go />
      <Text>This is test</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
