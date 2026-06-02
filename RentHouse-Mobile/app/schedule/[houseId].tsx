import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { visitService } from "../../services/visit.service";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomTimePicker from "../../components/CustomTimePicker";
import { FONTS } from "../../constants/fonts";

// Must stay in sync with CustomTimePicker's TIME_SLOTS constant
const TIME_SLOTS: string[] = Array.from({ length: 13 }, (_, i) => {
  const h = 8 + i;
  return `${String(h).padStart(2, "0")}:00`;
});

interface BookedSlot {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
}

const EXPECT_ITEMS = [
  { emoji: "📧", text: "You'll receive a confirmation email" },
  { emoji: "📞", text: "The landlord will contact you shortly" },
  { emoji: "⏱️", text: "Visit takes 30–45 minutes" },
  { emoji: "🪪", text: "Please bring a valid ID" },
];

export default function ScheduleScreen() {
  const { houseId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();

  // FIX 1 — minimum date is tomorrow, computed once at mount
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, []);

  const [visitorName,  setVisitorName]  = useState(user?.username || "");
  const [visitorEmail, setVisitorEmail] = useState(user?.email    || "");
  const [date, setDate]                 = useState<Date>(tomorrow);
  const [time, setTime]                 = useState("10:00");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [showSuccess, setShowSuccess]   = useState(false);

  // ── Booked slots ──────────────────────────────────────────────────────────
  const [bookedSlots, setBookedSlots]   = useState<BookedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!houseId) return;
    setLoadingSlots(true);
    visitService.getByHouse(Number(houseId))
      .then((res) => {
        const data: any[] = Array.isArray(res.data) ? res.data : [];
        setBookedSlots(
          data.map((v) => ({
            date: v.visitDate as string,
            // Backend may return "HH:MM:SS" — trim to "HH:MM"
            time: (v.visitTime as string).substring(0, 5),
          }))
        );
      })
      .catch(() => {/* non-critical — app still works without booked-slot data */})
      .finally(() => setLoadingSlots(false));
  }, [houseId]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatDate = (d: Date): string => {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isSlotBooked = (d: Date, t: string): boolean => {
    const ds = formatDate(d);
    return bookedSlots.some((s) => s.date === ds && s.time === t);
  };

  const hasBookingsOnDate = (d: Date): boolean => {
    const ds = formatDate(d);
    return bookedSlots.some((s) => s.date === ds);
  };

  // ── Inline slot grid tap ──────────────────────────────────────────────────

  const handleSlotPress = (slot: string) => {
    if (isSlotBooked(date, slot)) {
      Alert.alert(
        "Slot Unavailable",
        "This time slot is already booked. Please choose another."
      );
      return;
    }
    setTime(slot);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!visitorName.trim() || !visitorEmail.trim()) {
      Alert.alert("Error", "Please provide your name and email");
      return;
    }
    if (!user) return;

    // Guard against submitting a booked slot (edge case: data loaded after page open)
    if (isSlotBooked(date, time)) {
      Alert.alert(
        "Slot Unavailable",
        "This time slot is already booked. Please choose a different time."
      );
      return;
    }

    setLoading(true);
    try {
      await visitService.request({
        userId: user.id,
        houseId: Number(houseId),
        visitorName: visitorName.trim(),
        visitorEmail: visitorEmail.trim(),
        date: formatDate(date),
        time,
      });
      // Optimistically add the new slot so the grid reflects it immediately
      setBookedSlots((prev) => [...prev, { date: formatDate(date), time }]);
      setShowSuccess(true);
    } catch (error: any) {
      // FIX 2 — distinguish 409 slot conflict from generic failures
      if (error.response?.status === 409) {
        Alert.alert(
          "Slot Taken",
          "This time slot is already booked. Please choose a different time."
        );
        // Pull the conflicting slot into local state so the grid reflects it
        setBookedSlots((prev) => [...prev, { date: formatDate(date), time }]);
      } else {
        Alert.alert("Failed", "Could not send visit request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success view ──────────────────────────────────────────────────────────

  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={88} color="#27ae60" />
        <Text style={styles.successTitle}>Visit Scheduled!</Text>
        <Text style={styles.successSubtitle}>
          {"We'll send you a confirmation shortly"}
        </Text>
        <TouchableOpacity style={styles.successBtn} onPress={() => router.back()}>
          <Text style={styles.successBtnText}>Back to Property</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived values for render ─────────────────────────────────────────────

  const dateHasBookings  = hasBookingsOnDate(date);
  const currentlyBooked  = isSlotBooked(date, time);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={60} color="#2C3E50" />
        </View>

        <Text style={styles.title}>Schedule a Visit</Text>
        <Text style={styles.subtitle}>Request a visit time with the owner</Text>

        {/* ── Form ── */}
        <View style={styles.form}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#999999"
            value={visitorName}
            onChangeText={setVisitorName}
          />

          <Text style={styles.label}>Your Email</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor="#999999"
            value={visitorEmail}
            onChangeText={setVisitorEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* ── Date picker — shows ⚠️ when the date has any bookings ── */}
          <Text style={styles.label}>Visit Date</Text>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#2C3E50" />
            <Text style={styles.datePickerText}>{formatDate(date)}</Text>
            {dateHasBookings && (
              <View style={styles.dateWarningPill}>
                <Text style={styles.dateWarningText}>⚠️ Some slots taken</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Time picker — shows "Booked" badge when selected time is taken ── */}
          <Text style={styles.label}>Visit Time</Text>
          <TouchableOpacity
            style={[styles.datePickerBtn, currentlyBooked && styles.datePickerBtnWarning]}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={16} color={currentlyBooked ? "#dc2626" : "#2C3E50"} />
            <Text style={[styles.datePickerText, currentlyBooked && styles.datePickerTextWarning]}>
              {time}
            </Text>
            {currentlyBooked && (
              <View style={styles.bookedPill}>
                <Text style={styles.bookedPillText}>Booked — pick another</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Inline slot availability grid ── */}
          <View style={styles.slotSection}>
            <View style={styles.slotSectionHeader}>
              <Text style={styles.slotSectionTitle}>Time Availability</Text>
              {loadingSlots && <ActivityIndicator size="small" color="#2C3E50" />}
            </View>
            <Text style={styles.slotSectionSub}>
              {dateHasBookings
                ? "Grey slots are already booked — tap an available one to select it"
                : "All slots available — tap one to select it"}
            </Text>

            <View style={styles.slotGrid}>
              {TIME_SLOTS.map((slot) => {
                const booked   = isSlotBooked(date, slot);
                const selected = slot === time && !booked;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotChip,
                      selected && styles.slotChipSelected,
                      booked  && styles.slotChipBooked,
                    ]}
                    onPress={() => handleSlotPress(slot)}
                    activeOpacity={booked ? 0.6 : 0.75}
                  >
                    {booked && (
                      <Ionicons
                        name="close-circle"
                        size={11}
                        color="#94a3b8"
                        style={{ marginRight: 3 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.slotChipText,
                        selected && styles.slotChipTextSelected,
                        booked  && styles.slotChipTextBooked,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, currentlyBooked && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || currentlyBooked}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Send Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── What to Expect info card ── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>What to Expect</Text>
          {EXPECT_ITEMS.map(({ emoji, text }) => (
            <View key={text} style={styles.infoItem}>
              <Text style={styles.infoEmoji}>{emoji}</Text>
              <Text style={styles.infoText}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FIX 1 — minimumDate is tomorrow */}
      <CustomDatePicker
        isVisible={showDatePicker}
        minimumDate={tomorrow}
        currentDate={date}
        onConfirm={(selectedDate) => {
          setDate(selectedDate);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Post-confirm validation: alert if picked slot is already booked */}
      <CustomTimePicker
        isVisible={showTimePicker}
        currentTime={time}
        onConfirm={(selectedTime) => {
          setShowTimePicker(false);
          if (isSlotBooked(date, selectedTime)) {
            Alert.alert(
              "Slot Unavailable",
              "This time slot is already booked. Please choose another."
            );
            return;
          }
          setTime(selectedTime);
        }}
        onCancel={() => setShowTimePicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f5f6fa",
    padding: 24,
    alignItems: "center",
  },
  iconContainer: { marginTop: 20, marginBottom: 16 },
  title: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: "#2C3E50",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 30,
    fontFamily: FONTS.body,
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  form: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: "#2C3E50",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f8f9fa",
    marginBottom: 16,
    color: "#2C3E50",
  },

  // ── Date / time buttons ───────────────────────────────────────────────────
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f8f9fa",
    marginBottom: 16,
  },
  datePickerBtnWarning: {
    borderColor: "#fca5a5",
    backgroundColor: "#fff5f5",
  },
  datePickerText: { fontSize: 15, color: "#2C3E50", fontFamily: FONTS.body, flex: 1 },
  datePickerTextWarning: { color: "#dc2626" },

  // ── Date warning pill (some slots taken on this date) ────────────────────
  dateWarningPill: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  dateWarningText: { fontSize: 11, color: "#92400e", fontFamily: FONTS.semiBold },

  // ── Booked pill (currently selected time is taken) ───────────────────────
  bookedPill: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  bookedPillText: { fontSize: 11, color: "#dc2626", fontFamily: FONTS.semiBold },

  // ── Inline slot availability grid ─────────────────────────────────────────
  slotSection: {
    marginBottom: 20,
  },
  slotSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  slotSectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: "#2C3E50",
  },
  slotSectionSub: {
    fontSize: 11,
    color: "#7f8c8d",
    fontFamily: FONTS.body,
    marginBottom: 10,
    lineHeight: 15,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe6e9",
    backgroundColor: "#f8f9fa",
  },
  slotChipSelected: {
    backgroundColor: "#2C3E50",
    borderColor: "#2C3E50",
  },
  slotChipBooked: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
    opacity: 0.65,
  },
  slotChipText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: "#2C3E50",
  },
  slotChipTextSelected: { color: "#ffffff" },
  slotChipTextBooked:   { color: "#94a3b8", textDecorationLine: "line-through" },

  // ── Submit button ─────────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: "#2C3E50",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  submitBtnDisabled: { backgroundColor: "#94a3b8" },
  submitBtnText: { color: "#fff", fontFamily: FONTS.semiBold, fontSize: 16 },

  // ── What to Expect card ───────────────────────────────────────────────────
  infoCard: {
    width: "100%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  infoCardTitle: {
    fontSize: 15,
    fontFamily: FONTS.heading,
    color: "#2C3E50",
    marginBottom: 14,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  infoEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  infoText:  { fontSize: 14, color: "#2C3E50", fontFamily: FONTS.body, flex: 1 },

  // ── Success view ──────────────────────────────────────────────────────────
  successContainer: {
    flex: 1,
    backgroundColor: "#f5f6fa",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: FONTS.heading,
    color: "#2C3E50",
    marginTop: 20,
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 15,
    color: "#7f8c8d",
    fontFamily: FONTS.body,
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 22,
  },
  successBtn: {
    backgroundColor: "#2C3E50",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 40,
  },
  successBtnText: { color: "#fff", fontFamily: FONTS.semiBold, fontSize: 16 },
});
