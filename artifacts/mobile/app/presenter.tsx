import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/context/SessionContext";
import type { Note } from "@/context/SessionContext";

function NoteToast({
  note,
  onDismiss,
  isDark,
}: {
  note: Note;
  onDismiss: () => void;
  isDark: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 200, friction: 20, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dismiss(), 8000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        styles.noteToast,
        {
          backgroundColor: isDark ? "#1e1e36" : "#ffffff",
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.noteToastLeft}>
        <View style={[styles.noteAvatar, { backgroundColor: isDark ? "rgba(91,92,255,0.2)" : "rgba(91,92,255,0.12)" }]}>
          <Feather name="message-circle" size={14} color="#5b5cff" />
        </View>
        <View style={styles.noteToastContent}>
          <Text style={[styles.noteFrom, { color: isDark ? "#8888aa" : "#666680" }]}>{note.from}</Text>
          <Text style={[styles.noteText, { color: isDark ? "#ffffff" : "#0a0a0a" }]} numberOfLines={3}>{note.text}</Text>
        </View>
      </View>
      <Pressable onPress={dismiss} hitSlop={12}>
        <Feather name="x" size={16} color={isDark ? "#666688" : "#999aaa"} />
      </Pressable>
    </Animated.View>
  );
}

export default function PresenterScreen() {
  const {
    code,
    slideNumber,
    voteCount,
    totalAudience,
    presence,
    triggerFlash,
    advanceSlide,
    resetVotes,
    leaveSession,
    notes,
    dismissNote,
  } = useSession();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!code) {
      router.replace("/");
    }
  }, [code]);

  const prevFlash = useRef(false);
  useEffect(() => {
    if (triggerFlash && !prevFlash.current) {
      prevFlash.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: false,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1.04,
            tension: 300,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: false,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 300,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        prevFlash.current = false;
      });
    }
  }, [triggerFlash]);

  useEffect(() => {
    const ratio = totalAudience > 0 ? voteCount / totalAudience : 0;
    if (ratio >= 0.5) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voteCount, totalAudience]);

  const handleAdvance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    advanceSlide();
  };

  const handleLeave = () => {
    leaveSession();
    router.replace("/");
  };

  const bg = isDark ? "#0d0d14" : "#f2f2f7";
  const card = isDark ? "#1a1a2e" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#0a0a0a";
  const textSecondary = isDark ? "#8888aa" : "#666680";
  const accent = "#5b5cff";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const flashBg = isDark ? "#2a1a4e" : "#eeeeff";

  const ratio = totalAudience > 0 ? voteCount / totalAudience : 0;
  const hasVotes = voteCount > 0;
  const majorityReached = ratio >= 0.5 && totalAudience > 0;

  const flashBackground = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [card, isDark ? "#2d1080" : "#c8c6ff"],
  });

  const audienceMembers = presence.filter((p) => p.role === "audience");

  return (
    <Animated.View style={[styles.flex, { backgroundColor: bg, opacity: fadeIn }]}>
      {notes.length > 0 && (
        <View
          style={[
            styles.notesOverlay,
            { top: Platform.OS === "web" ? 67 + insets.top : insets.top + 60 },
          ]}
          pointerEvents="box-none"
        >
          <ScrollView
            style={styles.notesScroll}
            contentContainerStyle={styles.notesScrollContent}
            showsVerticalScrollIndicator={false}
            pointerEvents="box-none"
          >
            {notes.map((note) => (
              <NoteToast
                key={note.id}
                note={note}
                onDismiss={() => dismissNote(note.id)}
                isDark={isDark}
              />
            ))}
          </ScrollView>
        </View>
      )}
      <View
        style={[
          styles.container,
          {
            paddingTop: Platform.OS === "web" ? 67 + insets.top : insets.top + 16,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={handleLeave}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="x" size={18} color={textSecondary} />
          </Pressable>

          <View
            style={[
              styles.codeBadge,
              { backgroundColor: isDark ? "rgba(91,92,255,0.2)" : "rgba(91,92,255,0.1)" },
            ]}
          >
            <Text style={[styles.codeLabel, { color: textSecondary }]}>CODE</Text>
            <Text style={[styles.codeValue, { color: accent }]}>{code}</Text>
          </View>

          <View style={styles.audienceCount}>
            <Feather name="users" size={14} color={textSecondary} />
            <Text style={[styles.audienceCountText, { color: textSecondary }]}>
              {audienceMembers.length}
            </Text>
          </View>
        </View>

        <View style={styles.slideRow}>
          <Text style={[styles.slideLabel, { color: textSecondary }]}>SLIDE</Text>
          <Text style={[styles.slideNumber, { color: textPrimary }]}>
            {slideNumber}
          </Text>
        </View>

        <Animated.View
          style={[
            styles.flashCard,
            {
              backgroundColor: flashBackground,
              borderColor: majorityReached ? accent : border,
              borderWidth: majorityReached ? 2 : 1,
              transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
            },
          ]}
        >
          {hasVotes ? (
            <>
              <View
                style={[
                  styles.flashIconCircle,
                  {
                    backgroundColor: majorityReached
                      ? accent
                      : isDark
                      ? "rgba(91,92,255,0.2)"
                      : "rgba(91,92,255,0.1)",
                  },
                ]}
              >
                <Feather
                  name="arrow-right"
                  size={32}
                  color={majorityReached ? "#fff" : accent}
                />
              </View>
              <Text style={[styles.flashTitle, { color: textPrimary }]}>
                {majorityReached ? "Majority ready" : "Requests to advance"}
              </Text>
              <Text style={[styles.flashSubtitle, { color: textSecondary }]}>
                {voteCount} of {totalAudience} audience member
                {totalAudience !== 1 ? "s" : ""}
              </Text>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.flashIconCircle,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <Feather name="wifi" size={28} color={textSecondary} />
              </View>
              <Text style={[styles.flashTitle, { color: textSecondary }]}>
                Waiting for audience
              </Text>
              <Text style={[styles.flashSubtitle, { color: textSecondary }]}>
                {audienceMembers.length === 0
                  ? "Share the code to get started"
                  : `${audienceMembers.length} member${audienceMembers.length !== 1 ? "s" : ""} connected`}
              </Text>
            </>
          )}
        </Animated.View>

        {totalAudience > 0 && (
          <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: majorityReached ? accent : isDark ? "#4444aa" : "#9898ee",
                  width: `${Math.min(ratio * 100, 100)}%`,
                },
              ]}
            />
          </View>
        )}

        <View style={styles.actionRow}>
          {hasVotes && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                resetVotes();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: border,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="refresh-cw" size={16} color={textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={handleAdvance}
            style={({ pressed }) => [
              styles.nextButton,
              {
                backgroundColor: accent,
                flex: hasVotes ? 1 : undefined,
                width: hasVotes ? undefined : "100%",
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={styles.nextButtonText}>Next Slide</Text>
            <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
          </Pressable>
        </View>

        {audienceMembers.length > 0 && (
          <View style={[styles.membersList, { borderColor: border }]}>
            <Text style={[styles.membersTitle, { color: textSecondary }]}>
              AUDIENCE
            </Text>
            <View style={styles.memberChips}>
              {audienceMembers.map((m, i) => (
                <View
                  key={i}
                  style={[
                    styles.memberChip,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.07)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.memberDot,
                      { backgroundColor: "#22cc88" },
                    ]}
                  />
                  <Text style={[styles.memberName, { color: textPrimary }]}>
                    {m.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  codeLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  audienceCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: 36,
    justifyContent: "flex-end",
  },
  audienceCountText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  slideRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  slideLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
    marginBottom: 4,
  },
  slideNumber: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    lineHeight: 72,
    letterSpacing: -2,
  },
  flashCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    marginBottom: 16,
    shadowColor: "#5b5cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  flashIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  flashTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    textAlign: "center",
  },
  flashSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  secondaryButton: {
    height: 54,
    width: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  nextButton: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 24,
  },
  nextButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  membersList: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  membersTitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  memberChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  memberDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  memberName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  notesOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 99,
    maxHeight: 280,
  },
  notesScroll: {
    flex: 1,
  },
  notesScrollContent: {
    gap: 8,
  },
  noteToast: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  noteToastLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noteAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  noteToastContent: {
    flex: 1,
  },
  noteFrom: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  noteText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
