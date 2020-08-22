exports.up = async function (knex) {
  await knex.schema.createTable('sites', table => {
    table.string('origin')
    table.string('title')
    table.string('description')
    table.integer('writable')

    table.index('origin')
  })
  await knex.schema.createTable('site_indexes', table => {
    table.integer('site_rowid').unsigned().notNullable()
    table.string('index')
    table.integer('last_indexed_version')
    table.integer('last_indexed_ts')

    table.foreign('site_rowid').references('rowid').inTable('sites').onDelete('CASCADE')
    table.unique(['site_rowid', 'index'])
  })
  await knex.schema.createTable('records', table => {
    table.integer('site_rowid').unsigned().notNullable()
    table.string('path').notNullable()
    table.string('index')
    table.integer('mtime')
    table.integer('ctime')

    table.foreign('site_rowid').references('rowid').inTable('sites').onDelete('CASCADE')
    table.index('path')
    table.index('index')
    table.unique(['site_rowid', 'path'])
  })
  await knex.schema.createTable('records_data', table => {
    table.integer('record_rowid').unsigned().notNullable()
    table.string('key').notNullable()
    table.string('value')

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
  await knex.schema.createTable('notifications', table => {
    table.integer('site_rowid').unsigned().notNullable()
    table.integer('record_rowid').unsigned().notNullable()
    table.string('type')
    table.string('subject_origin')
    table.string('subject_path')
    table.integer('is_read')
    table.integer('ctime')

    table.unique(['site_rowid', 'record_rowid'])
    table.foreign('site_rowid').references('rowid').inTable('sites').onDelete('CASCADE')
    table.foreign('record_rowid').references('rowid').inTable('records').onDelete('CASCADE')
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('notifications')
  await knex.schema.raw(`DROP TRIGGER IF EXISTS records_data_au`)
  await knex.schema.raw(`DROP TRIGGER IF EXISTS records_data_ad`)
  await knex.schema.raw(`DROP TRIGGER IF EXISTS records_data_ai`)
  await knex.schema.dropTableIfExists('records_data_fts')
  await knex.schema.dropTableIfExists('records_data')
  await knex.schema.dropTableIfExists('records')
  await knex.schema.dropTableIfExists('site_indexess')
  await knex.schema.dropTableIfExists('sites')
}