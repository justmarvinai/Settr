import { SettrDB } from './db';

/** The app's database (Dexie opens it lazily on first use). Tests create their own instances. */
export const db = new SettrDB();
