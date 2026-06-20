import React, {
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const SUPPORT_URL =
  process.env
    .EXPO_PUBLIC_SUPPORT_URL
    ?.trim() ?? "";

type SupportProjectButtonProps = {
  compact?: boolean;
};

export function SupportProjectButton({
  compact = false,
}: SupportProjectButtonProps) {
  const [opening, setOpening] =
    useState(false);

  if (!SUPPORT_URL) {
    return null;
  }

  async function openSupportPage() {
    if (opening) {
      return;
    }

    setOpening(true);

    try {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined"
      ) {
        window.open(
          SUPPORT_URL,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }

      const supported =
        await Linking.canOpenURL(
          SUPPORT_URL
        );

      if (!supported) {
        throw new Error(
          "This PayPal link cannot be opened."
        );
      }

      await Linking.openURL(
        SUPPORT_URL
      );
    } catch (error: any) {
      const message =
        error?.message ??
        "The support page could not be opened.";

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined"
      ) {
        window.alert(message);
      } else {
        Alert.alert(
          "Unable to open PayPal",
          message
        );
      }
    } finally {
      setOpening(false);
    }
  }

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <Text style={styles.compactText}>
          Better data sources, broader
          datasets and stronger ensemble
          models require continued research
          and infrastructure.
        </Text>

        <Pressable
          disabled={opening}
          onPress={openSupportPage}
          style={({ pressed }) => [
            styles.compactButton,
            opening &&
              styles.disabled,
            pressed &&
              styles.pressed,
          ]}
        >
          {opening ? (
            <ActivityIndicator
              color="#fde68a"
            />
          ) : (
            <Text
              style={
                styles.compactButtonText
              }
            >
              Support development
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          SUPPORT CONTINUED DEVELOPMENT
        </Text>
      </View>

      <Text style={styles.title}>
        Help us build stronger models
      </Text>

      <Text style={styles.description}>
        AI Market Expert can be developed
        significantly further with access
        to higher-quality market data,
        broader historical datasets,
        stronger computing resources and
        more advanced ensemble models.
      </Text>

      <Text style={styles.description}>
        Optional support helps fund
        continued research, improved
        feature engineering, additional
        live validation and more robust
        forecasting systems.
      </Text>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Support is optional. It does not
          unlock Pro access, does not
          represent an investment and does
          not purchase financial advice or
          guaranteed results.
        </Text>
      </View>

      <Pressable
        disabled={opening}
        onPress={openSupportPage}
        style={({ pressed }) => [
          styles.button,
          opening &&
            styles.disabled,
          pressed &&
            styles.pressed,
        ]}
      >
        {opening ? (
          <ActivityIndicator
            color="#fde68a"
          />
        ) : (
          <Text style={styles.buttonText}>
            Support development via PayPal
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      width: "100%",
      borderWidth: 1,
      borderColor: "#92400e",
      borderRadius: 24,
      backgroundColor: "#1c1305",
      padding: 20,
      marginTop: 20,
      marginBottom: 4,
    },

    badge: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: "#d97706",
      borderRadius: 999,
      backgroundColor: "#451a03",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },

    badgeText: {
      color: "#fcd34d",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.5,
    },

    title: {
      marginTop: 16,
      color: "#ffffff",
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "900",
    },

    description: {
      marginTop: 10,
      color: "#d4d4d8",
      fontSize: 15,
      lineHeight: 23,
    },

    notice: {
      marginTop: 15,
      borderWidth: 1,
      borderColor: "#78350f",
      borderRadius: 16,
      backgroundColor: "#271306",
      padding: 14,
    },

    noticeText: {
      color: "#a1a1aa",
      fontSize: 12,
      lineHeight: 19,
    },

    button: {
      minHeight: 54,
      marginTop: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#f59e0b",
      borderRadius: 16,
      backgroundColor: "#78350f",
      paddingHorizontal: 18,
      paddingVertical: 15,
    },

    buttonText: {
      color: "#fde68a",
      fontSize: 16,
      fontWeight: "900",
    },

    compactWrap: {
      width: "100%",
      marginTop: 18,
      borderWidth: 1,
      borderColor: "#78350f",
      borderRadius: 18,
      backgroundColor: "#1c1305",
      padding: 15,
    },

    compactText: {
      color: "#a1a1aa",
      fontSize: 12,
      lineHeight: 19,
    },

    compactButton: {
      minHeight: 48,
      marginTop: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#d97706",
      borderRadius: 15,
      backgroundColor: "#451a03",
      paddingHorizontal: 18,
      paddingVertical: 13,
    },

    compactButtonText: {
      color: "#fde68a",
      fontSize: 14,
      fontWeight: "900",
    },

    disabled: {
      opacity: 0.55,
    },

    pressed: {
      opacity: 0.72,
    },
  });