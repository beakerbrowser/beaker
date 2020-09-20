exports.up = async function (knex) {
  await knex.schema.createTable('indexer_state', table => {
    table.string('key')
    table.string('value')

    table.index('key')
    table.unique('key')
  })
  await knex.schema.createTable('sites', table => {
    table.string('origin')
    table.string('title')
    table.string('description')
    table.integer('writable')
    table.integer('last_indexed_version')
    table.integer('last_indexed_ts')

    table.index('origin')
    table.unique('origin')
  })
  await knex.schema.createTable('records', table => {
    table.integer('site_rowid').unsigned().notNullable()
    table.string('prefix').notNullable()
    table.string('path').notNullable()
    table.string('extension')
    table.integer('mtime')
    table.integer('ctime')
    table.integer('rtime')

    table.foreign('site_rowid').references('rowid').inTable('sites').onDelete('CASCADE')
    table.index('prefix')
    table.index('path')
    table.index('extension')
    table.unique(['site_rowid', 'path'])
  })
  await knex.schema.createTable('records_data', table => {
    table.integer('record_rowid').unsigned().notNullable()
    table.string('key').notNullable()
    table.string('value')

    table.foreign('record_rowid').references('rowid').inTable('records').onDelete('CASCADE')
  })
  await knex.schema.createTable('records_notification', table => {
    table.integer('record_rowid').unsigned().notNullable()
    table.string('notification_key').notNullable()
    table.string('notification_subject_origin').notNullable()
    table.string('notification_subject_path').notNullable()

    table.index('notification_subject_origin')
    table.foreign('record_rowid').references('rowid').inTable('records').onDelete('CASCADE')
  })
  await knex.schema.raw(`
    CREATE VIRTUAL TABLE records_data_fts USING fts5(value, content='records_data');
  `)
  await knex.schema.raw(`
    CREATE TRIGGER records_data_ai AFTER INSERT ON records_data BEGIN
      INSERT INTO records_data_fts(rowid, value) VALUES (new.rowid, new.value);
    END;
  `)
  await knex.schema.raw(`
    CREATE TRIGGER records_data_ad AFTER DELETE ON records_data BEGIN
      INSERT INTO records_data_fts(records_data_fts, rowid, value) VALUES('delete', old.rowid, old.value);
    END;
  `)
  await knex.schema.raw(`
    CREATE TRIGGER records_data_au AFTER UPDATE ON records_data BEGIN
      INSERT INTO records_data_fts(records_data_fts, rowid, value) VALUES('delete', old.rowid, old.value);
      INSERT INTO records_data_fts(rowid, value) VALUES (new.rowid, new.value);
    END;
  `)
}

exports.down = async function (knex) {
  await knex.schema.raw(`DROP TRIGGER IF EXISTS records_data_au`)
  await knex.schema.raw(`DROP TRIGGER IF EXISTS records_data_ad`)
  await knex.schema.raw(`DROP TRIGGER IF EXISTS records_data_ai`)
  await knex.schema.dropTableIfExists('records_data_fts')
  await knex.schema.dropTableIfExists('records_notification')
  await knex.schema.dropTableIfExists('records_data')
  await knex.schema.dropTableIfExists('records')
  await knex.schema.dropTableIfExists('sites')
  await knex.schema.dropTableIfExists('indexer_state')
}