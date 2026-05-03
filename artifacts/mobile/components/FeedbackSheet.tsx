import { AntDesign, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as StoreReview from "expo-store-review";
import React, { useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onLeave: () => void;
}

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function FeedbackSheet({ visible, onLeave }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  const bg = isDark ? "#1c1914" : "#fefcf8";
  const textPrimary = isDark ? "#ede9e1" : "#1a1612";
  const textSecondary = isDark ? "#6e6258" : "#7a7268";
  const accent = "#c96a2f";
  const inputBg = isDark ? "rgba(237,233,225,0.05)" : "rgba(26,22,18,0.03)";
  const inputBorder = isDark ? "rgba(237,233,225,0.12)" : "rgba(26,22,18,0.12)";
  const handleColor = isDark ? "rgba(237,233,225,0.14)" : "rgba(26,22,18,0.12)";

  const doLeave = () => {
    Keyboard.dismiss();
    setRating(0);
    setText("");
    setDone(false);
    onLeave();
  };

  const submit = async () => {
    if (rating === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text: text.trim() }),
      });
    } catch { }

    setDone(true);

    if (rating >= 4) {
      try {
        const available = await StoreReview.isAvailableAsync();
        if (available) await StoreReview.requestReview();
      } catch { }
    }

    setTimeout(doLeave, 1400);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={doLeave}
    >
      <Pressable style={styles.backdrop} onPress={doLeave} />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: bg,
            paddingBottom: Math.max(insets.bottom + 4, 24),
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: handleColor }]} />

        {done ? (
          <View style={styles.doneRow}>
            <AntDesign name="checkcircle" size={22} color="#3d8a6e" />
            <Text style={[styles.doneText, { color: textPrimary }]}>
              Thanks — your feedback helps a lot!
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: textPrimary }]}>
                How was your session?
              </Text>
              <Pressable onPress={doLeave} hitSlop={12}>
                <Text style={[styles.skipLink, { color: textSecondary }]}>
                  Skip
                </Text>
              </Pressable>
            </View>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(s);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Ionicons
                    name={s <= rating ? "star" : "star-outline"}
                    size={34}
                    color={s <= rating ? accent : isDark ? "#3a3530" : "#d4cfc8"}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textPrimary,
                },
              ]}
              placeholder="Anything to share? (optional)"
              placeholderTextColor={textSecondary}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
              blurOnSubmit
            />

            <Pressable
              onPress={submit}
              disabled={rating === 0}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor:
                    rating > 0
                      ? accent
                      : isDark
                        ? "#2a2520"
                        : "#e8e3db",
                  opacity: pressed ? 0.84 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.submitText,
                  { color: rating > 0 ? "#fefcf8" : textSecondary },
                ]}
              >
                Submit
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 18,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 22,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: -0.2,
  },
  skipLink: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    letterSpacing: 0.1,
  },
  starsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    letterSpacing: 0.1,
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  submitBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.1,
  },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 22,
    justifyContent: "center",
  },
  doneText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_500Medium",
    letterSpacing: 0.1,
  },
});
