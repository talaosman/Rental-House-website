import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(month1Based: number, year: number): number {
  return new Date(year, month1Based, 0).getDate();
}

function normDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function resolveInit(
  currentDate: Date | undefined,
  minimumDate: Date | undefined,
): { day: number; month: number; year: number } {
  const min = minimumDate ? normDate(minimumDate) : null;
  const base = currentDate ? normDate(currentDate) : (min ?? normDate(new Date()));
  const resolved = min && base < min ? min : base;
  return {
    day: resolved.getDate(),
    month: resolved.getMonth() + 1,
    year: resolved.getFullYear(),
  };
}

interface Props {
  isVisible: boolean;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
  currentDate?: Date;
}

export default function CustomDatePicker({
  isVisible,
  onConfirm,
  onCancel,
  minimumDate,
  currentDate,
}: Props) {
  const minNorm = minimumDate ? normDate(minimumDate) : null;
  const now = new Date();
  const minYear = minNorm ? minNorm.getFullYear() : now.getFullYear();
  const maxYear = minYear + 6;

  const [day, setDay]     = useState(() => resolveInit(currentDate, minimumDate).day);
  const [month, setMonth] = useState(() => resolveInit(currentDate, minimumDate).month);
  const [year, setYear]   = useState(() => resolveInit(currentDate, minimumDate).year);

  useEffect(() => {
    if (isVisible) {
      const init = resolveInit(currentDate, minimumDate);
      setDay(init.day);
      setMonth(init.month);
      setYear(init.year);
    }
  }, [isVisible]);

  const isBeforeMin = (d: number, m: number, y: number): boolean => {
    if (!minNorm) return false;
    return new Date(y, m - 1, d) < minNorm;
  };

  const maxDay  = daysInMonth(month, year);
  const days    = Array.from({ length: maxDay }, (_, i) => i + 1);
  const months  = MONTH_NAMES.map((name, i) => ({ name, num: i + 1 }));
  const years   = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  const pickDay = (d: number) => {
    if (isBeforeMin(d, month, year)) return;
    setDay(d);
  };

  const pickMonth = (m: number) => {
    const lastOfMonth = daysInMonth(m, year);
    if (isBeforeMin(lastOfMonth, m, year)) return;
    setMonth(m);
    const clamped = Math.min(day, lastOfMonth);
    setDay(isBeforeMin(clamped, m, year) ? (minNorm?.getDate() ?? 1) : clamped);
  };

  const pickYear = (y: number) => {
    setYear(y);
    const lastOfMonth = daysInMonth(month, y);
    const clamped = Math.min(day, lastOfMonth);
    setDay(isBeforeMin(clamped, month, y) ? (minNorm?.getDate() ?? 1) : clamped);
  };

  const handleConfirm = () => {
    const finalDay = Math.min(day, daysInMonth(month, year));
    const date = new Date(year, month - 1, finalDay);
    if (minNorm && date < minNorm) return;
    onConfirm(date);
  };

  const isMonthDisabled = (m: number) =>
    isBeforeMin(daysInMonth(m, year), m, year);

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title}>Select a Date</Text>

          {/* Column headers */}
          <View style={s.headerRow}>
            <Text style={[s.colHeader, s.colDay]}>Day</Text>
            <Text style={[s.colHeader, s.colMonth]}>Month</Text>
            <Text style={[s.colHeader, s.colYear]}>Year</Text>
          </View>

          {/* Three scrollable columns */}
          <View style={s.columns}>

            {/* Day column */}
            <ScrollView style={s.colDay} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {days.map((d) => {
                const disabled = isBeforeMin(d, month, year);
                const selected = d === day;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[s.item, selected && s.itemSelected, disabled && s.itemDisabled]}
                    onPress={() => pickDay(d)}
                    activeOpacity={disabled ? 1 : 0.7}
                  >
                    <Text style={[s.itemText, selected && s.itemTextSelected, disabled && s.itemTextDisabled]}>
                      {String(d).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Month column */}
            <ScrollView style={s.colMonth} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {months.map(({ name, num }) => {
                const disabled = isMonthDisabled(num);
                const selected = num === month;
                return (
                  <TouchableOpacity
                    key={num}
                    style={[s.item, selected && s.itemSelected, disabled && s.itemDisabled]}
                    onPress={() => !disabled && pickMonth(num)}
                    activeOpacity={disabled ? 1 : 0.7}
                  >
                    <Text style={[s.itemText, selected && s.itemTextSelected, disabled && s.itemTextDisabled]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Year column */}
            <ScrollView style={s.colYear} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {years.map((y) => {
                const selected = y === year;
                return (
                  <TouchableOpacity
                    key={y}
                    style={[s.item, selected && s.itemSelected]}
                    onPress={() => pickYear(y)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.itemText, selected && s.itemTextSelected]}>{y}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

          </View>

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onCancel} activeOpacity={0.8}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.confirmBtn]} onPress={handleConfirm} activeOpacity={0.8}>
              <Text style={s.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const ACCENT = '#2C3E50';
const ITEM_HEIGHT = 44;
const COLUMN_HEIGHT = ITEM_HEIGHT * 5;

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
    width: '92%',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: ACCENT,
    textAlign: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  colHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columns: {
    flexDirection: 'row',
    height: COLUMN_HEIGHT,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  colDay:   { flex: 1, borderRightWidth: 1, borderRightColor: '#dfe6e9' },
  colMonth: { flex: 2, borderRightWidth: 1, borderRightColor: '#dfe6e9' },
  colYear:  { flex: 1.1 },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  itemSelected: { backgroundColor: ACCENT },
  itemDisabled: { opacity: 0.3 },
  itemText: {
    fontSize: 15,
    color: ACCENT,
    fontWeight: '500',
    textAlign: 'center',
  },
  itemTextSelected: { color: '#ffffff', fontWeight: '700' },
  itemTextDisabled: { color: '#b2bec3' },
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
