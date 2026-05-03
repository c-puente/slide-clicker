import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/context/SessionContext";

export default function HomeScreen() {
  const { name, setName, createSession, joinSession, code, role, error, clearError } =
    useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [joinCode, setJoinCode] = useState("");
  const [activeTab, setActiveTab] = useState<"presenter" | "audience">("presenter");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<"presenter" | "audience" | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start();
  }, []);

  useEffect(() => {
    if (code && role === "presenter") {
      setIsLoading(false);
      setPendingRoute(null);
      router.replace("/presenter");
    } else if (code && role === "audience") {
      setIsLoading(false);
      setPendingRoute(null);
      router.replace("/audience");
    }
  }, [code, role]);

  useEffect(() => {
    if (error) {
      setIsLoading(false);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 55, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: false }),
      ]).start();
    }
  }, [error]);

  const switchTab = (tab: "presenter" | "audience") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearError();
    setIsLoading(false);
    setActiveTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === "audience" ? 1 : 0,
      useNativeDriver: false,
      tension: 300,
      friction: 28,
    }).start();
  };

  const bg = isDark ? "#0d0b08" : "#f4f1ec";
  const textPrimary = isDark ? "#ede9e1" : "#1a1612";
  const textSecondary = isDark ? "#6e6258" : "#7a7268";
  const accent = "#c96a2f";
  const inputBg = isDark ? "rgba(237,233,225,0.06)" : "#fefcf8";
  const inputBorder = isDark ? "rgba(237,233,225,0.12)" : "rgba(26,22,18,0.14)";
  const divider = isDark ? "rgba(237,233,225,0.08)" : "rgba(26,22,18,0.08)";

  const underlineLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "50%"],
  });

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            paddingTop: Platform.OS === "web" ? 60 + insets.top : insets.top + 32,
            paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.header}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.wordmark, { color: textPrimary }]}>Next Slide, Please</Text>
          <Text style={[styles.tagline, { color: textSecondary }]}>Silent audience control for live talks</Text>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <View style={[styles.tabRow, { borderBottomColor: divider }]}> 
            <Pressable style={styles.tab} onPress={() => switchTab("presenter")}> 
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeTab === "presenter" ? accent : textSecondary,
                    fontFamily: activeTab === "presenter" ? "PlusJakartaSans_600SemiBold" : "PlusJakartaSans_400Regular",
                  },
                ]}
              >
                Present
              </Text>
            </Pressable>
            <Pressable style={styles.tab} onPress={() => switchTab("audience")}>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeTab === "audience" ? accent : textSecondary,
                    fontFamily: activeTab === "audience" ? "PlusJakartaSans_600SemiBold" : "PlusJakartaSans_400Regular",
                  },
                ]}
              >
                Join as Audience
              </Text>
            </Pressable>
            <Animated.View
              style={[
                styles.tabUnderline,
                { backgroundColor: accent, left: underlineLeft },
              ]}
            />
          </View>

          <View style={styles.formBody}>
            <Text style={[styles.fieldLabel, { color: textSecondary }]}>Your name</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
              ]}
              placeholder="Enter your name"
              placeholderTextColor={textSecondary}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
            />

            {activeTab === "audience" && (
              <>
                <Text style={[styles.fieldLabel, { color: textSecondary, marginTop: 18 }]}>Session code</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.codeInput,
                    {
                      backgroundColor: inputBg,
                      borderColor: error ? "#c94040" : inputBorder,
                      color: accent,
                    },
                  ]}
                  placeholder="XXXX"
                  placeholderTextColor={textSecondary}
                  value={joinCode}
                  onChangeText={(t) => {
                    clearError();
                    setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4));
                  }}
                  autoCapitalize="characters"
                  returnKeyType="join"
                  onSubmitEditing={() => joinSession(joinCode.trim().toUpperCase())}
                  maxLength={4}
                />
              </>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              disabled={isLoading}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: accent, opacity: isLoading ? 0.78 : pressed ? 0.82 : 1 },
              ]}
              onPress={() => {
                clearError();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsLoading(true);
                setPendingRoute(activeTab);
                if (activeTab === "presenter") {
                  router.replace("/presenter");
                  void createSession();
                } else {
                  router.replace("/audience");
                  void joinSession(joinCode.trim().toUpperCase());
                }
              }}
            >
              <Text style={styles.primaryButtonText}>{activeTab === "presenter" ? "Start Session" : "Join Session"}</Text>
              {isLoading || pendingRoute ? (
                <ActivityIndicator size="small" color="#fefcf8" style={{ marginLeft: 10 }} />
              ) : (
                <Feather name="arrow-right" size={16} color="#fefcf8" style={{ marginLeft: 8 }} />
              )}
            </Pressable>
          </View>
        </Animated.View>

        <Text style={[styles.hint, { color: textSecondary }]}>
          {activeTab === "presenter"
            ? "Share the code with your audience once you start"
            : "Ask the presenter for the 4-character code"}
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 36 },
  logo: { width: 60, height: 60, borderRadius: 14, marginBottom: 14 },
  wordmark: { fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: -0.4, textAlign: "center", marginBottom: 5 },
  tagline: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", textAlign: "center", lineHeight: 19 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 22, position: "relative" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabLabel: { fontSize: 14, letterSpacing: 0.1 },
  tabUnderline: { position: "absolute", bottom: -1, left: 0, width: "50%", height: 2, borderRadius: 999 },
  formBody: { gap: 10 },
  fieldLabel: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", letterSpacing: 0.1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "PlusJakartaSans_400Regular" },
  codeInput: { textAlign: "center", letterSpacing: 5, fontSize: 18, fontFamily: "PlusJakartaSans_700Bold" },
  errorText: { color: "#c94040", fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  primaryButton: { height: 52, borderRadius: 14, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fefcf8", fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  hint: { marginTop: 18, fontSize: 12.5, fontFamily: "PlusJakartaSans_400Regular", textAlign: "center" },
});
