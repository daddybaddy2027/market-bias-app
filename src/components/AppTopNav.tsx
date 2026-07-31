import { router, usePathname } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../providers/AuthProvider";

type NavItem = {
  label: string;
  route: "/" | "/performance" | "/outlook" | "/pricing" | "/account" | "/admin-outlook";
};

const BASE_ITEMS: NavItem[] = [
  { label: "Overview", route: "/" },
  { label: "Performance", route: "/performance" },
  { label: "Outlook", route: "/outlook" },
  { label: "Pricing", route: "/pricing" },
  { label: "Account", route: "/account" },
];

export function AppTopNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const items = isAdmin
    ? [...BASE_ITEMS, { label: "Publish", route: "/admin-outlook" as const }]
    : BASE_ITEMS;

  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/" as never)}
        style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
      >
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>↗</Text>
        </View>
        <View>
          <Text style={styles.brandName}>AI MARKET EXPERT</Text>
          <Text style={styles.brandTagline}>Market context before conviction</Text>
        </View>
      </Pressable>

      <View style={styles.navItems}>
        {items.map((item) => {
          const active = item.route === "/"
            ? pathname === "/"
            : pathname.startsWith(item.route);

          return (
            <Pressable
              accessibilityRole="button"
              key={item.route}
              onPress={() => router.push(item.route as never)}
              style={({ pressed }) => [
                styles.navButton,
                active && styles.navButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.navText, active && styles.navTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    marginBottom: 30,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 24,
    backgroundColor: "#09090b",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  brandMark: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38bdf8",
    borderRadius: 13,
    backgroundColor: "#082f49",
  },
  brandMarkText: {
    color: "#e0f2fe",
    fontSize: 21,
    fontWeight: "900",
  },
  brandName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  brandTagline: {
    marginTop: 3,
    color: "#71717a",
    fontSize: 10,
    fontWeight: "700",
  },
  navItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
  },
  navButton: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  navButtonActive: {
    borderColor: "#38bdf8",
    backgroundColor: "#082f49",
  },
  navText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "800",
  },
  navTextActive: {
    color: "#e0f2fe",
  },
  pressed: {
    opacity: 0.7,
  },
});
