exports.up = async function (knex) {
  await knex.schema.createTable('records_links', table => {
    table.integer('record_rowid').unsigned().notNullable()
    table.string('source').notNullable()
    table.string('href_origin').notNullable()
    table.string('href_path').notNullable()

    table.index('record_rowid')
    table.index('href_origin')
    table.index('href_path')
    table.foreign('record_rowid').references('rowid').inTable('records').onDelete('CASCADE')
  })
  await knex.schema.dropTableIfExists('records_notification')
}

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('records_links')
  await knex.schema.createTable('records_notification', table => {
    table.integer('record_rowid').unsigned().notNullable()
    table.string('notification_key').notNullable()
    table.string('notification_subject_origin').notNullable()
    table.string('notification_subject_path').notNullable()

    table.index('record_rowid')
    table.index('notification_subject_origin')
    table.foreign('record_rowid').references('rowid').inTable('records').onDelete('CASCADE')
  })
}