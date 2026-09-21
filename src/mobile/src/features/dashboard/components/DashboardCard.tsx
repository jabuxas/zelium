import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Card, Text } from 'react-native-paper';
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconBgColor: string;
  iconColor: string;
}

export function DashboardCard({ title, value, subtitle, icon, iconBgColor, iconColor }: DashboardCardProps) {
  const { width } = useWindowDimensions();
  
  const cardMinWidth = width > 500 ? 220 : (width - 44) / 2;

  return (
    <Card style={[styles.card, { minWidth: cardMinWidth }]} mode="contained">
      <Card.Content style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <FontAwesome name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text variant="headlineMedium" style={styles.value} numberOfLines={1}>
            {value}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  value: {
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 28,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 11,
  },
});