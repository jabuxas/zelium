import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Início",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="patrimonios"
        options={{
          title: "Patrimônios",
          tabBarIcon: ({ color }) => <TabBarIcon name="cube" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ambientes"
        options={{
          title: "Ambientes",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="map-marker" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="administracao"
        options={{
          headerShown: false,
          title: "Administração",
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
      <Tabs.Screen name="responsaveis" options={{ href: null }} />
      <Tabs.Screen name="conferentes" options={{ href: null }} />
      <Tabs.Screen name="fornecedores" options={{ href: null }} />
      <Tabs.Screen name="tipos-material" options={{ href: null }} />
      <Tabs.Screen name="estados-item" options={{ href: null }} />
      <Tabs.Screen name="audit-log" options={{ href: null }} />
    </Tabs>
  );
}
