/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  addDays, differenceInDays, startOfDay, isSameDay, isAfter, isBefore, parseISO, format, isWithinInterval 
} from 'date-fns';
import { CyclePhase, SymptomLog, DailySymptomRecord, ReminderSettings } from '../types';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebaseUtils';
import { useAuth } from '../components/AuthProvider';

export interface CycleRecord {
  id?: string;
  start: Date;
  end?: Date;
}

export function useCycleData(targetUserId?: string | null) {
  const { user } = useAuth();
  const [records, setRecords] = useState<CycleRecord[]>([]);
  const [symptoms, setSymptoms] = useState<DailySymptomRecord>({});
  
  const [reminders, setReminders] = useState<ReminderSettings>({
    logSymptoms: { enabled: true, time: '20:00' },
    periodStart: { enabled: true, time: '08:00' },
    wellness: { enabled: false, time: '14:00' },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const [partnerNote, setPartnerNote] = useState<string>('');

  useEffect(() => {
    if (!targetUserId) {
      setRecords([]);
      setSymptoms({});
      return;
    }

    const unsubs: (() => void)[] = [];

    // Cycle records
    try {
      const recordsRef = query(collection(db, 'users', targetUserId, 'cycleRecords'), where('userId', '==', targetUserId));
      unsubs.push(onSnapshot(recordsRef, (snap) => {
        const fetchedRecords: CycleRecord[] = [];
        snap.forEach(d => {
          const data = d.data();
          fetchedRecords.push({
            id: d.id,
            start: parseISO(data.start),
            end: data.end ? parseISO(data.end) : undefined
          });
        });
        setRecords(fetchedRecords.sort((a, b) => b.start.getTime() - a.start.getTime()));
      }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${targetUserId}/cycleRecords`)));

      // Symptoms
      const symptomsRef = query(collection(db, 'users', targetUserId, 'symptomLogs'), where('userId', '==', targetUserId));
      unsubs.push(onSnapshot(symptomsRef, (snap) => {
        const fetchedSymptoms: DailySymptomRecord = {};
        let latestPartnerNote = '';
        snap.forEach(d => {
          const data = d.data();
          fetchedSymptoms[data.date] = {
            mood: data.mood,
            energy: data.energy,
            discomfort: data.discomfort || [],
            note: data.partnerNote
          };
          if (data.partnerNote) {
            latestPartnerNote = data.partnerNote;
          }
        });
        setSymptoms(fetchedSymptoms);
      }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${targetUserId}/symptomLogs`)));

      // Settings
      const settingsRef = query(collection(db, 'users', targetUserId, 'settings'), where('userId', '==', targetUserId));
      unsubs.push(onSnapshot(settingsRef, (snap) => {
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (data.reminders) {
            setReminders(prev => ({
              ...prev,
              ...data.reminders,
              timezone: data.timezone || prev.timezone
            }));
          }
        }
      }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${targetUserId}/settings`)));

    } catch (error) {
      console.error("Setup Firebase listeners error", error);
    }

    return () => unsubs.forEach(u => u());
  }, [targetUserId]);

  const updateSettingsInDb = async (newReminders: ReminderSettings) => {
    if (!user || user.uid !== targetUserId) return; // Only owner can edit settings
    try {
      const docRef = doc(db, 'users', targetUserId, 'settings', 'main');
      const snap = await getDoc(docRef);
      const payload: any = {
        userId: targetUserId,
        reminders: newReminders,
        updatedAt: serverTimestamp()
      };
      if (!snap.exists()) payload.createdAt = serverTimestamp();
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${targetUserId}/settings/main`);
    }
  };

  const handleSetReminders = (newReminders: ReminderSettings | ((prev: ReminderSettings) => ReminderSettings)) => {
    setReminders(prev => {
      const updated = typeof newReminders === 'function' ? newReminders(prev) : newReminders;
      updateSettingsInDb(updated);
      return updated;
    });
  };

  const toggleDate = async (date: Date) => {
    if (!user || user.uid !== targetUserId) return;
    const d = startOfDay(date);
    
    // Check if the clicked date falls within any existing record
    const overlappingRecord = records.find(r => {
      if (r.end) return isWithinInterval(d, { start: startOfDay(r.start), end: startOfDay(r.end) });
      return isSameDay(d, startOfDay(r.start));
    });

    if (overlappingRecord && overlappingRecord.id) {
      if (isSameDay(d, startOfDay(overlappingRecord.start))) {
        // If they click the exact start date, delete the entire record
        try {
          await deleteDoc(doc(db, 'users', targetUserId, 'cycleRecords', overlappingRecord.id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${targetUserId}/cycleRecords/${overlappingRecord.id}`);
        }
      } else if (overlappingRecord.end && isSameDay(d, startOfDay(overlappingRecord.end))) {
        // If they click the exact end date, remove the end date
        try {
          await updateDoc(doc(db, 'users', targetUserId, 'cycleRecords', overlappingRecord.id), {
             end: null,
             updatedAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${targetUserId}/cycleRecords/${overlappingRecord.id}`);
        }
      } else {
        // If they click in the middle of a recorded period, truncate it to the day before
        try {
          await updateDoc(doc(db, 'users', targetUserId, 'cycleRecords', overlappingRecord.id), {
             end: format(addDays(d, -1), 'yyyy-MM-dd'),
             updatedAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${targetUserId}/cycleRecords/${overlappingRecord.id}`);
        }
      }
      return;
    }

    const openRecordIndex = records.findIndex(r => !r.end);
    if (openRecordIndex > -1) {
      const openRecord = records[openRecordIndex];
      if (isAfter(d, openRecord.start) && openRecord.id) {
        try {
          await updateDoc(doc(db, 'users', targetUserId, 'cycleRecords', openRecord.id), {
            end: format(d, 'yyyy-MM-dd'),
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${targetUserId}/cycleRecords/${openRecord.id}`);
        }
        return;
      }
    }

    // New start
    const newId = Date.now().toString();
    try {
      await setDoc(doc(db, 'users', targetUserId, 'cycleRecords', newId), {
        userId: targetUserId,
        start: format(d, 'yyyy-MM-dd'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${targetUserId}/cycleRecords/${newId}`);
    }
  };

  const setPeriodRange = async (start: Date, end: Date) => {
    if (!user || user.uid !== targetUserId) return;
    const s = startOfDay(start);
    const e = startOfDay(end);
    
    const newId = Date.now().toString();
    try {
      await setDoc(doc(db, 'users', targetUserId, 'cycleRecords', newId), {
        userId: targetUserId,
        start: format(s, 'yyyy-MM-dd'),
        end: format(e, 'yyyy-MM-dd'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${targetUserId}/cycleRecords/${newId}`);
    }
  };

  const deleteRecord = async (startDate: Date) => {
    if (!user || user.uid !== targetUserId) return;
    const r = records.find(rec => isSameDay(rec.start, startDate));
    if (r && r.id) {
      try {
        await deleteDoc(doc(db, 'users', targetUserId, 'cycleRecords', r.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${targetUserId}/cycleRecords/${r.id}`);
      }
    }
  };

  const updateRecord = async (oldStart: Date, newRecord: CycleRecord) => {
    if (!user || user.uid !== targetUserId) return;
    const r = records.find(rec => isSameDay(rec.start, oldStart));
    if (r && r.id) {
      try {
        await updateDoc(doc(db, 'users', targetUserId, 'cycleRecords', r.id), {
          start: format(startOfDay(newRecord.start), 'yyyy-MM-dd'),
          end: newRecord.end ? format(startOfDay(newRecord.end), 'yyyy-MM-dd') : null,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}/cycleRecords/${r.id}`);
      }
    }
  };

  const logSymptom = async (date: Date, log: Partial<SymptomLog>) => {
    if (!user || user.uid !== targetUserId) return; // Wait, hubby shouldn't log symptoms usually? Or okay if we prevent? We use firestore rules to prevent write anyway!
    const key = format(startOfDay(date), 'yyyy-MM-dd');
    const existing = symptoms[key] || {};
    
    try {
      const docRef = doc(db, 'users', targetUserId, 'symptomLogs', key);
      const snap = await getDoc(docRef);
      const payload: any = {
        userId: targetUserId,
        date: key,
        mood: log.mood || existing.mood || 'none',
        energy: log.energy || existing.energy || 'none',
        flow: 'none', // defaults
        discomfort: log.discomfort || existing.discomfort || [],
        partnerNote: log.note !== undefined ? log.note : (existing.note || ''),
        updatedAt: serverTimestamp()
      };
      if (!snap.exists()) payload.createdAt = serverTimestamp();
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetUserId}/symptomLogs/${key}`);
    }
  };

  const deleteSymptom = async (date: Date) => {
    if (!user || user.uid !== targetUserId) return;
    const key = format(startOfDay(date), 'yyyy-MM-dd');
    try {
      await deleteDoc(doc(db, 'users', targetUserId, 'symptomLogs', key));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUserId}/symptomLogs/${key}`);
    }
  };

  const history = useMemo(() => {
    const sorted = [...records].sort((a, b) => a.start.getTime() - b.start.getTime());
    return sorted.map((record, index) => {
      const nextRecord = sorted[index + 1];
      const cycleLength = nextRecord ? differenceInDays(nextRecord.start, record.start) : undefined;
      const duration = record.end ? differenceInDays(record.end, record.start) + 1 : undefined;

      return {
        ...record,
        duration,
        cycleLength
      };
    }).reverse(); // Latest first for display
  }, [records]);

  const lastPeriodStart = useMemo(() => {
    if (records.length === 0) return null;
    return records.reduce((latest, current) => 
      isAfter(current.start, latest.start) ? current : latest
    ).start;
  }, [records]);

  const { 
    weightedCycleLength, 
    weightedPeriodLength 
  } = useMemo(() => {
    if (records.length < 2) return { weightedCycleLength: 28, weightedPeriodLength: 5 };

    const sorted = [...records].sort((a, b) => a.start.getTime() - b.start.getTime());
    const lengths: number[] = [];
    const durations: number[] = [];

    sorted.forEach((record, i) => {
      if (record.end) {
        durations.push(differenceInDays(record.end, record.start) + 1);
      }
      if (i < sorted.length - 1) {
        lengths.push(differenceInDays(sorted[i + 1].start, record.start));
      }
    });

    // Weighted average: more recent cycles get higher weight
    const calculateWeighted = (values: number[]) => {
      if (values.length === 0) return null;
      if (values.length === 1) return values[0];
      
      let totalWeight = 0;
      let weightedSum = 0;
      
      // We reverse to handle latest first
      const reversed = [...values].reverse();
      reversed.forEach((val, index) => {
        const weight = Math.pow(0.8, index); // Decay factor
        weightedSum += val * weight;
        totalWeight += weight;
      });
      
      return weightedSum / totalWeight;
    };

    return {
      weightedCycleLength: Math.round(calculateWeighted(lengths) || 28),
      weightedPeriodLength: Math.round(calculateWeighted(durations) || 5)
    };
  }, [records]);

  const predictedNextPeriod = useMemo(() => {
    if (!lastPeriodStart) return addDays(startOfDay(new Date()), 5);
    return addDays(lastPeriodStart, weightedCycleLength);
  }, [lastPeriodStart, weightedCycleLength]);

  const predictedOvulation = useMemo(() => {
    return addDays(predictedNextPeriod, -14); // Luteal phase is usually consistently 14 days
  }, [predictedNextPeriod]);

  const getRecordForDate = (date: Date) => {
    const d = startOfDay(date);
    return records.find(r => {
      if (isSameDay(r.start, d)) return true;
      if (r.end && (isAfter(d, r.start) || isSameDay(d, r.start)) && (isBefore(d, r.end) || isSameDay(d, r.end))) {
        return true;
      }
      return false;
    });
  };

  const getPhaseForDate = (date: Date): CyclePhase | 'none' => {
    const d = startOfDay(date);
    if (!lastPeriodStart || records.length === 0) return 'none';

    // 1. Is there an actual recorded period overlapping this date?
    const actualRecord = getRecordForDate(d);
    if (actualRecord) return 'menstruation';

    // 2. Find the most recent period start before or equal to this date
    let mostRecentStart = records[0].start; // default to something
    let minDiff = Infinity;
    for (const r of records) {
      const diff = differenceInDays(d, r.start);
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        mostRecentStart = r.start;
      }
    }

    // 3. If there is no previous record (i.e. date is before the VERY FIRST recorded period)
    if (minDiff === Infinity) {
       // calculate backwards from the absolute earliest record we have
       const absoluteFirst = records.reduce((earliest, r) => r.start < earliest ? r.start : earliest, records[0].start);
       const daysSinceLast = differenceInDays(d, absoluteFirst);
       const cycleDay = ((daysSinceLast % weightedCycleLength) + weightedCycleLength) % weightedCycleLength;
       if (cycleDay < weightedPeriodLength) return 'menstruation';
       if (cycleDay < weightedCycleLength - 16) return 'follicular';
       if (cycleDay < weightedCycleLength - 12) return 'ovulation';
       return 'luteal';
    }

    // 4. We found the closest previous record. Calculate offset from that record.
    const daysSinceLast = differenceInDays(d, mostRecentStart);
    const cycleDay = daysSinceLast % weightedCycleLength;

    if (cycleDay < weightedPeriodLength) return 'menstruation';
    if (cycleDay < weightedCycleLength - 16) return 'follicular';
    if (cycleDay < weightedCycleLength - 12) return 'ovulation';
    return 'luteal';
  };

  const currentPhase: CyclePhase = useMemo(() => {
    const res = getPhaseForDate(new Date());
    return res === 'none' ? 'menstruation' : res;
  }, [lastPeriodStart, weightedPeriodLength, weightedCycleLength, records]);

  return {
    records,
    history,
    symptoms,
    toggleDate,
    setPeriodRange,
    deleteRecord,
    updateRecord,
    logSymptom,
    deleteSymptom,
    setReminders: handleSetReminders,
    getPhaseForDate,
    getRecordForDate,
    lastPeriodStart,
    predictedNextPeriod,
    predictedOvulation,
    weightedPeriodLength,
    currentPhase,
    averageCycleLength: weightedCycleLength,
    reminders,
    partnerNote,
    setPartnerNote
  };
}
