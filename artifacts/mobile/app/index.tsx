import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (code && role === "presenter") {
      router.replace("/presenter");
    } else if (code && role === "audience") {
      router.replace("/audience");
    }
  }, [code, role]);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
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
      tension: 200,
      friction: 20,
    }).start();
  };

  const handlePresent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createSession();
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    joinSession(joinCode.trim().toUpperCase());
  };

  const bg = isDark ? "#0d0d14" : "#f2f2f7";
  const card = isDark ? "#1a1a2e" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#0a0a0a";
  const textSecondary = isDark ? "#8888aa" : "#666680";
  const accent = "#5b5cff";
  const accentLight = isDark ? "rgba(91,92,255,0.18)" : "rgba(91,92,255,0.1)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  const tabIndicatorLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "52%"],
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
            paddingTop: Platform.OS === "web" ? 67 + insets.top : insets.top + 20,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: accentLight }]}>
            <Feather name="monitor" size={22} color={accent} />
          </View>
          <Text style={[styles.title, { color: textPrimary }]}>SlideClicker</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Control presentations together
          </Text>
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: card,
              borderColor: border,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <View style={[styles.tabBar, { backgroundColor: inputBg }]}>
            <Animated.View
              style={[
                styles.tabIndicator,
                { backgroundColor: accent, left: tabIndicatorLeft },
              ]}
            />
            <Pressable
              style={styles.tab}
              onPress={() => switchTab("presenter")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "presenter" ? "#ffffff" : textSecondary,
                    fontWeight: activeTab === "presenter" ? "600" : "400",
                  },
                ]}
              >
                Present
              </Text>
            </Pressable>
            <Pressable
              style={styles.tab}
              onPress={() => switchTab("audience")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "audience" ? "#ffffff" : textSecondary,
                    fontWeight: activeTab === "audience" ? "600" : "400",
                  },
                ]}
              >
                Audience
              </Text>
            </Pressable>
          </View>

          <View style={styles.cardBody}>
            <Text style={[styles.fieldLabel, { color: textSecondary }]}>
              Your name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: border,
                  color: textPrimary,
                },
              ]}
              placeholder="Enter your name"
              placeholderTextColor={textSecondary}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
            />

            {activeTab === "audience" && (
              <>
                <Text
                  style={[styles.fieldLabel, { color: textSecondary, marginTop: 12 }]}
                >
                  Session code
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.codeInput,
                    {
                      backgroundColor: inputBg,
                      borderColor: error ? "#ff4444" : border,
                      color: accent,
                      letterSpacing: 8,
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
                  onSubmitEditing={handleJoin}
                  maxLength={4}
                />
              </>
            )}

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={activeTab === "presenter" ? handlePresent : handleJoin}
            >
              <Feather
                name={activeTab === "presenter" ? "play" : "users"}
                size={16}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.primaryButtonText}>
                {activeTab === "presenter" ? "Start Session" : "Join Session"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Text style={[styles.hint, { color: textSecondary }]}>
          {activeTab === "presenter"
            ? "Create a session and share the code with your audience"
            : "Enter the 4-letter code shown on the presenter's screen"}
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tabBar: {
    flexDirection: "row",
    margin: 6,
    borderRadius: 14,
    padding: 2,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 2,
    width: "46%",
    height: "100%",
    borderRadius: 11,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  cardBody: {
    padding: 20,
    paddingTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    height: 58,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    textAlign: "center",
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 20,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  hint: {
    marginTop: 20,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
