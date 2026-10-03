import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import {
  createExercise,
  getExercise,
  listExercises,
  retireExerciseIfUnused,
  unarchiveExercise,
  updateExercise,
} from '../../db/repositories/exercises';
import { getItem, saveItem } from '../../db/repositories/program';
import type { Exercise, LoadType, ProgramItem } from '../../db/types';
import { clock } from '../../lib/dates';
import { parseNumber } from '../../lib/units';
import type { RootProps } from '../../navigation/types';
import { toast } from '../../store/snackbarStore';
import {
  colors,
  gutter,
  radius,
  ripple,
  space,
  type,
} from '../../theme/tokens';
import { Field, Input, NumberStepper } from './fields';
import { useUnsavedGuard } from './useUnsavedGuard';

type Form = Omit<ProgramItem, 'id' | 'position' | 'day_id' | 'exercise_id'>;
type ExForm = { name: string; load_type: LoadType; step: string };

const DEFAULT_FORM: Form = {
  sets: 3,
  rep_min: 8,
  rep_max: 10,
  rep_suffix: null,
  rest_seconds: 90,
  superset_group: null,
  note: null,
};

export function EditItemScreen({ route, navigation }: RootProps<'EditItem'>) {
  const { itemId, dayId } = route.params;
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [initial, setInitial] = useState<string>('');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [originalExerciseId, setOriginalExerciseId] = useState<string | null>(
    null,
  );
  const [exForm, setExForm] = useState<ExForm>({
    name: '',
    load_type: 'weighted',
    step: '',
  });
  const [initialEx, setInitialEx] = useState('');
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: itemId ? 'Edit exercise' : 'Add exercise' });
    if (!itemId) {
      setInitial(JSON.stringify(DEFAULT_FORM));
      setPicker(true);
      return;
    }
    (async () => {
      const it = await getItem(itemId);
      if (!it) return;
      const exercise_id = it.exercise_id;
      const f: Form = {
        sets: it.sets,
        rep_min: it.rep_min,
        rep_max: it.rep_max,
        rep_suffix: it.rep_suffix,
        rest_seconds: it.rest_seconds,
        superset_group: it.superset_group,
        note: it.note,
      };
      setForm(f);
      setInitial(JSON.stringify(f));
      setOriginalExerciseId(exercise_id);
      const ex = await getExercise(exercise_id);
      if (ex) choose(ex);
    })();
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(ex: Exercise) {
    setExercise(ex);
    const f = {
      name: ex.name,
      load_type: ex.load_type,
      step: ex.weight_step_kg == null ? '' : String(ex.weight_step_kg),
    };
    setExForm(f);
    setInitialEx(JSON.stringify(f)); // exercise-field dirtiness resets on pick; the swap itself is tracked via exercise id
    setPicker(false);
  }

  const repError =
    form.rep_min > form.rep_max
      ? 'Min reps must be less than or equal to max reps.'
      : null;
  const stepVal = exForm.step.trim() ? parseNumber(exForm.step) : null;
  const stepError =
    exForm.step.trim() && !(stepVal && stepVal > 0)
      ? 'Enter a weight step above 0, or leave empty for the default.'
      : null;
  const dirty =
    JSON.stringify(form) !== initial ||
    JSON.stringify(exForm) !== initialEx ||
    (exercise?.id ?? null) !== originalExerciseId;
  const leave = useUnsavedGuard(dirty && !saving);

  const save = async () => {
    if (!exercise) return Alert.alert('Pick an exercise first');
    if (repError || stepError) return;
    if (!exForm.name.trim()) return Alert.alert('Name required');
    setSaving(true);
    try {
      if (JSON.stringify(exForm) !== initialEx) {
        await updateExercise(exercise.id, {
          name: exForm.name,
          load_type: exForm.load_type,
          weight_step_kg: stepVal,
        });
      }
      if (exercise.archived) await unarchiveExercise(exercise.id);
      await saveItem({
        ...form,
        id: itemId,
        day_id: dayId,
        exercise_id: exercise.id,
        rep_suffix: form.rep_suffix?.trim() || null,
        note: form.note?.trim() || null,
      });
      if (originalExerciseId && originalExerciseId !== exercise.id)
        await retireExerciseIfUnused(originalExerciseId);
      toast('Saved. Applies from your next session.');
      leave();
    } catch (e) {
      const msg = String((e as Error).message);
      Alert.alert(
        'Could not save',
        /UNIQUE/i.test(msg) ? 'This exercise is already on this day.' : msg,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Exercise">
          <Pressable
            onPress={() => setPicker(true)}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel={
              exercise ? `Exercise ${exercise.name}. Swap` : 'Pick exercise'
            }
            style={({ pressed }) => [styles.pick, pressed && styles.pressed]}
          >
            <Text style={[type.body, styles.text, styles.flex]}>
              {exercise ? exercise.name : 'Pick or create an exercise'}
            </Text>
            <Icon name="swap-horizontal-outline" color={colors.textSecondary} />
          </Pressable>
        </Field>
        {exercise ? (
          <View style={styles.box}>
            <Text style={[type.label, styles.meta]}>
              Renaming changes this exercise on every day it appears. History is
              kept.
            </Text>
            <Field label="Name">
              <Input
                label="Exercise name"
                value={exForm.name}
                onChangeText={name => setExForm({ ...exForm, name })}
              />
            </Field>
            <LoadTypeChips
              value={exForm.load_type}
              onChange={load_type => setExForm({ ...exForm, load_type })}
            />
            <Field label="Weight step (kg), empty = default" error={stepError}>
              <Input
                label="Weight step in kilograms"
                value={exForm.step}
                onChangeText={step => setExForm({ ...exForm, step })}
                keyboardType="decimal-pad"
                placeholder="Default"
              />
            </Field>
          </View>
        ) : null}

        <Field label="Sets">
          <NumberStepper
            label="Sets"
            value={form.sets}
            min={1}
            max={10}
            onChange={sets => setForm({ ...form, sets })}
          />
        </Field>
        <View style={styles.row}>
          <Field label="Rep min">
            <NumberStepper
              label="Minimum reps"
              value={form.rep_min}
              min={1}
              max={100}
              onChange={rep_min => setForm({ ...form, rep_min })}
            />
          </Field>
          <Field label="Rep max">
            <NumberStepper
              label="Maximum reps"
              value={form.rep_max}
              min={1}
              max={100}
              onChange={rep_max => setForm({ ...form, rep_max })}
            />
          </Field>
        </View>
        {repError ? (
          <Text style={[type.label, { color: colors.accentText }]}>
            {repError}
          </Text>
        ) : null}
        <Field label="Rep suffix (e.g. /leg)">
          <Input
            label="Rep suffix"
            value={form.rep_suffix ?? ''}
            onChangeText={rep_suffix => setForm({ ...form, rep_suffix })}
            maxLength={12}
          />
        </Field>
        <Field label="Rest">
          <NumberStepper
            label="Rest"
            value={form.rest_seconds}
            step={15}
            min={0}
            max={600}
            format={s => clock(s * 1000)}
            onChange={rest_seconds => setForm({ ...form, rest_seconds })}
          />
        </Field>
        <Field label="Superset group">
          <View style={styles.chips}>
            {[null, 'A', 'B', 'C'].map(g => (
              <Chip
                key={g ?? 'none'}
                label={g ?? 'None'}
                selected={form.superset_group === g}
                onPress={() => setForm({ ...form, superset_group: g })}
                style={styles.flex}
              />
            ))}
          </View>
        </Field>
        <Field label="Note">
          <Input
            label="Note"
            value={form.note ?? ''}
            onChangeText={note => setForm({ ...form, note })}
            maxLength={80}
          />
        </Field>
        <Button
          title="Save"
          large
          onPress={save}
          loading={saving}
          disabled={!exercise || !!repError || !!stepError}
        />
      </ScrollView>

      <ExercisePicker
        visible={picker}
        onClose={() => {
          setPicker(false);
          if (!exercise && !itemId) navigation.goBack();
        }}
        onPick={choose}
      />
    </SafeAreaView>
  );
}

function LoadTypeChips({
  value,
  onChange,
}: {
  value: LoadType;
  onChange: (v: LoadType) => void;
}) {
  return (
    <Field label="Load type">
      <View style={styles.chips}>
        <Chip
          label="Weighted"
          selected={value === 'weighted'}
          onPress={() => onChange('weighted')}
          style={styles.flex}
        />
        <Chip
          label="Bodyweight"
          selected={value === 'bodyweight'}
          onPress={() => onChange('bodyweight')}
          style={styles.flex}
        />
      </View>
    </Field>
  );
}

function ExercisePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (e: Exercise) => void;
}) {
  const [all, setAll] = useState<Exercise[]>([]);
  const [q, setQ] = useState('');
  const [load, setLoad] = useState<LoadType>('weighted');
  const [step, setStep] = useState('');

  useEffect(() => {
    if (visible) listExercises(true).then(setAll);
  }, [visible]);

  const matches = useMemo(
    () =>
      all.filter(e => e.name.toLowerCase().includes(q.trim().toLowerCase())),
    [all, q],
  );
  const exact = all.some(e => e.name.toLowerCase() === q.trim().toLowerCase());

  const create = async () => {
    const s = step.trim() ? parseNumber(step) : null;
    if (step.trim() && !(s && s > 0)) return Alert.alert('Invalid weight step');
    onPick(await createExercise(q, load, s));
    setQ('');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Choose exercise">
      <View style={styles.gap}>
        <Input
          label="Search or new exercise name"
          placeholder="Search or type a new name"
          value={q}
          onChangeText={setQ}
          autoFocus={false}
        />
        {q.trim() && !exact ? (
          <View style={styles.box}>
            <LoadTypeChips value={load} onChange={setLoad} />
            <Input
              label="Weight step in kilograms"
              placeholder="Weight step kg (default)"
              value={step}
              onChangeText={setStep}
              keyboardType="decimal-pad"
            />
            <Button title={`Create "${q.trim()}"`} onPress={create} />
          </View>
        ) : null}
        {matches.map(e => (
          <Pressable
            key={e.id}
            onPress={() => onPick(e)}
            android_ripple={ripple}
            accessibilityRole="button"
            style={({ pressed }) => [styles.pickRow, pressed && styles.pressed]}
          >
            <Text style={[type.body, styles.text, styles.flex]}>{e.name}</Text>
            <Text style={[type.label, styles.meta]}>
              {e.load_type === 'bodyweight' ? 'BW' : ''}
              {e.archived ? ' archived' : ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, gap: space.l, paddingBottom: space.xxl },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.l, flexWrap: 'wrap' },
  gap: { gap: space.s, paddingBottom: space.l },
  chips: { flexDirection: 'row', gap: space.s },
  pick: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    paddingHorizontal: space.m,
    overflow: 'hidden',
  },
  pressed: { backgroundColor: colors.border },
  box: {
    gap: space.m,
    padding: space.m,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.s,
    borderRadius: radius.input,
  },
});
