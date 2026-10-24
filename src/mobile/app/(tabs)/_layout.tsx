import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant, height: 64 + insets.bottom, paddingBottom: Math.max(insets.bottom, 4), paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14 },
        tabBarLabelPosition: 'below-icon',
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
        name="escanear"
        options={{
          title: "Escanear",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="qrcode" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="patrimonios"
        options={{
          title: "Patrimônios",
          tabBarLabel: 'Bens',
          tabBarAccessibilityLabel: 'Patrimônios',
          tabBarIcon: ({ color }) => <TabBarIcon name="cube" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ambientes"
        options={{
          title: "Ambientes",
          tabBarLabel: 'Locais',
          tabBarAccessibilityLabel: 'Ambientes',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="map-marker" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="administracao"
        options={{
          headerShown: false,
          title: "Mais",
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
      <Tabs.Screen name="responsaveis" options={{ href: null }} />
      <Tabs.Screen name="conferentes" options={{ href: null }} />
      <Tabs.Screen name="fornecedores" options={{ href: null }} />
      <Tabs.Screen name="tipos-material" options={{ href: null }} />
      <Tabs.Screen name="estados-item" options={{ href: null }} />
      <Tabs.Screen name="audit-log" options={{ href: null, title: 'Histórico' }} />
    </Tabs>
  );
}
