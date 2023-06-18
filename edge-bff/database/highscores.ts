import {datetime, mysqlTable, smallint, varchar} from 'drizzle-orm/mysql-core';

export const highscores = mysqlTable('highscores', {
  id: varchar('id', {length: 36})
    .notNull()
    .primaryKey(),
  publicId: varchar('public_id', {length: 36})
    .notNull(),
  name: varchar('name', {length: 256})
    .notNull(),
  timeToComplete: smallint('time_to_complete')
    .notNull(),
  createdAt: datetime('created_at', {mode: 'date', fsp: 6})
    .notNull(),
  updatedAt: datetime('updated_at', {mode: 'date', fsp: 6})
    .notNull(),
});
