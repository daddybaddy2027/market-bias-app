import * as Linking from "expo-linking";
import { Platform } from "react-native";

function cleanPath(path: string) {
  return path.replace(/^\/+/, "");
}

export function getAuthRedirectUrl(path: string) {
  const targetPath = cleanPath(path);

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/${targetPath}`;
  }

  return Linking.createURL(targetPath);
}
