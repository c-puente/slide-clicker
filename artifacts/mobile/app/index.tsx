import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (code && role === "presenter") router.replace("/presenter");
    else if (code && role === "audience") router.replace("/audience");
  }, [code, role]);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const switchTab = (tab: "presenter" | "audience") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearError();
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
          <Text style={[styles.tagline, { color: textSecondary }]}>
            Silent audience control for live talks
          </Text>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <View style={[styles.tabRow, { borderBottomColor: divider }]}>
            <Pressable style={styles.tab} onPress={() => switchTab("presenter")}>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeTab === "presenter" ? accent : textSecondary,
                    fontFamily:
                      activeTab === "presenter"
                        ? "PlayfairDisplay_700Bold"
                        : "PlayfairDisplay_400Regular",
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
                    fontFamily:
                      activeTab === "audience"
                        ? "PlayfairDisplay_700Bold"
                        : "PlayfairDisplay_400Regular",
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
                <Text style={[styles.fieldLabel, { color: textSecondary, marginTop: 18 }]}>
                  Session code
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.codeInput,
                    {
                      backgroundColor: inputBg,
                      borderColor: error ? "#c94040" : inputBorder,
                      color: accent,
                      fontFamily: "PlayfairDisplay_700Bold",
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
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: accent, opacity: pressed ? 0.82 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                activeTab === "presenter"
                  ? createSession()
                  : joinSession(joinCode.trim().toUpperCase());
              }}
            >
              <Text style={styles.primaryButtonText}>
                {activeTab === "presenter" ? "Start Session" : "Join Session"}
              </Text>
              <Feather name="arrow-right" size={16} color="#fefcf8" style={{ marginLeft: 8 }} />
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
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 16,
  },
  wordmark: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 28,
    position: "relative",
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 14,
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    width: "50%",
    height: 2,
    borderRadius: 1,
  },
  formBody: {},
  fieldLabel: {
    fontSize: 11,
    fontFamily: "PlayfairDisplay_400Regular",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: "PlayfairDisplay_400Regular",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 26,
    letterSpacing: 10,
    height: 62,
  },
  errorText: {
    color: "#c94040",
    fontSize: 13,
    fontFamily: "PlayfairDisplay_400Regular",
    marginTop: 10,
  },
  primaryButton: {
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 24,
  },
  primaryButtonText: {
    color: "#fefcf8",
    fontSize: 16,
    fontFamily: "PlayfairDisplay_600SemiBold",
  },
  hint: {
    marginTop: 28,
    fontSize: 13,
    fontFamily: "PlayfairDisplay_400Regular",
    lineHeight: 19,
    textAlign: "center",
  },
});
