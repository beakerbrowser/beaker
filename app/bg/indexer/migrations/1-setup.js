exports.up = async function (knex) {
  await knex.schema.createTable('sites', table => {
    table.string('origin')
    table.string('title')

    table.index('origin')
  })
  await knex.schema.createTable('site_subscriptions', table => {
    table.integer('site_rowid').unsigned().notNullable()
    table.integer('last_indexed_version')
    table.integer('last_indexed_ts')

    table.foreign('site_rowid').references('rowid').inTable('sites').onDelete('CASCADE')
    table.unique('site_rowid')
  })
  await knex.schema.createTable('resources', table => {
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
  await knex.schema.createTable('resources_data', table => {
    table.integer('resource_rowid').unsigned().notNullable()
    table.string('key').notNullable()
    table.string('value')

    table.foreign('resource_rowid').references('rowid').inTable('resources').onDelete('CASCADE')
  })
  await knex.schema.raw(`
    CREATE VIRTUAL TABLE resources_data_fts USING fts5(value, content='resources_data');
  `)
  await knex.schema.raw(`
    CREATE TRIGGER resources_data_ai AFTER INSERT ON resources_data BEGIN
      INSERT INTO resources_data_fts(rowid, value) VALUES (new.rowid, new.value);
    END;
  `)
  await knex.schema.raw(`
    CREATE TRIGGER resources_data_ad AFTER DELETE ON resources_data BEGIN
      INSERT INTO resources_data_fts(resources_data_fts, rowid, value) VALUES('delete', old.rowid, old.value);
    END;
  `)
  await knex.schema.raw(`
    CREATE TRIGGER resources_data_au AFTER UPDATE ON resources_data BEGIN
      INSERT INTO resources_data_fts(resources_data_fts, rowid, value) VALUES('delete', old.rowid, old.value);
      INSERT INTO resources_data_fts(rowid, value) VALUES (new.rowid, new.value);
    END;
  `)
  await knex.schema.createTable('notifications', table => {
    table.integer('site_rowid').unsigned().notNullable()
    table.integer('resource_rowid').unsigned().notNullable()
    table.string('type')
    table.string('subject_origin')
    table.string('subject_path')
    table.integer('is_read')
    table.integer('ctime')

    table.unique(['site_rowid', 'resource_rowid'])
    table.foreign('site_rowid').references('rowid').inTable('sites').onDelete('CASCADE')
    table.foreign('resource_rowid').references('rowid').inTable('resources').onDelete('CASCADE')
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('notifications')
  await knex.schema.raw(`DROP TRIGGER IF EXISTS resources_data_au`)
  await knex.schema.raw(`DROP TRIGGER IF EXISTS resources_data_ad`)
  await knex.schema.raw(`DROP TRIGGER IF EXISTS resources_data_ai`)
  await knex.schema.dropTableIfExists('resources_data_fts')
  await knex.schema.dropTableIfExists('resources_data')
  await knex.schema.dropTableIfExists('resources')
  await knex.schema.dropTableIfExists('site_subscriptions')
  await knex.schema.dropTableIfExists('sites')
}