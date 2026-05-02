import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
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

export default function AudienceScreen() {
  const {
    code,
    slideNumber,
    voteCount,
    totalAudience,
    presence,
    voteNext,
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
  const [noteSent, setNoteSent] = useState(false);
  const noteAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!code) router.replace("/");
  }, [code]);

  useEffect(() => {
    setHasVoted(false);
    Animated.timing(checkAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideNumber]);

  const toggleNote = () => {
    const opening = !noteOpen;
    setNoteOpen(opening);
    if (opening) {
      setNoteSent(false);
    } else {
      Keyboard.dismiss();
    }
    Animated.spring(noteAnim, {
      toValue: opening ? 1 : 0,
      tension: 200,
      friction: 22,
      useNativeDriver: false,
    }).start();
  };

  const handleSendNote = () => {
    if (!noteText.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sendNote(noteText.trim());
    setNoteText("");
    setNoteSent(true);
    Keyboard.dismiss();
    setTimeout(() => {
      toggleNote();
    }, 1200);
  };

  const handleVote = () => {
    if (hasVoted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setHasVoted(true);
    voteNext();

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        tension: 400,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(checkAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
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

  const ratio = totalAudience > 0 ? voteCount / totalAudience : 0;
  const audienceMembers = presence.filter((p) => p.role === "audience");

  const buttonBg = hasVoted
    ? isDark
      ? "#1a3a2a"
      : "#e8f8f0"
    : accent;
  const buttonBorder = hasVoted
    ? "#22cc88"
    : "transparent";

  return (
    <Animated.View style={[styles.flex, { backgroundColor: bg, opacity: fadeIn }]}>
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
              {
                backgroundColor: isDark
                  ? "rgba(91,92,255,0.2)"
                  : "rgba(91,92,255,0.1)",
              },
            ]}
          >
            <Text style={[styles.codeLabel, { color: textSecondary }]}>
              SESSION
            </Text>
            <Text style={[styles.codeValue, { color: accent }]}>{code}</Text>
          </View>

          <View style={styles.participantCount}>
            <Feather name="users" size={14} color={textSecondary} />
            <Text style={[styles.participantCountText, { color: textSecondary }]}>
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

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPress={handleVote}
            disabled={hasVoted}
            style={[
              styles.voteButton,
              {
                backgroundColor: buttonBg,
                borderColor: buttonBorder,
                borderWidth: hasVoted ? 2 : 0,
                shadowColor: hasVoted ? "#22cc88" : accent,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.voteIconCircle,
                {
                  backgroundColor: hasVoted
                    ? "rgba(34,204,136,0.2)"
                    : "rgba(255,255,255,0.15)",
                },
              ]}
            >
              <Animated.View style={{ opacity: checkAnim, position: "absolute" }}>
                <Feather name="check" size={36} color="#22cc88" />
              </Animated.View>
              <Animated.View
                style={{
                  opacity: checkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                }}
              >
                <Feather
                  name="arrow-right-circle"
                  size={36}
                  color="#fff"
                />
              </Animated.View>
            </Animated.View>

            <Text
              style={[
                styles.voteButtonText,
                { color: hasVoted ? "#22cc88" : "#fff" },
              ]}
            >
              {hasVoted ? "Requested" : "Next Slide"}
            </Text>
            <Text
              style={[
                styles.voteButtonSub,
                {
                  color: hasVoted
                    ? "rgba(34,204,136,0.7)"
                    : "rgba(255,255,255,0.7)",
                },
              ]}
            >
              {hasVoted
                ? "Waiting for presenter"
                : "Tap to ask presenter to advance"}
            </Text>
          </Pressable>
        </Animated.View>

        {totalAudience > 0 && (
          <View style={styles.voteStatus}>
            <View
              style={[
                styles.voteBar,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <View
                style={[
                  styles.voteFill,
                  {
                    backgroundColor:
                      ratio >= 0.5
                        ? accent
                        : isDark
                        ? "#4444aa"
                        : "#9898ee",
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
              backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
              borderColor: noteOpen
                ? accent
                : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              height: noteAnim.interpolate({ inputRange: [0, 1], outputRange: [48, 130] }),
            },
          ]}
        >
          {noteSent ? (
            <View style={styles.noteSentRow}>
              <Feather name="check-circle" size={16} color="#22cc88" />
              <Text style={[styles.noteSentText, { color: "#22cc88" }]}>Note sent!</Text>
            </View>
          ) : noteOpen ? (
            <>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    color: textPrimary,
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  },
                ]}
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
                    { backgroundColor: noteText.trim() ? accent : isDark ? "rgba(91,92,255,0.3)" : "rgba(91,92,255,0.2)" },
                  ]}
                >
                  <Feather name="send" size={13} color="#fff" />
                  <Text style={styles.noteSendText}>Send</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable style={styles.noteClosedRow} onPress={toggleNote}>
              <Feather name="message-circle" size={16} color={textSecondary} />
              <Text style={[styles.noteClosedText, { color: textSecondary }]}>Note to presenter</Text>
              <Feather name="chevron-up" size={14} color={textSecondary} />
            </Pressable>
          )}
        </Animated.View>

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
                    style={[styles.memberDot, { backgroundColor: "#22cc88" }]}
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
  participantCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: 36,
    justifyContent: "flex-end",
  },
  participantCountText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  slideRow: {
    alignItems: "center",
    marginBottom: 32,
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
  voteButton: {
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  voteIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  voteButtonText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  voteButtonSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  voteStatus: {
    marginBottom: 24,
    alignItems: "center",
    gap: 10,
  },
  voteBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  voteFill: {
    height: "100%",
    borderRadius: 2,
  },
  voteText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
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
  noteBar: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: "center",
  },
  noteClosedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteClosedText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  noteInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 52,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  noteCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  noteCancelText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  noteSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  noteSendText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  noteSentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  noteSentText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
