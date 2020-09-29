exports.up = async function (knex) {
  await knex.schema.table('records', table => table.index('site_rowid'))
  await knex.schema.table('records_data', table => table.index('record_rowid'))
  await knex.schema.table('records_notification', table => table.index('record_rowid'))
}

exports.down = async function (knex) {
  await knex.schema.table('records_notification', table => table.dropIndex('record_rowid'))
  await knex.schema.table('records_data', table => table.dropIndex('record_rowid'))
  await knex.schema.table('records', table => table.dropIndex('site_rowid'))
}