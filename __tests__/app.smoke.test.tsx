/* Renders the whole app on an in-memory DB and logs one set through the UI. */
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import App from '../App';
import { makeTestDb } from '../test-utils/sqliteDb';
import { getDb } from '../src/db/client';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../src/db/client', () => {
  const actual = jest.requireActual('../src/db/client');
  return { ...actual, openDb: jest.fn(async () => actual.getDb()) };
});

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date(2026, 8, 28, 9, 0) }); // Monday: Upper A
  await makeTestDb();
});
afterEach(() => jest.useRealTimers());

test('fresh install opens today, logs a set, starts rest timer', async () => {
  render(<App />);
  await waitFor(() =>
    expect(
      screen.getAllByText('Flat Barbell Bench Press').length,
    ).toBeGreaterThan(0),
  );
  expect(screen.getByLabelText('0 of 15 sets logged')).toBeTruthy();
  expect(
    screen.getAllByText('First session for this exercise').length,
  ).toBeGreaterThan(0);

  // No weight yet: button asks for a starting weight.
  expect(screen.getByText('Set starting weight')).toBeTruthy();
  for (let i = 0; i < 4; i++)
    fireEvent.press(screen.getByLabelText('Increase Weight'));
  await waitFor(() =>
    expect(screen.getByLabelText('Weight 10 kg')).toBeTruthy(),
  );
  await act(async () => {
    fireEvent.press(screen.getByText('LOG SET'));
  });

  await waitFor(() =>
    expect(screen.getByLabelText('1 of 15 sets logged')).toBeTruthy(),
  );
  const { rows } = await getDb().execute(
    'SELECT weight_kg, reps, set_index FROM set_logs',
  );
  expect(rows).toEqual([{ weight_kg: 10, reps: 6, set_index: 0 }]);
  await waitFor(() =>
    expect(screen.getByText('Rest · next: Set 2 of 3')).toBeTruthy(),
  );
  expect(screen.getByLabelText('Skip')).toBeTruthy();

  // Tapping anywhere on another card (here its target line) focuses it.
  fireEvent.press(screen.getByText('3 × 6-8 · rest 2:00'));
  await waitFor(() =>
    expect(
      screen.getByLabelText(
        /Standing Barbell Overhead Press.*current exercise/,
      ),
    ).toBeTruthy(),
  );

  // Tapping a logged set chip opens edit instead of focusing its card.
  fireEvent.press(screen.getByLabelText(/^Set 1, 10×6, logged/));
  await waitFor(() => expect(screen.getByText('UPDATE SET')).toBeTruthy());
  expect(
    screen.getByLabelText(/Flat Barbell Bench Press.*current exercise/),
  ).toBeTruthy();
});
