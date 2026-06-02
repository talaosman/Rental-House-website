import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

const TIME_SLOTS: string[] = Array.from({ length: 13 }, (_, i) => {
  const h = 8 + i;
  return `${String(h).padStart(2, '0')}:00`;
});

interface Props {
  isVisible: boolean;
  onConfirm: (timeString: string) => void;
  onCancel: () => void;
  currentTime?: string;
}

export default function CustomTimePicker({
  isVisible,
  onConfirm,
  onCancel,
  currentTime,
}: Props) {
  const [selected, setSelected] = useState<string>(currentTime ?? '10:00');

  useEffect(() => {
    if (isVisible) setSelected(currentTime ?? '10:00');
  }, [isVisible, currentTime]);

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title}>Select a Time</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={s.scroll}>
            <View style={s.grid}>
              {TIME_SLOTS.map((slot) => {
                const active = selected === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[s.slot, active && s.slotActive]}
                    onPress={() => setSelected(slot)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.slotText, active && s.slotTextActive]}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onCancel} activeOpacity={0.8}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.confirmBtn]}
              onPress={() => onConfirm(selected)}
              activeOpacity={0.8}
            >
              <Text style={s.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const ACCENT = '#2C3E50';

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '86%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: ACCENT,
    textAlign: 'center',
    marginBottom: 16,
  },
  scroll: { marginBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  slot: {
    width: '28%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  slotActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  slotText: { fontSize: 16, color: ACCENT, fontWeight: '600' },
  slotTextActive: { color: '#ffffff', fontWeight: '700' },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  cancelText: { color: ACCENT, fontWeight: '700', fontSize: 15 },
  confirmBtn: { backgroundColor: ACCENT },
  confirmText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
