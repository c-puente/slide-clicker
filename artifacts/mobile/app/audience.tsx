import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/context/SessionContext";

export default function AudienceScreen() {
  const {
    code,
    slideNumber,
    voteCount,
    totalAudience,
    presence,
    voteNext,
    unvoteNext,
    leaveSession,
    sendNote,
  } = useSession();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [hasVoted, setHasVoted] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [briefSent, setBriefSent] = useState(false);

  const [noteCooldown, setNoteCooldown] = useState(false);
  const notesSentRef = useRef(0);
  const noteAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!code) router.replace("/");
  }, [code]);

  useEffect(() => {
    setHasVoted(false);
    Animated.timing(checkAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  }, [slideNumber]);

  const closeNoteBar = () => {
    setNoteOpen(false);
    Keyboard.dismiss();
    Animated.spring(noteAnim, {
      toValue: 0,
      tension: 260,
      friction: 26,
      useNativeDriver: false,
    }).start();
  };

  const toggleNote = () => {
    if (noteCooldown) return;
    const opening = !noteOpen;
    setNoteOpen(opening);
    if (!opening) Keyboard.dismiss();
    Animated.spring(noteAnim, {
      toValue: opening ? 1 : 0,
      tension: 260,
      friction: 26,
      useNativeDriver: false,
    }).start();
  };

  const handleSendNote = () => {
    if (!noteText.trim() || noteCooldown) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sendNote(noteText.trim());
    setNoteText("");
    setBriefSent(true);
    Keyboard.dismiss();

    const count = notesSentRef.current + 1;
    notesSentRef.current = count;

    setTimeout(() => setBriefSent(false), 700);

    if (count >= 2) {
      notesSentRef.current = 0;
      setTimeout(() => {
        closeNoteBar();
        setNoteCooldown(true);
        setTimeout(() => setNoteCooldown(false), 2000);
      }, 700);
    }
  };

  const handleVote = () => {
    if (hasVoted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setHasVoted(false);
      unvoteNext();
      Animated.timing(checkAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setHasVoted(true);
      voteNext();
      Animated.sequence([
        Animated.timing(pressAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.timing(pressAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      Animated.timing(checkAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  };

  const bg = isDark ? "#0d0b08" : "#f4f1ec";
  const textPrimary = isDark ? "#ede9e1" : "#1a1612";
  const textSecondary = isDark ? "#6e6258" : "#7a7268";
  const accent = "#c96a2f";
  const divider = isDark ? "rgba(237,233,225,0.08)" : "rgba(26,22,18,0.08)";
  const surface = isDark ? "#1c1914" : "#fefcf8";
  const inputBorder = isDark ? "rgba(237,233,225,0.12)" : "rgba(26,22,18,0.14)";

  const ratio = totalAudience > 0 ? voteCount / totalAudience : 0;
  const audienceMembers = presence.filter((p) => p.role === "audience");

  return (
    <Animated.View style={[styles.flex, { backgroundColor: bg, opacity: fadeIn }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: Platform.OS === "web" ? 60 + insets.top : insets.top + 16,
              paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 20,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => { leaveSession(); router.replace("/"); }}
            style={({ pressed }) => [styles.leaveBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.leaveBtnText, { color: textSecondary }]}>Leave</Text>
          </Pressable>

          <View
            style={[
              styles.codePill,
              { backgroundColor: isDark ? "rgba(201,106,47,0.12)" : "rgba(201,106,47,0.1)" },
            ]}
          >
            <Text style={[styles.codeValue, { color: accent }]}>{code}</Text>
          </View>

          <View style={styles.countSlot}>
            <Feather name="users" size={13} color={textSecondary} />
            <Text style={[styles.countText, { color: textSecondary }]}>
              {audienceMembers.length}
            </Text>
          </View>
        </View>

        <View style={styles.slideHero}>
          <Text style={[styles.slideLabel, { color: textSecondary }]}>slide</Text>
          <Text style={[styles.slideNumber, { color: textPrimary }]}>{slideNumber}</Text>
        </View>

        <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
          <Pressable
            onPress={handleVote}
            style={[
              styles.voteButton,
              {
                backgroundColor: hasVoted
                  ? isDark ? "#251f18" : "#f0ece4"
                  : accent,
                borderColor: hasVoted ? accent : "transparent",
                borderWidth: hasVoted ? 1.5 : 0,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.voteIconRow,
                {
                  opacity: checkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                },
              ]}
            >
              <Feather name="arrow-right" size={20} color="#fefcf8" />
            </Animated.View>
            <Animated.View
              style={[styles.voteIconRow, styles.voteIconAbsolute, { opacity: checkAnim }]}
            >
              <Feather name="check" size={20} color={accent} />
            </Animated.View>
            <Text style={[styles.voteButtonText, { color: hasVoted ? accent : "#fefcf8" }]}>
              {hasVoted ? "Requested" : "Next Slide"}
            </Text>
            <Text
              style={[
                styles.voteButtonSub,
                { color: hasVoted ? `${accent}99` : "rgba(254,252,248,0.65)" },
              ]}
            >
              {hasVoted ? "Tap again to cancel" : "Tap to signal the presenter"}
            </Text>
          </Pressable>
        </Animated.View>

        {totalAudience > 0 && (
          <View style={styles.voteStatus}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? "#3a3530" : "#e8e3db" },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: ratio >= 0.5 ? accent : isDark ? "#5a4a3a" : "#c4a882",
                    width: `${Math.min(ratio * 100, 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.voteText, { color: textSecondary }]}>
              {voteCount} of {totalAudience} want to advance
            </Text>
          </View>
        )}

        <Animated.View
          style={[
            styles.noteBar,
            {
              backgroundColor: surface,
              borderColor: noteCooldown
                ? isDark ? "rgba(237,233,225,0.06)" : "rgba(26,22,18,0.06)"
                : noteOpen ? accent : inputBorder,
              height: noteAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [44, 126],
              }),
            },
          ]}
        >
          {noteOpen ? (
            briefSent ? (
              <View style={styles.noteSentRow}>
                <Feather name="check" size={13} color="#3d8a6e" />
                <Text style={[styles.noteSentText, { color: "#3d8a6e" }]}>
                  Note sent — write another or wait
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={[styles.noteInput, { color: textPrimary }]}
                  placeholder="Write a note to the presenter…"
                  placeholderTextColor={textSecondary}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  maxLength={280}
                  autoFocus
                />
                <View style={styles.noteActions}>
                  <Pressable onPress={toggleNote} style={styles.noteCancelBtn}>
                    <Text style={[styles.noteCancelText, { color: textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSendNote}
                    style={[
                      styles.noteSendBtn,
                      {
                        backgroundColor: noteText.trim()
                          ? accent
                          : isDark ? "#3a3530" : "#e8e3db",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.noteSendText,
                        { color: noteText.trim() ? "#fefcf8" : textSecondary },
                      ]}
                    >
                      Send
                    </Text>
                  </Pressable>
                </View>
              </>
            )
          ) : noteCooldown ? (
            <View style={styles.noteClosedRow}>
              <Feather name="clock" size={13} color={textSecondary} />
              <Text style={[styles.noteClosedText, { color: textSecondary }]}>
                Please wait a moment…
              </Text>
            </View>
          ) : (
            <Pressable style={styles.noteClosedRow} onPress={toggleNote}>
              <Feather name="message-square" size={13} color={textSecondary} />
              <Text style={[styles.noteClosedText, { color: textSecondary }]}>
                Note to presenter
              </Text>
              <Feather name="chevron-up" size={13} color={textSecondary} />
            </Pressable>
          )}
        </Animated.View>

        {audienceMembers.length > 0 && (
          <View style={[styles.memberRow, { borderTopColor: divider }]}>
            {audienceMembers.map((m, i) => (
              <View
                key={i}
                style={[styles.memberChip, { backgroundColor: isDark ? "#2a2520" : "#eee9e1" }]}
              >
                <View style={[styles.memberDot, { backgroundColor: "#3d8a6e" }]} />
                <Text style={[styles.memberName, { color: textPrimary }]}>{m.name}</Text>
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  leaveBtn: { paddingVertical: 6, paddingRight: 8 },
  leaveBtnText: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", letterSpacing: 0.1 },
  codePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  codeValue: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 5 },
  countSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 36,
    justifyContent: "flex-end",
  },
  countText: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular" },
  slideHero: { marginBottom: 22 },
  slideLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  slideNumber: {
    fontSize: 76,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    lineHeight: 80,
    letterSpacing: -2.5,
  },
  voteButton: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 34,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  voteIconRow: { marginBottom: 12 },
  voteIconAbsolute: { position: "absolute", top: 0, marginBottom: 0 },
  voteButtonText: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  voteButtonSub: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    textAlign: "center",
    letterSpacing: 0.1,
  },
  voteStatus: { marginBottom: 16, gap: 7 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  voteText: { fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", letterSpacing: 0.1 },
  noteBar: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    paddingHorizontal: 13,
    paddingVertical: 7,
    justifyContent: "center",
  },
  noteClosedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  noteClosedText: { flex: 1, fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", letterSpacing: 0.1 },
  noteInput: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    minHeight: 48,
    textAlignVertical: "top",
    marginBottom: 6,
    paddingTop: 4,
    letterSpacing: 0.1,
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  noteCancelBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  noteCancelText: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular" },
  noteSendBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 7 },
  noteSendText: { fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold" },
  noteSentRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteSentText: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  memberRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  memberDot: { width: 6, height: 6, borderRadius: 3 },
  memberName: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", letterSpacing: 0.1 },
});
