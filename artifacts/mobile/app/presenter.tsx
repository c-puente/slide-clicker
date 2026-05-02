import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/context/SessionContext";
import type { Note, PresenceMember } from "@/context/SessionContext";

// ── Note toast ───────────────────────────────────────────────────────────────
function NoteToast({
  note,
  onDismiss,
  isDark,
}: {
  note: Note;
  onDismiss: () => void;
  isDark: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 260, friction: 24, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start();
    const timer = setTimeout(() => dismiss(), 8000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -80, duration: 220, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: false }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        styles.noteToast,
        {
          backgroundColor: isDark ? "#1c1914" : "#fefcf8",
          borderLeftColor: "#c96a2f",
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.noteToastInner}>
        <Text style={[styles.noteFrom, { color: "#c96a2f" }]}>{note.from}</Text>
        <Text
          style={[styles.noteText, { color: isDark ? "#ede9e1" : "#1a1612" }]}
          numberOfLines={3}
        >
          {note.text}
        </Text>
      </View>
      <Pressable onPress={dismiss} hitSlop={14} style={styles.noteDismiss}>
        <Feather name="x" size={14} color={isDark ? "#6e6258" : "#9a9288"} />
      </Pressable>
    </Animated.View>
  );
}

// ── Settings sheet ────────────────────────────────────────────────────────────
interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  roomLocked: boolean;
  notesDisabled: boolean;
  audienceMembers: PresenceMember[];
  onSetRoomLocked: (locked: boolean) => void;
  onSetNotesDisabled: (disabled: boolean) => void;
  onRemoveMember: (memberId: string) => void;
}

function SettingsSheet({
  visible,
  onClose,
  isDark,
  roomLocked,
  notesDisabled,
  audienceMembers,
  onSetRoomLocked,
  onSetNotesDisabled,
  onRemoveMember,
}: SettingsSheetProps) {
  const insets = useSafeAreaInsets();

  const surface = isDark ? "#1c1914" : "#fefcf8";
  const textPrimary = isDark ? "#ede9e1" : "#1a1612";
  const textSecondary = isDark ? "#6e6258" : "#7a7268";
  const accent = "#c96a2f";
  const divider = isDark ? "rgba(237,233,225,0.08)" : "rgba(26,22,18,0.08)";
  const subtleBg = isDark ? "rgba(237,233,225,0.05)" : "rgba(26,22,18,0.04)";
  const switchTrackOff = isDark ? "#3a3530" : "#dcd7cf";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={sheet.root}>
        <Pressable style={sheet.backdrop} onPress={onClose} />

        <View
          style={[
            sheet.panel,
            { backgroundColor: surface, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <View style={[sheet.handle, { backgroundColor: isDark ? "rgba(237,233,225,0.18)" : "rgba(26,22,18,0.13)" }]} />

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* ── Controls ── */}
            <Text style={[sheet.sectionLabel, { color: textSecondary }]}>
              Session Controls
            </Text>

            {/* Lock Room */}
            <View style={[sheet.row, { borderTopColor: divider }]}>
              <View style={[sheet.rowIcon, { backgroundColor: roomLocked ? "rgba(201,106,47,0.13)" : subtleBg }]}>
                <Feather
                  name={roomLocked ? "lock" : "unlock"}
                  size={15}
                  color={roomLocked ? accent : textSecondary}
                />
              </View>
              <View style={sheet.rowText}>
                <Text style={[sheet.rowTitle, { color: textPrimary }]}>Lock Room</Text>
                <Text style={[sheet.rowSub, { color: textSecondary }]}>
                  {roomLocked ? "New members cannot join" : "Open to new members"}
                </Text>
              </View>
              <Switch
                value={roomLocked}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSetRoomLocked(v);
                }}
                trackColor={{ false: switchTrackOff, true: accent }}
                thumbColor="#fefcf8"
                ios_backgroundColor={switchTrackOff}
              />
            </View>

            {/* Notes */}
            <View style={[sheet.row, { borderTopColor: divider }]}>
              <View style={[sheet.rowIcon, { backgroundColor: notesDisabled ? "rgba(201,106,47,0.13)" : subtleBg }]}>
                <Feather
                  name="message-square"
                  size={15}
                  color={notesDisabled ? accent : textSecondary}
                />
              </View>
              <View style={sheet.rowText}>
                <Text style={[sheet.rowTitle, { color: textPrimary }]}>Notes</Text>
                <Text style={[sheet.rowSub, { color: textSecondary }]}>
                  {notesDisabled ? "Audience cannot send notes" : "Audience can send notes"}
                </Text>
              </View>
              <Switch
                value={!notesDisabled}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSetNotesDisabled(!v);
                }}
                trackColor={{ false: switchTrackOff, true: accent }}
                thumbColor="#fefcf8"
                ios_backgroundColor={switchTrackOff}
              />
            </View>

            {/* ── Audience ── */}
            <Text style={[sheet.sectionLabel, { color: textSecondary, marginTop: 24 }]}>
              {audienceMembers.length > 0
                ? `Audience · ${audienceMembers.length}`
                : "Audience"}
            </Text>

            {audienceMembers.length === 0 ? (
              <Text style={[sheet.emptyText, { color: textSecondary }]}>
                No one has joined yet
              </Text>
            ) : (
              audienceMembers.map((m) => (
                <View key={m.id} style={[sheet.memberRow, { borderTopColor: divider }]}>
                  <View style={[sheet.memberDot, { backgroundColor: "#3d8a6e" }]} />
                  <Text style={[sheet.memberName, { color: textPrimary }]}>{m.name}</Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onRemoveMember(m.id);
                    }}
                    style={({ pressed }) => [
                      sheet.removeBtn,
                      { backgroundColor: pressed ? (isDark ? "rgba(237,233,225,0.08)" : "rgba(26,22,18,0.06)") : "transparent" },
                    ]}
                    hitSlop={8}
                  >
                    <Feather name="user-minus" size={14} color={textSecondary} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Presenter screen ──────────────────────────────────────────────────────────
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
    roomLocked,
    notesDisabled,
    setRoomLocked,
    setNotesDisabled,
    removeMember,
  } = useSession();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleShare = async () => {
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = `Join my presentation — enter code ${code} in the Slide Clicker app.`;
    try {
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title: "Join my presentation", text: message });
        } else if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(code);
        }
      } else {
        await Share.share({ message, title: "Join my presentation" });
      }
    } catch {
      // user cancelled — no-op
    }
  };

  const flashAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: false }).start();
  }, []);

  useEffect(() => {
    if (!code) router.replace("/");
  }, [code]);

  const prevFlash = useRef(false);
  useEffect(() => {
    if (triggerFlash && !prevFlash.current) {
      prevFlash.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 160, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]).start(() => { prevFlash.current = false; });
    }
  }, [triggerFlash]);

  useEffect(() => {
    const ratio = totalAudience > 0 ? voteCount / totalAudience : 0;
    if (ratio >= 0.5 && totalAudience > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 900, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voteCount, totalAudience]);

  const bg = isDark ? "#0d0b08" : "#f4f1ec";
  const textPrimary = isDark ? "#ede9e1" : "#1a1612";
  const textSecondary = isDark ? "#6e6258" : "#7a7268";
  const accent = "#c96a2f";
  const surface = isDark ? "#1c1914" : "#fefcf8";
  const divider = isDark ? "rgba(237,233,225,0.08)" : "rgba(26,22,18,0.08)";

  const ratio = totalAudience > 0 ? voteCount / totalAudience : 0;
  const hasVotes = voteCount > 0;
  const majorityReached = ratio >= 0.5 && totalAudience > 0;
  const audienceMembers = presence.filter((p) => p.role === "audience");

  const flashBorderColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? "rgba(237,233,225,0.08)" : "rgba(26,22,18,0.08)", accent],
  });

  return (
    <Animated.View style={[styles.flex, { backgroundColor: bg, opacity: fadeIn }]}>
      {notes.length > 0 && (
        <View
          style={[
            styles.notesOverlay,
            { top: Platform.OS === "web" ? 60 + insets.top : insets.top + 56 },
          ]}
          pointerEvents="box-none"
        >
          <ScrollView
            style={styles.notesScroll}
            contentContainerStyle={{ gap: 6 }}
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
            paddingTop: Platform.OS === "web" ? 60 + insets.top : insets.top + 16,
            paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 16,
          },
        ]}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => { leaveSession(); router.replace("/"); }}
            style={({ pressed }) => [styles.leaveBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.leaveBtnText, { color: textSecondary }]}>Leave</Text>
          </Pressable>

          {/* Code + share + lock indicator */}
          <View style={styles.codeArea}>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.codePill,
                {
                  backgroundColor: isDark ? "rgba(201,106,47,0.12)" : "rgba(201,106,47,0.1)",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.codeValue, { color: accent }]}>{code}</Text>
            </Pressable>
            {roomLocked && (
              <Feather name="lock" size={11} color={accent} style={{ marginLeft: 6 }} />
            )}
            <Pressable
              onPress={handleShare}
              hitSlop={10}
              style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather name="share-2" size={14} color={textSecondary} />
            </Pressable>
          </View>

          {/* Settings button */}
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => [
              styles.settingsBtn,
              {
                backgroundColor: isDark ? "rgba(237,233,225,0.07)" : "rgba(26,22,18,0.05)",
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Feather name="settings" size={16} color={textSecondary} />
          </Pressable>
        </View>

        {/* ── Slide number ── */}
        <View style={styles.slideHero}>
          <Text style={[styles.slideLabel, { color: textSecondary }]}>slide</Text>
          <Text style={[styles.slideNumber, { color: textPrimary }]}>{slideNumber}</Text>
        </View>

        {/* ── Status card ── */}
        <Animated.View
          style={[
            styles.statusCard,
            {
              backgroundColor: surface,
              borderColor: flashBorderColor,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {hasVotes ? (
            <View style={styles.statusCardInner}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: majorityReached ? accent : isDark ? "#3a3530" : "#e8e3db" },
                ]}
              />
              <View style={styles.statusTextBlock}>
                <Text style={[styles.statusTitle, { color: textPrimary }]}>
                  {majorityReached ? "Majority wants to advance" : "Requests to advance"}
                </Text>
                <Text style={[styles.statusSub, { color: textSecondary }]}>
                  {voteCount} of {totalAudience}{" "}
                  {totalAudience === 1 ? "person" : "people"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusCardInner}>
              <View
                style={[styles.statusDot, { backgroundColor: isDark ? "#3a3530" : "#e8e3db" }]}
              />
              <Text style={[styles.statusTitle, { color: textSecondary }]}>
                {audienceMembers.length === 0
                  ? "Waiting for audience to join"
                  : `${audienceMembers.length} ${audienceMembers.length === 1 ? "person" : "people"} connected`}
              </Text>
            </View>
          )}
        </Animated.View>

        {totalAudience > 0 && (
          <View
            style={[styles.progressTrack, { backgroundColor: isDark ? "#3a3530" : "#e8e3db" }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: majorityReached ? accent : isDark ? "#5a4a3a" : "#c4a882",
                  width: `${Math.min(ratio * 100, 100)}%`,
                },
              ]}
            />
          </View>
        )}

        {/* ── Action row ── */}
        <View style={styles.actionRow}>
          {hasVotes && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                resetVotes();
              }}
              style={({ pressed }) => [
                styles.resetBtn,
                {
                  borderColor: divider,
                  backgroundColor: isDark ? "rgba(237,233,225,0.04)" : "rgba(26,22,18,0.04)",
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Feather name="refresh-cw" size={15} color={textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              advanceSlide();
            }}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: accent,
                flex: hasVotes ? 1 : undefined,
                width: hasVotes ? undefined : "100%",
                opacity: pressed ? 0.84 : 1,
              },
            ]}
          >
            <Text style={styles.nextBtnText}>Next Slide</Text>
            <Feather name="arrow-right" size={16} color="#fefcf8" style={{ marginLeft: 6 }} />
          </Pressable>
        </View>

        {/* ── Audience chips ── */}
        {audienceMembers.length > 0 && (
          <View style={[styles.memberRow, { borderTopColor: divider }]}>
            {audienceMembers.map((m) => (
              <View
                key={m.id}
                style={[styles.memberChip, { backgroundColor: isDark ? "#2a2520" : "#eee9e1" }]}
              >
                <View style={[styles.memberDot, { backgroundColor: "#3d8a6e" }]} />
                <Text style={[styles.memberName, { color: textPrimary }]}>{m.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Settings sheet ── */}
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
        roomLocked={roomLocked}
        notesDisabled={notesDisabled}
        audienceMembers={audienceMembers}
        onSetRoomLocked={setRoomLocked}
        onSetNotesDisabled={setNotesDisabled}
        onRemoveMember={removeMember}
      />
    </Animated.View>
  );
}

// ── Main screen styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  leaveBtn: { paddingVertical: 6, paddingRight: 8 },
  leaveBtnText: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", letterSpacing: 0.1 },
  codeArea: { flexDirection: "row", alignItems: "center" },
  codePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  codeValue: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 5 },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 4,
  },
  slideHero: { marginBottom: 24 },
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
  statusCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  statusCardInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", letterSpacing: 0.1 },
  statusSub: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", marginTop: 2, letterSpacing: 0.1 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden", marginBottom: 20 },
  progressFill: { height: "100%", borderRadius: 2 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  resetBtn: {
    height: 50, width: 50, borderRadius: 10,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  nextBtn: {
    height: 50, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", paddingHorizontal: 22,
  },
  nextBtnText: {
    color: "#fefcf8", fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold", letterSpacing: 0.1,
  },
  memberRow: {
    borderTopWidth: 1, paddingTop: 14,
    flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  memberChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, gap: 6,
  },
  memberDot: { width: 6, height: 6, borderRadius: 3 },
  memberName: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", letterSpacing: 0.1 },
  notesOverlay: { position: "absolute", left: 16, right: 16, zIndex: 99, maxHeight: 260 },
  notesScroll: { flex: 1 },
  noteToast: {
    flexDirection: "row", alignItems: "flex-start",
    borderRadius: 10, borderLeftWidth: 3,
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  noteToastInner: { flex: 1 },
  noteFrom: {
    fontSize: 10, fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3,
  },
  noteText: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 19, letterSpacing: 0.1 },
  noteDismiss: { paddingTop: 2 },
});

// ── Settings sheet styles ─────────────────────────────────────────────────────
const sheet = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.48)" },
  panel: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "88%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 20 },
  sectionLabel: {
    paddingHorizontal: 22,
    fontSize: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 22, paddingVertical: 14,
    borderTopWidth: 1,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: "center", justifyContent: "center", marginRight: 13,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", letterSpacing: 0.1 },
  rowSub: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", marginTop: 2, letterSpacing: 0.1 },
  emptyText: {
    paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4,
    fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", letterSpacing: 0.1,
  },
  memberRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 22, paddingVertical: 12,
    borderTopWidth: 1,
  },
  memberDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 11 },
  memberName: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", letterSpacing: 0.1 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 },
});
